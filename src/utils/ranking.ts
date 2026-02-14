import type { Player } from "../types";

export function sortPlayers(
  a: Player,
  b: Player,
  isLowScoreWins = false,
): number {
  if (a.score !== b.score) {
    return isLowScoreWins ? a.score - b.score : b.score - a.score;
  }
  if (a.reachedAt !== b.reachedAt) return a.reachedAt - b.reachedAt;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.name.localeCompare(b.name);
}

export function hasReachedTarget(players: Player[], targetPoints: number): boolean {
  return players.some((p) => p.score >= targetPoints);
}

export function findWinner(
  players: Player[],
  targetPoints: number,
  isLowScoreWins = false,
): Player | null {
  if (!players.length || !hasReachedTarget(players, targetPoints)) return null;
  const sorted = [...players].sort((a, b) =>
    sortPlayers(a, b, isLowScoreWins),
  );
  return sorted[0] ?? null;
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
