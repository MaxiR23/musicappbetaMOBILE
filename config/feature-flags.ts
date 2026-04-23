const OFFLINE_USERS = [
  process.env.EXPO_PUBLIC_OFFLINE_USER_1,
  process.env.EXPO_PUBLIC_OFFLINE_USER_2,
].filter(Boolean) as string[];

export function canOffline(uid: string): boolean {
  return OFFLINE_USERS.includes(uid);
}