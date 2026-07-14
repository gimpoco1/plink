import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../../../components/HomeLockedState/StatsSkeleton";
import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
import { useEntitlementsContext } from "../../../hooks/useEntitlements";
import type { Game, GameTeam, PlayerProfile, TeamMember } from "../../../types";
import {
  buildPlayerReports,
  buildTeamReports,
  type SubjectReport,
} from "../../../utils/advancedStats";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import { StatsAdvancedCards } from "../components/StatsAdvancedCards";
import { StatsCharts } from "../components/StatsCharts";
import { StatsProPreview } from "../components/StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "../components/StatsScreenParts";
import {
  ALL_CHART_GAMES,
  STATUS_LABELS,
  type OpenChartGamePicker,
  type OpenPicker,
  type SelectableEntity,
} from "../types/statsTypes";
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
} from "../utils/statsUtils";

import {
  readStatsViewState,
  writeStatsViewState,
  type StatsScreenProps,
} from "../../../screens/StatsScreen";

export function useStatsScreenModel(props: StatsScreenProps) {
  const {
    games,
    profiles,
    teams,
    teamMembers,
    isAuthenticated,
    onOpenAuth,
    onOpenProPlan,
  } = props;

  const { canSeeAdvancedStats, canUseTeams } = useEntitlementsContext();
  const initialViewState = useMemo(() => readStatsViewState(), []);
  const [activeKind, setActiveKind] = useState<"players" | "teams">(
    initialViewState.activeKind,
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    initialViewState.selectedPlayerId,
  );
  const [compareEnabled, setCompareEnabled] = useState(
    initialViewState.compareEnabled,
  );
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(
    initialViewState.comparePlayerId,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    initialViewState.selectedTeamId,
  );
  const [compareTeamId, setCompareTeamId] = useState<string | null>(
    initialViewState.compareTeamId,
  );
  const [winsChartGame, setWinsChartGame] = useState(
    initialViewState.winsChartGame,
  );
  const [rateChartGame, setRateChartGame] = useState(
    initialViewState.rateChartGame,
  );
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  const [openChartGamePicker, setOpenChartGamePicker] =
    useState<OpenChartGamePicker>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);
  const chartPickerRef = useRef<HTMLDivElement | null>(null);
  const isCompareLocked = !canSeeAdvancedStats;
  const areTeamReportsLocked = !canSeeAdvancedStats || !canUseTeams;

  const winsChartGames = useMemo(
    () => filterGamesForChart(games, winsChartGame),
    [games, winsChartGame],
  );
  const rateChartGames = useMemo(
    () => filterGamesForChart(games, rateChartGame),
    [games, rateChartGame],
  );
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const playerReports = useMemo(
    () => buildPlayerReports(games, profiles),
    [games, profiles],
  );
  const teamReports = useMemo(
    () => buildTeamReports(games, teams, teamMembers),
    [games, teamMembers, teams],
  );
  const winsChartPlayerReports = useMemo(
    () => buildPlayerReports(winsChartGames, profiles),
    [profiles, winsChartGames],
  );
  const winsChartTeamReports = useMemo(
    () => buildTeamReports(winsChartGames, teams, teamMembers),
    [teamMembers, teams, winsChartGames],
  );
  const rateChartPlayerReports = useMemo(
    () => buildPlayerReports(rateChartGames, profiles),
    [profiles, rateChartGames],
  );
  const rateChartTeamReports = useMemo(
    () => buildTeamReports(rateChartGames, teams, teamMembers),
    [rateChartGames, teamMembers, teams],
  );

  const playerOptions = useMemo<SelectableEntity[]>(
    () =>
      profiles
        .map((profile) => {
          const report = playerReports.get(profile.id);
          return {
            id: profile.id,
            name: profile.isAccountPlayer
              ? formatAccountPlayerName(profile.name)
              : profile.name,
            subtitle: formatSessionCount(report?.gamesPlayed ?? 0),
            avatarColor: profile.avatarColor,
            isAccountPlayer: profile.isAccountPlayer,
          };
        })
        .sort((a, b) => {
          if (Boolean(b.isAccountPlayer) !== Boolean(a.isAccountPlayer)) {
            return (
              Number(Boolean(b.isAccountPlayer)) -
              Number(Boolean(a.isAccountPlayer))
            );
          }
          return a.name.localeCompare(b.name);
        }),
    [playerReports, profiles],
  );

  const teamOptions = useMemo<SelectableEntity[]>(
    () =>
      teams
        .map((team) => {
          const report = teamReports.get(team.id);
          const memberCount = teamMembers.filter(
            (member) => member.teamId === team.id,
          ).length;
          return {
            id: team.id,
            name: team.name,
            subtitle: `${memberCount} member${
              memberCount === 1 ? "" : "s"
            } · ${formatSessionCount(report?.gamesPlayed ?? 0)}`,
            icon: team.icon,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teamMembers, teamReports, teams],
  );

  const selectedPlayerOption = useMemo(
    () => playerOptions.find((item) => item.id === selectedPlayerId) ?? null,
    [playerOptions, selectedPlayerId],
  );
  const comparePlayerOption = useMemo(
    () => playerOptions.find((item) => item.id === comparePlayerId) ?? null,
    [comparePlayerId, playerOptions],
  );
  const selectedTeamOption = useMemo(
    () => teamOptions.find((item) => item.id === selectedTeamId) ?? null,
    [selectedTeamId, teamOptions],
  );
  const compareTeamOption = useMemo(
    () => teamOptions.find((item) => item.id === compareTeamId) ?? null,
    [compareTeamId, teamOptions],
  );

  function handleStatsPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as Node;

    if (openPicker && !pickerPanelRef.current?.contains(target)) {
      setOpenPicker(null);
    }

    if (openChartGamePicker && !chartPickerRef.current?.contains(target)) {
      setOpenChartGamePicker(null);
    }
  }

  useEffect(() => {
    if (
      activeKind === "teams" &&
      (areTeamReportsLocked || !teamOptions.length)
    ) {
      setActiveKind("players");
    }
  }, [activeKind, areTeamReportsLocked, teamOptions.length]);

  useEffect(() => {
    if (!playerOptions.length) {
      setSelectedPlayerId(null);
      return;
    }
    if (
      !selectedPlayerId ||
      !playerOptions.some((item) => item.id === selectedPlayerId)
    ) {
      setSelectedPlayerId(getDefaultPrimaryPlayerId(playerOptions));
    }
  }, [playerOptions, selectedPlayerId]);

  useEffect(() => {
    if (!playerOptions.length) {
      setComparePlayerId(null);
      return;
    }
    if (
      comparePlayerId &&
      !playerOptions.some((item) => item.id === comparePlayerId)
    ) {
      setComparePlayerId(null);
      return;
    }
    if (
      !compareEnabled ||
      activeKind !== "players" ||
      playerOptions.length < 2
    ) {
      return;
    }
    if (
      !comparePlayerId ||
      comparePlayerId === selectedPlayerId ||
      !playerOptions.some((item) => item.id === comparePlayerId)
    ) {
      setComparePlayerId(
        getDefaultComparePlayerId(playerOptions, selectedPlayerId),
      );
    }
  }, [
    activeKind,
    compareEnabled,
    comparePlayerId,
    playerOptions,
    selectedPlayerId,
  ]);

  useEffect(() => {
    if (!teamOptions.length) {
      setSelectedTeamId(null);
      return;
    }
    if (
      !selectedTeamId ||
      !teamOptions.some((item) => item.id === selectedTeamId)
    ) {
      setSelectedTeamId(teamOptions[0]?.id ?? null);
    }
  }, [selectedTeamId, teamOptions]);

  useEffect(() => {
    if (!teamOptions.length) {
      setCompareTeamId(null);
      return;
    }
    if (teamOptions.length < 2) {
      if (compareTeamId) setCompareTeamId(null);
      if (activeKind === "teams" && compareEnabled) {
        setCompareEnabled(false);
      }
      return;
    }
    const hasValidCompareTeam =
      Boolean(compareTeamId) &&
      teamOptions.some((item) => item.id === compareTeamId);
    if (!compareEnabled || activeKind !== "teams") {
      if (compareTeamId && !hasValidCompareTeam) {
        setCompareTeamId(null);
      }
      return;
    }
    if (
      !compareTeamId ||
      !hasValidCompareTeam ||
      compareTeamId === selectedTeamId
    ) {
      setCompareTeamId(getDefaultComparePlayerId(teamOptions, selectedTeamId));
    }
  }, [activeKind, compareEnabled, compareTeamId, selectedTeamId, teamOptions]);

  useEffect(() => {
    setOpenPicker(null);
    setPickerSearch("");
  }, [activeKind]);

  useEffect(() => {
    if (isCompareLocked && compareEnabled) {
      setCompareEnabled(false);
    }
  }, [compareEnabled, isCompareLocked]);

  useEffect(() => {
    writeStatsViewState({
      activeKind,
      selectedPlayerId,
      compareEnabled,
      comparePlayerId,
      compareTeamId,
      selectedTeamId,
      winsChartGame,
      rateChartGame,
    });
  }, [
    activeKind,
    compareEnabled,
    comparePlayerId,
    compareTeamId,
    rateChartGame,
    selectedPlayerId,
    selectedTeamId,
    winsChartGame,
  ]);

  const primaryPlayerReport = useMemo(
    () =>
      selectedPlayerId ? (playerReports.get(selectedPlayerId) ?? null) : null,
    [playerReports, selectedPlayerId],
  );
  const compareReport = useMemo(
    () =>
      compareEnabled
        ? activeKind === "players" && comparePlayerId
          ? (playerReports.get(comparePlayerId) ?? null)
          : activeKind === "teams" && compareTeamId
            ? (teamReports.get(compareTeamId) ?? null)
            : null
        : null,
    [
      activeKind,
      compareEnabled,
      comparePlayerId,
      compareTeamId,
      playerReports,
      teamReports,
    ],
  );
  const selectedTeamReport = useMemo(
    () => (selectedTeamId ? (teamReports.get(selectedTeamId) ?? null) : null),
    [selectedTeamId, teamReports],
  );
  const winsChartPrimaryPlayerReport = useMemo(
    () =>
      selectedPlayerId
        ? (winsChartPlayerReports.get(selectedPlayerId) ?? null)
        : null,
    [selectedPlayerId, winsChartPlayerReports],
  );
  const winsChartCompareReport = useMemo(
    () =>
      compareEnabled
        ? activeKind === "players" && comparePlayerId
          ? (winsChartPlayerReports.get(comparePlayerId) ?? null)
          : activeKind === "teams" && compareTeamId
            ? (winsChartTeamReports.get(compareTeamId) ?? null)
            : null
        : null,
    [
      activeKind,
      compareEnabled,
      comparePlayerId,
      compareTeamId,
      winsChartPlayerReports,
      winsChartTeamReports,
    ],
  );
  const winsChartSelectedTeamReport = useMemo(
    () =>
      selectedTeamId
        ? (winsChartTeamReports.get(selectedTeamId) ?? null)
        : null,
    [selectedTeamId, winsChartTeamReports],
  );
  const rateChartPrimaryPlayerReport = useMemo(
    () =>
      selectedPlayerId
        ? (rateChartPlayerReports.get(selectedPlayerId) ?? null)
        : null,
    [rateChartPlayerReports, selectedPlayerId],
  );
  const rateChartCompareReport = useMemo(
    () =>
      compareEnabled
        ? activeKind === "players" && comparePlayerId
          ? (rateChartPlayerReports.get(comparePlayerId) ?? null)
          : activeKind === "teams" && compareTeamId
            ? (rateChartTeamReports.get(compareTeamId) ?? null)
            : null
        : null,
    [
      activeKind,
      compareEnabled,
      comparePlayerId,
      compareTeamId,
      rateChartPlayerReports,
      rateChartTeamReports,
    ],
  );
  const rateChartSelectedTeamReport = useMemo(
    () =>
      selectedTeamId
        ? (rateChartTeamReports.get(selectedTeamId) ?? null)
        : null,
    [rateChartTeamReports, selectedTeamId],
  );
  const primaryReport =
    activeKind === "players" ? primaryPlayerReport : selectedTeamReport;
  const compareTeamReport =
    activeKind === "teams" && compareReport?.kind === "teams"
      ? compareReport
      : null;
  const chartGameOptions = useMemo(() => {
    const gameNames = new Set<string>();
    primaryReport?.gameBreakdown.forEach((game) => {
      if (game.sessions > 0) gameNames.add(game.name);
    });
    compareReport?.gameBreakdown.forEach((game) => {
      if (game.sessions > 0) gameNames.add(game.name);
    });
    return [...gameNames].sort((a, b) => a.localeCompare(b));
  }, [compareReport, primaryReport]);

  useEffect(() => {
    if (
      winsChartGame !== ALL_CHART_GAMES &&
      !chartGameOptions.includes(winsChartGame)
    ) {
      setWinsChartGame(ALL_CHART_GAMES);
    }
    if (
      rateChartGame !== ALL_CHART_GAMES &&
      !chartGameOptions.includes(rateChartGame)
    ) {
      setRateChartGame(ALL_CHART_GAMES);
    }
  }, [chartGameOptions, rateChartGame, winsChartGame]);

  const selectedMemberProfiles = useMemo(() => {
    if (!selectedTeamReport) return [];
    return selectedTeamReport.memberIds
      .map((memberId) => profileById.get(memberId))
      .filter((profile): profile is PlayerProfile => Boolean(profile));
  }, [profileById, selectedTeamReport]);
  const compareMemberProfiles = useMemo(() => {
    if (!compareTeamReport) return [];
    return compareTeamReport.memberIds
      .map((memberId) => profileById.get(memberId))
      .filter((profile): profile is PlayerProfile => Boolean(profile));
  }, [compareTeamReport, profileById]);

  const pickerOptions = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    const filterByQuery = (items: SelectableEntity[]) =>
      !query
        ? items
        : items.filter((item) => item.name.toLowerCase().includes(query));

    if (openPicker === "primary") {
      return filterByQuery(playerOptions);
    }
    if (openPicker === "compare") {
      return filterByQuery(
        playerOptions.filter((item) => item.id !== selectedPlayerId),
      );
    }
    if (openPicker === "team") {
      return filterByQuery(teamOptions);
    }
    if (openPicker === "teamCompare") {
      return filterByQuery(
        teamOptions.filter((item) => item.id !== selectedTeamId),
      );
    }
    return [];
  }, [
    openPicker,
    pickerSearch,
    playerOptions,
    selectedPlayerId,
    selectedTeamId,
    teamOptions,
  ]);

  const winsComparisonTrend = useMemo(
    () =>
      mergeCompareTrend(
        activeKind === "players"
          ? winsChartPrimaryPlayerReport
          : winsChartSelectedTeamReport,
        winsChartCompareReport,
      ),
    [
      activeKind,
      winsChartCompareReport,
      winsChartPrimaryPlayerReport,
      winsChartSelectedTeamReport,
    ],
  );
  const rateComparisonTrend = useMemo(
    () =>
      mergeCompareTrend(
        activeKind === "players"
          ? rateChartPrimaryPlayerReport
          : rateChartSelectedTeamReport,
        rateChartCompareReport,
      ),
    [
      activeKind,
      rateChartCompareReport,
      rateChartPrimaryPlayerReport,
      rateChartSelectedTeamReport,
    ],
  );

  const primaryName = primaryReport ? getDisplayName(primaryReport) : "—";
  const compareName = compareReport
    ? getDisplayName(compareReport)
    : "No comparison";
  const winsChartAxis = useMemo(
    () => buildChartAxis(winsComparisonTrend),
    [winsComparisonTrend],
  );
  const rateChartAxis = useMemo(
    () => buildChartAxis(rateComparisonTrend),
    [rateComparisonTrend],
  );
  const outcomeBreakdown = useMemo(
    () =>
      primaryReport
        ? [
            {
              label: "Wins",
              primaryValue: primaryReport.wins,
              secondaryValue: compareReport?.wins,
              outcomeFill: "#d9ff4f",
            },
            {
              label: "Losses",
              primaryValue: primaryReport.losses,
              secondaryValue: compareReport?.losses,
              outcomeFill: "#ff8ea2",
            },
            {
              label: "Draws",
              primaryValue: primaryReport.draws,
              secondaryValue: compareReport?.draws,
              outcomeFill: "#c3b1ff",
            },
            {
              label: "Done",
              primaryValue: primaryReport.completedWithoutWinner,
              secondaryValue: compareReport?.completedWithoutWinner,
              outcomeFill: "#d9e4eb",
            },
          ].filter(
            (item) => item.primaryValue > 0 || (item.secondaryValue ?? 0) > 0,
          )
        : [],
    [compareReport, primaryReport],
  );
  const gameWinRateBreakdown = useMemo(() => {
    if (!primaryReport) return [];

    const compareGames = new Map(
      (compareReport?.gameBreakdown ?? []).map((game) => [game.name, game]),
    );
    const gameNames = new Set([
      ...primaryReport.gameBreakdown.map((game) => game.name),
      ...compareGames.keys(),
    ]);

    return [...gameNames]
      .map((name) => {
        const primaryGame = primaryReport.gameBreakdown.find(
          (game) => game.name === name,
        );
        const compareGame = compareGames.get(name);
        return {
          label: name,
          primaryValue: primaryGame?.winRate ?? 0,
          secondaryValue: compareGame?.winRate,
          primarySessions: primaryGame?.sessions ?? 0,
          secondarySessions: compareGame?.sessions,
        };
      })
      .filter(
        (game) => game.primarySessions > 0 || (game.secondarySessions ?? 0) > 0,
      )
      .sort(
        (a, b) =>
          Math.max(b.primaryValue, b.secondaryValue ?? 0) -
            Math.max(a.primaryValue, a.secondaryValue ?? 0) ||
          a.label.localeCompare(b.label),
      )
      .slice(0, 5);
  }, [compareReport, primaryReport]);
  const streakHistorySummary = useMemo(
    () => buildStreakHistorySummary(primaryReport, compareReport),
    [compareReport, primaryReport],
  );
  const headToHeadSummary = useMemo(
    () => buildHeadToHeadSummary(primaryReport, compareReport),
    [compareReport, primaryReport],
  );

  return {
    ...props,
    canSeeAdvancedStats,
    canUseTeams,
    activeKind,
    setActiveKind,
    selectedPlayerId,
    setSelectedPlayerId,
    compareEnabled,
    setCompareEnabled,
    comparePlayerId,
    setComparePlayerId,
    selectedTeamId,
    setSelectedTeamId,
    compareTeamId,
    setCompareTeamId,
    winsChartGame,
    setWinsChartGame,
    rateChartGame,
    setRateChartGame,
    openPicker,
    setOpenPicker,
    openChartGamePicker,
    setOpenChartGamePicker,
    pickerSearch,
    setPickerSearch,
    pickerPanelRef,
    chartPickerRef,
    isCompareLocked,
    areTeamReportsLocked,
    winsChartGames,
    rateChartGames,
    playerOptions,
    teamOptions,
    selectedPlayerOption,
    comparePlayerOption,
    selectedTeamOption,
    compareTeamOption,
    handleStatsPointerDown,
    primaryPlayerReport,
    compareReport,
    selectedTeamReport,
    primaryReport,
    compareTeamReport,
    chartGameOptions,
    selectedMemberProfiles,
    compareMemberProfiles,
    pickerOptions,
    winsComparisonTrend,
    rateComparisonTrend,
    primaryName,
    compareName,
    winsChartAxis,
    rateChartAxis,
    outcomeBreakdown,
    gameWinRateBreakdown,
    streakHistorySummary,
    headToHeadSummary,
  };
}
