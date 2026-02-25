import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";

const BASE_URL =
  (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL)
  ?? (process?.env?.EXPO_PUBLIC_API_URL)
  ?? "http://66.55.75.224:8000/api";

async function authFetch<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

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

export async function fetchRecommendations(bucket?: string): Promise<UserRecommendations> {
  const url = bucket 
    ? `${BASE_URL}/feed/recommendations/me?bucket=${encodeURIComponent(bucket)}`
    : `${BASE_URL}/feed/recommendations/me`;
  
  console.log("[recommend] GET", url);

  const json = await authFetch(url);

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