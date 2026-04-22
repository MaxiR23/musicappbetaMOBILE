import { useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";

export interface LyricLine {
  text: string;
  start_time: number; // ms
  end_time: number; // ms
  id: number;
}

interface UseTrackLyricsParams {
  currentSong: any;
  getTrackLyrics: (id: string) => Promise<any>;
  setPanLocked: (locked: boolean) => void;
}

/**
 * Hook para manejar la carga y visualizacion de letras de canciones.
 * Soporta lyrics planas (string) y sincronizadas (array de LyricLine).
 */
export function useTrackLyrics({
  currentSong,
  getTrackLyrics,
  setPanLocked,
}: UseTrackLyricsParams) {
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [lyricsLines, setLyricsLines] = useState<LyricLine[] | null>(null);
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
        setLyricsLines(null);
        setLyricsError("no_lyrics");
        return;
      }

      if (res.has_timestamps && Array.isArray(res.lyrics)) {
        setLyricsLines(res.lyrics as LyricLine[]);
        setLyricsText(null);
      } else {
        const txt = String(res.lyrics).replace(/\r\n/g, "\n").trim();
        setLyricsText(txt || null);
        setLyricsLines(null);
        if (!txt) setLyricsError("no_lyrics");
      }
    } catch {
      setLyricsText(null);
      setLyricsLines(null);
      setLyricsError("load_error");
    } finally {
      setLyricsLoading(false);
    }
  };

  // Toggle mostrar/ocultar lyrics
  const toggleLyrics = async () => {
    const next = !lyricsOpen;
    setLyricsOpen(next);

    // Si se esta abriendo y no hay letras cargadas (ni texto ni lineas), fetchear
    if (next && lyricsText == null && lyricsLines == null && !lyricsLoading) {
      await fetchLyrics();
    }

    // Si se esta cerrando, resetear scroll y desbloquear pan
    if (!next) {
      setPanLocked(false);
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  // Reset cuando cambia la cancion
  useEffect(() => {
    setLyricsOpen(false);
    setLyricsText(null);
    setLyricsLines(null);
    setLyricsError(null);
    setLyricsLoading(false);
    setPanLocked(false);
  }, [currentSong?.id, setPanLocked]);

  return {
    lyricsOpen,
    lyricsText,
    lyricsLines,
    lyricsLoading,
    lyricsError,
    mainScrollRef,
    toggleLyrics,
    fetchLyrics,
  };
}