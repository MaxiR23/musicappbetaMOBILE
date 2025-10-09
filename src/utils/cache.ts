// utils/cache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/** TTL por defecto: 1 día */
export const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL = DAY_MS;

/** Entrada interna guardada */
type CacheEntry<T> = { v: T; exp: number };

/** Mem-cache para la sesión (rápido y evita deserializar) */
const mem = new Map<string, CacheEntry<any>>();

/** Arma la key con un posible scope por usuario */
const k = (key: string, userId?: string | null) =>
  userId ? `cache:${key}::u:${userId}` : `cache:${key}`;

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
      console.log(`[cache] HIT (mem) → ${full}`);
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
  const exp = Date.now() + (opts?.ttl ?? DEFAULT_TTL);
  const entry: CacheEntry<T> = { v: value, exp };
  mem.set(full, entry);
  try {
    await AsyncStorage.setItem(full, JSON.stringify(entry));
  } catch {}
}

/**
 * Wrapper: intenta cache y si no hay, llama al productor, guarda y devuelve.
 * Loguea si pega cache o si “golpea DB / red”.
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

  console.log(`[cache] MISS → fetching (${full})`); // ← “golpea cache y NO DB” vs “MISS = va a red/DB”
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