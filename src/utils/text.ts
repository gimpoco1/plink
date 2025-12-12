export function clampName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 28);
}

