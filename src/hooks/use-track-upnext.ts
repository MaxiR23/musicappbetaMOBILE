import { useEffect, useRef, useState } from "react";

interface UseTrackUpNextParams {
  currentSong: any;
  playSource: any;
  getTrackUpNext: (id: string) => Promise<any>;
}

/**
 * Hook para manejar la cola/queue de autoplay
 * 🔑 CLAVE: Se carga UNA VEZ por contexto (playlist/album) y se mantiene
 */
export function useTrackUpNext({
  currentSong,
  playSource,
  getTrackUpNext,
}: UseTrackUpNextParams) {
  const [upNextOpen, setUpNextOpen] = useState(false);
  const [upNextData, setUpNextData] = useState<any>(null);
  const [upNextLoading, setUpNextLoading] = useState(false);
  const [upNextError, setUpNextError] = useState<string | null>(null);

  // 🆕 Ref para trackear el contexto actual
  const currentContextRef = useRef<string | null>(null);

  // Siempre mostramos Up Next
  const shouldShowUpNext = true;

  const fetchUpNext = async () => {
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
  };

  const toggleUpNext = async () => {
    const next = !upNextOpen;
    setUpNextOpen(next);

    if (next && upNextData == null && !upNextLoading) {
      await fetchUpNext();
    }
  };

  // 🔑 CLAVE: Solo resetear cuando CAMBIA EL CONTEXTO (no la canción)
  useEffect(() => {
    // Crear un ID único del contexto basado en playSource
    const contextId = playSource?.type 
      ? `${playSource.type}-${playSource.name || 'unknown'}` 
      : null;

    // Si cambió el contexto, resetear todo
    if (contextId && contextId !== currentContextRef.current) {
      console.log('🔄 Contexto cambió:', currentContextRef.current, '→', contextId);
      console.log('🔄 Reseteando Up Next...');
      
      currentContextRef.current = contextId;
      
      // Reset todo
      setUpNextOpen(false);
      setUpNextData(null);
      setUpNextError(null);
      setUpNextLoading(false);
    } else if (contextId) {
      console.log('✅ Mismo contexto, manteniendo Up Next:', contextId);
    }
  }, [playSource?.type, playSource?.name]);

  // 🆕 NO resetear cuando cambia la canción (solo cuando cambia el contexto)
  // Por eso NO tenemos useEffect con currentSong?.id como dependencia

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