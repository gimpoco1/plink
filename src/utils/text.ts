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

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  const first = parts[0].slice(0, 1);
  const last = parts[parts.length - 1].slice(0, 1);
  return (first + last).toUpperCase();
}
