import { API_URL } from "@/constants/config";
import { supabase } from "../lib/supabase";
import { BugReport, BugReportCreate, BugReportUpdate, BugStatus } from "../types/bugReport";

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

export const bugReportService = {
  create: async (payload: BugReportCreate): Promise<BugReport> => {
    return authFetch(`${API_URL}/bug-reports`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listMine: async (limit = 50): Promise<BugReport[]> => {
    return authFetch(`${API_URL}/bug-reports/me?limit=${limit}`);
  },
  listAll: async (options?: { status?: BugStatus; limit?: number }): Promise<BugReport[]> => {
    const params = new URLSearchParams();
    if (options?.status) params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString();
    return authFetch(`${API_URL}/bug-reports${qs ? `?${qs}` : ""}`);
  },
  updateStatus: async (id: string, payload: BugReportUpdate): Promise<BugReport> => {
    return authFetch(`${API_URL}/bug-reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};