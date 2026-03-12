import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";

const BASE_URL =
  (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL)
  ?? (process?.env?.EXPO_PUBLIC_API_URL)
  ?? "http://34.39.241.17:8000/api";

export async function fetchFeed({ kind = "most_played", type = "album", store = "AR", limit = 25 } = {}) {
  const url =
    kind === "new_releases"
      ? `${BASE_URL}/feed/db/new-releases?limit=${encodeURIComponent(limit)}`
      : kind === "new_singles"
        ? `${BASE_URL}/feed/db/new-singles?limit=${encodeURIComponent(limit)}`
        : kind === "seed_tracks"
          ? `${BASE_URL}/feed/db/seed-tracks?limit=${encodeURIComponent(limit)}`
          : `${BASE_URL}/feed/most-played?limit=${encodeURIComponent(limit)}`;
  console.log("[feed] GET", url);

  // auth como en authFetch
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch (err: any) {
    console.warn("[feed] NETWORK ERROR:", err?.message || err);
    throw err;
  }

  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { }
    console.warn(`[feed] HTTP ${res.status} ${res.statusText} — body:`, (body || "").slice(0, 1200));
    throw new Error(`feed ${kind}/${type}: ${res.status}`);
  }

  let json: any;
  try { json = await res.json(); }
  catch (err: any) {
    let body = ""; try { body = await res.text(); } catch { }
    console.warn("[feed] JSON PARSE ERROR:", err?.message || err, "— raw body:", (body || "").slice(0, 1200));
    throw err;
  }

  const toAlbum = (a: any) => ({
    kind,
    type: "album",
    id: a.id,
    title: a.title,
    artist: a.artist,
    thumb: a.thumb,
    url: a.url,
    year: a.year ? Number(a.year) : null,
    track_count: a.track_count ? Number(a.track_count) : null,
    release_date: a.release_date || a.releaseDate || null,
    artist_id: null,
    album: null,
    duration: null,
    duration_seconds: null,
  });

  const toTrack = (t: any) => ({
    kind,
    type: "track",
    id: t.id,
    title: t.title,
    artist: t.artist,
    thumb: t.thumb,
    url: t.url,
    artist_id: t.artist_id ?? null,
    album: t.album ?? null,
    album_id: t.album_id ?? null,
    duration: t.duration ?? null,
    duration_seconds: typeof t.duration_seconds === "number" ? t.duration_seconds : null,
    year: null,
    track_count: null,
    release_date: t.release_date || null,
  });

  if (kind === "new_releases") {
    const albums = Array.isArray(json.new_releases) ? json.new_releases : [];
    return albums.map(toAlbum).slice(0, limit);
  } else {
    const albums = Array.isArray(json.albums) ? json.albums.map(toAlbum) : [];
    const tracks = Array.isArray(json.tracks) ? json.tracks.map(toTrack) : [];
    return (type === "track" ? tracks : albums).slice(0, limit);
  }
}