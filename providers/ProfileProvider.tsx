import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { ProfileContext, type ProfileContextValue } from "../context/ProfileContext";
import { useAuth } from "../hooks/use-auth";
import { profileService } from "../services/profileService";
import { hasRoleOrHigher, Profile, ProfileUpdate, Role } from "../types/profile";

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
};

export default function ProfileProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  const loadProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const profile = await profileService.getMyProfile();
      setState({ profile, loading: false, error: null });
    } catch (e: any) {
      setState({ profile: null, loading: false, error: e?.message ?? "profile_load_failed" });
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setState({ profile: null, loading: false, error: null });
      return;
    }
    loadProfile();
  }, [authLoading, isAuthenticated, loadProfile]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    await loadProfile();
  }, [isAuthenticated, loadProfile]);

  const updateProfile = useCallback(async (update: ProfileUpdate) => {
    const updated = await profileService.updateMyProfile(update);
    setState(prev => ({ ...prev, profile: updated }));
  }, []);

  const hasRole = useCallback((required: Role) => {
    if (!state.profile) return false;
    return hasRoleOrHigher(state.profile.role, required);
  }, [state.profile]);

  const value: ProfileContextValue = useMemo(() => ({
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    refresh,
    updateProfile,
    hasRole,
  }), [state.profile, state.loading, state.error, refresh, updateProfile, hasRole]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}