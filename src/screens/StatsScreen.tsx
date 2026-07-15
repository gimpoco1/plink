import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { LockedFrame } from "../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../components/HomeLockedState/StatsSkeleton";
import { AdBannerSlot } from "../components/AdBannerSlot/AdBannerSlot";
import { useEntitlementsContext } from "../hooks/useEntitlements";
import type { Game, GameTeam, PlayerProfile, TeamMember } from "../types";
import {
  buildPlayerReports,
  buildTeamReports,
  type SubjectReport,
} from "../utils/advancedStats";
import { avatarStyleFor } from "../utils/color";
import { formatAccountPlayerName, getInitials } from "../utils/text";
import { StatsAdvancedCards } from "../features/stats/components/StatsAdvancedCards";
import { StatsCharts } from "../features/stats/components/StatsCharts";
import { StatsProPreview } from "../features/stats/components/StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "../features/stats/components/StatsScreenParts";
import {
  ALL_CHART_GAMES,
  STATUS_LABELS,
  type OpenChartGamePicker,
  type OpenPicker,
  type SelectableEntity,
} from "../features/stats/types/statsTypes";
import {
  buildChartAxis,
  compareValues,
  filterGamesForChart,
  formatAveragePlacement,
  formatPlacement,
  formatSessionCount,
  getDefaultComparePlayerId,
  getDefaultPrimaryPlayerId,
  getDisplayName,
  buildHeadToHeadSummary,
  buildStreakHistorySummary,
  getStatusTone,
  mergeCompareTrend,
} from "../features/stats/utils/statsUtils";
import { useStatsScreenModel } from "../features/stats/hooks/useStatsScreenModel";
import "../features/stats/styles/StatsScreen.css";

export type StatsScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onOpenProPlan: () => void;
};

type StatsViewState = {
  activeKind: "players" | "teams";
  selectedPlayerId: string | null;
  compareEnabled: boolean;
  comparePlayerId: string | null;
  selectedTeamId: string | null;
  compareTeamId: string | null;
  winsChartGame: string;
  rateChartGame: string;
};

const STATS_VIEW_STORAGE_KEY = "plink:stats-view:v1";

const DEFAULT_STATS_VIEW_STATE: StatsViewState = {
  activeKind: "players",
  selectedPlayerId: null,
  compareEnabled: false,
  comparePlayerId: null,
  selectedTeamId: null,
  compareTeamId: null,
  winsChartGame: ALL_CHART_GAMES,
  rateChartGame: ALL_CHART_GAMES,
};

export function readStatsViewState(): StatsViewState {
  if (typeof window === "undefined") return DEFAULT_STATS_VIEW_STATE;

  try {
    const raw = window.localStorage.getItem(STATS_VIEW_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS_VIEW_STATE;
    const parsed = JSON.parse(raw) as Partial<StatsViewState>;
    return {
      ...DEFAULT_STATS_VIEW_STATE,
      activeKind:
        parsed.activeKind === "teams" || parsed.activeKind === "players"
          ? parsed.activeKind
          : DEFAULT_STATS_VIEW_STATE.activeKind,
      selectedPlayerId:
        typeof parsed.selectedPlayerId === "string"
          ? parsed.selectedPlayerId
          : null,
      compareEnabled: Boolean(parsed.compareEnabled),
      comparePlayerId:
        typeof parsed.comparePlayerId === "string"
          ? parsed.comparePlayerId
          : null,
      selectedTeamId:
        typeof parsed.selectedTeamId === "string"
          ? parsed.selectedTeamId
          : null,
      compareTeamId:
        typeof parsed.compareTeamId === "string" ? parsed.compareTeamId : null,
      winsChartGame:
        typeof parsed.winsChartGame === "string"
          ? parsed.winsChartGame
          : ALL_CHART_GAMES,
      rateChartGame:
        typeof parsed.rateChartGame === "string"
          ? parsed.rateChartGame
          : ALL_CHART_GAMES,
    };
  } catch {
    return DEFAULT_STATS_VIEW_STATE;
  }
}
export function writeStatsViewState(state: StatsViewState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STATS_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; the screen still works with in-memory state.
  }
}

import { StatsScreenProvider } from "../features/stats/context/StatsScreenContext";
import { StatsScreenView } from "../features/stats/views/StatsScreenView";

export function StatsScreen(props: StatsScreenProps) {
  const model = useStatsScreenModel(props);
  return (
    <StatsScreenProvider value={model}>
      <StatsScreenView />
    </StatsScreenProvider>
  );
}
