import AsyncStorage from "@react-native-async-storage/async-storage";

/** TTL por defecto: 1 día */
export const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL = DAY_MS;

function msUntilEndOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime();
}

// TTLs específicos por tipo de contenido
export const CACHE_TTL = {
  artist: 60 * 60 * 1000,
  album: 60 * 60 * 1000,
  playlist: 30 * 60 * 1000,
  track: 60 * 60 * 1000,
  feed: 30 * 60 * 1000,
  recent: DAY_MS * 7,
  weeklyStats: DAY_MS * 7,
  get monthlyStats() { return msUntilEndOfMonth(); },
  default: 5 * 60 * 1000,
};

const NO_REVALIDATE_MS = 10 * 60 * 1000;

type CacheEntry<T> = { v: T; exp: number; ttl?: number };

const mem = new Map<string, CacheEntry<any>>();

/** Arma la key con scope de usuario y VERSIÓN del backend */
const k = (key: string, userId?: string | null, version?: string | null) => {
  let full = userId ? `cache:${key}::u:${userId}` : `cache:${key}`;
  if (version) full += `::ver:${version}`;  // ← NUEVO: incluye versión
  return full;
};

function getTTLForKey(key: string): number {
  if (key.includes('monthly-stats')) return CACHE_TTL.monthlyStats;
  if (key.includes('weekly-stats')) return CACHE_TTL.weeklyStats;
  if (key.includes('artist')) return CACHE_TTL.artist;
  if (key.includes('album')) return CACHE_TTL.album;
  if (key.includes('playlist')) return CACHE_TTL.playlist;
  if (key.includes('track')) return CACHE_TTL.track;
  if (key.includes('feed')) return CACHE_TTL.feed;
  if (key.includes('recent')) return CACHE_TTL.recent;
  return CACHE_TTL.default;
}

/** Lee del cache con versión opcional */
export async function cacheGet<T>(
  key: string,
  opts?: { userId?: string | null; version?: string | null }  // ← NUEVO: version
): Promise<T | null> {
  const full = k(key, opts?.userId, opts?.version);  // ← usa version
  const now = Date.now();

  // 1) memoria
  const m = mem.get(full);
  if (m) {
    if (m.exp > now) {
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

/** Guarda en cache con versión opcional */
export async function cacheSet<T>(
  key: string,
  value: T,
  opts?: { ttl?: number; userId?: string | null; version?: string | null }  // ← NUEVO: version
): Promise<void> {
  const full = k(key, opts?.userId, opts?.version);  // ← usa version
  const ttl = opts?.ttl ?? getTTLForKey(key);
  const exp = Date.now() + ttl;
  const entry: CacheEntry<T> = { v: value, exp, ttl };
  mem.set(full, entry);
  try {
    await AsyncStorage.setItem(full, JSON.stringify(entry));
  } catch { }
}

/** Wrapper con versión opcional */
export async function cacheWrap<T>(
  key: string,
  producer: () => Promise<T>,
  opts?: { ttl?: number; userId?: string | null; skipCache?: boolean; version?: string | null }  // ← NUEVO: version
): Promise<T> {
  const full = k(key, opts?.userId, opts?.version);

  if (!opts?.skipCache) {
    const hit = await cacheGet<T>(key, { userId: opts?.userId, version: opts?.version });  // ← pasa version
    if (hit !== null) return hit;
  }

  console.log(`[cache] MISS → fetching (${full})`);
  const data = await producer();
  await cacheSet(key, data, {
    ttl: opts?.ttl ?? DEFAULT_TTL,
    userId: opts?.userId,
    version: opts?.version  // ← pasa version
  });
  return data;
}

/** Invalidaciones útiles */
export async function cacheDel(key: string, userId?: string | null, version?: string | null) {  // ← NUEVO: version
  const full = k(key, userId, version);
  mem.delete(full);
  try { await AsyncStorage.removeItem(full); } catch { }
}

export async function cacheClearPrefix(prefix: string) {
  const allKeys = await AsyncStorage.getAllKeys();
  const pref = `cache:${prefix}`;
  const toDel = allKeys.filter((kk) => kk.startsWith(pref));
  toDel.forEach((kk) => mem.delete(kk));
  if (toDel.length) {
    try { await AsyncStorage.multiRemove(toDel); } catch { }
  }
}

export async function cacheClearAll() {
  const allKeys = await AsyncStorage.getAllKeys();
  const toDel = allKeys.filter((kk) => kk.startsWith("cache:"));
  mem.clear();
  if (toDel.length) {
    try { await AsyncStorage.multiRemove(toDel); } catch { }
  }
}

export async function cleanExpiredCache(): Promise<void> {
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000)
  );

  const cleanPromise = (async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('cache:') && k !== 'cache:last-clean');
      const now = Date.now();
      const toDelete: string[] = [];

      const keysToCheck = cacheKeys.slice(0, 100);

      for (const key of keysToCheck) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.exp && parsed.exp <= now) {
              toDelete.push(key);
              mem.delete(key);
            }
          }
        } catch {
          toDelete.push(key);
          mem.delete(key);
        }
      }

      if (toDelete.length > 0) {
        await AsyncStorage.multiRemove(toDelete);
        console.log(`[cache] Limpieza exitosa: ${toDelete.length} entries eliminadas`);
      } else {
        console.log('[cache] Limpieza: nada que borrar');
      }
    } catch (err) {
      console.warn('[cache] Error en limpieza:', err);
    }
  })();

  try {
    await Promise.race([cleanPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[cache] Limpieza cancelada (timeout o error)');
  }
}