import type { Game } from "../../types";
import { isGameComplete } from "../../utils/ranking";

export function selectLiveScoreGame(games: Game[]): Game | null {
  return [...games]
    .filter((game) => game.participantMode !== "teams" && game.players.length >= 2 && game.players.length <= 3 && !isGameComplete(game))
    .sort((first, second) => second.createdAt - first.createdAt || second.id.localeCompare(first.id))[0] ?? null;
}
