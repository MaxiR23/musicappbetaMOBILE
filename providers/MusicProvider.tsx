import { useAuth } from "@/hooks/use-auth";
import Constants from "expo-constants";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, RepeatMode, TrackType } from "react-native-track-player";
import { useCacheInvalidation } from "../hooks/use-cache-invalidation";
import { useMusicApi } from "../hooks/use-music-api";
import { ensureTrackPlayer } from "../services/setupTrackPlayer";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playSource, setPlaySource] = useState<PlaySource | null>(null);
  const [originalQueueSize, setOriginalQueueSize] = useState<number>(0);
  const [initialQueueSize, setInitialQueueSize] = useState<number>(0);

  const autoplayProviderRef = useRef<(() => Song | null) | null>(null);
  const isAutoplayEnabledRef = useRef<(() => boolean) | null>(null);
  const playedAutoplayIdsRef = useRef<Set<string>>(new Set());

  const lastProcessedTrackRef = useRef<string | null>(null);

  const [isShuffled, setIsShuffled] = useState(false);
  const [originalQueueBeforeShuffle, setOriginalQueueBeforeShuffle] = useState<Song[]>([]);
  const [originalIndexBeforeShuffle, setOriginalIndexBeforeShuffle] = useState<number>(-1);

  const { user } = useAuth();
  const userId = user?.id ?? undefined;

  const { logPlayAlbum, logPlayArtist, logPlayTrack, logPlayPlaylist } = useMusicApi();
  const { invalidateRecent } = useCacheInvalidation(userId);

  const syncingRef = useRef(false);
  const switchingRef = useRef(false);
  const lastLoggedContextKeyRef = useRef<string | null>(null);
  const lastLoggedTrackIdRef = useRef<string | null>(null);
  const listenTimeRef = useRef<{ trackId: string; accumulated: number; lastPosition: number } | null>(null);
  const endingRef = useRef(false);

  // Refs para mantener valores actualizados en callbacks
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef<number>(-1);
  const originalQueueSizeRef = useRef<number>(0);

  type PlaySource =
    | { type: "playlist"; name?: string | null; thumb?: string | null }
    | { type: "album"; name?: string | null; thumb?: string | null }
    | { type: "artist"; name?: string | null; thumb?: string | null }
    | { type: "queue"; name?: string | null; thumb?: string | null }
    | { type: "related"; id: string; name?: string | null; thumb?: string | null }
    | { type: "search"; id: string; name?: string | null; thumb?: string | null };

  function getBaseUrl() {
    return (
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
      ((Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
      null
    );
  }

  function warmBatch(ids: string[], baseUrl: string) { return; }

  function majorityId<T>(list: T[], pick: (x: T) => string | null | undefined): string | null {
    const counts = new Map<string, number>();
    for (const item of list) {
      const v = pick(item);
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
    return best;
  }

  function resolveContextKey(
    list: Song[],
    source?: PlaySource | null
  ): { key: string; kind: "album" | "artist" | "playlist"; id: string } | null {
    if (!source) return null;
    if (source.type === "album") {
      const album_id =
        majorityId(list, (s: any) => s.album_id ?? s.album_id ?? null) || null;
      return album_id ? { key: `album:${album_id}`, kind: "album", id: album_id } : null;
    }
    if (source.type === "artist") {
      const artist_id =
        majorityId(list, (s: any) => s.artist_id ?? s.artist_id ?? null) || null;
      return artist_id ? { key: `artist:${artist_id}`, kind: "artist", id: artist_id } : null;
    }
    if (source.type === "playlist") {
      const pid = (source as any).id;
      return pid ? { key: `playlist:${pid}`, kind: "playlist", id: pid } : null;
    }
    return null;
  }

  async function syncWithTrackPlayer(list: Song[], startIndex: number) {
    await ensureTrackPlayer();

    const BASE_URL = getBaseUrl();
    if (!BASE_URL || !list?.length) return;

    const idx = Math.max(0, Math.min(startIndex, list.length - 1));

    const currentTrack = {
      id: String(list[idx].id),
      url: `${BASE_URL}/music/play?id=${encodeURIComponent(list[idx].id)}&redir=2`,
      title: (list[idx] as any).title,
      artist: (list[idx] as any).artist_name ?? (list[idx] as any).artist ?? "",
      artwork: (list[idx] as any).thumbnail ?? (list[idx] as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      headers: {
        Range: "bytes=0-",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
    } as any;

    syncingRef.current = true;
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(currentTrack);
      TrackPlayer.play().catch(() => { });

      setTimeout(async () => {
        try {
          const beforeTracks = list.slice(0, idx).map((s) => ({
            id: String(s.id),
            url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
            title: (s as any).title,
            artist: (s as any).artist_name ?? (s as any).artist ?? "",
            artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
            type: TrackType.Default,
            headers: { Range: "bytes=0-", "Accept-Encoding": "identity", Connection: "keep-alive" },
          })) as any[];

          const afterTracks = list.slice(idx + 1).map((s) => ({
            id: String(s.id),
            url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
            title: (s as any).title,
            artist: (s as any).artist_name ?? (s as any).artist ?? "",
            artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
            type: TrackType.Default,
            headers: { Range: "bytes=0-", "Accept-Encoding": "identity", Connection: "keep-alive" },
          })) as any[];

          if (beforeTracks.length > 0) await TrackPlayer.add(beforeTracks, 0);
          if (afterTracks.length > 0) await TrackPlayer.add(afterTracks);
        } catch { }
      }, 50);

    } catch (e) {
      console.error("[sync] ERROR:", e);
      throw e;
    } finally {
      syncingRef.current = false;
    }
  }

  async function playFromList(list: Song[], startIndex: number, source?: PlaySource) {
    if (switchingRef.current) return;
    switchingRef.current = true;

    playedAutoplayIdsRef.current.clear();

    const ctx = resolveContextKey(list, source);
    const isSameContext = ctx && lastLoggedContextKeyRef.current === ctx.key;

    // Actualizar refs primero (para que el listener tenga valores correctos)
    queueRef.current = list;
    queueIndexRef.current = startIndex;
    originalQueueSizeRef.current = list.length;

    // Reproducir
    try {
      if (isSameContext) {
        await ensureTrackPlayer();
        await TrackPlayer.skip(startIndex);
        await TrackPlayer.play();
      } else {
        await syncWithTrackPlayer(list, startIndex);
      }
    } catch (err) {
      console.error("[RNTP] error:", err);
      switchingRef.current = false;
      return;
    }

    // Actualizar estados (disparan efectos y re-sincronizan refs via useEffect)
    setQueue(list);
    setQueueIndex(startIndex);
    setCurrentSong(list[startIndex] ?? null);
    setOriginalQueueSize(list.length);
    setInitialQueueSize(list.length);

    try {
      setPlaySource(
        source
          ? { ...source, id: ctx?.id ?? null }
          : { type: "queue", id: null, name: null, thumb: null }
      );
      if (ctx) {
        if (!isSameContext) {
          lastLoggedContextKeyRef.current = ctx.key;
          const srcMeta = { name: source?.name ?? null, thumb: source?.thumb ?? null };
          if (ctx.kind === "album") {
            logPlayAlbum(ctx.id, srcMeta).catch(() => { });
          } else if (ctx.kind === "artist") {
            logPlayArtist(ctx.id, srcMeta).catch(() => { });
          } else if (ctx.kind === "playlist") {
            logPlayPlaylist(ctx.id, srcMeta).catch(() => { });
          }

          setTimeout(async () => {
            try {
              await invalidateRecent();
            } catch (e) {
              console.warn("[cache] Error invalidando:", e);
            }
          }, 2000);

        } else {
          console.log("[tracklog] same context, skip log:", ctx.key);
        }
      }
    } catch (e) {
      console.warn("[tracklog] logging failed:", e);
    } finally {
      switchingRef.current = false;
    }
  }

  // Reproducir canción desde Related (borra queue y crea nueva)
  async function playFromRelated(song: Song) {
    if (switchingRef.current) return;
    switchingRef.current = true;
    //DBG
    //console.log('Reproduciendo desde Related:', song.title);
    //console.log('Borrando queue anterior y creando nueva');

    // Resetear autoplay reproducidos
    playedAutoplayIdsRef.current.clear();

    const newQueue = [song];

    setQueue(newQueue);
    setQueueIndex(0);
    setCurrentSong(song);
    setOriginalQueueSize(1);
    setInitialQueueSize(1);

    lastLoggedContextKeyRef.current = null;

    try {

      setPlaySource({ type: "related", id: String(song.id), name: "Recommended", thumb: null });
      await syncWithTrackPlayer(newQueue, 0);

      console.log('Reproducción desde Related iniciada');
    } catch (err) {
      console.error("[RNTP] error en syncWithTrackPlayer:", err);
    } finally {
      switchingRef.current = false;
    }
  }

  async function playFromSearch(song: Song) {
    if (switchingRef.current) return;
    switchingRef.current = true;

    playedAutoplayIdsRef.current.clear();

    const newQueue = [song];

    queueRef.current = newQueue;
    queueIndexRef.current = 0;
    originalQueueSizeRef.current = 1;

    setQueue(newQueue);
    setQueueIndex(0);
    setCurrentSong(song);
    setOriginalQueueSize(1);
    setInitialQueueSize(1);
    setPlaySource({ type: "search", id: String(song.id), name: (song as any).title ?? null, thumb: null });

    lastLoggedContextKeyRef.current = null;

    try {
      await syncWithTrackPlayer(newQueue, 0);
    } catch (err) {
      console.error("[playFromSearch] error:", err);
    } finally {
      switchingRef.current = false;
    }
  }

  //CASO 1: Click manual en autoplay (agrega y reproduce inmediatamente)
  async function addToQueueAndPlay(song: Song) {
    console.log('[CASO 1] Click en autoplay:', song.title);

    // Verificar si ya existe
    const alreadyExists = queue.some(s => String(s.id) === String(song.id));
    if (alreadyExists) {
      console.log('Canción ya existe en cola');
      return;
    }

    // Marcar como reproducida desde autoplay
    playedAutoplayIdsRef.current.add(String(song.id));

    const insertPosition = originalQueueSize;

    // Agregar la canción en la posición correcta
    const newQueue = [...queue];
    newQueue.splice(insertPosition, 0, song);

    setQueue(newQueue);
    setOriginalQueueSize(originalQueueSize + 1);

    console.log('Nueva cola:', newQueue.map(s => (s as any).title));
    console.log('originalQueueSize:', originalQueueSize, '→', originalQueueSize + 1);

    // RE-SINCRONIZAR TrackPlayer completamente
    try {
      syncingRef.current = true;
      await syncWithTrackPlayer(newQueue, insertPosition);
      console.log('TrackPlayer re-sincronizado y reproduciendo en posición', insertPosition);
    } catch (e) {
      console.error('[addToQueueAndPlay] ERROR:', e);
    } finally {
      syncingRef.current = false;
    }
  }

  async function next() {
    if (queueIndex < 0) return;
    const ni = queueIndex + 1;

    // Si hay siguiente canción en el queue, reproducirla
    if (ni < queue.length) {
      setQueueIndex(ni);
      setCurrentSong(queue[ni]);

      try {
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      } catch (e) {
        console.error("[next] ERROR:", e);
      }
      return;
    }

    // CASO 2: Autoplay automático al terminar la última canción
    if (isAutoplayEnabled() && autoplayProviderRef.current) {
      let nextAutoplaySong = autoplayProviderRef.current();

      // Buscar una canción que no haya sido reproducida
      let attempts = 0;
      while (nextAutoplaySong && playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id)) && attempts < 10) {
        console.log('Canción ya reproducida, buscando otra...');
        nextAutoplaySong = autoplayProviderRef.current();
        attempts++;
      }

      if (nextAutoplaySong && !playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id))) {
        console.log('[CASO 2] Agregando autoplay automático:', nextAutoplaySong.title);

        // Marcar como reproducida
        playedAutoplayIdsRef.current.add(String(nextAutoplaySong.id));

        // Agregar AL FINAL (tanto en state como en TrackPlayer)
        const newQueue = [...queue, nextAutoplaySong];
        const newIndex = queue.length;

        setQueue(newQueue);
        setOriginalQueueSize(originalQueueSize + 1);
        setQueueIndex(newIndex);
        setCurrentSong(nextAutoplaySong);

        try {
          // Agregar al final de TrackPlayer
          await TrackPlayer.add({
            id: String(nextAutoplaySong.id),
            url: `${getBaseUrl()}/music/play?id=${encodeURIComponent(nextAutoplaySong.id)}&redir=2`,
            title: (nextAutoplaySong as any).title,
            artist: (nextAutoplaySong as any).artist_name ?? "",
            artwork: (nextAutoplaySong as any).thumbnail ?? undefined,
            type: TrackType.Default,
            headers: {
              Range: "bytes=0-",
              "Accept-Encoding": "identity",
              Connection: "keep-alive",
            },
          } as any);

          // Ir al siguiente (que es la canción que acabamos de agregar)
          await TrackPlayer.skipToNext();
          await TrackPlayer.play();

          console.log('Autoplay automático agregado en posición', newIndex);
        } catch (e) {
          console.error("[next] ERROR agregando autoplay:", e);
        }
        return;
      }
    }

    console.log('Última canción, sin autoplay');
  }

  async function skipToIndex(index: number) {
    if (index < 0 || index >= queue.length) {
      console.warn('[skipToIndex] índice fuera de rango:', index);
      return;
    }

    setQueueIndex(index);
    setCurrentSong(queue[index]);

    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch (e) {
      console.error('[skipToIndex] ERROR:', e);
    }
  }

  function setAutoplayProvider(provider: (() => Song | null) | null) {
    autoplayProviderRef.current = provider;
  }

  function setIsAutoplayEnabledCallback(callback: (() => boolean) | null) {
    isAutoplayEnabledRef.current = callback;
  }

  function isAutoplayEnabled(): boolean {
    return isAutoplayEnabledRef.current?.() ?? false;
  }

  async function prev() {
    if (queueIndex < 0) return;

    try {
      const position = await TrackPlayer.getPosition();

      if (position > 3) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        return;
      }
    } catch (e) {
      console.error("[prev] ERROR obteniendo posición:", e);
    }

    const ni = queueIndex - 1;

    if (ni < 0) {
      try {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } catch (e) {
        console.error("[prev] ERROR (seekTo 0):", e);
      }
      return;
    }

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (e) {
      console.error("[prev] ERROR (skipToPrevious):", e);
    }
  }

  // Dentro de MusicProvider, después de la función prev()
  async function toggleShuffle() {
    if (originalQueueSize <= 1) {
      console.log('[SHUFFLE] No hay suficientes temas para shuffle');
      return;
    }

    const currentSongId = currentSong?.id;
    if (!currentSongId) {
      console.warn('[SHUFFLE] No hay canción actual');
      return;
    }

    // ======== DESACTIVAR SHUFFLE ========
    if (isShuffled) {
      console.log('[SHUFFLE OFF] Restaurando orden original...');

      // Encontrar la canción actual en la queue original
      const currentSongIndexInOriginal = originalQueueBeforeShuffle.findIndex(
        (s) => s.id === currentSongId
      );

      if (currentSongIndexInOriginal === -1) {
        console.warn('[SHUFFLE OFF] No se encontró la canción en la queue original');
        return;
      }

      console.log('[SHUFFLE OFF] Canción actual está en posición original:', currentSongIndexInOriginal);

      // Restaurar estados
      setQueue(originalQueueBeforeShuffle);
      setQueueIndex(currentSongIndexInOriginal);
      setIsShuffled(false);

      // Sincronizar TrackPlayer sin cortes
      try {
        switchingRef.current = true;
        await ensureTrackPlayer();
        const BASE_URL = getBaseUrl();
        if (!BASE_URL) return;

        syncingRef.current = true;

        // Obtener índice actual
        const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();

        // Remover todas las pistas excepto la actual
        const allTracks = await TrackPlayer.getQueue();
        const indicesToRemove = allTracks
          .map((_, idx) => idx)
          .filter(idx => idx !== currentTrackIndex);

        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          await TrackPlayer.remove(indicesToRemove[i]);
        }

        // Agregar pistas ANTES de la actual (en orden inverso)
        const tracksBeforeCurrent = originalQueueBeforeShuffle
          .slice(0, currentSongIndexInOriginal)
          .reverse() // Invertir para agregar de atrás hacia adelante
          .map((s) => ({
            id: String(s.id),
            url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
            title: (s as any).title,
            artist: (s as any).artist_name ?? (s as any).artist ?? "",
            artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
            type: TrackType.Default,
            headers: {
              Range: "bytes=0-",
              "Accept-Encoding": "identity",
              Connection: "keep-alive",
            },
          })) as any[];

        // Agregar ANTES de la actual (índice 0 = antes de la pista actual)
        for (const track of tracksBeforeCurrent) {
          await TrackPlayer.add(track, 0);
        }

        // Agregar pistas DESPUÉS de la actual
        const tracksAfterCurrent = originalQueueBeforeShuffle
          .slice(currentSongIndexInOriginal + 1)
          .map((s) => ({
            id: String(s.id),
            url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
            title: (s as any).title,
            artist: (s as any).artist_name ?? (s as any).artist ?? "",
            artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
            type: TrackType.Default,
            headers: {
              Range: "bytes=0-",
              "Accept-Encoding": "identity",
              Connection: "keep-alive",
            },
          })) as any[];

        // Agregar DESPUÉS de la actual
        if (tracksAfterCurrent.length > 0) {
          await TrackPlayer.add(tracksAfterCurrent);
        }

        console.log('[SHUFFLE OFF] Orden original restaurado');
      } catch (e) {
        console.error('[SHUFFLE OFF] Error:', e);
      } finally {
        syncingRef.current = false;
        switchingRef.current = false;
      }

      return;
    }

    // ======== ACTIVAR SHUFFLE ========
    console.log('[SHUFFLE ON] Mezclando temas originales...');
    console.log('[SHUFFLE ON] Original size:', originalQueueSize, 'Total:', queue.length);

    // Guardar estado original ANTES de mezclar
    setOriginalQueueBeforeShuffle([...queue]);
    setOriginalIndexBeforeShuffle(queueIndex);

    // Separar originales y autoplay
    const originalTracks = queue.slice(0, originalQueueSize);
    const autoplayTracks = queue.slice(originalQueueSize);

    // Mezclar solo originales (sin la actual)
    const otherOriginalTracks = originalTracks.filter((s) => s.id !== currentSongId);

    for (let i = otherOriginalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherOriginalTracks[i], otherOriginalTracks[j]] = [otherOriginalTracks[j], otherOriginalTracks[i]];
    }

    // Nueva queue: actual + mezclados + autoplay
    const shuffledQueue = [currentSong, ...otherOriginalTracks, ...autoplayTracks];

    setQueue(shuffledQueue);
    setQueueIndex(0);
    setIsShuffled(true);

    // Sincronizar TrackPlayer sin cortes
    try {
      switchingRef.current = true;
      await ensureTrackPlayer();
      const BASE_URL = getBaseUrl();
      if (!BASE_URL) return;

      syncingRef.current = true;

      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      const allTracks = await TrackPlayer.getQueue();
      const indicesToRemove = allTracks
        .map((_, idx) => idx)
        .filter(idx => idx !== currentTrackIndex);

      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        await TrackPlayer.remove(indicesToRemove[i]);
      }

      const tracksToAdd = shuffledQueue
        .slice(1)
        .map((s) => ({
          id: String(s.id),
          url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
          title: (s as any).title,
          artist: (s as any).artist_name ?? (s as any).artist ?? "",
          artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
          type: TrackType.Default,
          headers: {
            Range: "bytes=0-",
            "Accept-Encoding": "identity",
            Connection: "keep-alive",
          },
        })) as any[];

      if (tracksToAdd.length > 0) {
        await TrackPlayer.add(tracksToAdd);
      }

      console.log('[SHUFFLE ON] Queue mezclada');
    } catch (e) {
      console.error('[SHUFFLE ON] Error:', e);
    } finally {
      syncingRef.current = false;
      switchingRef.current = false;
    }
  }

  // Sincronizar refs con estados
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    originalQueueSizeRef.current = originalQueueSize;
  }, [originalQueueSize]);

  useEffect(() => {
    const findActiveIndex = async (): Promise<number | null> => {
      try {
        const getActiveTrack = (TrackPlayer as any).getActiveTrack?.bind(TrackPlayer);
        const getCurrentTrack = (TrackPlayer as any).getCurrentTrack?.bind(TrackPlayer);
        const getTrack = (TrackPlayer as any).getTrack?.bind(TrackPlayer);

        let active: any = getActiveTrack ? await getActiveTrack() : null;
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
      if (syncingRef.current) return;
      const pos = await findActiveIndex();
      if (pos == null) return;

      const newTrackId = queue[pos] ? String(queue[pos].id) : null;
      const prevTrackId = currentSong ? String(currentSong.id) : null;

      // DEBOUNCE: Si es el mismo track que acabamos de procesar, skip
      if (newTrackId === lastProcessedTrackRef.current) return;

      // Si cambió de track, resetear el log para permitir nuevo conteo
      if (newTrackId && newTrackId !== prevTrackId) {
        lastLoggedTrackIdRef.current = null;
        console.log('[tracklog] Track cambió, reseteando log para permitir nuevo conteo');
      }

      setQueueIndex((prev) => (prev !== pos ? pos : prev));
      setCurrentSong((prev) => (queue[pos] && prev?.id !== queue[pos].id ? queue[pos] : prev));

      try {
        const BASE_URL = getBaseUrl();
        const nexts = queue.slice(pos + 1, pos + 6).map((s) => String(s.id));
        if (BASE_URL && nexts.length) {
          warmBatch(nexts, BASE_URL);
          console.log("[prefetch] warm next batch:", nexts);
        }
      } catch (e) {
        console.warn("[prefetch] warm next failed:", e);
      }
    };

    const subActive = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveChanged);

    // Listener para tracking de tiempo de reproducción REAL (30 segundos acumulados)
    const subProgress = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (progress) => {
      const pos = queueIndexRef.current;
      if (pos < 0) return;

      const trackToLog = queueRef.current[pos];
      if (!trackToLog) return;

      const trackId = String(trackToLog.id);
      const currentPosition = progress.position;

      // Si cambió de canción, reiniciar acumulador
      if (!listenTimeRef.current || listenTimeRef.current.trackId !== trackId) {
        listenTimeRef.current = { trackId, accumulated: 0, lastPosition: currentPosition };
        return;
      }

      const delta = currentPosition - listenTimeRef.current.lastPosition;

      // Solo acumular si el delta es de reproducción normal (entre 0 y ~3s)
      const isNormalPlayback = delta > 0 && delta < 3;

      if (isNormalPlayback) {
        listenTimeRef.current.accumulated += delta;
      } else {
        console.log(`[tracklog] Seek detectado (delta: ${delta.toFixed(2)}s), no se acumula`);
      }

      listenTimeRef.current.lastPosition = currentPosition;

      // Verificar si acumuló 30 segundos REALES
      if (listenTimeRef.current.accumulated >= 30) {
        const alreadyLogged = lastLoggedTrackIdRef.current === trackId;

        if (!alreadyLogged) {
          console.log(`[tracklog] 30s reales acumulados para: ${trackId}`);
          lastLoggedTrackIdRef.current = trackId;

          const trackContext = {
            album_id: (trackToLog as any).album_id,
            album_name: (trackToLog as any).album_name,
            artist_id: (trackToLog as any).artist_id,
            artist_name: (trackToLog as any).artist_name,
            track_name: (trackToLog as any).title,
            duration_seconds: (trackToLog as any).duration_seconds,
            thumbnail_url: (trackToLog as any).thumbnail ?? (trackToLog as any).thumbnail_url ?? null,
          };

          logPlayTrack(trackId, trackContext).catch(() => { });
          //DBG: CHECK TRACK console.log("[duration-check] trackToLog json =", JSON.stringify(trackToLog, null, 2));
          console.log("[tracklog] track logged after 30s real:", trackId, trackContext);
        }
      }
    });

    // CASO 2: Evento cuando termina la cola
    const subEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (syncingRef.current) return;
      if (endingRef.current) return;
      endingRef.current = true;

      try {
        console.log('PlaybackQueueEnded disparado - verificando autoplay...');

        // Verificar si hay autoplay disponible
        if (isAutoplayEnabledRef.current && autoplayProviderRef.current) {
          const isEnabled = isAutoplayEnabledRef.current();

          if (isEnabled) {
            let nextAutoplaySong = autoplayProviderRef.current();

            // Buscar una canción que no haya sido reproducida
            let attempts = 0;
            while (nextAutoplaySong && playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id)) && attempts < 10) {
              console.log('Canción ya reproducida, buscando otra...');
              nextAutoplaySong = autoplayProviderRef.current();
              attempts++;
            }

            if (nextAutoplaySong && !playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id))) {
              console.log('[CASO 2] Agregando siguiente autoplay:', nextAutoplaySong.title);

              // Marcar como reproducida
              playedAutoplayIdsRef.current.add(String(nextAutoplaySong.id));

              // Usar refs para valores actuales
              const currentQueue = queueRef.current;
              const currentOriginalSize = originalQueueSizeRef.current;

              // Agregar AL FINAL en TrackPlayer
              await TrackPlayer.add({
                id: String(nextAutoplaySong.id),
                url: `${getBaseUrl()}/music/play?id=${encodeURIComponent(nextAutoplaySong.id)}&redir=2`,
                title: (nextAutoplaySong as any).title,
                artist: (nextAutoplaySong as any).artist_name ?? "",
                artwork: (nextAutoplaySong as any).thumbnail ?? undefined,
                type: TrackType.Default,
                headers: {
                  Range: "bytes=0-",
                  "Accept-Encoding": "identity",
                  Connection: "keep-alive",
                },
              } as any);

              // Agregar AL FINAL en state
              const newQueue = [...currentQueue, nextAutoplaySong];
              const newIndex = currentQueue.length;

              setQueue(newQueue);
              setOriginalQueueSize(currentOriginalSize + 1);
              setQueueIndex(newIndex);
              setCurrentSong(nextAutoplaySong);

              // Reproducir la nueva canción
              await TrackPlayer.skipToNext();
              await TrackPlayer.play();

              console.log('Autoplay agregado y reproduciendo en posición', newIndex);
              endingRef.current = false;
              return;
            }
          }
        }

        // Si NO hay autoplay, pausar al final
        console.log('No hay más autoplay, pausando al final');
        const lastIdx = Math.max(0, queue.length - 1);
        const lastSong = queue[lastIdx];
        if (!lastSong) { endingRef.current = false; return; }

        await TrackPlayer.setRepeatMode(RepeatMode.Off).catch(() => { });
        await TrackPlayer.skip(lastIdx).catch(() => { });
        await TrackPlayer.pause().catch(() => { });
        await TrackPlayer.seekTo(0).catch(() => { });

        setQueueIndex(lastIdx);
        setCurrentSong(lastSong);
      } catch (e) {
        console.warn("[ended] Error:", e);
      } finally {
        endingRef.current = false;
      }
    });

    return () => {
      subActive.remove();
      subProgress.remove();
      subEnded.remove();
    };
  }, [queue]);

  const value = useMemo(
    () => ({
      currentSong,
      setCurrentSong,
      queue,
      queueIndex,
      playFromList,
      playFromRelated,
      playFromSearch,
      next,
      skipToIndex,
      prev,
      shuffle: toggleShuffle,
      isShuffled,
      playSource,
      originalQueueSize,
      initialQueueSize,
      addToQueueAndPlay,
      setAutoplayProvider,
      setIsAutoplayEnabledCallback,
      isAutoplayEnabled,
    }),
    [currentSong, queue, queueIndex, playSource, originalQueueSize, initialQueueSize, isShuffled]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}