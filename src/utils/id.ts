export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

