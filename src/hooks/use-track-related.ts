import { useEffect, useState } from "react";

interface UseTrackRelatedParams {
  currentSong: any;
  playSource: any;
  getTrackRelated: (id: string) => Promise<any>;
}

/**
 * Hook para manejar canciones relacionadas
 * Solo se carga cuando playSource es null (búsqueda sin contexto)
 */
export function useTrackRelated({
  currentSong,
  playSource,
  getTrackRelated,
}: UseTrackRelatedParams) {
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  // Solo fetcheamos si NO hay contexto (búsqueda directa)
  /* const shouldFetch = !playSource?.type || playSource?.type === "queue"; */
  const shouldFetch = true; //mostramos siempre.

  const fetchRelated = async () => {
    if (!currentSong?.id || !shouldFetch) return;

    setRelatedLoading(true);
    setRelatedError(null);

    try {
      const res = await getTrackRelated(String(currentSong.id));
      
      if (!res?.ok || !res?.related) {
        setRelatedData(null);
        setRelatedError("No hay canciones relacionadas.");
      } else {
        setRelatedData(res.related);
      }
    } catch {
      setRelatedData(null);
      setRelatedError("No se pudieron cargar canciones relacionadas.");
    } finally {
      setRelatedLoading(false);
    }
  };

  const toggleRelated = async () => {
    const next = !relatedOpen;
    setRelatedOpen(next);

    if (next && relatedData == null && !relatedLoading) {
      await fetchRelated();
    }
  };

  // Reset cuando cambia la canción
  useEffect(() => {
    setRelatedOpen(false);
    setRelatedData(null);
    setRelatedError(null);
    setRelatedLoading(false);
  }, [playSource]);

  return {
    relatedOpen,
    relatedData,
    relatedLoading,
    relatedError,
    toggleRelated,
    shouldShowRelated: shouldFetch,
    fetchRelated
  };
}