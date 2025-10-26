// utils/cache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/** TTL por defecto: 1 día */
export const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL = DAY_MS;

// ✨ NUEVO: TTLs específicos por tipo de contenido
export const CACHE_TTL = {
  artist: 60 * 60 * 1000,      // 1 hora
  album: 60 * 60 * 1000,       // 1 hora
  playlist: 30 * 60 * 1000,    // 30 min
  track: 60 * 60 * 1000,       // 1 hora
  feed: 30 * 60 * 1000,        // 30 min
  default: 5 * 60 * 1000,      // 5 min
};

// ✨ NUEVO: No revalidar si es más reciente que esto
const NO_REVALIDATE_MS = 10 * 60 * 1000; // 10 minutos

/** Entrada interna guardada */
type CacheEntry<T> = { v: T; exp: number; ttl?: number }; // ✨ Agregado ttl

/** Mem-cache para la sesión (rápido y evita deserializar) */
const mem = new Map<string, CacheEntry<any>>();

/** Arma la key con un posible scope por usuario */
const k = (key: string, userId?: string | null) =>
  userId ? `cache:${key}::u:${userId}` : `cache:${key}`;

// ✨ NUEVO: Auto-detectar TTL según el tipo de key
function getTTLForKey(key: string): number {
  if (key.includes('artist')) return CACHE_TTL.artist;
  if (key.includes('album')) return CACHE_TTL.album;
  if (key.includes('playlist')) return CACHE_TTL.playlist;
  if (key.includes('track')) return CACHE_TTL.track;
  if (key.includes('feed')) return CACHE_TTL.feed;
  return CACHE_TTL.default;
}

/** Lee del cache (memoria → AsyncStorage). Devuelve null si no existe o está vencido. */
export async function cacheGet<T>(
  key: string,
  opts?: { userId?: string | null }
): Promise<T | null> {
  const full = k(key, opts?.userId);
  const now = Date.now();

  // 1) memoria
  const m = mem.get(full);
  if (m) {
    if (m.exp > now) {
      // ✨ NUEVO: Si es reciente (<10 min), marcar como "fresh"
      const age = now - (m.exp - (m.ttl || DEFAULT_TTL));
      if (age < NO_REVALIDATE_MS) {
        console.log(`[cache] HIT (mem, fresh) → ${full}`);
      } else {
        console.log(`[cache] HIT (mem) → ${full}`);
      }
      return m.v as T;
    }
    mem.delete(full);
  }

  // 2) disco
  try {
    const raw = await AsyncStorage.getItem(full);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.exp !== "number") {
      await AsyncStorage.removeItem(full);
      return null;
    }
    if (parsed.exp <= now) {
      await AsyncStorage.removeItem(full);
      return null;
    }
    mem.set(full, parsed);
    console.log(`[cache] HIT (disk) → ${full}`);
    return parsed.v;
  } catch {
    return null;
  }
}

/** Guarda en cache (memoria + AsyncStorage) */
export async function cacheSet<T>(
  key: string,
  value: T,
  opts?: { ttl?: number; userId?: string | null }
): Promise<void> {
  const full = k(key, opts?.userId);
  
  // ✨ NUEVO: Auto-detectar TTL si no se especifica
  const ttl = opts?.ttl ?? getTTLForKey(key);
  const exp = Date.now() + ttl;
  
  const entry: CacheEntry<T> = { v: value, exp, ttl }; // ✨ Guardar ttl
  mem.set(full, entry);
  try {
    await AsyncStorage.setItem(full, JSON.stringify(entry));
  } catch {}
}

/**
 * Wrapper: intenta cache y si no hay, llama al productor, guarda y devuelve.
 * Loguea si pega cache o si "golpea DB / red".
 */
export async function cacheWrap<T>(
  key: string,
  producer: () => Promise<T>,
  opts?: { ttl?: number; userId?: string | null; skipCache?: boolean }
): Promise<T> {
  const full = k(key, opts?.userId);

  if (!opts?.skipCache) {
    const hit = await cacheGet<T>(key, { userId: opts?.userId });
    if (hit !== null) return hit;
  }

  console.log(`[cache] MISS → fetching (${full})`);
  const data = await producer();
  await cacheSet(key, data, { ttl: opts?.ttl ?? DEFAULT_TTL, userId: opts?.userId });
  return data;
}

/** Invalidaciones útiles */
export async function cacheDel(key: string, userId?: string | null) {
  const full = k(key, userId);
  mem.delete(full);
  try { await AsyncStorage.removeItem(full); } catch {}
}

export async function cacheClearPrefix(prefix: string) {
  const allKeys = await AsyncStorage.getAllKeys();
  const pref = `cache:${prefix}`;
  const toDel = allKeys.filter((kk) => kk.startsWith(pref));
  toDel.forEach((kk) => mem.delete(kk));
  if (toDel.length) {
    try { await AsyncStorage.multiRemove(toDel); } catch {}
  }
}

export async function cacheClearAll() {
  const allKeys = await AsyncStorage.getAllKeys();
  const toDel = allKeys.filter((kk) => kk.startsWith("cache:"));
  mem.clear();
  if (toDel.length) {
    try { await AsyncStorage.multiRemove(toDel); } catch {}
  }
}