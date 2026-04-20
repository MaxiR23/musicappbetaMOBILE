import { LibraryAddInput, LibraryContext } from "@/context/LibraryContext";
import { useAuth } from "@/hooks/use-auth";
import { useCacheVersions } from "@/hooks/use-cache-versions";
import { LibraryItem, LibraryKind, libraryService } from "@/services/libraryService";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

function makeKey(kind: LibraryKind, externalId: string): string {
  return `${kind}:${externalId}`;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { versions } = useCacheVersions();
  const libraryVersion = versions.library;

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  const syncingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Serializa mutaciones por (kind, external_id) para evitar race conditions
  const mutationQueuesRef = useRef<Map<string, Promise<unknown>>>(new Map());

  const enqueueMutation = useCallback(
    (key: string, fn: () => Promise<unknown>): Promise<unknown> => {
      const prev = mutationQueuesRef.current.get(key) ?? Promise.resolve();
      const next = prev.then(fn).catch((err) => {
        console.warn(`[LibraryProvider] mutation ${key} failed:`, err);
      });
      mutationQueuesRef.current.set(key, next);
      next.finally(() => {
        if (mutationQueuesRef.current.get(key) === next) {
          mutationQueuesRef.current.delete(key);
        }
      });
      return next;
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!userId || syncingRef.current) return;
    // No refrescar si hay mutaciones pendientes, el server puede no estar al dia
    if (mutationQueuesRef.current.size > 0) return;
    syncingRef.current = true;
    try {
      const { items: fetched } = await libraryService.list({ library: libraryVersion });
      setItems(fetched);
    } catch (err) {
      console.warn("[LibraryProvider] refresh failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, [userId, libraryVersion]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setIsReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items: fetched } = await libraryService.list({ library: libraryVersion });
        if (!cancelled) setItems(fetched);
      } catch (err) {
        console.warn("[LibraryProvider] loadInitial failed:", err);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, libraryVersion]);

  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  const libraryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) set.add(makeKey(i.kind, i.external_id));
    return set;
  }, [items]);

  const isInLibrary = useCallback(
    (kind: LibraryKind, externalId: string) =>
      libraryKeys.has(makeKey(kind, externalId)),
    [libraryKeys],
  );

  const addToLibrary = useCallback(
    async (input: LibraryAddInput) => {
      const key = makeKey(input.kind, input.external_id);
      if (itemsRef.current.some(i => makeKey(i.kind, i.external_id) === key)) return;

      const nowIso = new Date().toISOString();
      const stubId = `temp-${Date.now()}`;
      const stub: LibraryItem = {
        id: stubId,
        user_id: userId ?? "",
        kind: input.kind,
        external_id: input.external_id,
        title: input.title,
        thumbnail_url: input.thumbnail_url ?? "",
        artist: input.artist ?? "",
        artist_id: input.artist_id ?? "",
        album_id: input.album_id ?? "",
        album_name: input.album_name ?? "",
        added_at: nowIso,
        updated_at: nowIso,
      };
      setItems(prev => [stub, ...prev]);

      await enqueueMutation(key, async () => {
        try {
          const { item } = await libraryService.add(input);
          setItems(prev => {
            const withoutStub = prev.filter(i => i.id !== stubId);
            // Si mientras tanto lo sacaron, el item no debe volver
            const stillWants = withoutStub.some(i => makeKey(i.kind, i.external_id) === key);
            if (stillWants) return withoutStub;
            return [item, ...withoutStub];
          });
        } catch (err) {
          setItems(prev => prev.filter(i => i.id !== stubId));
          throw err;
        }
      });
    },
    [userId, enqueueMutation],
  );

  const removeFromLibrary = useCallback(
    async (kind: LibraryKind, externalId: string) => {
      const key = makeKey(kind, externalId);
      const target = itemsRef.current.find(i => makeKey(i.kind, i.external_id) === key);
      if (!target) return;

      setItems(prev => prev.filter(i => makeKey(i.kind, i.external_id) !== key));

      await enqueueMutation(key, async () => {
        try {
          await libraryService.remove(kind, externalId);
        } catch (err) {
          // Si mientras tanto lo volvieron a agregar, NO hacemos rollback (el add manda)
          const stillAbsent = !itemsRef.current.some(
            i => makeKey(i.kind, i.external_id) === key,
          );
          if (stillAbsent) {
            setItems(prev => [target, ...prev]);
          }
          throw err;
        }
      });
    },
    [enqueueMutation],
  );

  const albums = useMemo(() => items.filter(i => i.kind === "album"), [items]);
  const playlists = useMemo(() => items.filter(i => i.kind === "playlist"), [items]);

  const value = useMemo(
    () => ({ items, albums, playlists, isReady, isInLibrary, addToLibrary, removeFromLibrary, refresh }),
    [items, albums, playlists, isReady, isInLibrary, addToLibrary, removeFromLibrary, refresh],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}