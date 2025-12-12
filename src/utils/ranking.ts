import type { Player } from "../types";

export function sortPlayers(a: Player, b: Player): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.reachedAt !== b.reachedAt) return a.reachedAt - b.reachedAt;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.name.localeCompare(b.name);
}

export function computeRanks(sortedPlayers: Player[]): Map<string, number> {
  const ranks = new Map<string, number>();
  let currentRank = 1;
  let lastScore: number | null = null;
  let seen = 0;
  for (const player of sortedPlayers) {
    seen++;
    if (lastScore === null || player.score !== lastScore) currentRank = seen;
    ranks.set(player.id, currentRank);
    lastScore = player.score;
  }
  return ranks;
}

