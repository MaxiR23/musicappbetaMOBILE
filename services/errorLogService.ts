import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

interface PlaybackErrorParams {
  trackId: string;
  itag?: number;
  audioUrl?: string;
  errorMessage?: string;
  errorCode?: string;
}

export async function logPlaybackError(params: PlaybackErrorParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      track_id: params.trackId,
      platform: Platform.OS,
      itag: params.itag ?? null,
      audio_url: params.audioUrl ?? null,
      error_message: params.errorMessage ?? null,
      error_code: params.errorCode ?? null,
      resolved: false,
      os_version: `${Platform.OS} ${Platform.Version}`,
    });
  } catch (error) {
    console.warn("Failed to log playback error:", error);
  }
}