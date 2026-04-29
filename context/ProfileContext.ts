import { createContext } from "react";
import { Profile, ProfileUpdate, Role } from "../types/profile";

export type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  hasRole: (required: Role) => boolean;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);