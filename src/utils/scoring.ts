import { DEFAULT_QUICK_SCORE_VALUES, MAX_ABS_SCORE } from "../constants";
import type { Game, Player, QuickScoreValues } from "../types";
import { getGameParticipants } from "./gameParticipants";

export function sanitizeQuickScoreValues(input: unknown): QuickScoreValues {
  if (!Array.isArray(input) || input.length < 2) {
    return [...DEFAULT_QUICK_SCORE_VALUES];
  }

  const values = input.slice(0, 2).map((value) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.trunc(value)
      : Number.NaN,
  );
  const valid = values.every(
    (value) => value > 0 && value <= MAX_ABS_SCORE,
  );

  if (!valid || values[0] === values[1]) {
    return [...DEFAULT_QUICK_SCORE_VALUES];
  }

  return values[0] < values[1]
    ? [values[0], values[1]]
    : [values[1], values[0]];
}

export function shouldSortLowToHigh(game: Pick<Game, "scoreDirection" | "winCondition">) {
  return game.scoreDirection === "down" || game.winCondition === "lowest";
}

export function hasGameEnded(
  players: Player[],
  game: Pick<
    Game,
    | "participantMode"
    | "teams"
    | "targetScore"
    | "winCondition"
    | "winByTwo"
    | "manualEndOnly"
    | "endedAt"
  >,
) {
  const participants = getGameParticipants({
    participantMode: game.participantMode,
    players,
    teams: game.teams ?? [],
  });
  if (!participants.length) return false;
  if (typeof game.endedAt === "number") return true;
  if (game.manualEndOnly) return false;

  if (game.winCondition === "reach_zero") {
    return participants.some((player) => player.score <= game.targetScore);
  }

  if (game.winByTwo && game.winCondition === "lowest") {
    if (participants.length < 2) return false;
    const sorted = [...participants].sort((a, b) => a.score - b.score);
    const leader = sorted[0];
    const runnerUp = sorted[1];
    return (
      participants.some((player) => player.score >= game.targetScore) &&
      runnerUp.score - leader.score >= 2
    );
  }

  if (game.winByTwo && game.winCondition === "reach_target") {
    if (participants.length < 2) return false;
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const leader = sorted[0];
    const runnerUp = sorted[1];
    return (
      leader.score >= game.targetScore &&
      leader.score - runnerUp.score >= 2
    );
  }

  return participants.some((player) => player.score >= game.targetScore);
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
