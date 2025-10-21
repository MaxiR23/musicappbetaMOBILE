// hooks/use-detail-screen.ts
import { useCallback, useEffect, useState } from "react";

interface UseDetailScreenOptions<T, R = T> {
  /**
   * ID del recurso a cargar (album, artist, playlist)
   */
  id: string | undefined;
  
  /**
   * Función que obtiene los datos desde la API
   * Ejemplo: getAlbum, getArtist, getPlaylistById
   */
  fetcher: (id: string) => Promise<T>;
  
  /**
   * Función opcional para transformar los datos antes de guardarlos en el estado
   * Útil para normalizar la estructura de respuesta de diferentes APIs
   */
  transformer?: (data: T) => R;
  
  /**
   * Callback opcional que se ejecuta cuando hay un error
   */
  onError?: (error: any) => void;
}

interface UseDetailScreenReturn<R> {
  /**
   * Los datos cargados (null si aún no se cargaron)
   */
  data: R | null;
  
  /**
   * Indica si está cargando
   */
  loading: boolean;
  
  /**
   * Error si hubo alguno
   */
  error: Error | null;
  
  /**
   * Función para recargar manualmente los datos
   */
  reload: () => Promise<void>;
}

/**
 * Hook personalizado para manejar la carga de datos en pantallas de detalle
 * (Album, Artist, Playlist, etc.)
 * 
 * Encapsula la lógica común de:
 * - Estado de loading
 * - Estado de data
 * - Llamada a API
 * - Manejo de errores
 * - Auto-carga cuando cambia el ID
 * 
 * @example
 * ```tsx
 * const { data: album, loading, reload } = useDetailScreen({
 *   id,
 *   fetcher: getAlbum,
 * });
 * ```
 */
export function useDetailScreen<T, R = T>({
  id,
  fetcher,
  transformer,
  onError,
}: UseDetailScreenOptions<T, R>): UseDetailScreenReturn<R> {
  const [data, setData] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(id);
      const transformed = transformer ? transformer(result) : (result as unknown as R);
      setData(transformed);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Error cargando recurso [${id}]:`, err);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Auto-cargar cuando cambia el ID
  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
  };
}