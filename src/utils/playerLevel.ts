import type { Game } from "../types";
import { getGameParticipants } from "./gameParticipants";
import { findWinner, isGameComplete, isGameDraw } from "./ranking";

export const INITIAL_PLAYER_LEVEL = 5;
const MIN_LEVEL = 1;
const MAX_LEVEL = 10;
const INITIAL_CHANGE_FACTOR = 0.9;
const MIN_CHANGE_FACTOR = 0.25;
const LEVEL_SPREAD = 4;

type RatingState = {
  rating: number;
  ratedGames: number;
};

export type ComputedPlayerLevel = {
  level: number;
  ratedGames: number;
};

function clampLevel(level: number) {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

function expectedResult(level: number, opponentLevel: number) {
  return 1 / (1 + 10 ** ((opponentLevel - level) / LEVEL_SPREAD));
}

function changeFactor(ratedGames: number) {
  return Math.max(
    MIN_CHANGE_FACTOR,
    INITIAL_CHANGE_FACTOR / Math.sqrt(1 + ratedGames / 6),
  );
}

export function calculatePlayerLevelChange(
  level: number,
  opponentLevel: number,
  result: 0 | 0.5 | 1,
  ratedGames: number,
) {
  return changeFactor(ratedGames) * (result - expectedResult(level, opponentLevel));
}

function gameOrder(game: Game) {
  return game.endedAt ?? game.updatedAt ?? game.createdAt;
}

/**
 * Replays rated games chronologically so every result uses the levels that all
 * participants had when that game ended. Players begin provisionally at 5.0.
 */
export function computePlayerLevels(games: Game[]) {
  const states = new Map<string, RatingState>();
  const completedGames = games
    .filter((game) => isGameComplete(game))
    .sort((left, right) => {
      const orderDifference = gameOrder(left) - gameOrder(right);
      return orderDifference || left.id.localeCompare(right.id);
    });

  completedGames.forEach((game) => {
    const participants = getGameParticipants(game);
    if (participants.length < 2) return;

    const winner = findWinner(game.players, game);
    const draw = isGameDraw(game);
    const winningParticipantId = winner
      ? participants.find((participant) =>
          participant.members.some((member) => member.id === winner.id),
        )?.id
      : null;

    // A manually completed game without a winner has no competitive result.
    if (!draw && !winningParticipantId) return;

    const participantLevels = new Map(
      participants.map((participant) => {
        const memberLevels = participant.members.map((member) =>
          member.profileId
            ? (states.get(member.profileId)?.rating ?? INITIAL_PLAYER_LEVEL)
            : INITIAL_PLAYER_LEVEL,
        );
        const level =
          memberLevels.reduce((sum, memberLevel) => sum + memberLevel, 0) /
          memberLevels.length;
        return [participant.id, level] as const;
      }),
    );

    const updates = new Map<string, number>();
    participants.forEach((participant) => {
      const opponents = participants.filter(
        (opponent) => opponent.id !== participant.id,
      );
      const participantLevel =
        participantLevels.get(participant.id) ?? INITIAL_PLAYER_LEVEL;
      const expected =
        opponents.reduce(
          (sum, opponent) =>
            sum +
            expectedResult(
              participantLevel,
              participantLevels.get(opponent.id) ?? INITIAL_PLAYER_LEVEL,
            ),
          0,
        ) / opponents.length;
      const actual = draw
        ? 0.5
        : participant.id === winningParticipantId
          ? 1
          : opponents.reduce(
                (sum, opponent) =>
                  sum + (opponent.id === winningParticipantId ? 0 : 0.5),
                0,
              ) / opponents.length;

      participant.members.forEach((member) => {
        if (!member.profileId) return;
        const current = states.get(member.profileId) ?? {
          rating: INITIAL_PLAYER_LEVEL,
          ratedGames: 0,
        };
        updates.set(
          member.profileId,
          clampLevel(
            current.rating +
              changeFactor(current.ratedGames) * (actual - expected),
          ),
        );
      });
    });

    updates.forEach((rating, profileId) => {
      const current = states.get(profileId) ?? {
        rating: INITIAL_PLAYER_LEVEL,
        ratedGames: 0,
      };
      states.set(profileId, {
        rating,
        ratedGames: current.ratedGames + 1,
      });
    });
  });

  return new Map<string, ComputedPlayerLevel>(
    [...states].map(([profileId, state]) => [
      profileId,
      {
        level: Math.round(state.rating * 10) / 10,
        ratedGames: state.ratedGames,
      },
    ]),
  );
}

export function getPlayerLevel(stats?: {
  level: number | null;
}): number | null {
  if (!stats || stats.level === null) return null;
  return stats.level;
}
