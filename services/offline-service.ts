import { API_URL } from "@/constants/config";
import { removeOfflineTrack, upsertOfflineTrack } from "@/lib/offlineItems";
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const OFFLINE_DIR = `${FileSystem.documentDirectory}offline/`;

const PRIMARY_ITAG = Platform.OS === "ios" ? 141 : 774;
const FALLBACK_ITAG = Platform.OS === "ios" ? 140 : 251;

const EXT_MAP: Record<number, string> = {
  141: "m4a",
  140: "m4a",
  774: "opus",
  251: "opus",
};

export interface OfflineDownloadMeta {
  track_id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  album_id: string;
  thumbnail_url: string;
  duration_seconds: number;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("no_session");
  return { Authorization: `Bearer ${token}` };
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(OFFLINE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
  }
}

function localPath(trackId: string, itag: number): string {
  return `${OFFLINE_DIR}${trackId}.${EXT_MAP[itag]}`;
}

export const offlineService = {
  isDownloaded: async (trackId: string): Promise<boolean> => {
    for (const ext of ["m4a", "opus"]) {
      const info = await FileSystem.getInfoAsync(`${OFFLINE_DIR}${trackId}.${ext}`);
      if (info.exists) return true;
    }
    return false;
  },

  getLocalPath: async (trackId: string): Promise<string | null> => {
    for (const ext of ["m4a", "opus"]) {
      const path = `${OFFLINE_DIR}${trackId}.${ext}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return path;
    }
    return null;
  },

  download: async (
    meta: OfflineDownloadMeta,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    await ensureDir();
    const headers = await getAuthHeaders();
    const trackId = meta.track_id;

    const tryItag = async (itag: number): Promise<string> => {
      const url = `${API_URL}/offline/fetch/${trackId}?itag=${itag}`;
      const dest = localPath(trackId, itag);

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        dest,
        { headers },
        (downloadProgress) => {
          if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
            const pct = downloadProgress.totalBytesWritten
              / downloadProgress.totalBytesExpectedToWrite;
            onProgress(pct);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error("download_failed");

      if (result.status && result.status >= 400) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        throw new Error(`download_failed_${result.status}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 10000)) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        throw new Error("download_failed_invalid_file");
      }

      return result.uri;
    };

    let uri: string;
    try {
      uri = await tryItag(PRIMARY_ITAG);
    } catch {
      uri = await tryItag(FALLBACK_ITAG);
    }

    await upsertOfflineTrack({
      ...meta,
      downloaded_at: new Date().toISOString(),
    });

    return uri;
  },

  remove: async (trackId: string): Promise<void> => {
    for (const ext of ["m4a", "opus"]) {
      const path = `${OFFLINE_DIR}${trackId}.${ext}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) await FileSystem.deleteAsync(path);
    }
    await removeOfflineTrack(trackId);
  },
};