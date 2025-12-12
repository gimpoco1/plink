import type { Player } from "../types";
import { STORAGE_KEY } from "../constants";

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
          typeof obj.score !== "number" ||
          typeof obj.createdAt !== "number"
        ) {
          return null;
        }
        const reachedAt = typeof obj.reachedAt === "number" ? obj.reachedAt : (obj.createdAt as number);
        const avatarColor = typeof obj.avatarColor === "string" ? obj.avatarColor : "#64748b";
        return {
          id: obj.id,
          name: obj.name,
          score: obj.score,
          createdAt: obj.createdAt,
          reachedAt,
          avatarColor,
        } satisfies Player;
      })
      .filter(Boolean) as Player[];
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}
