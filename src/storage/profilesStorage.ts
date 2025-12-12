import type { PlayerProfile } from "../types";
import { PROFILES_STORAGE_KEY } from "../constants";

export function loadProfiles(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const obj = p as Record<string, unknown>;
        if (
          typeof obj.id !== "string" ||
          typeof obj.name !== "string" ||
          typeof obj.avatarColor !== "string" ||
          typeof obj.createdAt !== "number"
        ) {
          return null;
        }
        return {
          id: obj.id,
          name: obj.name,
          avatarColor: obj.avatarColor,
          createdAt: obj.createdAt,
        } satisfies PlayerProfile;
      })
      .filter(Boolean) as PlayerProfile[];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: PlayerProfile[]) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

