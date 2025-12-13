export function clampName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 28);
}

export function capitalizeFirst(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPlayerName(raw: string): string {
  return capitalizeFirst(clampName(raw));
}
