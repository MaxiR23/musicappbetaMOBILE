// providers/CacheVersionsProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CacheVersionsContext, type CacheVersions, type CacheVersionsContextValue } from "../context/CacheVersionsContext";

const API_BASE =
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? "http://66.55.75.224:8000/api";

const BACKEND_URL = `${API_BASE}/feed/cache/versions`;
const VERSIONS_KEY = 'cache:backend-versions';

export default function CacheVersionsProvider({ children }: PropsWithChildren) {
  const [versions, setVersions] = useState<CacheVersions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const isFetching = useRef(false);

  const checkVersions = useCallback(async () => {
    if (isFetching.current) {
      console.log('[cache-versions] Ya hay una consulta en curso, ignorando...');
      return;
    }

    isFetching.current = true;
    setError(null);

    try {
      console.log('[cache-versions] 🔄 Consultando versiones del backend...');
      const res = await fetch(BACKEND_URL);
      
      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`);
      }

      const json = await res.json();
      const newVersions = json?.versions;

      if (!newVersions || typeof newVersions !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }

      // Comparar con versiones anteriores
      const stored = await AsyncStorage.getItem(VERSIONS_KEY);
      const oldVersions: CacheVersions = stored ? JSON.parse(stored) : {};

      let hasChanges = false;
      for (const [type, newVer] of Object.entries(newVersions)) {
        const oldVer = oldVersions[type];
        
        if (oldVer && oldVer !== newVer) {
          console.log(`[cache-versions] ✅ ${type} cambió: ${oldVer} → ${newVer}`);
          hasChanges = true;
        }
      }

      if (hasChanges || !stored) {
        await AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(newVersions));
      }

      setVersions(newVersions);
      setLastChecked(new Date());

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      console.error('[cache-versions] ❌ Error:', error.message);
      setError(error);
      
      // Fallback: cargar desde AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(VERSIONS_KEY);
        if (stored) {
          const cachedVersions = JSON.parse(stored);
          setVersions(cachedVersions);
          console.log('[cache-versions] 📦 Usando versiones cacheadas');
        }
      } catch (cacheErr) {
        console.error('[cache-versions] Error al cargar cache:', cacheErr);
      }

    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  // Cargar versiones al montar (una sola vez al abrir la app)
  useEffect(() => {
    checkVersions();
  }, [checkVersions]);

  const value: CacheVersionsContextValue = useMemo(
    () => ({
      versions,
      loading,
      error,
      lastChecked,
      checkVersions,
    }),
    [versions, loading, error, lastChecked, checkVersions]
  );

  return <CacheVersionsContext.Provider value={value}>{children}</CacheVersionsContext.Provider>;
}