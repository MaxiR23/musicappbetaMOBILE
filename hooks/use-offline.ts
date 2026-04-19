import { offlineService } from "@/services/offline-service";
import { useCallback, useState } from "react";

export function useOffline() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const download = useCallback(async (trackId: string) => {
    try {
      setDownloading(trackId);
      setProgress(0);
      await offlineService.download(trackId, (pct) => setProgress(pct));
    } finally {
      setDownloading(null);
      setProgress(0);
    }
  }, []);

  const remove = useCallback(async (trackId: string) => {
    await offlineService.remove(trackId);
  }, []);

  const isDownloaded = useCallback(async (trackId: string) => {
    return offlineService.isDownloaded(trackId);
  }, []);

  const getLocalPath = useCallback(async (trackId: string) => {
    return offlineService.getLocalPath(trackId);
  }, []);

  return {
    download,
    remove,
    isDownloaded,
    getLocalPath,
    downloading,
    progress,
  };
}