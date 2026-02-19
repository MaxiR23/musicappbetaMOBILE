import { useCallback, useEffect, useState } from "react";
interface UseTrackRelatedParams {
  currentSong: any;
  playSource: any;
  getTrackRelated: (id: string) => Promise<any>;
}

export function useTrackRelated({
  currentSong,
  playSource,
  getTrackRelated,
}: UseTrackRelatedParams) {
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const shouldFetch = true;

  const fetchRelated = useCallback(async () => {
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
  }, [currentSong?.id, getTrackRelated, shouldFetch]);

  const toggleRelated = async () => {
    const next = !relatedOpen;
    setRelatedOpen(next);

    if (next && relatedData == null && !relatedLoading) {
      await fetchRelated();
    }
  };

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