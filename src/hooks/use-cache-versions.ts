import { useContext } from "react";
import { CacheVersionsContext, type CacheVersionsContextValue } from "../context/CacheVersionsContext";

export function useCacheVersions(): CacheVersionsContextValue {
  const ctx = useContext(CacheVersionsContext);
  if (!ctx) throw new Error("useCacheVersions debe usarse dentro de <CacheVersionsProvider>");
  return ctx;
}

// Hook adicional para obtener una versión específica
export function useCacheVersion(type: string): string | undefined {
  const { versions } = useCacheVersions();
  return versions[type];
}