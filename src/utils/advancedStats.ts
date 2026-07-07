import type { Game, GameTeam, PlayerProfile, TeamMember } from "../types";
import { getGameParticipants } from "./gameParticipants";
import { computeRanks, findWinner, isGameComplete, isGameDraw, sortPlayers } from "./ranking";
import { shouldSortLowToHigh } from "./scoring";
import { getGameDisplayName, getGameSessionLabel } from "./text";

export type ReportKind = "players" | "teams";
export type ReportStatusKind =
  | "won"
  | "lost"
  | "draw"
  | "completed"
  | "in_progress";

export type ReportTrendPoint = {
  id: string;
  timestamp: number;
  label: string;
  fullDateLabel: string;
  fullDateTimeLabel: string;
  sessionName: string;
  resultKind: ReportStatusKind;
  placement: number | null;
  placementMax: number;
  cumulativeWins: number;
  cumulativeCompleted: number;
  cumulativeWinRate: number;
};

export type ReportSession = {
  id: string;
  sessionName: string;
  gameName: string;
  createdAt: number;
  dateLabel: string;
  resultKind: ReportStatusKind;
  isTeamGame: boolean;
  placement: number | null;
  placementMax: number;
  teamName?: string;
  teamIcon?: string;
};

export type ReportGameBreakdown = {
  name: string;
  sessions: number;
  wins: number;
  losses: number;
  draws: number;
  completed: number;
  inProgress: number;
  winRate: number;
};

export type SubjectReport = {
  id: string;
  kind: ReportKind;
  name: string;
  avatarColor?: string;
  icon?: string;
  isAccountPlayer?: boolean;
  memberIds: string[];
  gamesPlayed: number;
  completedGames: number;
  inProgressGames: number;
  wins: number;
  losses: number;
  draws: number;
  completedWithoutWinner: number;
  winRate: number;
  currentWinStreak: number;
  averagePlacement: number | null;
  bestPlacement: number | null;
  sessions: ReportSession[];
  trend: ReportTrendPoint[];
  gameBreakdown: ReportGameBreakdown[];
};

function resolveStatusKind({
  isComplete,
  isDraw,
  won,
  hasWinner,
}: {
  isComplete: boolean;
  isDraw: boolean;
  won: boolean;
  hasWinner: boolean;
}): ReportStatusKind {
  if (!isComplete) return "in_progress";
  if (isDraw) return "draw";
  if (won) return "won";
  if (hasWinner) return "lost";
  return "completed";
}

function createEmptyBreakdown(name: string): ReportGameBreakdown {
  return {
    name,
    sessions: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    completed: 0,
    inProgress: 0,
    winRate: 0,
  };
}

function computePlacement(
  game: Game,
  participantId: string | null,
): { placement: number | null; placementMax: number } {
  const participants = getGameParticipants(game);
  if (!participants.length || !participantId) {
    return { placement: null, placementMax: participants.length };
  }

  const sorted = [...participants].sort((a, b) =>
    sortPlayers(a, b, shouldSortLowToHigh(game)),
  );
  const ranks = computeRanks(sorted);
  return {
    placement: ranks.get(participantId) ?? null,
    placementMax: participants.length,
  };
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function finalizeReport(
  report: SubjectReport,
  breakdownByName: Map<string, ReportGameBreakdown>,
  dateFormat: Intl.DateTimeFormat,
  dateTimeFormat: Intl.DateTimeFormat,
) {
  const completedSessions = [...report.sessions]
    .filter((entry) => entry.resultKind !== "in_progress")
    .sort((a, b) => a.createdAt - b.createdAt);

  let currentWinStreak = 0;
  for (const session of completedSessions) {
    if (session.resultKind === "won") currentWinStreak += 1;
    else currentWinStreak = 0;
  }
  report.currentWinStreak = currentWinStreak;

  const completedPlacements = completedSessions
    .map((entry) => entry.placement)
    .filter((value): value is number => typeof value === "number");
  if (completedPlacements.length > 0) {
    report.averagePlacement = roundToSingleDecimal(
      completedPlacements.reduce((sum, value) => sum + value, 0) /
        completedPlacements.length,
    );
    report.bestPlacement = Math.min(...completedPlacements);
  }

  report.winRate =
    report.completedGames > 0
      ? Math.round((report.wins / report.completedGames) * 100)
      : 0;

  report.sessions.sort((a, b) => b.createdAt - a.createdAt);
  report.gameBreakdown = [...breakdownByName.values()]
    .map((entry) => ({
      ...entry,
      winRate:
        entry.sessions - entry.inProgress > 0
          ? Math.round((entry.wins / (entry.sessions - entry.inProgress)) * 100)
          : 0,
    }))
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

  const ascendingSessions = [...report.sessions].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  let cumulativeWins = 0;
  let cumulativeCompleted = 0;
  report.trend = ascendingSessions.map((session) => {
    if (session.resultKind === "won") cumulativeWins += 1;
    if (session.resultKind !== "in_progress") cumulativeCompleted += 1;
    return {
      id: session.id,
      timestamp: session.createdAt,
      label: dateFormat.format(new Date(session.createdAt)),
      fullDateLabel: session.dateLabel,
      fullDateTimeLabel: dateTimeFormat.format(new Date(session.createdAt)),
      sessionName: session.sessionName,
      resultKind: session.resultKind,
      placement: session.placement,
      placementMax: session.placementMax,
      cumulativeWins,
      cumulativeCompleted,
      cumulativeWinRate:
        cumulativeCompleted > 0
          ? Math.round((cumulativeWins / cumulativeCompleted) * 100)
          : 0,
    };
  });
}

function buildTeamResolver(teams: GameTeam[], teamMembers: TeamMember[]) {
  const savedTeamIds = new Set(teams.map((team) => team.id));
  const memberIdsBySavedTeamId = new Map<string, Set<string>>();

  teamMembers.forEach((member) => {
    const next = memberIdsBySavedTeamId.get(member.teamId) ?? new Set<string>();
    next.add(member.profileId);
    memberIdsBySavedTeamId.set(member.teamId, next);
  });

  function areSetsEqual<T>(left: Set<T>, right: Set<T>) {
    if (left.size !== right.size) return false;
    for (const value of left) {
      if (!right.has(value)) return false;
    }
    return true;
  }

  return function resolveSavedTeamId(game: Game, gameTeam: Game["teams"][number]) {
    if (gameTeam.sourceTeamId && savedTeamIds.has(gameTeam.sourceTeamId)) {
      return gameTeam.sourceTeamId;
    }

    const gameProfileIds = new Set(
      game.players
        .filter(
          (player): player is typeof player & { profileId: string } =>
            player.teamId === gameTeam.id && typeof player.profileId === "string",
        )
        .map((player) => player.profileId),
    );

    if (gameProfileIds.size > 0) {
      const matchingTeam = teams.find((team) =>
        areSetsEqual(
          gameProfileIds,
          memberIdsBySavedTeamId.get(team.id) ?? new Set<string>(),
        ),
      );
      if (matchingTeam) return matchingTeam.id;
    }

    const normalizedName = gameTeam.name.trim().toLowerCase();
    const matchingByName = teams.find(
      (team) => team.name.trim().toLowerCase() === normalizedName,
    );
    return matchingByName?.id ?? null;
  };
}

export function buildPlayerReports(
  games: Game[],
  profiles: PlayerProfile[],
): Map<string, SubjectReport> {
  const reports = new Map<string, SubjectReport>();
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  profiles.forEach((profile) => {
    reports.set(profile.id, {
      id: profile.id,
      kind: "players",
      name: profile.name,
      avatarColor: profile.avatarColor,
      isAccountPlayer: profile.isAccountPlayer,
      memberIds: [profile.id],
      gamesPlayed: 0,
      completedGames: 0,
      inProgressGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      completedWithoutWinner: 0,
      winRate: 0,
      currentWinStreak: 0,
      averagePlacement: null,
      bestPlacement: null,
      sessions: [],
      trend: [],
      gameBreakdown: [],
    });
  });

  const breakdownByProfileId = new Map<string, Map<string, ReportGameBreakdown>>();

  games.forEach((game) => {
    const winner = findWinner(game.players, game);
    const isComplete = isGameComplete(game);
    const isDraw = isGameDraw(game);
    const gameName = getGameDisplayName(game.name).title;
    const sessionName = getGameSessionLabel(game.name);
    const teamsById = new Map(game.teams.map((team) => [team.id, team]));

    game.players.forEach((player) => {
      if (!player.profileId) return;
      const report = reports.get(player.profileId);
      if (!report) return;

      const won =
        game.participantMode === "teams"
          ? Boolean(winner?.teamId && winner.teamId === player.teamId)
          : winner?.profileId === player.profileId;
      const resultKind = resolveStatusKind({
        isComplete,
        isDraw,
        won,
        hasWinner: Boolean(winner),
      });
      const participantId =
        game.participantMode === "teams" && player.teamId
          ? `team:${player.teamId}`
          : player.id;
      const placement = computePlacement(game, participantId);

      report.gamesPlayed += 1;
      if (isComplete) report.completedGames += 1;
      else report.inProgressGames += 1;

      if (resultKind === "won") report.wins += 1;
      if (resultKind === "lost") report.losses += 1;
      if (resultKind === "draw") report.draws += 1;
      if (resultKind === "completed") report.completedWithoutWinner += 1;

      report.sessions.push({
        id: `${game.id}:${player.id}`,
        sessionName,
        gameName,
        createdAt: game.createdAt,
        dateLabel: dateFormat.format(new Date(game.createdAt)),
        resultKind,
        isTeamGame: game.participantMode === "teams",
        placement: placement.placement,
        placementMax: placement.placementMax,
        teamName:
          game.participantMode === "teams" && player.teamId
            ? teamsById.get(player.teamId)?.name
            : undefined,
        teamIcon:
          game.participantMode === "teams" && player.teamId
            ? teamsById.get(player.teamId)?.icon
            : undefined,
      });

      const breakdownMap =
        breakdownByProfileId.get(player.profileId) ??
        new Map<string, ReportGameBreakdown>();
      const breakdown =
        breakdownMap.get(gameName) ?? createEmptyBreakdown(gameName);
      breakdown.sessions += 1;
      if (resultKind === "in_progress") breakdown.inProgress += 1;
      if (resultKind === "won") breakdown.wins += 1;
      if (resultKind === "lost") breakdown.losses += 1;
      if (resultKind === "draw") breakdown.draws += 1;
      if (resultKind === "completed") breakdown.completed += 1;
      breakdownMap.set(gameName, breakdown);
      breakdownByProfileId.set(player.profileId, breakdownMap);
    });
  });

  reports.forEach((report, profileId) => {
    finalizeReport(
      report,
      breakdownByProfileId.get(profileId) ?? new Map<string, ReportGameBreakdown>(),
      dateFormat,
      dateTimeFormat,
    );
  });

  return reports;
}

export function buildTeamReports(
  games: Game[],
  teams: GameTeam[],
  teamMembers: TeamMember[],
): Map<string, SubjectReport> {
  const reports = new Map<string, SubjectReport>();
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const membersByTeamId = new Map<string, string[]>();

  teamMembers.forEach((member) => {
    const next = membersByTeamId.get(member.teamId) ?? [];
    next.push(member.profileId);
    membersByTeamId.set(member.teamId, next);
  });

  teams.forEach((team) => {
    reports.set(team.id, {
      id: team.id,
      kind: "teams",
      name: team.name,
      icon: team.icon,
      memberIds: membersByTeamId.get(team.id) ?? [],
      gamesPlayed: 0,
      completedGames: 0,
      inProgressGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      completedWithoutWinner: 0,
      winRate: 0,
      currentWinStreak: 0,
      averagePlacement: null,
      bestPlacement: null,
      sessions: [],
      trend: [],
      gameBreakdown: [],
    });
  });

  const resolveSavedTeamId = buildTeamResolver(teams, teamMembers);
  const breakdownByTeamId = new Map<string, Map<string, ReportGameBreakdown>>();

  games.forEach((game) => {
    if (game.participantMode !== "teams") return;

    const winner = findWinner(game.players, game);
    const isComplete = isGameComplete(game);
    const isDraw = isGameDraw(game);
    const gameName = getGameDisplayName(game.name).title;
    const sessionName = getGameSessionLabel(game.name);

    game.teams.forEach((gameTeam) => {
      const savedTeamId = resolveSavedTeamId(game, gameTeam);
      if (!savedTeamId) return;

      const report = reports.get(savedTeamId);
      if (!report) return;

      const participantId = `team:${gameTeam.id}`;
      const placement = computePlacement(game, participantId);
      const won = winner?.teamId === gameTeam.id;
      const resultKind = resolveStatusKind({
        isComplete,
        isDraw,
        won,
        hasWinner: Boolean(winner),
      });

      report.gamesPlayed += 1;
      if (isComplete) report.completedGames += 1;
      else report.inProgressGames += 1;

      if (resultKind === "won") report.wins += 1;
      if (resultKind === "lost") report.losses += 1;
      if (resultKind === "draw") report.draws += 1;
      if (resultKind === "completed") report.completedWithoutWinner += 1;

      report.sessions.push({
        id: `${game.id}:${savedTeamId}`,
        sessionName,
        gameName,
        createdAt: game.createdAt,
        dateLabel: dateFormat.format(new Date(game.createdAt)),
        resultKind,
        isTeamGame: true,
        placement: placement.placement,
        placementMax: placement.placementMax,
      });

      const breakdownMap =
        breakdownByTeamId.get(savedTeamId) ??
        new Map<string, ReportGameBreakdown>();
      const breakdown =
        breakdownMap.get(gameName) ?? createEmptyBreakdown(gameName);
      breakdown.sessions += 1;
      if (resultKind === "in_progress") breakdown.inProgress += 1;
      if (resultKind === "won") breakdown.wins += 1;
      if (resultKind === "lost") breakdown.losses += 1;
      if (resultKind === "draw") breakdown.draws += 1;
      if (resultKind === "completed") breakdown.completed += 1;
      breakdownMap.set(gameName, breakdown);
      breakdownByTeamId.set(savedTeamId, breakdownMap);
    });
  });

  reports.forEach((report, teamId) => {
    finalizeReport(
      report,
      breakdownByTeamId.get(teamId) ?? new Map<string, ReportGameBreakdown>(),
      dateFormat,
      dateTimeFormat,
    );
  });

  return reports;
}
