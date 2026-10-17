import type { Game } from "../../types";

export function selectLiveScoreGame(games: Game[]): Game | null {
  return [...games]
    .filter((game) => game.participantMode !== "teams" && game.players.length >= 2 && game.players.length <= 3 && game.endedAt === undefined)
    .sort((first, second) => second.createdAt - first.createdAt || second.id.localeCompare(first.id))[0] ?? null;
}
