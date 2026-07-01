import type { Game } from "../types";
import { findWinner, isGameComplete } from "./ranking";
import { getGameDisplayName } from "./text";

export type ProfileStats = {
  gamesPlayed: number;
  completedGames: number;
  inProgressGames: number;
  wins: number;
  winRate: number;
  currentWinStreak: number;
  topWonGame: { name: string; wins: number } | null;
  gameResults: { name: string; wins: number }[];
};

export function createEmptyProfileStats(): ProfileStats {
  return {
    gamesPlayed: 0,
    completedGames: 0,
    inProgressGames: 0,
    wins: 0,
    winRate: 0,
    currentWinStreak: 0,
    topWonGame: null,
    gameResults: [],
  };
}

export function computeProfileStats(games: Game[]): Map<string, ProfileStats> {
  const stats = new Map<string, ProfileStats>();
  const winCountsByProfile = new Map<string, Map<string, number>>();
  const playedGamesByProfile = new Map<string, Set<string>>();
  const topWinsByGame = new Map<string, number>();
  const completedHistoryByProfile = new Map<
    string,
    Array<{ won: boolean; score: number; gameName: string; order: number }>
  >();

  games.forEach((game) => {
    const winner = findWinner(game.players, game);
    const isComplete = isGameComplete(game);
    const winnerProfileId = winner?.profileId ?? null;
    const normalizedGameName = getGameDisplayName(game.name).title;

    game.players.forEach((player) => {
      if (!player.profileId) return;

      const current = stats.get(player.profileId) ?? createEmptyProfileStats();
      const playedGames =
        playedGamesByProfile.get(player.profileId) ?? new Set<string>();

      current.gamesPlayed += 1;
      playedGames.add(normalizedGameName);
      playedGamesByProfile.set(player.profileId, playedGames);

      if (isComplete) current.completedGames += 1;
      else current.inProgressGames += 1;

      if (winnerProfileId === player.profileId) {
        current.wins += 1;
        const gameWins =
          winCountsByProfile.get(player.profileId) ?? new Map<string, number>();
        const nextGameWins = (gameWins.get(normalizedGameName) ?? 0) + 1;
        gameWins.set(normalizedGameName, nextGameWins);
        winCountsByProfile.set(player.profileId, gameWins);
        topWinsByGame.set(
          normalizedGameName,
          Math.max(topWinsByGame.get(normalizedGameName) ?? 0, nextGameWins),
        );

        if (
          !current.topWonGame ||
          nextGameWins > current.topWonGame.wins ||
          (nextGameWins === current.topWonGame.wins &&
            normalizedGameName.localeCompare(current.topWonGame.name) < 0)
        ) {
          current.topWonGame = {
            name: normalizedGameName,
            wins: nextGameWins,
          };
        }
      }

      current.winRate =
        current.completedGames > 0
          ? Math.round((current.wins / current.completedGames) * 100)
          : 0;

      if (isComplete) {
        const history = completedHistoryByProfile.get(player.profileId) ?? [];
        history.push({
          won: winnerProfileId === player.profileId,
          score: player.score,
          gameName: normalizedGameName,
          order: game.endedAt ?? game.updatedAt ?? game.createdAt,
        });
        completedHistoryByProfile.set(player.profileId, history);
      }

      stats.set(player.profileId, current);
    });
  });

  stats.forEach((current) => {
    if (!current.topWonGame) return;
    const leaderWins = topWinsByGame.get(current.topWonGame.name) ?? 0;
    if (current.topWonGame.wins < leaderWins) {
      current.topWonGame = null;
    }
  });

  stats.forEach((current, profileId) => {
    const playedGames = playedGamesByProfile.get(profileId) ?? new Set<string>();
    const winCounts =
      winCountsByProfile.get(profileId) ?? new Map<string, number>();
    current.gameResults = Array.from(playedGames)
      .map((name) => ({
        name,
        wins: winCounts.get(name) ?? 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name);
      });

    const history = (completedHistoryByProfile.get(profileId) ?? []).sort(
      (a, b) => a.order - b.order,
    );
    let currentStreak = 0;
    for (const entry of history) {
      if (entry.won) {
        currentStreak += 1;
      } else {
        currentStreak = 0;
      }
    }
    current.currentWinStreak = currentStreak;
  });

  return stats;
}
