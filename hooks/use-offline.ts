import { OfflineDownloadMeta, offlineService } from "@/services/offline-service";
import { useCallback, useState } from "react";

export function useOffline() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const download = useCallback(async (meta: OfflineDownloadMeta) => {
    try {
      setDownloading(meta.track_id);
      setProgress(0);
      await offlineService.download(meta, (pct) => setProgress(pct));
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