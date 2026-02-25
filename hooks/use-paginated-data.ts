import { useCallback, useEffect, useMemo, useState } from "react";

interface UsePaginatedDataOptions<T> {
  data: T[]; /** Data completa a paginar */
  itemsPerPage?: number; /** Items por página (default: 20) */
}

/**
 * Retorno del hook:
 * - visibleData: Items visibles actualmente (paginados).
 * - hasMore: Indica si hay más items por cargar.
 * - loadMore: Carga el siguiente “bloque” de items.
 * - totalCount: Total de items disponibles.
 * - displayCount: Cantidad de items visibles actualmente.
 */
interface UsePaginatedDataReturn<T> {
  visibleData: T[];
  hasMore: boolean;
  loadMore: () => void;
  totalCount: number;
  displayCount: number;
}


/**
 * Hook para manejar paginación virtual en listas largas.
 * Renderiza solo N items inicialmente y carga más al hacer scroll.
 * Optimiza performance en listas con cientos/miles de items.
 * 
 * Reemplaza este patrón:
 * ```tsx
 * const [displayCount, setDisplayCount] = useState(20);
 * const data = allItems.slice(0, displayCount);
 * const handleEndReached = () => {
 *   if (displayCount < allItems.length) {
 *     setDisplayCount(prev => prev + 20);
 *   }
 * };
 * ```
 * 
 * Por esto:
 * ```tsx
 * const { visibleData, loadMore } = usePaginatedData({
 *   data: allItems,
 *   itemsPerPage: 20
 * });
 * 
 * <FlatList 
 *   data={visibleData}
 *   onEndReached={loadMore}
 * />
 * ```
 * 
 * @returns Objeto con data paginada y controles
 */
export function usePaginatedData<T>({
  data,
  itemsPerPage = 20,
}: UsePaginatedDataOptions<T>): UsePaginatedDataReturn<T> {
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  // Reset cuando cambia la data o itemsPerPage
  useEffect(() => {
    setDisplayCount(itemsPerPage);
  }, [data, itemsPerPage]);

  const visibleData = useMemo(
    () => data.slice(0, displayCount),
    [data, displayCount]
  );

  const hasMore = displayCount < data.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => Math.min(prev + itemsPerPage, data.length));
    }
  }, [hasMore, itemsPerPage, data.length]);

  return {
    visibleData,
    hasMore,
    loadMore,
    totalCount: data.length,
    displayCount,
  };
}