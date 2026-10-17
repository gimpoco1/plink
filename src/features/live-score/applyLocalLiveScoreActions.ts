import type { Game, LiveScoreLocalAction } from "../../types";
import { MAX_ABS_SCORE } from "../../constants";
import { clampScoreForGame, hasGameEnded } from "../../utils/scoring";

export function applyLocalLiveScoreActions(
  games: Game[],
  actions: LiveScoreLocalAction[],
): Game[] {
  return actions.reduce((currentGames, action) => {
    const game = currentGames.find((candidate) => candidate.id === action.gameId);
    if (!game) throw new Error(`Cannot restore Lock Screen score: game ${action.gameId} is missing.`);
    if (game.scoreHistory.some((entry) => entry.id === action.id)) return currentGames;
    if (game.isShared) throw new Error(`Cannot import local scores into shared game ${game.id}.`);
    const player = game.players.find((candidate) => candidate.id === action.playerId);
    if (!player) throw new Error(`Cannot restore Lock Screen score: player ${action.playerId} is missing from game ${game.id}.`);
    const scoreAfter = clampScoreForGame(player.score + action.delta, game,
      (value) => Math.max(-MAX_ABS_SCORE, Math.min(MAX_ABS_SCORE, value)));
    const players = game.players.map((candidate) => candidate.id === player.id
      ? { ...candidate, score: scoreAfter, reachedAt: action.createdAt }
      : candidate);
    const updated: Game = {
      ...game,
      players,
      updatedAt: Math.max(game.updatedAt + 1, action.createdAt),
      completionMode: undefined,
      endedAt: hasGameEnded(players, { ...game, endedAt: undefined }) ? action.createdAt : undefined,
      scoreHistory: [{
        id: action.id,
        playerId: player.id,
        playerName: player.name,
        avatarColor: player.avatarColor,
        delta: scoreAfter - player.score,
        scoreBefore: player.score,
        scoreAfter,
        createdAt: action.createdAt,
      }, ...game.scoreHistory],
    };
    return currentGames.map((candidate) => candidate.id === game.id ? updated : candidate);
  }, games);
}
