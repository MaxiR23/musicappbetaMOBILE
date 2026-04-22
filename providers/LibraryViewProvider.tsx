import { LibraryAddInput, LibraryViewContext } from "@/context/LibraryViewContext";
import { useAuth } from "@/hooks/use-auth";
import { useCacheVersions } from "@/hooks/use-cache-versions";
import {
  LibraryKind,
  LibraryViewItem,
  libraryService,
} from "@/services/libraryService";
import { onLikesChange } from "@/utils/likes-events";
import { onPlaylistChange } from "@/utils/playlist-events";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

function savedKey(kind: LibraryKind, externalId: string): string {
  return `${kind}:${externalId}`;
}

// Mapea un LibraryKind ("album" | "playlist") al LibraryViewItem.kind
// correspondiente de un item saved ("saved_album" | "saved_playlist").
function toSavedViewKind(kind: LibraryKind): "saved_album" | "saved_playlist" {
  return kind === "album" ? "saved_album" : "saved_playlist";
}

// Inserta un item respetando la invariante "Liked siempre primera".
function insertAfterLiked(
  items: LibraryViewItem[],
  item: LibraryViewItem,
): LibraryViewItem[] {
  const likedIndex = items.findIndex((i) => i.kind === "liked");
  if (likedIndex === -1) return [item, ...items];
  return [
    ...items.slice(0, likedIndex + 1),
    item,
    ...items.slice(likedIndex + 1),
  ];
}

export function LibraryViewProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { versions } = useCacheVersions();
  const libraryVersion = versions["library-view"];

  const [viewItems, setViewItems] = useState<LibraryViewItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  const syncingRef = useRef(false);
  const viewItemsRef = useRef(viewItems);
  viewItemsRef.current = viewItems;

  // Serializa mutaciones por (kind, external_id) para evitar race conditions.
  const mutationQueuesRef = useRef<Map<string, Promise<unknown>>>(new Map());

  const enqueueMutation = useCallback(
    (key: string, fn: () => Promise<unknown>): Promise<unknown> => {
      const prev = mutationQueuesRef.current.get(key) ?? Promise.resolve();
      const next = prev.then(fn).catch((err) => {
        console.warn(`[LibraryViewProvider] mutation ${key} failed:`, err);
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

  // ── FETCH ───────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!userId || syncingRef.current) return;
    if (!libraryVersion) return;
    // No refrescar si hay mutaciones pendientes (el server puede estar desfasado).
    if (mutationQueuesRef.current.size > 0) return;

    syncingRef.current = true;
    try {
      const { items } = await libraryService.getView(libraryVersion);
      setViewItems(items);
    } catch (err) {
      console.warn("[LibraryViewProvider] refresh failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, [userId, libraryVersion]);

  // ── CARGA INICIAL ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setViewItems([]);
      setIsReady(false);
      return;
    }
    if (!libraryVersion) return;

    let cancelled = false;
    (async () => {
      try {
        const { items } = await libraryService.getView(libraryVersion);
        if (!cancelled) setViewItems(items);
      } catch (err) {
        console.warn("[LibraryViewProvider] loadInitial failed:", err);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, libraryVersion]);

  // ── REFRESH AL VOLVER DE BACKGROUND ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  // ── REFRESH EN CAMBIOS DE PLAYLISTS (create/edit/delete emit emitPlaylistChange) ──
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onPlaylistChange(() => {
      refreshRef.current();
    });
    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onLikesChange(() => {
      refreshRef.current();
    });
    return unsubscribe;
  }, [userId]);

  // ── QUERIES ─────────────────────────────────────────────────────────────────
  const savedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const i of viewItems) {
      if (i.kind === "saved_album") set.add(savedKey("album", i.id));
      else if (i.kind === "saved_playlist") set.add(savedKey("playlist", i.id));
    }
    return set;
  }, [viewItems]);

  const isInLibrary = useCallback(
    (kind: LibraryKind, externalId: string) =>
      savedKeys.has(savedKey(kind, externalId)),
    [savedKeys],
  );

  // ── MUTATIONS: ADD ──────────────────────────────────────────────────────────
  const addToLibrary = useCallback(
    async (input: LibraryAddInput) => {
      const key = savedKey(input.kind, input.external_id);
      const viewKind = toSavedViewKind(input.kind);

      // Dedup: si ya esta, no hacemos nada.
      const alreadyPresent = viewItemsRef.current.some(
        (i) => i.kind === viewKind && i.id === input.external_id,
      );
      if (alreadyPresent) return;

      const nowIso = new Date().toISOString();
      const stub: LibraryViewItem = {
        kind: viewKind,
        id: input.external_id,
        title: input.title,
        thumbnail_url: input.thumbnail_url ?? "",
        subtitle: input.artist ?? "",
        sorted_at: nowIso,
      };

      // Optimistic: Liked siempre queda primera, stub justo despues.
      setViewItems((prev) => insertAfterLiked(prev, stub));

      await enqueueMutation(key, async () => {
        try {
          await libraryService.add(input);
          // Refresh para traer el shape real con sorted_at del servidor.
          await refreshRef.current();
        } catch (err) {
          // Rollback: sacar el stub.
          setViewItems((prev) =>
            prev.filter(
              (i) => !(i.kind === viewKind && i.id === input.external_id),
            ),
          );
          throw err;
        }
      });
    },
    [enqueueMutation],
  );

  // ── MUTATIONS: REMOVE ───────────────────────────────────────────────────────
  const removeFromLibrary = useCallback(
    async (kind: LibraryKind, externalId: string) => {
      const key = savedKey(kind, externalId);
      const viewKind = toSavedViewKind(kind);
      const target = viewItemsRef.current.find(
        (i) => i.kind === viewKind && i.id === externalId,
      );
      if (!target) return;

      // Optimistic: sacarlo de la grilla.
      setViewItems((prev) =>
        prev.filter((i) => !(i.kind === viewKind && i.id === externalId)),
      );

      await enqueueMutation(key, async () => {
        try {
          await libraryService.remove(kind, externalId);
        } catch (err) {
          // Si mientras tanto lo volvieron a agregar, no rollbackeamos (el add manda).
          const stillAbsent = !viewItemsRef.current.some(
            (i) => i.kind === viewKind && i.id === externalId,
          );
          if (stillAbsent) {
            // Rollback respetando invariante Liked primera.
            setViewItems((prev) => insertAfterLiked(prev, target));
          }
          throw err;
        }
      });
    },
    [enqueueMutation],
  );

  // ── SLICES DERIVADOS ────────────────────────────────────────────────────────
  const ownedPlaylists = useMemo(
    () => viewItems.filter((i) => i.kind === "own_playlist"),
    [viewItems],
  );
  const savedAlbums = useMemo(
    () => viewItems.filter((i) => i.kind === "saved_album"),
    [viewItems],
  );
  const savedPlaylists = useMemo(
    () => viewItems.filter((i) => i.kind === "saved_playlist"),
    [viewItems],
  );

  const value = useMemo(
    () => ({
      viewItems,
      isReady,
      ownedPlaylists,
      savedAlbums,
      savedPlaylists,
      isInLibrary,
      addToLibrary,
      removeFromLibrary,
      refresh,
    }),
    [
      viewItems,
      isReady,
      ownedPlaylists,
      savedAlbums,
      savedPlaylists,
      isInLibrary,
      addToLibrary,
      removeFromLibrary,
      refresh,
    ],
  );

  return (
    <LibraryViewContext.Provider value={value}>
      {children}
    </LibraryViewContext.Provider>
  );
}