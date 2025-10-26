// src/utils/cachedFetch.ts
import { cacheGet, cacheSet } from "./cache";

type FetchJSONOpts = {
  key: string;                 // clave única del caché
  ttl?: number;                // ms (opcional, auto-detecta si no se pasa)
  headers?: Record<string, string>;
  revalidate?: boolean;        // SWR: devolver cache y después refrescar
  onUpdate?: (fresh: any) => void; // hook para cuando hay dato fresco
};

export async function cachedFetchJSON(
  url: string,
  init: RequestInit = {},
  { key, ttl, headers = {}, revalidate = true, onUpdate }: FetchJSONOpts
): Promise<{ data: any; fromCache: boolean }> {

  // 1) intento caché
  const cached = await cacheGet<any>(key);
  if (cached && !revalidate) {
    return { data: cached, fromCache: true };
  }

  // 2) si hay caché y queremos SWR → devolvés ya y refrescás aparte
  if (cached && revalidate) {
    // refresco en "segundo plano" (no bloquea la UI)
    (async () => {
      try {
        const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...headers } });
        if (!res.ok) return;
        const fresh = await res.json();
        
        // si cambió, guardamos y notificamos
        const changed = JSON.stringify(fresh) !== JSON.stringify(cached);
        if (changed) {
          await cacheSet(key, fresh, { ttl });
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
    await cacheSet(key, body, { ttl });
  }
  
  return { data: body, fromCache: false };
}