// hooks/use-track-lyrics.ts
import { useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";

interface UseTrackLyricsParams {
  currentSong: any;
  getTrackLyrics: (id: string) => Promise<any>;
  setPanLocked: (locked: boolean) => void;
}

/**
 * Hook para manejar la carga y visualización de letras de canciones
 * Incluye estados de loading, error y control del scroll
 */
export function useTrackLyrics({
  currentSong,
  getTrackLyrics,
  setPanLocked,
}: UseTrackLyricsParams) {
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // Fetch lyrics desde el API
  const fetchLyrics = async () => {
    if (!currentSong?.id) return;

    setLyricsLoading(true);
    setLyricsError(null);

    try {
      const res = await getTrackLyrics(String(currentSong.id));
      
      if (!res?.ok || !res?.lyrics) {
        setLyricsText(null);
        setLyricsError("No hay letras para este tema.");
      } else {
        const txt = String(res.lyrics).replace(/\r\n/g, "\n").trim();
        setLyricsText(txt || null);
      }
    } catch {
      setLyricsText(null);
      setLyricsError("No se pudieron cargar las letras.");
    } finally {
      setLyricsLoading(false);
    }
  };

  // Toggle mostrar/ocultar lyrics
  const toggleLyrics = async () => {
    const next = !lyricsOpen;
    setLyricsOpen(next);

    // Si se está abriendo y no hay letras cargadas, fetchear
    if (next && lyricsText == null && !lyricsLoading) {
      await fetchLyrics();
    }

    // Si se está cerrando, resetear scroll y desbloquear pan
    if (!next) {
      setPanLocked(false);
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  // Reset cuando cambia la canción
  useEffect(() => {
    setLyricsOpen(false);
    setLyricsText(null);
    setLyricsError(null);
    setLyricsLoading(false);
    setPanLocked(false);
  }, [currentSong?.id, setPanLocked]);

  return {
    lyricsOpen,
    lyricsText,
    lyricsLoading,
    lyricsError,
    mainScrollRef,
    toggleLyrics,
    fetchLyrics,
  };
}