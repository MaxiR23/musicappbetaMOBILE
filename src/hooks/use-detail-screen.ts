import { useCallback, useEffect, useState } from "react";

/**
 * Opciones para el hook useDetailScreen:
 * - id: ID del recurso a cargar (album, artist, playlist).
 * - fetcher: Función que obtiene los datos desde la API (ej: getAlbum/getArtist/getPlaylistById).
 * - transformer: Transformación opcional antes de guardar en estado (normalización/mapeo).
 * - onError: Callback opcional cuando ocurre un error.
 */
interface UseDetailScreenOptions<T, R = T> {
  id: string | undefined;
  fetcher: (id: string) => Promise<T>;
  transformer?: (data: T) => R;
  onError?: (error: any) => void;
}

/**
 * Retorno del hook useDetailScreen:
 * - data: Datos cargados (null si aún no se cargaron).
 * - loading: Indica si está cargando.
 * - error: Error si hubo alguno.
 * - reload: Recarga manual de los datos.
 */
interface UseDetailScreenReturn<R> {
  data: R | null;
  loading: boolean;
  error: Error | null;
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