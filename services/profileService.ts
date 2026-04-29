import { API_URL } from "@/constants/config";
import { supabase } from "../lib/supabase";
import { Profile, ProfileUpdate } from "../types/profile";

async function authFetch<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers, redirect: "error" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

export const profileService = {
  getMyProfile: async (): Promise<Profile> => {
    return authFetch(`${API_URL}/profile/me`);
  },
  updateMyProfile: async (update: ProfileUpdate): Promise<Profile> => {
    return authFetch(`${API_URL}/profile/me`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
  },
};