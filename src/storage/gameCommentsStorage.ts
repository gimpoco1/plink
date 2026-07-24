import type { GameComment } from "../types";

const STORAGE_PREFIX = "plink.game-comments:";

function storageKey(gameId: string) {
  return `${STORAGE_PREFIX}${gameId}`;
}

function sanitizeComments(input: unknown, gameId: string): GameComment[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const item = value as Record<string, unknown>;
      if (
        typeof item.id !== "string" ||
        typeof item.body !== "string" ||
        typeof item.authorName !== "string" ||
        typeof item.authorAvatarColor !== "string" ||
        typeof item.createdAt !== "number" ||
        typeof item.updatedAt !== "number"
      ) {
        return null;
      }
      return {
        id: item.id,
        gameId,
        authorUserId: "local",
        authorName: item.authorName,
        authorAvatarColor: item.authorAvatarColor,
        body: item.body,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      } satisfies GameComment;
    })
    .filter(Boolean) as GameComment[];
}

export function loadLocalGameComments(gameId: string) {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    return raw ? sanitizeComments(JSON.parse(raw) as unknown, gameId) : [];
  } catch {
    return [];
  }
}

export function saveLocalGameComments(
  gameId: string,
  comments: GameComment[],
) {
  localStorage.setItem(storageKey(gameId), JSON.stringify(comments));
}
