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

export function formatTeamName(raw: string): string {
  return capitalizeFirst(clampName(raw));
}

export function formatAccountPlayerName(raw: string): string {
  const name = capitalizeFirst(raw);
  return name ? `${name} (You)` : "";
}

export function getInitials(name: string): string {
  const cleanName = name
    .trim()
    .replace(/\s*\(You\)\s*$/i, "")
    .replace(/\s*#\d+\s*$/, "");
  const parts = cleanName.split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  const first = parts[0].slice(0, 1);
  const last = parts[parts.length - 1].slice(0, 1);
  return (first + last).toUpperCase();
}

export function getGameDisplayName(name: string): {
  title: string;
  replayNumber: number | null;
} {
  const normalized = name.trim();
  const replayMatch = normalized.match(/\s+\((\d+)\)$/);
  if (!replayMatch) return { title: normalized, replayNumber: null };

  const replayNumber = Number.parseInt(replayMatch[1], 10);
  if (!Number.isFinite(replayNumber) || replayNumber < 1) {
    return { title: normalized, replayNumber: null };
  }

  return {
    title: normalized.slice(0, replayMatch.index).trim(),
    replayNumber,
  };
}

export function getGameSessionLabel(name: string): string {
  const parsed = getGameDisplayName(name);
  if (parsed.replayNumber) return `${parsed.title} #${parsed.replayNumber}`;
  return parsed.title;
}
