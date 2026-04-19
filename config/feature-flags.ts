const OFFLINE_USERS = (process.env.EXPO_PUBLIC_OFFLINE_USERS ?? "").split(",").filter(Boolean);

export function canOffline(uid: string): boolean {
  return OFFLINE_USERS.includes(uid);
}