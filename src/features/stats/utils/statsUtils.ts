import type { Game } from "../../../types";
import type { ReportStatusKind, SubjectReport } from "../../../utils/advancedStats";
import { formatAccountPlayerName, getGameDisplayName } from "../../../utils/text";
import {
  ALL_CHART_GAMES,
  type CompareChartPoint,
  type SelectableEntity,
} from "../types/statsTypes";

export function getDisplayName(report: SubjectReport) {
  if (report.kind === "players" && report.isAccountPlayer) {
    return formatAccountPlayerName(report.name);
  }
  return report.name;
}

export function getStatusTone(status: ReportStatusKind) {
  switch (status) {
    case "won":
      return "statsStatus--won";
    case "lost":
      return "statsStatus--lost";
    case "draw":
      return "statsStatus--draw";
    case "completed":
      return "statsStatus--completed";
    default:
      return "statsStatus--progress";
  }
}

export function getDefaultPrimaryPlayerId(options: SelectableEntity[]) {
  return (
    options.find((item) => item.isAccountPlayer)?.id ?? options[0]?.id ?? null
  );
}

export function getDefaultComparePlayerId(
  options: SelectableEntity[],
  primaryId: string | null,
) {
  return options.find((item) => item.id !== primaryId)?.id ?? null;
}

export function mergeCompareTrend(
  primary: SubjectReport | null,
  secondary: SubjectReport | null,
): CompareChartPoint[] {
  if (!primary) return [];

  const events: Array<{
    key: string;
    groupKey: string;
    timestamp: number;
    label: string;
    fullDateLabel: string;
    fullDateTimeLabel: string;
    sessionName: string;
    owner: "primary" | "secondary";
    cumulativeWins: number;
    cumulativeWinRate: number;
  }> = [];

  primary.trend.forEach((point) => {
    events.push({
      key: `p:${point.id}`,
      groupKey: getTrendGroupKey(point.id),
      timestamp: point.timestamp,
      label: point.label,
      fullDateLabel: point.fullDateLabel,
      fullDateTimeLabel: point.fullDateTimeLabel,
      sessionName: point.sessionName,
      owner: "primary",
      cumulativeWins: point.cumulativeWins,
      cumulativeWinRate: point.cumulativeWinRate,
    });
  });

  secondary?.trend.forEach((point) => {
    events.push({
      key: `s:${point.id}`,
      groupKey: getTrendGroupKey(point.id),
      timestamp: point.timestamp,
      label: point.label,
      fullDateLabel: point.fullDateLabel,
      fullDateTimeLabel: point.fullDateTimeLabel,
      sessionName: point.sessionName,
      owner: "secondary",
      cumulativeWins: point.cumulativeWins,
      cumulativeWinRate: point.cumulativeWinRate,
    });
  });

  events.sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.groupKey.localeCompare(b.groupKey) ||
      a.key.localeCompare(b.key),
  );

  let primaryWins: number | null = null;
  let secondaryWins: number | null = secondary ? null : null;
  let primaryRate: number | null = null;
  let secondaryRate: number | null = secondary ? null : null;
  const points: CompareChartPoint[] = [];

  for (let index = 0; index < events.length;) {
    const first = events[index];
    if (!first) break;
    const groupEvents: typeof events = [];

    while (
      index < events.length &&
      events[index]?.timestamp === first.timestamp &&
      events[index]?.groupKey === first.groupKey
    ) {
      const event = events[index];
      if (event) groupEvents.push(event);
      index += 1;
    }

    groupEvents.forEach((event) => {
      if (event.owner === "primary") {
        primaryWins = event.cumulativeWins;
        primaryRate = event.cumulativeWinRate;
      } else {
        secondaryWins = event.cumulativeWins;
        secondaryRate = event.cumulativeWinRate;
      }
    });

    points.push({
      id: first.groupKey,
      x: points.length + 1,
      timestamp: first.timestamp,
      label: first.label,
      fullDateLabel: first.fullDateLabel,
      fullDateTimeLabel: first.fullDateTimeLabel,
      sessionName: first.sessionName,
      primaryWins,
      secondaryWins,
      primaryRate,
      secondaryRate,
    });
  }

  return points;
}

function getTrendGroupKey(pointId: string) {
  return pointId.split(":")[0] || pointId;
}

function sampleIndexes(length: number, maxTicks = 3) {
  if (length <= maxTicks) {
    return Array.from({ length }, (_, index) => index);
  }
  return [0, Math.floor((length - 1) / 2), length - 1];
}

function formatAxisDate(timestamp: number, rangeMs: number) {
  const date = new Date(timestamp);
  const day = 24 * 60 * 60 * 1000;
  if (rangeMs > 365 * day * 2) {
    return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(date);
  }
  if (rangeMs > 90 * day) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export type ChartAxis = {
  ticks: number[];
  labelByX: Map<number, string>;
};

export function buildChartAxis(points: CompareChartPoint[]): ChartAxis {
  if (!points.length) {
    return { ticks: [] as number[], labelByX: new Map<number, string>() };
  }

  const firstTimestamp = points[0]?.timestamp ?? 0;
  const lastTimestamp = points.at(-1)?.timestamp ?? firstTimestamp;
  const rangeMs = Math.max(0, lastTimestamp - firstTimestamp);
  const labelByX = new Map<number, string>();
  const usedLabels = new Set<string>();
  const ticks: number[] = [];

  sampleIndexes(points.length).forEach((index) => {
    const point = points[index];
    if (!point) return;
    const label = formatAxisDate(point.timestamp, rangeMs);
    if (usedLabels.has(label)) return;
    usedLabels.add(label);
    ticks.push(point.x);
    labelByX.set(point.x, label);
  });

  if (!ticks.length) {
    const point = points[Math.floor((points.length - 1) / 2)];
    if (point) {
      ticks.push(point.x);
      labelByX.set(point.x, formatAxisDate(point.timestamp, rangeMs));
    }
  }

  return { ticks, labelByX };
}

export function compareValues(
  left: number | null,
  right: number | null,
  direction: "higher" | "lower" = "higher",
) {
  if (left === null && right === null) return "tie";
  if (left !== null && right === null) return "left";
  if (left === null && right !== null) return "right";
  if (left === right) return "tie";
  const leftValue = left ?? 0;
  const rightValue = right ?? 0;
  if (direction === "higher") return leftValue > rightValue ? "left" : "right";
  return leftValue < rightValue ? "left" : "right";
}

export function formatAveragePlacement(value: number | null) {
  return typeof value === "number" ? value.toFixed(1) : "—";
}

export function formatSessionCount(value: number) {
  return `${value} session${value === 1 ? "" : "s"}`;
}

export function formatPlacement(value: number | null, total: number) {
  if (typeof value !== "number") return "—";
  return `#${value}/${Math.max(total, value)}`;
}

export type StreakSubjectSummary = {
  name: string;
  current: number;
  best: number;
  completed: number;
  form: ReportStatusKind[];
};

export type StreakHistorySummary = {
  primary: StreakSubjectSummary;
  secondary: StreakSubjectSummary | null;
};

export function buildStreakHistorySummary(
  primary: SubjectReport | null,
  secondary: SubjectReport | null,
): StreakHistorySummary | null {
  if (!primary) return null;

  return {
    primary: buildStreakSubjectSummary(primary),
    secondary: secondary ? buildStreakSubjectSummary(secondary) : null,
  };
}

function buildStreakSubjectSummary(report: SubjectReport): StreakSubjectSummary {
  const completedSessions = report.sessions
    .filter((session) => session.resultKind !== "in_progress")
    .sort((a, b) => a.createdAt - b.createdAt);

  let running = 0;
  let best = 0;
  completedSessions.forEach((session) => {
    if (session.resultKind === "won") {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  });

  return {
    name: getDisplayName(report),
    current: report.currentWinStreak,
    best,
    completed: completedSessions.length,
    form: completedSessions
      .slice(-10)
      .map((session) => session.resultKind),
  };
}

export type HeadToHeadSummary = {
  primaryName: string;
  secondaryName: string;
  sharedCompleted: number;
  inProgress: number;
  primaryWins: number;
  secondaryWins: number;
  draws: number;
  sharedWins: number;
  completedWithoutWinner: number;
};

export function buildHeadToHeadSummary(
  primary: SubjectReport | null,
  secondary: SubjectReport | null,
): HeadToHeadSummary | null {
  if (!primary || !secondary) return null;

  const primaryByGame = buildSessionBySourceGame(primary);
  const secondaryByGame = buildSessionBySourceGame(secondary);
  const summary: HeadToHeadSummary = {
    primaryName: getDisplayName(primary),
    secondaryName: getDisplayName(secondary),
    sharedCompleted: 0,
    inProgress: 0,
    primaryWins: 0,
    secondaryWins: 0,
    draws: 0,
    sharedWins: 0,
    completedWithoutWinner: 0,
  };

  primaryByGame.forEach((primarySession, gameId) => {
    const secondarySession = secondaryByGame.get(gameId);
    if (!secondarySession) return;

    if (
      primarySession.resultKind === "in_progress" ||
      secondarySession.resultKind === "in_progress"
    ) {
      summary.inProgress += 1;
      return;
    }

    summary.sharedCompleted += 1;

    if (
      primarySession.resultKind === "draw" ||
      secondarySession.resultKind === "draw"
    ) {
      summary.draws += 1;
      return;
    }

    if (
      primarySession.resultKind === "won" &&
      secondarySession.resultKind === "won"
    ) {
      summary.sharedWins += 1;
      return;
    }

    if (primarySession.resultKind === "won") {
      summary.primaryWins += 1;
      return;
    }

    if (secondarySession.resultKind === "won") {
      summary.secondaryWins += 1;
      return;
    }

    summary.completedWithoutWinner += 1;
  });

  return summary;
}

function buildSessionBySourceGame(report: SubjectReport) {
  const sessions = [...report.sessions].sort((a, b) => b.createdAt - a.createdAt);
  const byGame = new Map<string, (typeof sessions)[number]>();
  sessions.forEach((session) => {
    const sourceGameId = getTrendGroupKey(session.id);
    if (!byGame.has(sourceGameId)) byGame.set(sourceGameId, session);
  });
  return byGame;
}

export function filterGamesForChart(games: Game[], gameName: string) {
  if (gameName === ALL_CHART_GAMES) return games;
  return games.filter(
    (game) => getGameDisplayName(game.name).title === gameName,
  );
}
