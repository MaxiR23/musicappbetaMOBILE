import { useEffect, useRef } from "react";

/**
 * Hook que devuelve una función para verificar si el componente sigue montado.
 * Evita memory leaks y warnings al actualizar estado en componentes desmontados.
 * 
 * Reemplaza este patrón repetitivo:
 * ```tsx
 * useEffect(() => {
 *   let mounted = true;
 *   (async () => {
 *     const data = await fetch();
 *     if (mounted) setState(data);
 *   })();
 *   return () => { mounted = false; };
 * }, []);
 * ```
 * 
 * Por esto:
 * ```tsx
 * const isMounted = useMounted();
 * 
 * useEffect(() => {
 *   (async () => {
 *     const data = await fetch();
 *     if (isMounted()) setState(data);
 *   })();
 * }, []);
 * ```
 * 
 * @returns Función que retorna `true` si el componente está montado
 */
export function useMounted() {
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return () => mountedRef.current;
}