import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomeTab } from "./types";
import type { NewGameInput } from "./components/NewGameCard/NewGameCard";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "./components/ConfirmDialog/ConfirmDialog";
import {
  AuthDialog,
  type AuthDialogHandle,
} from "./components/AuthDialog/AuthDialog";
import {
  ProFeatureGateDialog,
  type ProFeatureGateDialogHandle,
} from "./components/ProFeatureGateDialog/ProFeatureGateDialog";
import { TopBar } from "./components/TopBar/TopBar";
import { useProfiles } from "./hooks/useProfiles";
import { useTeams } from "./hooks/useTeams";
import { useGames } from "./hooks/useGames";
import { useScorePulse } from "./hooks/useScorePulse";
import { useAuthSession } from "./hooks/useAuthSession";
import { EntitlementsProvider, useEntitlements } from "./hooks/useEntitlements";
import { supabase } from "./lib/supabase";
import { DashboardScreen } from "./screens/DashboardScreen";
import { GameScreen } from "./screens/GameScreen";
import { GameHistoryScreen } from "./screens/GameHistoryScreen";
import type {
  Game,
  GameTeam,
  PlayerProfile,
  ToastState,
  ToastTone,
} from "./types";
import {
  GameSettingsDialog,
  GameSettingsDialogHandle,
} from "./components/GameSettingsDialog/GameSettingsDialog";
import { ManagePlayersDialogHandle } from "./components/ManagePlayersDialog/ManagePlayersDialog";
import DotGrid from "./components/DotGrid/DotGrid";
import { uid } from "./utils/id";
import {
  capitalizeFirst,
  formatPlayerName,
  getGameDisplayName,
} from "./utils/text";
import { findWinner, sortPlayers } from "./utils/ranking";
import { getGameParticipants } from "./utils/gameParticipants";
import {
  computeProfileStats,
  createEmptyProfileStats,
} from "./utils/profileStats";
import { shouldSortLowToHigh } from "./utils/scoring";
import {
  createBackupPayload,
  getGameImportSignature,
  parseBackupPayload,
  prepareBackupImport,
  type BackupSelection,
} from "./storage/backupFile";
import { loadGuestGames } from "./storage/gamesStorage";
import { loadProfiles } from "./storage/profilesStorage";
import {
  APP_VIEW_STORAGE_KEY,
  AVATAR_COLORS,
  HOME_TAB_STORAGE_KEY,
  LOCAL_SESSIONS_HINT_DISMISSED_KEY,
  PLAYERS_VIEW_STORAGE_KEY,
} from "./constants";
import { CircleUser } from "lucide-react";

type PresetDraftIntent = "edit" | "teams-detour" | null;

export default function App() {
  const reduceMotion = useReducedMotion();
  const {
    session,
    loading: authLoading,
    authEnabled,
    passwordRecoveryRequestedAt,
  } = useAuthSession();
  const entitlements = useEntitlements(session);
  const {
    profiles,
    upsertProfile,
    upsertAccountPlayer,
    deleteProfile,
    updateProfile,
    importProfiles,
    remoteReady: profilesReady,
    syncNotice: profileSyncNotice,
  } = useProfiles(session);
  const {
    teams,
    teamMembers,
    createTeam,
    updateTeam,
    deleteTeam: deleteSavedTeam,
    toggleTeamMember,
    removeProfileMemberships,
    importTeams,
    remoteReady: teamsReady,
    syncNotice: teamSyncNotice,
  } = useTeams(session);
  const {
    games,
    currentGameId,
    currentGame,
    createGame,
    duplicateGame,
    selectGame,
    deleteGame,
    renameGame,
    addPlayer,
    addTeam,
    removePlayer,
    removeTeam,
    updatePlayer,
    resetScores,
    updateScore,
    updateGameSettings,
    finishGame,
    syncProfile,
    importGames,
    remoteReady: gamesReady,
    syncNotice: gameSyncNotice,
  } = useGames(session, authLoading);
  const { pulseById, triggerPulse } = useScorePulse();
  const confirmRef = useRef<ConfirmDialogHandle>(null!);
  const managePlayersDialogRef = useRef<ManagePlayersDialogHandle>(null!);
  const handledManageTeamsDialogOpenTokenRef = useRef(0);
  const settingsDialogRef = useRef<GameSettingsDialogHandle>(null!);
  const authDialogRef = useRef<AuthDialogHandle>(null!);
  const proFeatureGateDialogRef = useRef<ProFeatureGateDialogHandle>(null!);
  const wantsRestoredGameView = useMemo(() => {
    try {
      return localStorage.getItem(APP_VIEW_STORAGE_KEY) === "game";
    } catch {
      return false;
    }
  }, []);
  const [view, setView] = useState<"home" | "game" | "history">(() => {
    try {
      return localStorage.getItem(APP_VIEW_STORAGE_KEY) === "game"
        ? "game"
        : "home";
    } catch {
      return "home";
    }
  });
  const [hasCompletedInitialViewRestore, setHasCompletedInitialViewRestore] =
    useState(() => !wantsRestoredGameView);
  const [homeTab, setHomeTab] = useState<HomeTab>(() => {
    try {
      const stored = localStorage.getItem(HOME_TAB_STORAGE_KEY);
      return stored === "sessions" || stored === "stats" || stored === "players"
        ? stored
        : "home";
    } catch {
      return "home";
    }
  });
  const [gameReturnTab, setGameReturnTab] = useState<HomeTab>(homeTab);
  const appTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [visibleToast, setVisibleToast] = useState<ToastState | null>(null);
  const [localDataVersion, setLocalDataVersion] = useState(0);
  const [shouldSaveGamePlayersOnSignIn, setShouldSaveGamePlayersOnSignIn] =
    useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [presetDraft, setPresetDraft] = useState<NewGameInput | null>(null);
  const [presetDraftToken, setPresetDraftToken] = useState(0);
  const [presetDraftIntent, setPresetDraftIntent] =
    useState<PresetDraftIntent>(null);
  const [openTeamBuilderRequestToken, setOpenTeamBuilderRequestToken] =
    useState(0);
  const [returnToManageTeamsAfterCreate, setReturnToManageTeamsAfterCreate] =
    useState(false);
  const [
    pendingManageTeamsDialogOpenToken,
    setPendingManageTeamsDialogOpenToken,
  ] = useState(0);
  const [
    dismissedLocalSessionsHintSignature,
    setDismissedLocalSessionsHintSignature,
  ] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_SESSIONS_HINT_DISMISSED_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const profileStats = useMemo(() => computeProfileStats(games), [games]);
  const canViewSavedData = !!session;
  const visibleGames = canViewSavedData && !gamesReady ? [] : games;
  const visibleProfiles = canViewSavedData ? profiles : [];
  const visibleTeams = canViewSavedData && teamsReady ? teams : [];
  const visibleTeamMembers = canViewSavedData && teamsReady ? teamMembers : [];
  const localGuestGames = useMemo(
    () => (canViewSavedData ? loadGuestGames() : games),
    [canViewSavedData, games, localDataVersion],
  );
  const localGuestProfiles = useMemo(
    () => (canViewSavedData ? loadProfiles() : profiles),
    [canViewSavedData, localDataVersion, profiles],
  );
  const localGamesCount = localGuestGames.length;
  const localProfilesCount = localGuestProfiles.length;
  const pendingLocalGuestGames = useMemo(() => {
    if (!canViewSavedData) return [];
    const accountGamesById = new Map(games.map((game) => [game.id, game]));
    return localGuestGames.filter((guestGame) => {
      const accountGame = accountGamesById.get(guestGame.id);
      return !accountGame || guestGame.updatedAt > accountGame.updatedAt;
    });
  }, [canViewSavedData, games, localGuestGames]);
  const pendingLocalGuestProfiles = useMemo(() => {
    if (!canViewSavedData) return [];
    const accountProfilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    const accountProfileKeys = new Set(
      profiles
        .map((profile) => formatPlayerName(profile.name).toLowerCase())
        .filter(Boolean),
    );

    return localGuestProfiles.filter((guestProfile) => {
      const accountProfile = accountProfilesById.get(guestProfile.id);
      if (accountProfile) {
        return guestProfile.updatedAt > accountProfile.updatedAt;
      }

      const key = formatPlayerName(guestProfile.name).toLowerCase();
      return Boolean(key) && !accountProfileKeys.has(key);
    });
  }, [canViewSavedData, localGuestProfiles, profiles]);
  const pendingLocalSessionsHintSignature = useMemo(() => {
    return pendingLocalGuestGames
      .map((game) => `${game.id}:${game.updatedAt}`)
      .sort()
      .join("|");
  }, [pendingLocalGuestGames]);
  const pendingLocalSessionsCount = pendingLocalGuestGames.length;
  const showLocalSessionsHint =
    pendingLocalSessionsCount > 0 &&
    pendingLocalSessionsHintSignature !== dismissedLocalSessionsHintSignature;
  const isSessionCountPending = canViewSavedData && !gamesReady;
  const currentSessionCount = canViewSavedData
    ? games.length
    : localGuestGames.length;

  useEffect(() => {
    if (passwordRecoveryRequestedAt > 0) {
      authDialogRef.current?.openPasswordReset();
    }
  }, [passwordRecoveryRequestedAt]);

  function randomAvatarColor() {
    const index = Math.floor(Math.random() * AVATAR_COLORS.length);
    return AVATAR_COLORS[index]?.value ?? "#64748b";
  }

  function showToast(message: string, tone: ToastTone = "default") {
    setVisibleToast({ message, tone });
  }

  function getSessionCapacityState(extra = 1) {
    if (canViewSavedData && entitlements.isLoading) return "loading" as const;
    if (isSessionCountPending) return "loading" as const;
    if (entitlements.maxSessions === null) return "allowed" as const;
    return currentSessionCount + extra <= entitlements.maxSessions
      ? ("allowed" as const)
      : ("blocked" as const);
  }

  function showSessionsLoadingToast() {
    showToast("Loading your saved sessions. Try again in a moment.");
  }

  function showSessionLimitToast() {
    const limit = entitlements.maxSessions;
    if (!limit) return;
    showToast(
      `Free plan includes up to ${limit} sessions. Upgrade to Pro for unlimited session history.`,
    );
  }

  function guardSessionCreation(extra = 1) {
    const capacityState = getSessionCapacityState(extra);
    if (capacityState === "loading") {
      showSessionsLoadingToast();
      return false;
    }
    if (capacityState === "blocked") {
      showSessionLimitToast();
      return false;
    }
    return true;
  }

  function returnToGameSource() {
    setHomeTab(gameReturnTab);
    setView("home");
  }

  function openTeamsTabFromGame() {
    try {
      localStorage.setItem(PLAYERS_VIEW_STORAGE_KEY, "teams");
    } catch {
      // Ignore storage failures; fallback tab navigation still works.
    }
    setReturnToManageTeamsAfterCreate(true);
    setOpenTeamBuilderRequestToken((value) => value + 1);
    setGameReturnTab("players");
    setHomeTab("players");
    setView("home");
  }

  function handleTeamCreatedFromDashboard(team: GameTeam) {
    if (presetDraftIntent === "teams-detour" && presetDraft) {
      setPresetDraft({
        ...presetDraft,
        participantMode: "teams",
        initialTeams: [
          {
            id: team.id,
            name: team.name,
            icon: team.icon,
            members: [],
          },
          ...(presetDraft.initialTeams ?? []).filter(
            (draftTeam) => draftTeam.id !== team.id,
          ),
        ],
      });
      setPresetDraftToken((value) => value + 1);
      setPresetDraftIntent("edit");
      setHomeTab("home");
      setView("home");
      return;
    }

    if (!returnToManageTeamsAfterCreate) return;
    setReturnToManageTeamsAfterCreate(false);
    setGameReturnTab("players");
    setView("game");
    setPendingManageTeamsDialogOpenToken((value) => value + 1);
  }

  function dismissLocalSessionsHint() {
    setDismissedLocalSessionsHintSignature(pendingLocalSessionsHintSignature);
    try {
      localStorage.setItem(
        LOCAL_SESSIONS_HINT_DISMISSED_KEY,
        pendingLocalSessionsHintSignature,
      );
    } catch {
      // Ignore storage failures.
    }
  }

  async function openProFeatureAuthPrompt() {
    await proFeatureGateDialogRef.current?.open();
  }

  function updateProfileEverywhere(
    profileId: string,
    updates: Parameters<typeof updateProfile>[1],
  ) {
    updateProfile(profileId, updates);
    syncProfile(profileId, updates);

    const profile = profiles.find((item) => item.id === profileId);
    if (!profile?.isAccountPlayer || updates.name === undefined || !supabase) {
      return;
    }

    void supabase.auth.updateUser({
      data: {
        name: updates.name,
        full_name: updates.name,
        display_name: updates.name,
        player_name: updates.name,
      },
    });
  }

  const gameMetaItems = useMemo(() => {
    if (!currentGame) return [];

    const items: Array<{ label: string; tone?: "accent" | "muted" }> = [];
    const winner = findWinner(currentGame.players, currentGame);
    const isTeamsGame =
      currentGame.participantMode === "teams" && currentGame.teams.length > 0;
    const winningTeamName =
      winner && isTeamsGame
        ? getGameParticipants(currentGame).find((participant) =>
            participant.members.some((member) => member.id === winner.id),
          )?.name
        : null;

    if (winner) {
      items.push({
        label: `Winner ${winningTeamName ?? capitalizeFirst(winner.name)}`,
        tone: "accent",
      });
    }

    items.push({
      label: currentGame.manualEndOnly
        ? currentGame.targetScore > 0
          ? `Manual finish · ref ${currentGame.targetScore}`
          : "Manual finish"
        : currentGame.winCondition === "reach_zero"
          ? `Start ${currentGame.startingScore} · reach 0`
          : currentGame.winCondition === "lowest"
            ? currentGame.winByTwo
              ? `Lowest wins · ${currentGame.targetScore} · win by 2`
              : `Lowest wins · ${currentGame.targetScore}`
            : currentGame.winByTwo
              ? `Target ${currentGame.targetScore} · win by 2`
              : `Target ${currentGame.targetScore} pts`,
      tone: "accent",
    });

    if (currentGame.timerEnabled) {
      items.push({ label: "Timer on", tone: "muted" });
    }

    return items;
  }, [currentGame]);

  const gameDisplayName = useMemo(() => {
    if (!currentGame) return { title: "", replayNumber: null };
    return getGameDisplayName(currentGame.name);
  }, [currentGame]);

  const hasNonZeroScore = useMemo(() => {
    if (!currentGame) return false;
    return currentGame.players.some(
      (p) => p.score !== currentGame.startingScore,
    );
  }, [currentGame]);

  const currentWinnerStats = useMemo(() => {
    if (!currentGame) return null;
    const winner = findWinner(currentGame.players, currentGame);
    if (!winner?.profileId) return null;
    return profileStats.get(winner.profileId) ?? createEmptyProfileStats();
  }, [currentGame, profileStats]);

  async function handleEndCurrentGame() {
    if (!currentGame) return;
    const participants = [...getGameParticipants(currentGame)].sort((a, b) =>
      sortPlayers(a, b, shouldSortLowToHigh(currentGame)),
    );
    const leader = participants[0] ?? null;
    const runnerUp = participants[1] ?? null;
    const isDraw = Boolean(
      leader && runnerUp && leader.score === runnerUp.score,
    );
    const canDeclareWinner = Boolean(
      leader && (!runnerUp || leader.score !== runnerUp.score),
    );

    const result = await confirmRef.current?.choose({
      title: "End game",
      message: isDraw
        ? "Current standings are tied. End this game as a draw or finish it without a winner?"
        : canDeclareWinner
          ? "Finish this game using the current standings, or end it without a winner?"
          : "Mark this game as finished without a winner?",
      confirmText: isDraw
        ? "End as draw"
        : canDeclareWinner
          ? "End with winner"
          : "End game",
      extraActionText: isDraw || canDeclareWinner ? "End without winner" : "",
      tone: "default",
    });
    if (!result || result === "cancel") return;
    if (result === "extra") {
      finishGame(currentGame.id, "no_winner");
      return;
    }
    if (isDraw) {
      finishGame(currentGame.id, "draw");
      return;
    }
    finishGame(currentGame.id, canDeclareWinner ? "winner" : "no_winner");
  }

  useEffect(() => {
    const nextToast = gameSyncNotice ?? profileSyncNotice ?? teamSyncNotice;
    if (!nextToast) return;
    setVisibleToast(nextToast);
  }, [gameSyncNotice, profileSyncNotice, teamSyncNotice]);

  useEffect(() => {
    if (!visibleToast) return;
    const timeout = window.setTimeout(() => setVisibleToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [visibleToast]);

  useEffect(() => {
    localStorage.setItem(
      APP_VIEW_STORAGE_KEY,
      view === "home" ? "home" : "game",
    );
  }, [view]);

  useEffect(() => {
    localStorage.setItem(HOME_TAB_STORAGE_KEY, homeTab);
  }, [homeTab]);

  useEffect(() => {
    if (
      hasCompletedInitialViewRestore &&
      view !== "home" &&
      gamesReady &&
      !currentGameId
    ) {
      setView("home");
    }
  }, [currentGameId, gamesReady, hasCompletedInitialViewRestore, view]);

  useEffect(() => {
    if (
      !pendingManageTeamsDialogOpenToken ||
      pendingManageTeamsDialogOpenToken ===
        handledManageTeamsDialogOpenTokenRef.current ||
      view !== "game" ||
      !currentGame
    ) {
      return;
    }

    handledManageTeamsDialogOpenTokenRef.current =
      pendingManageTeamsDialogOpenToken;
    const frame = window.requestAnimationFrame(() => {
      managePlayersDialogRef.current?.open();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentGame, pendingManageTeamsDialogOpenToken, view]);

  useEffect(() => {
    if (
      hasCompletedInitialViewRestore ||
      !wantsRestoredGameView ||
      !gamesReady
    ) {
      return;
    }

    setView(currentGameId ? "game" : "home");
    setHasCompletedInitialViewRestore(true);
  }, [
    currentGameId,
    gamesReady,
    hasCompletedInitialViewRestore,
    wantsRestoredGameView,
  ]);

  const isResolvingInitialGameView =
    wantsRestoredGameView && !hasCompletedInitialViewRestore;

  useEffect(() => {
    if (!shouldSaveGamePlayersOnSignIn || !session || !currentGame) return;
    if (!profilesReady || !gamesReady) return;

    currentGame.players.forEach((player) => {
      const profile = upsertProfile(player.name, player.avatarColor);
      if (!profile) return;
      if (player.profileId !== profile.id) {
        updatePlayer(currentGame.id, player.id, {
          profileId: profile.id,
          name: profile.name,
          avatarColor: profile.avatarColor,
        });
      }
    });

    showToast("Saved players from this game to your account.", "success");
    setShouldSaveGamePlayersOnSignIn(false);
  }, [
    currentGame,
    gamesReady,
    profilesReady,
    session,
    shouldSaveGamePlayersOnSignIn,
    updatePlayer,
    upsertProfile,
  ]);

  useEffect(() => {
    if (!session || !profilesReady) return;
    if (profiles.some((profile) => profile.isAccountPlayer)) return;

    const metadata = session.user.user_metadata ?? {};
    const playerName =
      metadata.player_name ??
      metadata.name ??
      metadata.full_name ??
      metadata.display_name;
    if (typeof playerName !== "string" || !playerName.trim()) return;
    upsertAccountPlayer(playerName, randomAvatarColor());
  }, [profiles, profilesReady, session, upsertAccountPlayer]);

  useEffect(() => {
    if (!session || !gamesReady || !profilesReady || profiles.length === 0) {
      return;
    }

    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    const profilesByName = new Map(
      profiles.map((profile) => [
        formatPlayerName(profile.name).toLowerCase(),
        profile,
      ]),
    );

    games.forEach((game) => {
      game.players.forEach((player) => {
        const matchedProfile =
          (player.profileId ? profilesById.get(player.profileId) : null) ??
          profilesByName.get(formatPlayerName(player.name).toLowerCase());

        if (!matchedProfile) return;
        if (
          player.profileId === matchedProfile.id &&
          player.name === matchedProfile.name &&
          player.avatarColor === matchedProfile.avatarColor
        ) {
          return;
        }

        updatePlayer(game.id, player.id, {
          profileId: matchedProfile.id,
          name: matchedProfile.name,
          avatarColor: matchedProfile.avatarColor,
        });
      });
    });
  }, [games, gamesReady, profiles, profilesReady, session, updatePlayer]);

  async function handleCreateGame(input: Parameters<typeof createGame>[0]) {
    if (!guardSessionCreation()) {
      return false;
    }

    if (!session) {
      const ok = await confirmRef.current?.confirm({
        title: "Not signed in",
        message:
          "Continue as guest? This game stays on this device and will not be saved to your account.",
        confirmText: "Continue",
        cancelText: "Cancel",
      });
      if (!ok) return false;
    }

    const created = createGame(input);
    if (created) {
      setPresetDraft(null);
      setPresetDraftIntent(null);
      setGameReturnTab(homeTab);
      setView("game");
      return true;
    }
    return false;
  }

  async function handleStartQuickSetup(
    input: NewGameInput,
    details: {
      label: string;
      players: { name: string; avatarColor: string }[];
      teams?: Array<{
        id: string;
        name: string;
        icon?: string;
        members: { name: string; avatarColor: string }[];
      }>;
    },
  ) {
    const timerValue = !input.timerEnabled
      ? "Off"
      : input.timerMode === "stopwatch"
        ? "Stopwatch"
        : formatDialogTimer(input.timerSeconds);
    const result = await confirmRef.current?.choose({
      title: "New game details",
      details: [
        { label: "Name", value: details.label },
        {
          label:
            input.winCondition === "reach_zero"
              ? "Starting score"
              : input.manualEndOnly
                ? "Reference target"
                : "Points to win",
          value: String(
            input.winCondition === "reach_zero"
              ? input.startingScore
              : input.targetScore,
          ),
        },
        {
          label: "Win mode",
          value: input.manualEndOnly
            ? input.winByTwo
              ? "Manual finish, win by 2"
              : "Manual finish"
            : input.winCondition === "reach_zero"
              ? "First to zero wins"
              : input.winCondition === "lowest"
                ? input.winByTwo
                  ? "Lowest score wins by 2"
                  : "Lowest score wins"
                : input.winByTwo
                  ? "Highest score wins by 2"
                  : "Highest score wins",
        },
        { label: "Timer", value: timerValue },
        { label: "Dice", value: input.diceEnabled ? "On" : "Off" },
      ],
      players: input.participantMode === "teams" ? [] : details.players,
      teams: details.teams,
      message:
        input.participantMode === "teams"
          ? details.teams?.length
            ? "Teams"
            : ""
          : details.players.length
            ? "Players"
            : "",
      hideCancelAction: true,
      extraActionText: "Edit",
      confirmText: "Start new game",
      cancelText: "Cancel",
      layout: "feature",
    });
    if (result === "extra") {
      setPresetDraft(input);
      setPresetDraftToken((value) => value + 1);
      setPresetDraftIntent("edit");
      setHomeTab("home");
      setView("home");
      return;
    }
    if (result !== "confirm") return;
    await handleCreateGame(input);
  }

  function handleStoreNewGameDraft(draft: NewGameInput) {
    setPresetDraft(draft);
    setPresetDraftToken((value) => value + 1);
    setPresetDraftIntent("teams-detour");
  }

  function formatDialogTimer(totalSeconds: number | undefined) {
    const safeSeconds = Math.max(0, Math.trunc(totalSeconds ?? 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    appTouchStartRef.current = touch
      ? { x: touch.clientX, y: touch.clientY }
      : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const touchStart = appTouchStartRef.current;
    appTouchStartRef.current = null;
    if (!touchStart) return;

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStart.x;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - touchStart.y;
    if (
      view === "history" &&
      deltaX > 60 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      setView("game");
    } else if (
      view === "game" &&
      deltaX > 60 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      returnToGameSource();
    }
  }

  function prepareImportedData(
    incomingGames: Game[],
    incomingProfiles: PlayerProfile[],
  ) {
    const profileByKey = new Map<string, PlayerProfile>();
    const importedProfileById = new Map<string, PlayerProfile>();
    const profilesToImport: PlayerProfile[] = [];

    function getProfileKey(name: string) {
      const formatted = formatPlayerName(name);
      return formatted ? formatted.toLowerCase() : "";
    }

    profiles.forEach((profile) => {
      const key = getProfileKey(profile.name);
      if (key) profileByKey.set(key, profile);
    });

    incomingProfiles.forEach((profile) => {
      const key = getProfileKey(profile.name);
      if (!key) return;

      const existing = profileByKey.get(key);
      if (existing) {
        importedProfileById.set(profile.id, existing);
        return;
      }

      profileByKey.set(key, profile);
      importedProfileById.set(profile.id, profile);
      profilesToImport.push(profile);
    });

    const games = incomingGames.map((game) => ({
      ...game,
      players: game.players.map((player) => {
        const key = getProfileKey(player.name);
        let linkedProfile =
          (player.profileId
            ? importedProfileById.get(player.profileId)
            : null) ?? (key ? profileByKey.get(key) : null);

        if (!linkedProfile && key) {
          const now = Date.now();
          linkedProfile = {
            id: uid(),
            name: formatPlayerName(player.name),
            avatarColor: player.avatarColor,
            createdAt: now,
            updatedAt: now,
          };
          profileByKey.set(key, linkedProfile);
          profilesToImport.push(linkedProfile);
        }

        if (!linkedProfile) {
          return {
            ...player,
            name: formatPlayerName(player.name),
          };
        }

        return {
          ...player,
          name: linkedProfile.name,
          avatarColor: linkedProfile.avatarColor,
          profileId: linkedProfile.id,
        };
      }),
    }));

    return { games, profiles: profilesToImport };
  }

  function filterImportableGames(incomingGames: Game[]) {
    if (entitlements.canUseTeams) return incomingGames;
    return incomingGames.filter((game) => game.participantMode !== "teams");
  }

  async function handleImportLocalData(selection: {
    gameIds: string[];
    profileIds: string[];
  }) {
    const selectedLocalGames = localGuestGames.filter((game) =>
      selection.gameIds.includes(game.id),
    );
    const localProfiles = localGuestProfiles.filter((profile) =>
      selection.profileIds.includes(profile.id),
    );
    const localGames = filterImportableGames(selectedLocalGames);
    const skippedTeamContent = selectedLocalGames.length !== localGames.length;

    const prepared = prepareImportedData(localGames, localProfiles);
    const importCapacityState = getSessionCapacityState(prepared.games.length);
    if (importCapacityState === "loading") {
      throw new Error(
        "Loading your saved sessions. Try importing again in a moment.",
      );
    }
    if (importCapacityState === "blocked") {
      throw new Error(
        `Free plan includes up to ${entitlements.maxSessions} sessions. Upgrade to Pro to import more history.`,
      );
    }
    const importedProfiles = importProfiles(prepared.profiles);
    const importedGames = importGames(prepared.games);

    setLocalDataVersion((value) => value + 1);
    return {
      games: importedGames,
      profiles: importedProfiles,
      teams: 0,
      skippedTeamContent,
    };
  }

  async function handleImportBackupFile(
    file: File,
    selection: BackupSelection,
  ) {
    const raw = await file.text();
    const backup = parseBackupPayload(raw);
    const canImportTeams = entitlements.canUseTeams && selection.profiles;
    const skippedTeamContent =
      !entitlements.canUseTeams &&
      ((selection.games &&
        backup.games.some((game) => game.participantMode === "teams")) ||
        (selection.profiles &&
          (backup.teams.length > 0 || backup.teamMembers.length > 0)));

    if (canImportTeams && !teamsReady) {
      throw new Error(
        "Loading your saved teams. Try restoring again in a moment.",
      );
    }

    const prepared = prepareBackupImport(backup, {
      importGames: selection.games,
      importProfiles: selection.profiles,
      importTeams: canImportTeams,
      allowTeamSessions: entitlements.canUseTeams,
      existingGames: games,
      existingProfiles: profiles,
      existingTeams: teams,
      existingTeamMembers: teamMembers,
    });

    const reconciled = prepareImportedData(
      selection.games ? prepared.games : [],
      selection.profiles ? prepared.profiles : [],
    );
    const existingGameSignatures = new Set(games.map(getGameImportSignature));
    const uniqueReconciledGames = reconciled.games.filter((game) => {
      const signature = getGameImportSignature(game);
      if (existingGameSignatures.has(signature)) return false;
      existingGameSignatures.add(signature);
      return true;
    });
    const restoreCapacityState = getSessionCapacityState(
      uniqueReconciledGames.length,
    );
    if (restoreCapacityState === "loading") {
      throw new Error(
        "Loading your saved sessions. Try restoring again in a moment.",
      );
    }
    if (restoreCapacityState === "blocked") {
      throw new Error(
        `Free plan includes up to ${entitlements.maxSessions} sessions. Upgrade to Pro to restore larger backups.`,
      );
    }
    const importedProfiles = importProfiles(reconciled.profiles);
    const importedGames = importGames(uniqueReconciledGames);
    const importedTeams = canImportTeams
      ? importTeams(prepared.teams, prepared.teamMembers)
      : 0;

    return {
      games: importedGames,
      profiles: importedProfiles,
      teams: importedTeams,
      skippedTeamContent,
    };
  }

  async function handleDownloadBackupFile(selection: BackupSelection) {
    if (selection.profiles && session && !teamsReady) {
      throw new Error(
        "Loading your saved teams. Try downloading again in a moment.",
      );
    }

    const payload = createBackupPayload(
      games,
      profiles,
      teams,
      teamMembers,
      selection,
    );
    const backupJson = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `plink-backup-${stamp}.json`;
    const file = new File([backupJson], filename, {
      type: "application/json",
    });

    if (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "Plink backup",
          text: "Backup file for Plink sessions and players.",
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return {
            games: selection.games ? payload.games.length : 0,
            profiles: selection.profiles ? payload.profiles.length : 0,
            teams: selection.profiles ? payload.teams.length : 0,
          };
        }
        throw error;
      }

      return {
        games: selection.games ? payload.games.length : 0,
        profiles: selection.profiles ? payload.profiles.length : 0,
        teams: selection.profiles ? payload.teams.length : 0,
      };
    }

    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return {
      games: selection.games ? payload.games.length : 0,
      profiles: selection.profiles ? payload.profiles.length : 0,
      teams: selection.profiles ? payload.teams.length : 0,
    };
  }

  return (
    <EntitlementsProvider value={entitlements}>
      <div
        className="app"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`appBackdrop${authDialogOpen ? " appBackdrop--hidden" : ""}`}
          aria-hidden="true"
        >
          <DotGrid
            dotSize={3}
            gap={23}
            baseColor="#202b34"
            activeColor="#d8ff4f"
            proximity={140}
            shockRadius={250}
            shockStrength={5}
            resistance={750}
            returnDuration={1.5}
            idleSpeed={1.75}
            idleStrength={4.5}
          />
        </div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0.85, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        >
          <TopBar
            accentTone={
              view === "game" &&
              !!currentGame &&
              currentGame.participantMode === "teams"
                ? "team"
                : "default"
            }
            balancedLayout={view === "history"}
            title={
              view === "history" && currentGame
                ? "History"
                : view === "game" && currentGame
                  ? gameDisplayName.title
                  : ""
            }
            titleSuffix={
              view === "game" && currentGame && gameDisplayName.replayNumber
                ? `#${gameDisplayName.replayNumber}`
                : undefined
            }
            backLabel={view === "history" ? "Back to game" : "Back to games"}
            showBackButton={view !== "home" && !!currentGame}
            showActionMenu={view === "game" && !!currentGame}
            primaryActionLabel={
              view === "home" && homeTab !== "home" && homeTab !== "players"
                ? "New game"
                : undefined
            }
            authLabel={
              view === "home"
                ? authLoading
                  ? "Loading..."
                  : authEnabled
                    ? session
                      ? undefined
                      : "Sign in"
                    : "Local only"
                : undefined
            }
            authIcon={
              view === "home" && authEnabled && !authLoading && session ? (
                <CircleUser size={26} strokeWidth={2.3} aria-hidden="true" />
              ) : undefined
            }
            authAriaLabel={session ? "Account" : "Sign in"}
            metaItems={
              view === "history" && currentGame
                ? [{ label: gameDisplayName.title, tone: "muted" }]
                : view === "game" && currentGame
                  ? gameMetaItems
                  : undefined
            }
            showReset={view === "game" && hasNonZeroScore}
            onBack={() =>
              view === "history" ? setView("game") : returnToGameSource()
            }
            onLogoClick={() => setView("home")}
            onPrimaryAction={() => {
              setView("home");
              if (homeTab === "players" && session) {
                window.dispatchEvent(new CustomEvent("plink:add-player"));
              } else {
                window.dispatchEvent(new CustomEvent("plink:new-game"));
              }
            }}
            onOpenAuth={() => {
              setShouldSaveGamePlayersOnSignIn(false);
              authDialogRef.current?.open();
            }}
            onAddPlayerLabel={
              view === "game" && currentGame?.participantMode === "teams"
                ? "Manage teams"
                : "Manage players"
            }
            onAddPlayer={() => managePlayersDialogRef.current?.open()}
            onOpenSettings={
              view === "game" && currentGame
                ? () => settingsDialogRef.current?.open()
                : undefined
            }
            onOpenHistory={
              view === "game" && currentGame
                ? () => setView("history")
                : undefined
            }
            onEndGame={
              view === "game" &&
              currentGame &&
              currentGame.players.length > 0 &&
              !findWinner(currentGame.players, currentGame)
                ? handleEndCurrentGame
                : undefined
            }
            onResetGame={async () => {
              if (!currentGame) return;
              const ok = await confirmRef.current?.confirm({
                title: "Reset game",
                message: "Reset all scores to 0?",
                confirmText: "Reset",
                tone: "danger",
              });
              if (!ok) return;
              resetScores(currentGame.id);
            }}
          />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {isResolvingInitialGameView ? null : view === "history" &&
            currentGame ? (
            <motion.div
              className="appView"
              key={`view-history-${currentGame.id}`}
              initial={
                reduceMotion ? false : { opacity: 0, y: 18, scale: 0.995 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -16, scale: 0.995 }}
              transition={{
                duration: reduceMotion ? 0 : 0.26,
                ease: "easeOut",
              }}
            >
              <GameHistoryScreen game={currentGame} />
            </motion.div>
          ) : view === "game" && currentGame ? (
            <motion.div
              className="appView"
              key={`view-game-${currentGame.id}`}
              initial={
                reduceMotion ? false : { opacity: 0, y: 18, scale: 0.995 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -16, scale: 0.995 }}
              transition={{
                duration: reduceMotion ? 0 : 0.26,
                ease: "easeOut",
              }}
            >
              <GameScreen
                game={currentGame}
                profiles={visibleProfiles}
                teams={visibleTeams}
                teamMembers={visibleTeamMembers}
                isAuthenticated={canViewSavedData}
                canUseTeams={entitlements.canUseTeams}
                pulseById={pulseById}
                onTriggerPulse={triggerPulse}
                managePlayersDialogRef={managePlayersDialogRef}
                onDeleteProfile={async (profileId) => {
                  const profile = profiles.find((p) => p.id === profileId);
                  if (profile?.isAccountPlayer) {
                    showToast("Your account player cannot be deleted.");
                    return;
                  }
                  const label = profile ? profile.name : "this player";
                  const ok = await confirmRef.current?.confirm({
                    title: "Delete saved player",
                    message: `Delete "${label}" from your saved players?`,
                    confirmText: "Delete",
                    tone: "danger",
                  });
                  if (!ok) return;
                  deleteProfile(profileId);
                }}
                onUpsertProfile={upsertProfile}
                onStartGame={(profileIds, newPlayers) => {
                  if (!currentGame) return;

                  // 1. Add players from existing profiles
                  profileIds.forEach((pid) => {
                    const profile = profiles.find((p) => p.id === pid);
                    if (profile) {
                      addPlayer(currentGame.id, {
                        name: profile.name,
                        avatarColor: profile.avatarColor,
                        profileId: profile.id,
                      });
                    }
                  });

                  // 2. Add newly created players
                  newPlayers.forEach((np) => {
                    if (np.saveForLater && canViewSavedData) {
                      const profile = upsertProfile(np.name, np.avatarColor);
                      if (profile) {
                        addPlayer(currentGame.id, {
                          name: profile.name,
                          avatarColor: profile.avatarColor,
                          profileId: profile.id,
                        });
                      }
                    } else {
                      addPlayer(currentGame.id, {
                        name: np.name,
                        avatarColor: np.avatarColor,
                      });
                    }
                  });
                }}
                onUpdateScore={(playerId, delta) =>
                  updateScore(currentGame.id, playerId, delta)
                }
                onDeletePlayer={async (playerId) => {
                  const player = currentGame.players.find(
                    (item) => item.id === playerId,
                  );
                  const label = player
                    ? capitalizeFirst(player.name)
                    : "this player";
                  const ok = await confirmRef.current?.confirm({
                    title: "Remove player",
                    message: `Do you want to remove ${label} from this game?`,
                    confirmText: "Remove",
                    tone: "danger",
                  });
                  if (!ok) return;
                  removePlayer(currentGame.id, playerId);
                }}
                onUpdateProfile={(profileId, updates) => {
                  updateProfileEverywhere(profileId, updates);
                }}
                onUpdatePlayer={(playerId, updates) => {
                  const player = currentGame.players.find(
                    (item) => item.id === playerId,
                  );
                  const profileId = player?.profileId;
                  if (profileId) {
                    const profileUpdates: Parameters<typeof updateProfile>[1] =
                      {};
                    if (updates.name !== undefined) {
                      profileUpdates.name = updates.name;
                    }
                    if (updates.avatarColor !== undefined) {
                      profileUpdates.avatarColor = updates.avatarColor;
                    }
                    if (Object.keys(profileUpdates).length > 0) {
                      updateProfileEverywhere(profileId, profileUpdates);
                    }
                  }
                  updatePlayer(currentGame.id, playerId, updates);
                }}
                onCreateTeam={(name, icon, members = []) => {
                  return addTeam(
                    currentGame.id,
                    name,
                    icon,
                    members.map((member) => ({
                      name: member.name,
                      avatarColor: member.avatarColor,
                      profileId: member.id,
                    })),
                  );
                }}
                onDeleteTeam={async (teamId, teamName) => {
                  const ok = await confirmRef.current?.confirm({
                    title: "Remove team",
                    message:
                      currentGame.participantMode === "teams"
                        ? `Remove "${teamName}" from this game? Players in this team will also be removed from this game.`
                        : `Remove "${teamName}" from this game? Players will stay in the game but be unassigned from that team.`,
                    confirmText: "Remove",
                    tone: "danger",
                  });
                  if (!ok) return;
                  removeTeam(currentGame.id, teamId);
                }}
                onDeleteSavedTeam={async (teamId, teamName) => {
                  const ok = await confirmRef.current?.confirm({
                    title: "Delete team",
                    message: `Delete "${teamName}"? This removes the team only. Saved players will stay in your roster.`,
                    confirmText: "Delete",
                    tone: "danger",
                  });
                  if (ok) deleteSavedTeam(teamId);
                }}
                onOpenTeamsTab={openTeamsTabFromGame}
                winnerStats={currentWinnerStats}
                onReplayGame={() => {
                  if (!guardSessionCreation()) {
                    return;
                  }
                  const duplicated = duplicateGame(currentGame.id);
                  if (duplicated) setView("game");
                }}
                onBackToHome={returnToGameSource}
                onEndGame={handleEndCurrentGame}
              />
            </motion.div>
          ) : (
            <motion.div
              className="appView"
              key="view-home"
              initial={
                reduceMotion ? false : { opacity: 0, y: 16, scale: 0.995 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -14, scale: 0.995 }}
              transition={{
                duration: reduceMotion ? 0 : 0.24,
                ease: "easeOut",
              }}
            >
              <DashboardScreen
                games={visibleGames}
                profiles={visibleProfiles}
                teams={visibleTeams}
                teamMembers={visibleTeamMembers}
                canUseTeams={entitlements.canUseTeams}
                isAuthenticated={canViewSavedData}
                showLocalSessionsHint={showLocalSessionsHint}
                pendingLocalSessionsCount={pendingLocalSessionsCount}
                onDismissLocalSessionsHint={dismissLocalSessionsHint}
                presetDraft={presetDraft}
                presetDraftToken={presetDraftToken}
                presetDraftIntent={presetDraftIntent}
                openTeamBuilderRequestToken={openTeamBuilderRequestToken}
                onOpenTeamBuilderRequestHandled={() =>
                  setOpenTeamBuilderRequestToken(0)
                }
                onOpenAuth={() => {
                  setShouldSaveGamePlayersOnSignIn(false);
                  authDialogRef.current?.open();
                }}
                onOpenProFeatureAuth={openProFeatureAuthPrompt}
                onOpenLocalImport={() => {
                  setShouldSaveGamePlayersOnSignIn(false);
                  authDialogRef.current?.openLocalImport();
                }}
                onOpenProPlan={() => {
                  setShouldSaveGamePlayersOnSignIn(false);
                  authDialogRef.current?.openPlan();
                }}
                activeTab={homeTab}
                onActiveTabChange={setHomeTab}
                onStoreNewGameDraft={handleStoreNewGameDraft}
                onCreate={handleCreateGame}
                onStartQuickSetup={handleStartQuickSetup}
                onUpsertProfile={upsertProfile}
                onUpdateProfile={(id, updates) => {
                  updateProfileEverywhere(id, updates);
                }}
                onDeleteProfile={async (profileId) => {
                  const profile = profiles.find((p) => p.id === profileId);
                  if (profile?.isAccountPlayer) {
                    showToast("Your account player cannot be deleted.");
                    return;
                  }
                  const ok = await confirmRef.current?.confirm({
                    title: "Delete saved player",
                    message: `Delete "${profile?.name || "this player"}"? They will be removed from your list.`,
                    confirmText: "Delete",
                    tone: "danger",
                  });
                  if (ok) {
                    removeProfileMemberships(profileId);
                    deleteProfile(profileId);
                  }
                }}
                onCreateTeam={(name, icon) => createTeam(name, icon)}
                onTeamCreated={handleTeamCreatedFromDashboard}
                onUpdateTeam={updateTeam}
                onDeleteTeam={async (teamId) => {
                  const team = teams.find((item) => item.id === teamId);
                  const ok = await confirmRef.current?.confirm({
                    title: "Delete team",
                    message: `Delete "${team?.name ?? "this team"}"? This removes the team only. Saved players will stay in your roster.`,
                    confirmText: "Delete",
                    tone: "danger",
                  });
                  if (ok) deleteSavedTeam(teamId);
                }}
                onToggleTeamMember={(teamId, profileId) => {
                  toggleTeamMember(teamId, profileId);
                }}
                onDuplicate={(gameId) => {
                  if (!guardSessionCreation()) {
                    return;
                  }
                  const duplicated = duplicateGame(gameId);
                  if (duplicated) {
                    setGameReturnTab(homeTab);
                    setView("game");
                  }
                }}
                onRename={async (gameId) => {
                  const g = games.find((x) => x.id === gameId);
                  if (!g) return;
                  const nextName = await confirmRef.current?.prompt({
                    title: "Rename session",
                    message:
                      "Choose a clear name so this session is easy to find later.",
                    initialValue: g.name,
                    placeholder: "Session name",
                    confirmText: "Save name",
                    maxLength: 28,
                  });
                  if (nextName) {
                    renameGame(gameId, nextName);
                  }
                }}
                onEnter={(gameId) => {
                  selectGame(gameId);
                  setGameReturnTab(homeTab);
                  setView("game");
                }}
                onDelete={async (gameId) => {
                  const g = games.find((x) => x.id === gameId);
                  const label = g ? g.name : "this game";
                  const ok = await confirmRef.current?.confirm({
                    title: "Delete game",
                    message: `Delete "${label}"? This removes the game and its scores.`,
                    confirmText: "Delete",
                    tone: "danger",
                  });
                  if (!ok) return;
                  deleteGame(gameId);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {view === "game" && currentGame ? (
          <GameSettingsDialog
            ref={settingsDialogRef}
            game={currentGame}
            isAuthenticated={canViewSavedData}
            onOpenAuth={() => {
              setShouldSaveGamePlayersOnSignIn(true);
              authDialogRef.current?.open();
            }}
            onAddPlayer={() => managePlayersDialogRef.current?.open()}
            onSave={(input) => {
              updateGameSettings(currentGame.id, input);
            }}
          />
        ) : null}

        <AuthDialog
          ref={authDialogRef}
          session={session}
          onOpenChange={setAuthDialogOpen}
          localGamesCount={
            canViewSavedData ? pendingLocalGuestGames.length : localGamesCount
          }
          localProfilesCount={
            canViewSavedData
              ? pendingLocalGuestProfiles.length
              : localProfilesCount
          }
          localGames={
            canViewSavedData ? pendingLocalGuestGames : localGuestGames
          }
          localProfiles={
            canViewSavedData ? pendingLocalGuestProfiles : localGuestProfiles
          }
          accountGamesCount={games.length}
          accountProfilesCount={profiles.length}
          accountGames={games}
          accountProfiles={profiles}
          onUpdateProfile={(id, updates) => {
            updateProfileEverywhere(id, updates);
          }}
          onImportLocalData={handleImportLocalData}
          onImportBackupFile={handleImportBackupFile}
          onDownloadBackupFile={handleDownloadBackupFile}
        />
        <ProFeatureGateDialog
          ref={proFeatureGateDialogRef}
          onContinue={() => {
            setShouldSaveGamePlayersOnSignIn(false);
            authDialogRef.current?.open();
          }}
        />
        <ConfirmDialog ref={confirmRef} />
        <AnimatePresence>
          {visibleToast ? (
            <div className="appToastWrap" aria-hidden="false">
              <motion.div
                className={`appToast appToast--${visibleToast.tone}`}
                role="status"
                aria-live="polite"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.2,
                  ease: "easeOut",
                }}
              >
                {visibleToast.message}
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </EntitlementsProvider>
  );
}
