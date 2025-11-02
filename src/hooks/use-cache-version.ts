// hooks/useCacheVersions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { useEffect, useState } from 'react';

const API_BASE =
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? "http://66.55.75.224:8000/api";

const BACKEND_URL = `${API_BASE}/feed/cache/versions`;
const VERSIONS_KEY = 'cache:backend-versions';

export function useCacheVersions() {
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVersions();
  }, []);

  async function checkVersions() {
    try {
      const res = await fetch(BACKEND_URL);
      if (!res.ok) {
        console.error('[cache-versions] HTTP error:', res.status);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const newVersions = json?.versions;

      if (!newVersions || typeof newVersions !== 'object') {
        console.error('[cache-versions] Invalid response:', json);
        setLoading(false);
        return;
      }

      // Comparar con versiones anteriores (solo para logging)
      const stored = await AsyncStorage.getItem(VERSIONS_KEY);
      const oldVersions = stored ? JSON.parse(stored) : {};

      for (const [type, newVer] of Object.entries(newVersions)) {
        const oldVer = oldVersions[type];
        
        if (oldVer && oldVer !== newVer) {
          console.log(`[cache-versions] ✅ ${type} cambió: ${oldVer} → ${newVer}`);
        }
      }

      // Guardar nuevas versiones
      await AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(newVersions));
      setVersions(newVersions);
      setLoading(false);

    } catch (err) {
      console.error('[cache-versions] Error:', err);
      setLoading(false);
    }
  }

  return { 
    versions,      // ← expone las versiones
    loading,       // ← indica si está cargando
    checkVersions  // ← permite refrescar manualmente
  };
}