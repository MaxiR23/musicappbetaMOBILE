// src/utils/reorder-logger.ts

/**
 * Flag para habilitar/deshabilitar logs de reordenamiento
 * Solo funciona en desarrollo
 */
const RELOG_ENABLED = true;

/**
 * Logger especializado para operaciones de reordenamiento
 * Solo loguea en modo desarrollo si RELOG_ENABLED es true
 * 
 * @param tag - Etiqueta descriptiva del log
 * @param data - Datos opcionales a loguear (se convierten a JSON)
 */
export function reorderLog(tag: string, data?: any): void {
  if (!__DEV__ || !RELOG_ENABLED) return;
  
  try {
    const message = data ? JSON.stringify(data) : "";
    console.log(`REORDER:${tag}`, message);
  } catch {
    console.log(`REORDER:${tag}`);
  }
}

/**
 * Crea un objeto resumido de una canción para logging
 * Útil para no loguear objetos completos
 * 
 * @param song - Objeto de canción
 * @param index - Índice en la lista
 * @returns Objeto con información resumida
 */
export function briefSong(song: any, index: number) {
  return {
    i: index,
    pos1: index + 1, // posición 1-based
    id: song?.id,
    internalId: song?.internalId,
    title: song?.title,
  };
}

/**
 * Reconcilia el orden local con el orden canónico del servidor
 * Útil después de operaciones de reordenamiento para corregir gaps/duplicados
 * 
 * @param songs - Lista de canciones local
 * @param order - Orden canónico del servidor con positions
 * @returns Lista de canciones reordenada según el servidor
 */
export function applyServerOrder(
  songs: any[],
  order: { internalId: string | number; trackId?: string | number; position: number }[]
): any[] {
  if (!order?.length) return songs;
  
  // Crear mapas de posiciones por internalId y trackId
  const byInternal = new Map(
    order.map(o => [String(o.internalId), Number(o.position)])
  );
  const byTrack = new Map(
    order.map(o => [String(o.trackId ?? ""), Number(o.position)])
  );
  
  // Asignar posiciones a cada canción
  const withPos = songs.map((s: any, i: number) => {
    const p1 = byInternal.get(String(s.internalId));
    const p2 = byTrack.get(String(s.id));
    const pos = typeof p1 === "number" 
      ? p1 
      : (typeof p2 === "number" ? p2 : (i + 1));
    
    return { s, pos };
  });
  
  // Ordenar por posición
  withPos.sort((a, b) => a.pos - b.pos);
  
  return withPos.map(x => x.s);
}