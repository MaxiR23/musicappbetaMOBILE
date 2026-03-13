import type { Session } from "@supabase/supabase-js";
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type AuthState = { session: Session | null; loading: boolean };

export default function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });
  // Solo nos suscribimos y dejamos que esa suscripción haga TODO (incluido el init)
  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (cancelled) return;

      // Evita renders innecesarios: solo cambia si varía el token o si seguimos en loading
      setState(prev => {
        const sameToken = newSession?.access_token === prev.session?.access_token;
        if (sameToken && prev.loading === false) return prev;
        return { session: newSession ?? null, loading: false };
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const signIn: AuthContextValue["signIn"] = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp: AuthContextValue["signUp"] = useCallback(async ({ email, password, metadata }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: metadata?.display_name, ...metadata },
        emailRedirectTo: "beatly://auth/callback",
      },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const fetchWithAuth: AuthContextValue["fetchWithAuth"] = useCallback(
    async <T = unknown>(url: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
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
    },
    [getToken]
  );

  const user = state.session?.user ?? null;

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      session: state.session,
      loading: state.loading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      getToken,
      fetchWithAuth,
    }),
    [user, state.session, state.loading, signIn, signUp, signInWithGoogle, signOut, getToken, fetchWithAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}