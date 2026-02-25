import type { Session, User } from "@supabase/supabase-js";
import { createContext } from "react";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;

  signIn: (args: { email: string; password: string }) => Promise<void>;
  signUp: (args: { email: string; password: string; metadata?: Record<string, unknown> }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;

  fetchWithAuth: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);