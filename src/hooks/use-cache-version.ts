import { cacheDel } from '@/src/utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { useEffect, useState } from 'react';

const API_BASE =
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? "http://66.55.75.224:8000/api";

const BACKEND_URL = `${API_BASE}/feed/cache/versions`;
const VERSIONS_KEY = 'cache:backend-versions';

export function useCacheVersions(userId?: string) {
  const [versions, setVersions] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    checkVersions();
  }, []);

  async function checkVersions() {
    try {
      const res = await fetch(BACKEND_URL);
      if (!res.ok) {
        console.error('[cache-versions] HTTP error:', res.status);
        return;
      }

      const json = await res.json();
      const newVersions = json?.versions;

      if (!newVersions || typeof newVersions !== 'object') {
        console.error('[cache-versions] Invalid response:', json);
        return;
      }

      const stored = await AsyncStorage.getItem(VERSIONS_KEY);
      const oldVersions = stored ? JSON.parse(stored) : {};

      for (const [type, newVer] of Object.entries(newVersions)) {
        const oldVer = oldVersions[type];
        
        if (oldVer && oldVer !== newVer) {
          console.log(`[cache-versions] ${type} cambió: ${oldVer} → ${newVer}`);
          await invalidateByType(type, userId);
        }
      }

      await AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(newVersions));
      setVersions(newVersions);

    } catch (err) {
      console.error('[cache-versions] Error:', err);
    }
  }

  async function invalidateByType(type: string, userId?: string) {
    switch (type) {
      case 'new-releases':
        await cacheDel('home:feed:new_releases:AR:albums:20:v1', userId);
        break;
      case 'top-tracks':
        await cacheDel('home:feed:most_played:tracks:20:v1', userId);
        break;
      case 'top-albums':
        await cacheDel('home:feed:most_played:albums:20:v1', userId);
        break;
      case 'seed-tracks':
        await cacheDel('home:feed:seed_tracks:tracks:20:v1', userId);
        break;
    }
  }

  return { versions, checkVersions };
}