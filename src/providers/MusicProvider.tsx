import Constants from "expo-constants";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, TrackType } from "react-native-track-player";
import { ensureTrackPlayer } from "../components/player/setupTrackPlayer";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playSource, setPlaySource] = useState<PlaySource | null>(null);

  // 👇 Flag para evitar que eventos externos pisen el índice mientras sincronizamos
  const syncingRef = useRef(false);

  type PlaySource =
    | { type: "playlist"; name?: string | null }
    | { type: "album"; name?: string | null }
    | { type: "artist"; name?: string | null }
    | { type: "queue"; name?: string | null };

  function getBaseUrl() {
    return (
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
      ((Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
      null
    );
  }

  // 🔁 RESOLVER STREAM PARA RNTP (JSON limpio desde backend)
  async function resolveStreamUrl(id: string, baseUrl: string): Promise<string> {
    const url = `${baseUrl}/music/play?id=${encodeURIComponent(id)}&redir=0`;
    console.log("[RNTP] resolviendo stream JSON:", url);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`[resolveStreamUrl] status ${res.status}`);
    }

    const data = await res.json();
    console.log("[RNTP] streamUrl =", data.url);
    return data.url;
  }

  async function syncWithTrackPlayer(list: Song[], startIndex: number) {
    await ensureTrackPlayer();

    const BASE_URL = getBaseUrl();
    if (!BASE_URL || !list.length) return;

    // --- 1) armar objetos de track ---
    const tracks = list.map((s) => ({
      id: String(s.id),
      // ⚠️ primer track SIN redir para usar PROXY+Range y sonar ya;
      // el resto con redir=0 acá (mantenemos lo tuyo)
      url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=0`,
      title: s.title,
      artist: (s as any).artistName ?? s.artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,     // ← añade tipo explícito
      contentType: "audio/mp4",    // ← MIME correcto
    }));

    // asegurar startIndex válido
    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));

    const resolvedUrl = `${BASE_URL}/music/play?id=${encodeURIComponent(list[idx].id)}&redir=2`;

    const firstTrack = {
      id: String(list[idx].id),
      url: resolvedUrl,
      title: list[idx].title || "Unknown",
      artist: (list[idx] as any).artistName ?? list[idx].artist ?? "Unknown",
      artwork: (list[idx] as any).thumbnail ?? (list[idx] as any).thumbnail_url ?? undefined,

      // 👇 usar enum correcto en lugar de string
      type: TrackType.Default,
      contentType: "audio/mp4",
    };

    syncingRef.current = true;
    try {
      await TrackPlayer.reset();
      console.log("[RNTP] firstTrack.url =", firstTrack.url);
      await TrackPlayer.add([firstTrack]);
      await TrackPlayer.play();
    } finally {
      syncingRef.current = false;
    }

    // --- 3) en background, hidratar el resto de la cola ---
    (async () => {
      try {
        const before = tracks.slice(0, idx);
        const after = tracks.slice(idx + 1);

        if (before.length) {
          await TrackPlayer.add(before, 0);
        }
        if (after.length) {
          await TrackPlayer.add(after);
        }
      } catch {
        // no rompas el primer play si falla la hidratación
      }
    })();
  }

  function playFromList(list: Song[], startIndex: number, source?: PlaySource) {
    setQueue(list);
    setQueueIndex(startIndex);
    setCurrentSong(list[startIndex] ?? null);
    setPlaySource(source ?? { type: "queue", name: null });

    // 1) sincroniza cola mínima (sólo 1er tema)
    // 2) reproduce YA
    // 3) el resto de la cola se agrega en background dentro de syncWithTrackPlayer
    syncWithTrackPlayer(list, startIndex)
      .then(() => TrackPlayer.play())
      .catch((err) => {
        console.error("[RNTP] error en syncWithTrackPlayer:", err);
      });
  }

  function next() {
    setQueueIndex((i) => {
      if (i < 0) return i;
      const ni = i + 1;
      if (ni < queue.length) {
        setCurrentSong(queue[ni]);
        return ni;
      }
      return i;
    });
    TrackPlayer.skipToNext().catch(() => {});
  }

  function prev() {
    setQueueIndex((i) => {
      if (i <= 0) return i;
      const ni = i - 1;
      setCurrentSong(queue[ni]);
      return ni;
    });
    TrackPlayer.skipToPrevious().catch(() => {});
  }

  // Mantener provider en sync con cambios externos (lockscreen / fin de tema)
  useEffect(() => {
    // Helper: encontrar índice del track activo por ID (no por índice interno del player)
    const findActiveIndex = async (): Promise<number | null> => {
      try {
        const getActiveTrack = (TrackPlayer as any).getActiveTrack?.bind(TrackPlayer);
        const getCurrentTrack = (TrackPlayer as any).getCurrentTrack?.bind(TrackPlayer);
        const getTrack = (TrackPlayer as any).getTrack?.bind(TrackPlayer);

        let active: any = getActiveTrack ? await getActiveTrack() : null;

        // Compat: si solo tenemos índice, resolvemos el objeto
        if (!active && getCurrentTrack) {
          const idx = await getCurrentTrack();
          if (typeof idx === "number" && idx >= 0 && getTrack) {
            active = await getTrack(idx);
          }
        }

        const activeId = active?.id ?? null;
        if (!activeId) return null;

        const pos = queue.findIndex((s) => String(s.id) === String(activeId));
        return pos >= 0 ? pos : null;
      } catch {
        return null;
      }
    };

    const onActiveChanged = async () => {
      if (syncingRef.current) return; // ignorar durante hydration
      const pos = await findActiveIndex();
      if (pos == null) return;
      setQueueIndex((prev) => (prev !== pos ? pos : prev));
      setCurrentSong((prev) => (queue[pos] && prev?.id !== queue[pos].id ? queue[pos] : prev));
    };

    const subActive = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveChanged);

    const subEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (syncingRef.current) return;
      if (queue.length) {
        setQueueIndex(queue.length - 1);
        setCurrentSong(queue[queue.length - 1] ?? null);
      }
    });

    // Compat para builds que emiten este evento
    const subLegacy = TrackPlayer.addEventListener(Event.PlaybackTrackChanged as any, onActiveChanged);

    return () => {
      subActive.remove();
      subEnded.remove();
      subLegacy.remove();
    };
  }, [queue]);

  const value = useMemo(
    () => ({
      currentSong,
      setCurrentSong,
      queue,
      queueIndex,
      playFromList,
      next,
      prev,
      playSource,
    }),
    [currentSong, queue, queueIndex, playSource]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}