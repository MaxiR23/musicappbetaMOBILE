// src/utils/avatar.ts
export const GRADIENTS: [string, string][] = [
  ["#ff9966", "#ff5e62"],
  ["#36D1DC", "#5B86E5"],
  ["#a18cd1", "#fbc2eb"],
  ["#7F00FF", "#E100FF"],
  ["#00c6ff", "#0072ff"],
  ["#11998e", "#38ef7d"],
  ["#f7971e", "#ffd200"],
  ["#fc5c7d", "#6a82fb"],
];

export function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function pickGradient(seed: string) {
  const idx = hashStr(seed) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "U";
  const name = nameOrEmail.trim();
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base.split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return initials.toUpperCase() || "U";
}