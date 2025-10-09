// src/utils/cachedFetch.ts
import { cacheGet, cacheSet } from "./cache";

type FetchJSONOpts = {
  key: string;                 // clave única del caché
  ttl?: number;                // ms (default 5 min)
  headers?: Record<string,string>;
  version?: string;            // por si cambiás el shape
  revalidate?: boolean;        // SWR: devolver cache y después refrescar
  // hook opcional para avisarte cuando haya dato fresco:
  onUpdate?: (fresh: any) => void;
};

export async function cachedFetchJSON(
  url: string,
  init: RequestInit = {},
  { key, ttl = 5 * 60_000, headers = {}, version, revalidate = true, onUpdate }: FetchJSONOpts
): Promise<{ data: any; fromCache: boolean }> {

  // 1) intento caché
  const cached = await cacheGet<any>(key, { expectedVersion: version });
  if (cached && !revalidate) return { data: cached, fromCache: true };

  // 2) si hay caché y queremos SWR → devolvés ya y refrescás aparte
  if (cached && revalidate) {
    // refresco en “segundo plano” (no bloquea la UI)
    (async () => {
      try {
        const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...headers } });
        if (!res.ok) return;
        const etag = res.headers.get("etag");
        const fresh = await res.json();
        // si cambió, guardamos y notificamos
        const changed = JSON.stringify(fresh) !== JSON.stringify(cached);
        if (changed) {
          await cacheSet(key, fresh, { ttl, etag: etag ?? undefined, version });
          onUpdate?.(fresh);
        }
      } catch {}
    })();
    return { data: cached, fromCache: true };
  }

  // 3) no hay caché → fetch normal
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...headers } });
  const body = await res.json().catch(() => null);
  if (res.ok && body) {
    const etag = res.headers.get("etag");
    await cacheSet(key, body, { ttl, etag: etag ?? undefined, version });
  }
  return { data: body, fromCache: false };
}