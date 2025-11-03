// context/CacheVersionsContext.ts
import { createContext } from "react";

export type CacheVersions = Record<string, string>;

export type CacheVersionsContextValue = {
  versions: CacheVersions;
  loading: boolean;
  error: Error | null;
  lastChecked: Date | null;
  checkVersions: () => Promise<void>;
};

export const CacheVersionsContext = createContext<CacheVersionsContextValue | null>(null);