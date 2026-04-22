// INFO: Sincronización de letras con scheduler basado en setTimeout.
// - Store externo + useSyncExternalStore: el activeIndex vive fuera del render
//   tree, solo el item entrante/saliente re-renderiza, el FlatList nunca.
// - useProgress(1000ms) como ancla; entre polls, posición predicha localmente
//   con baseline + (Date.now() - baselineAt). Recalibra cada poll real.
// - setTimeout programa UN evento exacto en lines[N+1].start_time, en vez de
//   pollear cada 100ms. Es la herramienta correcta para eventos discretos en
//   tiempos conocidos (no setInterval ni rAF, que serían 10-120x más callbacks).
// - Defensas: MIN/MAX timeout, cleanup en unmount/cambio de canción, sin
//   scheduling en pausa, detección de seek por delta vs posición predicha.
//
// SEE:
// - Timers RN:       https://reactnative.dev/docs/timers
// - RNTP hooks:      https://rntp.dev/docs/api/hooks
// - External store:  https://react.dev/reference/react/useSyncExternalStore
import type { LyricLine } from "@/hooks/use-track-lyrics";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { State, usePlaybackState, useProgress } from "react-native-track-player";

const POLL_INTERVAL_MS = 1000;
const SEEK_THRESHOLD_MS = 1500;
const MIN_TIMEOUT_MS = 16;
const MAX_TIMEOUT_MS = 30_000;

function findActiveLineIndex(lines: LyricLine[], positionMs: number): number {
  if (lines.length === 0 || positionMs < lines[0].start_time) return -1;

  let lo = 0;
  let hi = lines.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lines[mid].start_time <= positionMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export class LyricSyncStore {
  private listeners = new Set<() => void>();
  private currentIndex = -1;
  private currentSeekVersion = 0;

  getIndex = (): number => this.currentIndex;
  getSeekVersion = (): number => this.currentSeekVersion;

  setIndex = (next: number): void => {
    if (this.currentIndex === next) return;
    this.currentIndex = next;
    this.emit();
  };

  bumpSeekVersion = (): void => {
    this.currentSeekVersion += 1;
    this.emit();
  };

  reset = (): void => {
    const changed = this.currentIndex !== -1 || this.currentSeekVersion !== 0;
    this.currentIndex = -1;
    this.currentSeekVersion = 0;
    if (changed) this.emit();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export function useLyricSyncStore(): LyricSyncStore {
  const ref = useRef<LyricSyncStore | null>(null);
  if (ref.current === null) {
    ref.current = new LyricSyncStore();
  }
  return ref.current;
}

export function useLyricSyncEngine(
  store: LyricSyncStore,
  lines: LyricLine[] | null
): void {
  const { position } = useProgress(POLL_INTERVAL_MS);
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;

  const baselineMsRef = useRef(0);
  const baselineAtRef = useRef(Date.now());
  const isPlayingRef = useRef(isPlaying);
  const linesRef = useRef<LyricLine[] | null>(lines);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const predictedNow = useCallback((): number => {
    return isPlayingRef.current
      ? baselineMsRef.current + (Date.now() - baselineAtRef.current)
      : baselineMsRef.current;
  }, []);

  const cancelScheduledTick = useCallback((): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNextTick = useCallback((): void => {
    cancelScheduledTick();

    const currentLines = linesRef.current;
    if (!currentLines || currentLines.length === 0) return;
    if (!isPlayingRef.current) return;

    const predictedMs = predictedNow();
    const idx = findActiveLineIndex(currentLines, predictedMs);

    store.setIndex(idx);

    const nextIdx = idx + 1;
    if (nextIdx >= currentLines.length) return;

    const msUntilNext = currentLines[nextIdx].start_time - predictedMs;
    const wait = Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, msUntilNext));

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      scheduleNextTick();
    }, wait);
  }, [predictedNow, cancelScheduledTick, store]);

  useEffect(() => {
    linesRef.current = lines;
    store.reset();
    baselineMsRef.current = 0;
    baselineAtRef.current = Date.now();
    cancelScheduledTick();
    scheduleNextTick();
  }, [lines, store, cancelScheduledTick, scheduleNextTick]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    baselineAtRef.current = Date.now();

    if (isPlaying) {
      scheduleNextTick();
    } else {
      cancelScheduledTick();
      const currentLines = linesRef.current;
      if (currentLines) {
        store.setIndex(findActiveLineIndex(currentLines, predictedNow()));
      }
    }
  }, [isPlaying, scheduleNextTick, cancelScheduledTick, store, predictedNow]);

  useEffect(() => {
    const realMs = position * 1000;
    const predictedMs = predictedNow();
    const delta = Math.abs(realMs - predictedMs);

    baselineMsRef.current = realMs;
    baselineAtRef.current = Date.now();

    if (delta > SEEK_THRESHOLD_MS) {
      store.bumpSeekVersion();
    }

    scheduleNextTick();
  }, [position, predictedNow, scheduleNextTick, store]);

  useEffect(() => {
    return () => {
      cancelScheduledTick();
    };
  }, [cancelScheduledTick]);
}

export function useIsActiveLine(store: LyricSyncStore, index: number): boolean {
  const getSnapshot = useCallback(
    () => store.getIndex() === index,
    [store, index]
  );
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}