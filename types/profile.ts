export type Role = "admin" | "developer" | "tester" | "user";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  tester: 1,
  developer: 2,
  admin: 3,
};

export function hasRoleOrHigher(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}