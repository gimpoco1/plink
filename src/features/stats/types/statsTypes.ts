import type { ReportStatusKind } from "../../../utils/advancedStats";

export const ALL_CHART_GAMES = "__all__";

export type SelectableEntity = {
  id: string;
  name: string;
  subtitle: string;
  avatarColor?: string;
  icon?: string;
  isAccountPlayer?: boolean;
};

export type OpenPicker = "primary" | "compare" | "team" | "teamCompare" | null;
export type OpenChartGamePicker = "wins" | "rate" | null;

export type CompareChartPoint = {
  id: string;
  x: number;
  timestamp: number;
  label: string;
  fullDateLabel: string;
  fullDateTimeLabel: string;
  sessionName: string;
  primaryWins: number | null;
  secondaryWins: number | null;
  primaryRate: number | null;
  secondaryRate: number | null;
};

export const STATUS_LABELS: Record<ReportStatusKind, string> = {
  won: "Won",
  lost: "Lost",
  draw: "Draw",
  completed: "Completed",
  in_progress: "In progress",
};
