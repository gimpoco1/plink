import type { Game, GameTeam, TeamMember } from "../types";
import { findWinner, isGameComplete, isGameDraw } from "./ranking";
import { getGameDisplayName, getGameSessionLabel } from "./text";
import { areSetsEqual } from "./sets";

export type GameResultSummary = {
  name: string;
  wins: number;
  teamWins: number;
};

export type SessionResultSummary = {
  id: string;
  name: string;
  statusKind: "won" | "lost" | "completed" | "draw" | "in_progress";
  isTeamGame: boolean;
  teamName?: string;
  teamIcon?: string;
  order: number;
};

export type ProfileStats = {
  gamesPlayed: number;
  completedGames: number;
  inProgressGames: number;
  wins: number;
  winRate: number;
  currentWinStreak: number;
  topWonGame: GameResultSummary | null;
  gameResults: GameResultSummary[];
  sessionResults: SessionResultSummary[];
};

export type TeamStats = {
  gamesPlayed: number;
  completedGames: number;
  inProgressGames: number;
  wins: number;
  winRate: number;
  currentWinStreak: number;
  topWonGame: GameResultSummary | null;
  gameResults: GameResultSummary[];
  sessionResults: SessionResultSummary[];
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
    sessionResults: [],
  };
}

export function createEmptyTeamStats(): TeamStats {
  return {
    gamesPlayed: 0,
    completedGames: 0,
    inProgressGames: 0,
    wins: 0,
    winRate: 0,
    currentWinStreak: 0,
    topWonGame: null,
    gameResults: [],
    sessionResults: [],
  };
}

export function computeProfileStats(games: Game[]): Map<string, ProfileStats> {
  const stats = new Map<string, ProfileStats>();
  const winCountsByProfile = new Map<string, Map<string, number>>();
  const teamWinCountsByProfile = new Map<string, Map<string, number>>();
  const playedGamesByProfile = new Map<string, Set<string>>();
  const topWinsByGame = new Map<string, number>();
  const completedHistoryByProfile = new Map<
    string,
    Array<{ won: boolean; score: number; gameName: string; order: number }>
  >();
  const sessionResultsByProfile = new Map<string, SessionResultSummary[]>();

  games.forEach((game) => {
    const winner = findWinner(game.players, game);
    const isComplete = isGameComplete(game);
    const draw = isGameDraw(game);
    const winnerProfileId = winner?.profileId ?? null;
    const winningTeamId =
      game.participantMode === "teams" ? (winner?.teamId ?? null) : null;
    const normalizedGameName = getGameDisplayName(game.name).title;
    const teamsById = new Map(game.teams.map((team) => [team.id, team]));

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

      const wonGame =
        game.participantMode === "teams"
          ? Boolean(winningTeamId && player.teamId === winningTeamId)
          : winnerProfileId === player.profileId;
      const teamName =
        game.participantMode === "teams" && player.teamId
          ? teamsById.get(player.teamId)?.name
          : null;

      if (wonGame) {
        current.wins += 1;
        const gameWins =
          winCountsByProfile.get(player.profileId) ?? new Map<string, number>();
        const nextGameWins = (gameWins.get(normalizedGameName) ?? 0) + 1;
        gameWins.set(normalizedGameName, nextGameWins);
        winCountsByProfile.set(player.profileId, gameWins);

        const teamGameWins =
          teamWinCountsByProfile.get(player.profileId) ??
          new Map<string, number>();
        const nextTeamGameWins =
          (teamGameWins.get(normalizedGameName) ?? 0) +
          (game.participantMode === "teams" ? 1 : 0);
        teamGameWins.set(normalizedGameName, nextTeamGameWins);
        teamWinCountsByProfile.set(player.profileId, teamGameWins);

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
            teamWins: nextTeamGameWins,
          };
        }
      }

      const sessions = sessionResultsByProfile.get(player.profileId) ?? [];
      const statusKind = !isComplete
        ? "in_progress"
        : draw
          ? "draw"
          : wonGame
            ? "won"
            : game.participantMode === "teams"
              ? winningTeamId
                ? "lost"
                : "completed"
              : winnerProfileId
                ? "lost"
                : "completed";
      sessions.push({
        id: `${game.id}:${player.id}`,
        name: getGameSessionLabel(game.name),
        statusKind,
        isTeamGame: game.participantMode === "teams",
        teamName: teamName ?? undefined,
        teamIcon:
          game.participantMode === "teams" && player.teamId
            ? teamsById.get(player.teamId)?.icon
            : undefined,
        order: game.createdAt,
      });
      sessionResultsByProfile.set(player.profileId, sessions);

      current.winRate =
        current.completedGames > 0
          ? Math.round((current.wins / current.completedGames) * 100)
          : 0;

      if (isComplete) {
        const history = completedHistoryByProfile.get(player.profileId) ?? [];
        history.push({
          won: wonGame,
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
    const playedGames =
      playedGamesByProfile.get(profileId) ?? new Set<string>();
    const winCounts =
      winCountsByProfile.get(profileId) ?? new Map<string, number>();
    const teamWinCounts =
      teamWinCountsByProfile.get(profileId) ?? new Map<string, number>();
    current.gameResults = Array.from(playedGames)
      .map((name) => ({
        name,
        wins: winCounts.get(name) ?? 0,
        teamWins: teamWinCounts.get(name) ?? 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name);
      });

    if (current.topWonGame) {
      current.topWonGame.teamWins =
        teamWinCounts.get(current.topWonGame.name) ?? 0;
    }

    current.sessionResults = [
      ...(sessionResultsByProfile.get(profileId) ?? []),
    ].sort((a, b) => b.order - a.order);

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

export function computeTeamStats(
  games: Game[],
  teams: GameTeam[],
  teamMembers: TeamMember[],
): Map<string, TeamStats> {
  const stats = new Map<string, TeamStats>();
  const playedGamesByTeam = new Map<string, Set<string>>();
  const winCountsByTeam = new Map<string, Map<string, number>>();
  const topWinsByGame = new Map<string, number>();
  const sessionResultsByTeam = new Map<string, SessionResultSummary[]>();
  const completedHistoryByTeam = new Map<
    string,
    Array<{ won: boolean; order: number }>
  >();
  const memberIdsBySavedTeamId = new Map<string, Set<string>>();

  teamMembers.forEach((member) => {
    const next = memberIdsBySavedTeamId.get(member.teamId) ?? new Set<string>();
    next.add(member.profileId);
    memberIdsBySavedTeamId.set(member.teamId, next);
  });

  function resolveSavedTeamId(game: Game, gameTeam: Game["teams"][number]) {
    if (gameTeam.sourceTeamId) return gameTeam.sourceTeamId;

    const gameProfileIds = new Set(
      game.players
        .filter(
          (player): player is typeof player & { profileId: string } =>
            player.teamId === gameTeam.id &&
            typeof player.profileId === "string",
        )
        .map((player) => player.profileId),
    );

    if (gameProfileIds.size > 0) {
      const matchingTeamByMembers = teams.find((team) =>
        areSetsEqual(
          gameProfileIds,
          memberIdsBySavedTeamId.get(team.id) ?? new Set<string>(),
        ),
      );

      if (matchingTeamByMembers) return matchingTeamByMembers.id;
    }

    const normalizedGameTeamName = gameTeam.name.trim().toLowerCase();
    const matchingTeamByName = teams.find(
      (team) => team.name.trim().toLowerCase() === normalizedGameTeamName,
    );
    return matchingTeamByName?.id ?? gameTeam.id;
  }

  games.forEach((game) => {
    if (game.participantMode !== "teams") return;

    const winner = findWinner(game.players, game);
    const isComplete = isGameComplete(game);
    const draw = isGameDraw(game);
    const winningTeamId = winner?.teamId ?? null;
    const normalizedGameName = getGameDisplayName(game.name).title;

    game.teams.forEach((team) => {
      const savedTeamId = resolveSavedTeamId(game, team);
      if (!savedTeamId) return;

      const current = stats.get(savedTeamId) ?? createEmptyTeamStats();
      const playedGames =
        playedGamesByTeam.get(savedTeamId) ?? new Set<string>();

      current.gamesPlayed += 1;
      if (isComplete) current.completedGames += 1;
      else current.inProgressGames += 1;

      playedGames.add(normalizedGameName);
      playedGamesByTeam.set(savedTeamId, playedGames);

      const sessions = sessionResultsByTeam.get(savedTeamId) ?? [];
      sessions.push({
        id: `${game.id}:${savedTeamId}`,
        name: getGameSessionLabel(game.name),
        statusKind: !isComplete
          ? "in_progress"
          : draw
            ? "draw"
            : winningTeamId === team.id
              ? "won"
              : winningTeamId
                ? "lost"
                : "completed",
        isTeamGame: true,
        teamIcon: team.icon,
        order: game.createdAt,
      });
      sessionResultsByTeam.set(savedTeamId, sessions);

      if (winningTeamId === team.id) {
        current.wins += 1;
        const teamWins =
          winCountsByTeam.get(savedTeamId) ?? new Map<string, number>();
        const nextGameWins = (teamWins.get(normalizedGameName) ?? 0) + 1;

        teamWins.set(normalizedGameName, nextGameWins);
        winCountsByTeam.set(savedTeamId, teamWins);
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
            teamWins: nextGameWins,
          };
        }
      }

      current.winRate =
        current.completedGames > 0
          ? Math.round((current.wins / current.completedGames) * 100)
          : 0;

      if (isComplete) {
        const history = completedHistoryByTeam.get(savedTeamId) ?? [];
        history.push({
          won: winningTeamId === team.id,
          order: game.endedAt ?? game.updatedAt ?? game.createdAt,
        });
        completedHistoryByTeam.set(savedTeamId, history);
      }

      stats.set(savedTeamId, current);
    });
  });

  stats.forEach((current) => {
    if (!current.topWonGame) return;
    const leaderWins = topWinsByGame.get(current.topWonGame.name) ?? 0;
    if (current.topWonGame.wins < leaderWins) {
      current.topWonGame = null;
    }
  });

  stats.forEach((current, teamId) => {
    const playedGames = playedGamesByTeam.get(teamId) ?? new Set<string>();
    const winCounts = winCountsByTeam.get(teamId) ?? new Map<string, number>();

    current.gameResults = Array.from(playedGames)
      .map((name) => {
        const wins = winCounts.get(name) ?? 0;
        return {
          name,
          wins,
          teamWins: wins,
        };
      })
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name);
      });

    if (current.topWonGame) {
      current.topWonGame.teamWins = winCounts.get(current.topWonGame.name) ?? 0;
    }

    current.sessionResults = [...(sessionResultsByTeam.get(teamId) ?? [])].sort(
      (a, b) => b.order - a.order,
    );

    const history = (completedHistoryByTeam.get(teamId) ?? []).sort(
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
