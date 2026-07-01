import type { Game, Player } from "../types";

export function shouldSortLowToHigh(game: Pick<Game, "scoreDirection" | "winCondition">) {
  return game.scoreDirection === "down" || game.winCondition === "lowest";
}

export function hasGameEnded(
  players: Player[],
  game: Pick<
    Game,
    "targetScore" | "winCondition" | "winByTwo" | "manualEndOnly" | "endedAt"
  >,
) {
  if (!players.length) return false;
  if (typeof game.endedAt === "number") return true;
  if (game.manualEndOnly) return false;

  if (game.winCondition === "reach_zero") {
    return players.some((player) => player.score <= game.targetScore);
  }

  if (game.winByTwo && game.winCondition === "lowest") {
    if (players.length < 2) return false;
    const sorted = [...players].sort((a, b) => a.score - b.score);
    const leader = sorted[0];
    const runnerUp = sorted[1];
    return (
      players.some((player) => player.score >= game.targetScore) &&
      runnerUp.score - leader.score >= 2
    );
  }

  if (game.winByTwo && game.winCondition === "reach_target") {
    if (players.length < 2) return false;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const leader = sorted[0];
    const runnerUp = sorted[1];
    return (
      leader.score >= game.targetScore &&
      leader.score - runnerUp.score >= 2
    );
  }

  return players.some((player) => player.score >= game.targetScore);
}

export function clampScoreForGame(
  nextScore: number,
  game: Pick<Game, "targetScore" | "winCondition">,
  clampScore: (value: number) => number,
) {
  const clamped = clampScore(nextScore);
  if (game.winCondition === "reach_zero") {
    return Math.max(game.targetScore, clamped);
  }
  return clamped;
}
