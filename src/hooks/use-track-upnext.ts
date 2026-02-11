import { useCallback, useEffect, useRef, useState } from "react";

interface UseTrackUpNextParams {
  currentSong: any;
  playSource: any;
  getTrackUpNext: (id: string) => Promise<any>;
}

export function useTrackUpNext({
  currentSong,
  playSource,
  getTrackUpNext,
}: UseTrackUpNextParams) {
  const [upNextOpen, setUpNextOpen] = useState(false);
  const [upNextData, setUpNextData] = useState<any>(null);
  const [upNextLoading, setUpNextLoading] = useState(false);
  const [upNextError, setUpNextError] = useState<string | null>(null);

  const currentContextRef = useRef<string | null>(null);

  const shouldShowUpNext = true;

  const fetchUpNext = useCallback(async () => {
    if (!currentSong?.id) return;

    setUpNextLoading(true);
    setUpNextError(null);

    try {
      const res = await getTrackUpNext(String(currentSong.id));
      
      if (!res?.ok || !res?.upNext) {
        setUpNextData(null);
        setUpNextError("No hay cola disponible.");
      } else {
        console.log('✅ Up Next cargado:', res.upNext.length, 'canciones');
        setUpNextData(res);
      }
    } catch {
      setUpNextData(null);
      setUpNextError("No se pudo cargar la cola.");
    } finally {
      setUpNextLoading(false);
    }
  }, [currentSong?.id, getTrackUpNext]);

  const toggleUpNext = async () => {
    const next = !upNextOpen;
    setUpNextOpen(next);

    if (next && upNextData == null && !upNextLoading) {
      await fetchUpNext();
    }
  };

  useEffect(() => {
    const contextId = playSource?.type 
      ? `${playSource.type}-${playSource.name || 'unknown'}` 
      : null;

    if (contextId && contextId !== currentContextRef.current) {
      console.log('🔄 Contexto cambió:', currentContextRef.current, '→', contextId);
      console.log('🔄 Reseteando Up Next...');
      
      currentContextRef.current = contextId;
      
      setUpNextOpen(false);
      setUpNextData(null);
      setUpNextError(null);
      setUpNextLoading(false);
    } else if (contextId) {
      console.log('✅ Mismo contexto, manteniendo Up Next:', contextId);
    }
  }, [playSource?.type, playSource?.name]);

  return {
    upNextOpen,
    upNextData,
    upNextLoading,
    upNextError,
    toggleUpNext,
    shouldShowUpNext,
    fetchUpNext 
  };
}