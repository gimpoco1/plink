import type { Game, Player } from "../types";
import { getGameParticipants } from "./gameParticipants";
import { hasGameEnded, shouldSortLowToHigh } from "./scoring";

export function sortPlayers(
  a: Player,
  b: Player,
  lowToHigh = false,
): number {
  if (a.score !== b.score) {
    return lowToHigh ? a.score - b.score : b.score - a.score;
  }
  if (a.reachedAt !== b.reachedAt) return a.reachedAt - b.reachedAt;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.name.localeCompare(b.name);
}

export function findWinner(
  players: Player[],
  game: Pick<
    Game,
    | "participantMode"
    | "teams"
    | "scoreDirection"
    | "targetScore"
    | "winCondition"
    | "winByTwo"
    | "manualEndOnly"
    | "endedAt"
  >,
): Player | null {
  if (!players.length || !hasGameEnded(players, game)) return null;
  const sorted = getGameParticipants({
    participantMode: game.participantMode,
    players,
    teams: game.teams ?? [],
  }).sort((a, b) =>
    sortPlayers(a, b, shouldSortLowToHigh(game)),
  );
  const winner = sorted[0] ?? null;
  if (!winner) return null;
  const tiedWinner = sorted[1];
  if (tiedWinner && tiedWinner.score === winner.score) return null;
  return winner.members[0] ?? null;
}

export function isGameComplete(
  game: Pick<
    Game,
    | "players"
    | "participantMode"
    | "teams"
    | "scoreDirection"
    | "targetScore"
    | "winCondition"
    | "winByTwo"
    | "manualEndOnly"
    | "endedAt"
  >,
) {
  return hasGameEnded(game.players, game);
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
