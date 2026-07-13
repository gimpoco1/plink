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
import { StatsAdvancedCards } from "./StatsScreen/StatsAdvancedCards";
import { StatsCharts } from "./StatsScreen/StatsCharts";
import { StatsProPreview } from "./StatsScreen/StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "./StatsScreen/StatsScreenParts";
import {
  ALL_CHART_GAMES,
  STATUS_LABELS,
  type OpenChartGamePicker,
  type OpenPicker,
  type SelectableEntity,
} from "./StatsScreen/statsTypes";
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
} from "./StatsScreen/statsUtils";
import "./StatsScreen.css";

type StatsScreenProps = {
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

function readStatsViewState(): StatsViewState {
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

function writeStatsViewState(state: StatsViewState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STATS_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; the screen still works with in-memory state.
  }
}

export function StatsScreen({
  games,
  profiles,
  teams,
  teamMembers,
  isAuthenticated,
  onOpenAuth,
  onOpenProPlan,
}: StatsScreenProps) {
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
  const renderTeamReportCard = ({
    report,
    option,
    memberProfiles,
    eyebrow,
  }: {
    report: SubjectReport;
    option: SelectableEntity | null;
    memberProfiles: PlayerProfile[];
    eyebrow: string;
  }) => (
    <section className="statsFocusCard">
      <div className="statsFocusCard__identity">
        {option ? <EntitySwatch option={option} /> : null}
        <div className="statsFocusCard__copy">
          <span className="statsEyebrow">{eyebrow}</span>
          <h3>{getDisplayName(report)}</h3>
          <p>
            {memberProfiles.length} member
            {memberProfiles.length === 1 ? "" : "s"} tracked across{" "}
            {report.gamesPlayed} team sessions.
          </p>
        </div>
      </div>
      {memberProfiles.length ? (
        <div className="statsFocusMembers">
          {memberProfiles.map((profile) => (
            <span key={profile.id} className="statsFocusMember">
              <span
                className="statsFocusMember__avatar"
                style={avatarStyleFor(profile.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(profile.name)}
              </span>
              <span>
                {profile.isAccountPlayer
                  ? formatAccountPlayerName(profile.name)
                  : profile.name}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );

  return (
    <div
      className="tabContent tabContent--stats"
      onPointerDown={handleStatsPointerDown}
    >
      <AdBannerSlot
        placement="Stats"
        slotId={import.meta.env.VITE_ADSENSE_STATS_SLOT_ID}
      />
      <div className="tabHeader">
        <div>
          <h2 className="tabTitle">Stats</h2>
          <p className="tabSubtitle">
            Pick a player or team and compare their form, wins, and trends over
            time.
          </p>
        </div>
      </div>
      {!isAuthenticated ? (
        <LockedFrame title="Sign in to unlock stats." onSignIn={onOpenAuth}>
          <StatsSkeleton />
        </LockedFrame>
      ) : (
        <div className="statsExperience">
          <section className="statsSelectorPanel" ref={pickerPanelRef}>
            <div className="statsSelectorPanel__head">
              <div className="statsSelectorPanel__copy">
                <span className="statsEyebrow">Reporting</span>
                <h3>Choose who to analyze</h3>
              </div>
              <div className="statsSelectorControls">
                <div
                  className={`statsScopeSwitch statsScopeSwitch--${activeKind}`}
                  role="tablist"
                  aria-label="Stats view"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeKind === "players"}
                    className={`statsScopeSwitch__option${
                      activeKind === "players"
                        ? " statsScopeSwitch__option--active"
                        : ""
                    }`}
                    onClick={() => setActiveKind("players")}
                  >
                    Individuals
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeKind === "teams"}
                    className={`statsScopeSwitch__option${
                      activeKind === "teams"
                        ? " statsScopeSwitch__option--active"
                        : ""
                    }`}
                    onClick={() => {
                      if (areTeamReportsLocked) {
                        onOpenProPlan();
                        return;
                      }
                      if (!areTeamReportsLocked) setActiveKind("teams");
                    }}
                    aria-disabled={areTeamReportsLocked}
                  >
                    <span>Teams</span>
                    {!canSeeAdvancedStats ? (
                      <span className="statsControlProBadge">PRO</span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`statsPickerDock${
                compareEnabled ? " statsPickerDock--compare" : ""
              }`}
            >
              <div className="statsPickerSlot statsPickerSlot--primary">
                <PickerButton
                  option={
                    activeKind === "players"
                      ? selectedPlayerOption
                      : selectedTeamOption
                  }
                  placeholder={
                    activeKind === "players" ? "Choose player" : "Choose team"
                  }
                  isOpen={
                    openPicker ===
                    (activeKind === "players" ? "primary" : "team")
                  }
                  onClick={() => {
                    setPickerSearch("");
                    setOpenPicker((current) =>
                      current ===
                      (activeKind === "players" ? "primary" : "team")
                        ? null
                        : activeKind === "players"
                          ? "primary"
                          : "team",
                    );
                  }}
                />
                {openPicker === "primary" && activeKind === "players" ? (
                  <PickerPopover
                    kind="players"
                    options={pickerOptions}
                    selectedId={selectedPlayerId}
                    onSelect={(id) => {
                      setSelectedPlayerId(id);
                      setOpenPicker(null);
                    }}
                    search={pickerSearch}
                    onSearchChange={setPickerSearch}
                  />
                ) : null}
                {openPicker === "team" && activeKind === "teams" ? (
                  <PickerPopover
                    kind="teams"
                    options={pickerOptions}
                    selectedId={selectedTeamId}
                    onSelect={(id) => {
                      setSelectedTeamId(id);
                      setOpenPicker(null);
                    }}
                    search={pickerSearch}
                    onSearchChange={setPickerSearch}
                  />
                ) : null}
              </div>

              {compareEnabled ? (
                <>
                  <div className="statsPickerDock__vs">VS</div>
                  <div className="statsPickerSlot statsPickerSlot--compare">
                    <PickerButton
                      option={
                        activeKind === "players"
                          ? comparePlayerOption
                          : compareTeamOption
                      }
                      placeholder={
                        activeKind === "players"
                          ? "Choose player"
                          : "Choose team"
                      }
                      isOpen={
                        openPicker ===
                        (activeKind === "players" ? "compare" : "teamCompare")
                      }
                      onClick={() => {
                        setPickerSearch("");
                        setOpenPicker((current) =>
                          current ===
                          (activeKind === "players" ? "compare" : "teamCompare")
                            ? null
                            : activeKind === "players"
                              ? "compare"
                              : "teamCompare",
                        );
                      }}
                    />
                    {openPicker === "compare" && activeKind === "players" ? (
                      <PickerPopover
                        kind="players"
                        options={pickerOptions}
                        selectedId={comparePlayerId}
                        onSelect={(id) => {
                          setComparePlayerId(id);
                          setOpenPicker(null);
                        }}
                        search={pickerSearch}
                        onSearchChange={setPickerSearch}
                      />
                    ) : null}
                    {openPicker === "teamCompare" && activeKind === "teams" ? (
                      <PickerPopover
                        kind="teams"
                        options={pickerOptions}
                        selectedId={compareTeamId}
                        onSelect={(id) => {
                          setCompareTeamId(id);
                          setOpenPicker(null);
                        }}
                        search={pickerSearch}
                        onSearchChange={setPickerSearch}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            {activeKind === "players" || activeKind === "teams" ? (
              <label
                className={`statsCompareToggle${
                  compareEnabled ? " statsCompareToggle--active" : ""
                }${isCompareLocked ? " statsCompareToggle--locked" : ""}`}
                onClick={(event) => {
                  if (!isCompareLocked) return;
                  event.preventDefault();
                  onOpenProPlan();
                }}
              >
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(event) => {
                    if (isCompareLocked) return;
                    const next = event.target.checked;
                    setCompareEnabled(next);
                    if (!next) {
                      setOpenPicker(null);
                    }
                  }}
                />
                <span className="statsCompareToggle__box" aria-hidden="true" />
                <span>
                  Compare with another{" "}
                  {activeKind === "players" ? "player" : "team"}
                </span>
                {isCompareLocked ? (
                  <span className="statsControlProBadge">PRO</span>
                ) : null}
              </label>
            ) : null}
          </section>

          {!primaryReport ? (
            <StatsScreenEmpty
              title={
                activeKind === "players"
                  ? "No saved players yet"
                  : "No saved teams yet"
              }
              copy={
                activeKind === "players"
                  ? "Create a saved player first, then you can analyze and compare them here."
                  : "Build a saved team first, then its team-level report will show here."
              }
            />
          ) : (
            <>
              {activeKind === "teams" && selectedTeamReport ? (
                <div
                  className={`statsFocusCardGrid${
                    compareTeamReport ? " statsFocusCardGrid--compare" : ""
                  }`}
                >
                  {renderTeamReportCard({
                    report: selectedTeamReport,
                    option: selectedTeamOption,
                    memberProfiles: selectedMemberProfiles,
                    eyebrow: "Primary team",
                  })}
                  {compareTeamReport
                    ? renderTeamReportCard({
                        report: compareTeamReport,
                        option: compareTeamOption,
                        memberProfiles: compareMemberProfiles,
                        eyebrow: "Compared team",
                      })
                    : null}
                </div>
              ) : null}

              {primaryReport && compareEnabled && compareReport ? (
                <div className="statsCompareMetricGrid">
                  <ComparisonMetricCard
                    label="Wins"
                    leftName={primaryName}
                    rightName={compareName}
                    leftValue={primaryReport.wins}
                    rightValue={compareReport?.wins ?? null}
                    winner={compareValues(
                      primaryReport.wins,
                      compareReport?.wins ?? null,
                    )}
                    icon={
                      <Trophy size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                  />
                  <ComparisonMetricCard
                    label="Win rate"
                    leftName={primaryName}
                    rightName={compareName}
                    leftValue={`${primaryReport.winRate}%`}
                    rightValue={
                      compareReport ? `${compareReport.winRate}%` : null
                    }
                    winner={compareValues(
                      primaryReport.winRate,
                      compareReport?.winRate ?? null,
                    )}
                    icon={
                      <SquareActivity
                        size={16}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    }
                  />
                  <ComparisonMetricCard
                    label="Current streak"
                    leftName={primaryName}
                    rightName={compareName}
                    leftValue={
                      primaryReport.currentWinStreak
                        ? `${primaryReport.currentWinStreak}x`
                        : "—"
                    }
                    rightValue={
                      compareReport
                        ? compareReport.currentWinStreak
                          ? `${compareReport.currentWinStreak}x`
                          : "—"
                        : null
                    }
                    winner={compareValues(
                      primaryReport.currentWinStreak,
                      compareReport?.currentWinStreak ?? null,
                    )}
                    icon={
                      <Flame size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                  />
                  <ComparisonMetricCard
                    label="Avg placement"
                    leftName={primaryName}
                    rightName={compareName}
                    leftValue={formatAveragePlacement(
                      primaryReport.averagePlacement,
                    )}
                    rightValue={
                      compareReport
                        ? formatAveragePlacement(compareReport.averagePlacement)
                        : null
                    }
                    winner={compareValues(
                      primaryReport.averagePlacement,
                      compareReport?.averagePlacement ?? null,
                      "lower",
                    )}
                    icon={
                      <Medal size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                  />
                </div>
              ) : (
                <div className="statsKpiGrid">
                  <MetricCard
                    label="Wins"
                    value={primaryReport.wins}
                    copy={`${primaryReport.losses} losses, ${primaryReport.draws} draws`}
                    icon={
                      <Trophy size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                    accent
                  />
                  <MetricCard
                    label="Win rate"
                    value={`${primaryReport.winRate}%`}
                    copy={`${primaryReport.completedGames} completed sessions`}
                    icon={
                      <SquareActivity
                        size={16}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    }
                  />
                  <MetricCard
                    label="Current streak"
                    value={
                      primaryReport.currentWinStreak
                        ? `${primaryReport.currentWinStreak}x`
                        : "—"
                    }
                    copy={
                      primaryReport.currentWinStreak
                        ? "Consecutive wins right now"
                        : "No active win streak"
                    }
                    icon={
                      <Flame size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                  />
                  <MetricCard
                    label="Avg placement"
                    value={formatAveragePlacement(
                      primaryReport.averagePlacement,
                    )}
                    copy={
                      typeof primaryReport.bestPlacement === "number"
                        ? `Best finish: #${primaryReport.bestPlacement}`
                        : "No completed placements yet"
                    }
                    icon={
                      <Medal size={16} strokeWidth={2.2} aria-hidden="true" />
                    }
                  />
                </div>
              )}

              {canSeeAdvancedStats ? (
                <>
                  <div ref={chartPickerRef}>
                    <StatsCharts
                      activeKind={activeKind}
                      primaryName={primaryName}
                      secondaryName={compareReport ? compareName : null}
                      chartGameOptions={chartGameOptions}
                      openChartGamePicker={openChartGamePicker}
                      winsChartGame={winsChartGame}
                      rateChartGame={rateChartGame}
                      winsComparisonTrend={winsComparisonTrend}
                      rateComparisonTrend={rateComparisonTrend}
                      winsChartAxis={winsChartAxis}
                      rateChartAxis={rateChartAxis}
                      outcomeBreakdown={outcomeBreakdown}
                      gameWinRateBreakdown={gameWinRateBreakdown}
                      onToggleChartGamePicker={(picker) =>
                        setOpenChartGamePicker((current) =>
                          current === picker ? null : picker,
                        )
                      }
                      onSelectWinsChartGame={(value) => {
                        setWinsChartGame(value);
                        setOpenChartGamePicker(null);
                      }}
                      onSelectRateChartGame={(value) => {
                        setRateChartGame(value);
                        setOpenChartGamePicker(null);
                      }}
                    />
                  </div>

                  <StatsAdvancedCards
                    activeKind={activeKind}
                    streakSummary={streakHistorySummary}
                    headToHeadSummary={headToHeadSummary}
                    isLocked={false}
                    onUpgrade={onOpenProPlan}
                  />
                </>
              ) : (
                <StatsProPreview onUpgrade={onOpenProPlan} />
              )}

              <div className="statsMetaGrid">
                <section className="statsPanel">
                  <PanelHeader
                    title={`Recent sessions for ${primaryName}`}
                    count={primaryReport.sessions.length}
                  />
                  {primaryReport.sessions.length ? (
                    <div className="statsSessionList">
                      {primaryReport.sessions.map((session) => (
                        <div key={session.id} className="statsSessionRow">
                          <div className="statsSessionRow__left">
                            <strong>{session.sessionName}</strong>
                            <span>
                              {session.dateLabel}
                              {session.isTeamGame && session.teamName
                                ? ` · ${session.teamName}`
                                : ""}
                            </span>
                          </div>
                          <div className="statsSessionRow__right">
                            <span className="statsSessionPlacement">
                              {formatPlacement(
                                session.placement,
                                session.placementMax,
                              )}
                            </span>
                            <span
                              className={`statsStatus ${getStatusTone(
                                session.resultKind,
                              )}`}
                            >
                              {STATUS_LABELS[session.resultKind]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyMsg">No sessions tracked yet.</div>
                  )}
                </section>

                <section className="statsPanel">
                  <PanelHeader
                    title={`Best games for ${primaryName}`}
                    count={primaryReport.gameBreakdown.length}
                  />
                  {primaryReport.gameBreakdown.length ? (
                    <div className="statsBreakdownList">
                      {primaryReport.gameBreakdown.map((game) => (
                        <div key={game.name} className="statsBreakdownRow">
                          <div className="statsBreakdownRow__left">
                            <strong>{game.name}</strong>
                            <span>
                              {game.sessions} sessions · {game.wins} wins
                            </span>
                          </div>
                          <div className="statsBreakdownRow__right">
                            <span>{game.winRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyMsg">No game breakdown yet.</div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
