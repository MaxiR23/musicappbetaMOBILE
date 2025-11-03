import { supabase } from "@/src/lib/supabase";
import Constants from "expo-constants";

const BASE_URL =
  (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL)
  ?? (process?.env?.EXPO_PUBLIC_API_URL)
  ?? "http://66.55.75.224:8000/api";

export type ArtistReco = {
  type: "artist";
  id: string;
  name: string | null;
  subtitle?: string | null;
  thumbnails: { url: string; width?: number; height?: number }[];
  similarTo?: { id: string; name?: string | null; thumbnail?: string | null };
};

export type AlbumReco = {
  type: "album";
  id: string;
  title: string | null;
  artistName?: string | null;
  thumbnails: { url: string; width?: number; height?: number }[];
  release_date?: string | null;
  year?: number | null;
  track_count?: number | null;
};

export type UserRecommendations = {
  bucket: string;
  artists: ArtistReco[];
  albums:  AlbumReco[];
};

export async function fetchRecommendations(
  bucket?: string,
  fetchWithAuth?: (url: string, init?: RequestInit) => Promise<any>
): Promise<UserRecommendations> {
  const url = bucket 
    ? `${BASE_URL}/feed/recommendations/me?bucket=${encodeURIComponent(bucket)}`
    : `${BASE_URL}/feed/recommendations/me`;
  
  console.log("[recommend] GET", url);

  let json: any;
  
  if (fetchWithAuth) {
    json = await fetchWithAuth(url);
  } else {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { method: "GET", headers });
    
    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch {}
      console.warn(`[recommend] HTTP ${res.status} ${res.statusText} — body:`, (body || "").slice(0, 1200));
      throw new Error(`recommend: ${res.status}`);
    }

    json = await res.json();
  }

  const rec = (json?.recommendations ?? {}) as {
    artists?: any[];
    albums?: any[];
  };

  const artists: ArtistReco[] = (Array.isArray(rec.artists) ? rec.artists : []).map((a: any) => ({
    type: "artist",
    id: String(a?.id ?? ""),
    name: a?.name ?? null,
    subtitle: a?.subtitle ?? null,
    thumbnails: Array.isArray(a?.thumbnails) ? a.thumbnails : [],
    similarTo: a?.similarTo?.id ? {
      id: String(a.similarTo.id),
      name: a.similarTo?.name ?? null,
      thumbnail: a.similarTo?.thumbnail ?? null,
    } : undefined,
  })).filter(x => x.id);

  const albums: AlbumReco[] = (Array.isArray(rec.albums) ? rec.albums : []).map((al: any) => ({
    type: "album",
    id: String(al?.id ?? ""),
    title: al?.title ?? al?.name ?? null,
    artistName: al?.artistName ?? al?.artist ?? null,
    thumbnails: Array.isArray(al?.thumbnails) ? al.thumbnails : [],
    release_date: al?.release_date ?? al?.releaseDate ?? null,
    year: typeof al?.year === "number" ? al.year : (al?.year ? Number(al.year) : null),
    track_count: typeof al?.track_count === "number" ? al.track_count : (al?.track_count ? Number(al.track_count) : null),
  })).filter(x => x.id);

  return {
    bucket: String(json?.bucket ?? bucket ?? "seed_recos_v1"),
    artists,
    albums,
  };
}