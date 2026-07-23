import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import type { NewGameInput } from "../../../components/NewGameCard/NewGameCard";
import type { ConfirmDialogHandle } from "../../../components/ConfirmDialog/ConfirmDialog";
import type { AuthDialogHandle } from "../../../components/AuthDialog/AuthDialog";
import type { ProFeatureGateDialogHandle } from "../../../components/ProFeatureGateDialog/ProFeatureGateDialog";
import type { GameSettingsDialogHandle } from "../../../components/GameSettingsDialog/GameSettingsDialog";
import type { ManagePlayersDialogHandle } from "../../../components/ManagePlayersDialog/ManagePlayersDialog";
import { useProfiles } from "../../../hooks/useProfiles";
import { useTeams } from "../../../hooks/useTeams";
import { useGames } from "../../../hooks/useGames";
import { useScorePulse } from "../../../hooks/useScorePulse";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { useEntitlements } from "../../../hooks/useEntitlements";
import { useGameStartSplash } from "./useGameStartSplash";
import { useToastStack } from "./useToastStack";
import { supabase } from "../../../lib/supabase";
import type {
  Game,
  GameTeam,
  HomeTab,
  PlayerProfile,
} from "../../../types";
import { uid } from "../../../utils/id";
import {
  capitalizeFirst,
  formatPlayerName,
  getGameDisplayName,
} from "../../../utils/text";
import { findWinner, isGameComplete, sortPlayers } from "../../../utils/ranking";
import { getGameParticipants } from "../../../utils/gameParticipants";
import {
  computeProfileStats,
  computeTeamStats,
  createEmptyProfileStats,
  createEmptyTeamStats,
} from "../../../utils/profileStats";
import { shouldSortLowToHigh } from "../../../utils/scoring";
import {
  createBackupPayload,
  getGameImportSignature,
  parseBackupPayload,
  prepareBackupImport,
  type BackupSelection,
} from "../../../storage/backupFile";
import { shareOrDownloadBackup } from "../../../storage/backupDownload";
import { loadGuestGames, saveGuestGames } from "../../../storage/gamesStorage";
import { loadProfiles } from "../../../storage/profilesStorage";
import {
  APP_VIEW_STORAGE_KEY,
  AVATAR_COLORS,
  HOME_TAB_STORAGE_KEY,
  LOCAL_SESSIONS_HINT_DISMISSED_KEY,
  PLAYERS_VIEW_STORAGE_KEY,
} from "../../../constants";
import {
  ArrowDownUp,
  Boxes,
  Dices,
  Flag,
  GitCompareArrows,
  RotateCcw,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import {
  areLocalPlayersEqual,
  loadLocalPlayers,
  saveLocalPlayers,
  LOCAL_PLAYERS_CHANGED_EVENT,
  type LocalPlayer,
} from "../../../storage/localPlayers";
import { getUnsavedReplayPlayers } from "../../../utils/replay";

type PresetDraftIntent = "edit" | "teams-detour" | null;

function getGameStatsOrder(game: Game) {
  return game.endedAt ?? game.updatedAt ?? game.createdAt;
}

function getGamesThroughSession(games: Game[], currentGame: Game) {
  const cutoff = getGameStatsOrder(currentGame);
  return games.filter(
    (game) => game.id === currentGame.id || getGameStatsOrder(game) <= cutoff,
  );
}

export function useAppModel() {
  const reduceMotion = useReducedMotion();
  const { visibleToasts, showToast } = useToastStack();
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
    getReplayInviteCandidates,
    selectGame,
    deleteGame,
    renameGame,
    addPlayer,
    addTeam,
    removePlayer,
    mergePlayers,
    addPastLinkedPlayer,
    addPastLinkedPlayersToNewGame,
    removeTeam,
    updatePlayer,
    resetScores,
    updateScore,
    createGameInvite,
    rotateGameInvite,
    joinGameByCode,
    updateGameSettings,
    setCollaboratorsCanManage,
    finishGame,
    syncProfile,
    importGames,
    remoteReady: gamesReady,
    syncNotice: gameSyncNotice,
    pastLinkedPlayers,
    pastInvitedPlayers,
  } = useGames(session, authLoading, showToast);
  const { pulseById, triggerPulse } = useScorePulse();
  const {
    cancelGameStartSplash,
    gameStartSplashCue,
    triggerGameStartSplash,
  } = useGameStartSplash();
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
  const [localDataVersion, setLocalDataVersion] = useState(0);
  const [localStoredPlayers, setLocalStoredPlayers] = useState<LocalPlayer[]>(
    () => loadLocalPlayers(),
  );
  const [shouldSaveGamePlayersOnSignIn, setShouldSaveGamePlayersOnSignIn] =
    useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
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
  const localStoredPlayerProfiles = useMemo<PlayerProfile[]>(
    () =>
      localStoredPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        avatarColor: player.avatarColor,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
      })),
    [localStoredPlayers],
  );
  const combinedGuestAndLocalProfiles = useMemo(
    () => [...localGuestProfiles, ...localStoredPlayerProfiles],
    [localGuestProfiles, localStoredPlayerProfiles],
  );
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

    const allLocalProfiles = [
      ...localGuestProfiles,
      ...localStoredPlayerProfiles,
    ];

    return allLocalProfiles.filter((guestProfile) => {
      const accountProfile = accountProfilesById.get(guestProfile.id);
      if (accountProfile) {
        return guestProfile.updatedAt > accountProfile.updatedAt;
      }

      const key = formatPlayerName(guestProfile.name).toLowerCase();
      return Boolean(key) && !accountProfileKeys.has(key);
    });
  }, [
    canViewSavedData,
    localGuestProfiles,
    localStoredPlayerProfiles,
    profiles,
  ]);
  const pendingLocalSessionsHintSignature = useMemo(() => {
    const gameSignature = pendingLocalGuestGames
      .map((game) => `${game.id}:${game.updatedAt}`)
      .sort()
      .join("|");
    const profileSignature = pendingLocalGuestProfiles
      .map((profile) => `${profile.id}:${profile.updatedAt}`)
      .sort()
      .join("|");

    return [gameSignature, profileSignature].filter(Boolean).join("||");
  }, [pendingLocalGuestGames, pendingLocalGuestProfiles]);
  const pendingLocalSessionsCount = pendingLocalGuestGames.length;
  const pendingLocalProfilesCount = pendingLocalGuestProfiles.length;
  const showLocalSessionsHint =
    pendingLocalSessionsCount + pendingLocalProfilesCount > 0 &&
    pendingLocalSessionsHintSignature !== dismissedLocalSessionsHintSignature;
  const authDialogLocalGames = canViewSavedData
    ? pendingLocalGuestGames
    : localGuestGames;
  const authDialogLocalProfiles = canViewSavedData
    ? pendingLocalGuestProfiles
    : combinedGuestAndLocalProfiles;
  const gameScreenProfiles = canViewSavedData
    ? visibleProfiles
    : combinedGuestAndLocalProfiles;
  const isSessionCountPending = canViewSavedData && !gamesReady;
  const currentSessionCount = canViewSavedData
    ? games.filter((game) => game.accessRole !== "collaborator").length
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

  function upsertLocalStoredPlayer(
    rawName: string,
    avatarColor: string,
  ): LocalPlayer | null {
    const name = formatPlayerName(rawName);
    if (!name) return null;

    const existingPlayers = loadLocalPlayers();
    const existingIndex = existingPlayers.findIndex(
      (player) => player.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      const existing = existingPlayers[existingIndex];
      if (existing.name === name && existing.avatarColor === avatarColor) {
        return existing;
      }

      const updated: LocalPlayer = {
        ...existing,
        name,
        avatarColor,
        updatedAt: Date.now(),
      };
      const nextPlayers = [...existingPlayers];
      nextPlayers[existingIndex] = updated;
      saveLocalPlayers(nextPlayers);
      setLocalStoredPlayers(nextPlayers);
      return updated;
    }

    const now = Date.now();
    const created: LocalPlayer = {
      id: uid(),
      name,
      avatarColor,
      createdAt: now,
      updatedAt: now,
    };
    const nextPlayers = [...existingPlayers, created];
    saveLocalPlayers(nextPlayers);
    setLocalStoredPlayers(nextPlayers);
    return created;
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

  async function chooseReplayInvitedUserIds(
    game: Game,
  ): Promise<string[] | null> {
    if (!game.isShared) return [];

    const candidates = await getReplayInviteCandidates(game.id);
    if (candidates === null) return null;

    const candidatePlayerIds = new Set(
      candidates.map((candidate) => candidate.sourcePlayerId),
    );
    const unsavedPlayers = getUnsavedReplayPlayers(game, profiles).filter(
      (player) => !candidatePlayerIds.has(player.id),
    );
    const hasInvitablePlayers = candidates.some(
      (candidate) => candidate.canInvite,
    );

    if (candidates.length === 0 && unsavedPlayers.length === 0) return [];

    const selectedUserIds = await confirmRef.current?.selectPlayers({
      eyebrow: "New game",
      title: "Play again",
      message: hasInvitablePlayers
        ? "You’ll own this new game. Select the accounts you want to invite again."
        : "",
      messageCase: "normal",
      playersTitle: hasInvitablePlayers
        ? "Players from the previous game"
        : "Players not saved",
      players: [
        ...candidates.map((candidate) => ({
          id: candidate.userId,
          name: candidate.name,
          avatarColor: candidate.avatarColor,
          label: candidate.canInvite
            ? candidate.isPreviousOwner
              ? "Previous game owner"
              : "Invited before"
            : "Automatic invites off",
          description: candidate.canInvite
            ? undefined
            : "Can’t be invited. They’ll be added as a player not saved, and Stats won’t count.",
          selectedDescription: candidate.canInvite
            ? "Invited to the new game. Their results will count toward Stats."
            : undefined,
          unselectedDescription: candidate.canInvite
            ? "Added as a player not saved. Their results won’t count toward Stats."
            : undefined,
          disabled: !candidate.canInvite,
        })),
        ...unsavedPlayers.map((player) => ({
          id: `game-only:${player.id}`,
          name: player.name,
          avatarColor: player.avatarColor,
          label: "Player not saved",
          description: "Their results won’t count toward Stats.",
          disabled: true,
        })),
      ],
      initialSelectedPlayerIds: candidates
        .filter((candidate) => candidate.canInvite)
        .map((candidate) => candidate.userId),
      confirmText: "Play again",
      cancelText: "Cancel",
      layout: "feature",
      tone: "default",
    });

    return selectedUserIds ?? null;
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

    const items: Array<{
      label: string;
      tone?: "accent" | "muted";
      icon?: React.ReactNode;
    }> = [];
    const winner = findWinner(currentGame.players, currentGame);
    const isTeamsGame =
      currentGame.participantMode === "teams" && currentGame.teams.length > 0;
    const participants = getGameParticipants(currentGame);
    const winningTeamName =
      winner && isTeamsGame
        ? participants.find((participant) =>
            participant.members.some((member) => member.id === winner.id),
          )?.name
        : null;

    if (winner && participants.length > 1) {
      items.push({
        label: winningTeamName ?? capitalizeFirst(winner.name),
        tone: "accent",
        icon: createElement(Trophy, { size: 14, strokeWidth: 2.45 }),
      });
    }

    items.push({
      label: currentGame.manualEndOnly
        ? currentGame.targetScore > 0
          ? `Ref ${currentGame.targetScore}`
          : "Manual"
        : currentGame.winCondition === "reach_zero"
          ? `${currentGame.startingScore} to 0`
          : currentGame.winCondition === "lowest"
            ? `Low ${currentGame.targetScore}`
            : `${currentGame.targetScore} pts`,
      tone: "muted",
      icon: currentGame.manualEndOnly
        ? createElement(Flag, { size: 14, strokeWidth: 2.35 })
        : currentGame.winCondition === "reach_zero"
          ? createElement(RotateCcw, { size: 14, strokeWidth: 2.35 })
          : currentGame.winCondition === "lowest"
            ? createElement(ArrowDownUp, { size: 14, strokeWidth: 2.35 })
            : createElement(Target, { size: 14, strokeWidth: 2.45 }),
    });

    if (currentGame.winByTwo) {
      items.push({
        label: "Win by 2",
        tone: "muted",
        icon: createElement(GitCompareArrows, { size: 14, strokeWidth: 2.35 }),
      });
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
    const snapshotGames = getGamesThroughSession(games, currentGame);
    const snapshotProfileStats = computeProfileStats(snapshotGames);
    const snapshotTeamStats = computeTeamStats(
      snapshotGames,
      teams,
      teamMembers,
    );
    const isTeamsGame =
      currentGame.participantMode === "teams" && currentGame.teams.length > 0;
    if (winner && isTeamsGame) {
      const winningParticipant = getGameParticipants(currentGame).find(
        (participant) =>
          participant.members.some((member) => member.id === winner.id),
      );
      const winningTeam = winningParticipant?.teamId
        ? currentGame.teams.find(
            (team) => team.id === winningParticipant.teamId,
          )
        : null;
      const teamStatsKey = winningTeam?.sourceTeamId ?? winningTeam?.id;
      return teamStatsKey
        ? (snapshotTeamStats.get(teamStatsKey) ?? createEmptyTeamStats())
        : null;
    }
    if (!winner?.profileId) return null;
    return (
      snapshotProfileStats.get(winner.profileId) ?? createEmptyProfileStats()
    );
  }, [currentGame, games, teamMembers, teams]);

  const currentGameIsLatestCompleted = useMemo(() => {
    if (!currentGame || !isGameComplete(currentGame)) return true;
    const currentOrder = getGameStatsOrder(currentGame);
    return games.every(
      (game) =>
        !isGameComplete(game) || getGameStatsOrder(game) <= currentOrder,
    );
  }, [currentGame, games]);

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
      await finishGame(currentGame.id, "no_winner");
      return;
    }
    if (isDraw) {
      await finishGame(currentGame.id, "draw");
      return;
    }
    await finishGame(
      currentGame.id,
      canDeclareWinner ? "winner" : "no_winner",
    );
  }

  useEffect(() => {
    const nextToast = gameSyncNotice ?? profileSyncNotice ?? teamSyncNotice;
    if (!nextToast) return;
    showToast(nextToast.message, nextToast.tone);
  }, [gameSyncNotice, profileSyncNotice, showToast, teamSyncNotice]);

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
      !currentGame
    ) {
      setView("home");
    }
  }, [currentGame, gamesReady, hasCompletedInitialViewRestore, view]);

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
  const isResumingActiveGameView =
    view !== "home" &&
    !currentGame &&
    (authLoading ||
      !gamesReady ||
      !hasCompletedInitialViewRestore ||
      currentGameId !== null);
  const isAppBootLoading =
    authLoading ||
    isResolvingInitialGameView ||
    (canViewSavedData &&
      (!gamesReady || !profilesReady || !teamsReady || entitlements.isLoading));

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
      if (game.isShared) return;
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

  useEffect(() => {
    function refreshLocalStoredPlayers() {
      const nextPlayers = loadLocalPlayers();
      setLocalStoredPlayers((current) =>
        areLocalPlayersEqual(current, nextPlayers) ? current : nextPlayers,
      );
    }

    refreshLocalStoredPlayers();

    window.addEventListener("storage", refreshLocalStoredPlayers);
    window.addEventListener("focus", refreshLocalStoredPlayers);
    window.addEventListener(
      LOCAL_PLAYERS_CHANGED_EVENT,
      refreshLocalStoredPlayers,
    );

    return () => {
      window.removeEventListener("storage", refreshLocalStoredPlayers);
      window.removeEventListener("focus", refreshLocalStoredPlayers);
      window.removeEventListener(
        LOCAL_PLAYERS_CHANGED_EVENT,
        refreshLocalStoredPlayers,
      );
    };
  }, [localDataVersion]);

  useEffect(() => {
    if (
      !canViewSavedData ||
      localStoredPlayers.length === 0 ||
      profiles.length === 0
    ) {
      return;
    }

    const accountProfileKeys = new Set(
      profiles
        .map((profile) => formatPlayerName(profile.name).toLowerCase())
        .filter(Boolean),
    );
    const remainingLocalPlayers = localStoredPlayers.filter((player) => {
      const key = formatPlayerName(player.name).toLowerCase();
      return !key || !accountProfileKeys.has(key);
    });

    if (remainingLocalPlayers.length === localStoredPlayers.length) {
      return;
    }

    saveLocalPlayers(remainingLocalPlayers);
    setLocalStoredPlayers(remainingLocalPlayers);
  }, [canViewSavedData, localStoredPlayers, profiles]);

  async function handleCreateGame(
    input: Parameters<typeof createGame>[0],
    invitedPlayers: Array<{ userId: string; profileId: string }> = [],
  ) {
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

    triggerGameStartSplash();
    const created = createGame(input);
    if (created) {
      const requestedInvitedPlayers = new Map<
        string,
        { userId: string; profileId: string }
      >();
      input.initialPlayers?.forEach((player) => {
        if (!player.invitedUserId || !player.profileId) return;
        requestedInvitedPlayers.set(player.invitedUserId, {
          userId: player.invitedUserId,
          profileId: player.profileId,
        });
      });
      invitedPlayers.forEach((player) => {
        requestedInvitedPlayers.set(player.userId, player);
      });
      if (requestedInvitedPlayers.size > 0) {
        await addPastLinkedPlayersToNewGame(
          created,
          [...requestedInvitedPlayers.values()],
        );
      }
      setPresetDraft(null);
      setPresetDraftIntent(null);
      setGameReturnTab(homeTab);
      setView("game");
      return true;
    }
    cancelGameStartSplash();
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
      invitedPlayers?: Array<{ userId: string; profileId: string }>;
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
        {
          label: "Name",
          value: details.label,
          icon: createElement(Boxes, { size: 16, strokeWidth: 2.15 }),
        },
        {
          label:
            input.winCondition === "reach_zero"
              ? "Starting score"
              : input.manualEndOnly
                ? "Reference target"
                : "Target",
          value: String(
            input.winCondition === "reach_zero"
              ? input.startingScore
              : input.targetScore,
          ),
          icon: input.manualEndOnly
            ? createElement(Flag, { size: 16, strokeWidth: 2.15 })
            : input.winCondition === "reach_zero"
              ? createElement(RotateCcw, { size: 16, strokeWidth: 2.15 })
              : createElement(Target, { size: 16, strokeWidth: 2.25 }),
          size: "compact",
        },
        {
          label: "Timer",
          value: input.timerEnabled ? timerValue : "No timer",
          icon: createElement(Timer, { size: 16, strokeWidth: 2.2 }),
          size: "compact",
        },
        {
          label: "Dice",
          value: input.diceEnabled ? "Dice on" : "No dice",
          icon: createElement(Dices, { size: 16, strokeWidth: 2.2 }),
          size: "compact",
        },
      ],
      settingChips: [
        {
          label: input.manualEndOnly
            ? "Manual finish"
            : input.winCondition === "reach_zero"
              ? "Reach zero"
              : input.winCondition === "lowest"
                ? "Lowest wins"
                : "Highest wins",
          icon: input.manualEndOnly
            ? createElement(Flag, { size: 14, strokeWidth: 2.2 })
            : input.winCondition === "reach_zero"
              ? createElement(RotateCcw, { size: 14, strokeWidth: 2.2 })
              : input.winCondition === "lowest"
                ? createElement(ArrowDownUp, { size: 14, strokeWidth: 2.2 })
                : createElement(Target, { size: 14, strokeWidth: 2.25 }),
          size: input.winByTwo ? "default" : "wide",
        },
        ...(input.winByTwo
          ? [
              {
                label: "Win by 2",
                icon: createElement(GitCompareArrows, {
                  size: 14,
                  strokeWidth: 2.2,
                }),
              },
            ]
          : []),
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
    await handleCreateGame(input, details.invitedPlayers);
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
    options: { importLinkedProfilesFromGames?: boolean } = {},
  ) {
    const importLinkedProfilesFromGames =
      options.importLinkedProfilesFromGames ?? true;
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

        if (!linkedProfile && key && importLinkedProfilesFromGames) {
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
          const { profileId: _profileId, ...playerWithoutProfileId } = player;
          return {
            ...playerWithoutProfileId,
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
    const localProfilesForImport = [
      ...localGuestProfiles,
      ...localStoredPlayerProfiles,
    ];

    const localProfiles = localProfilesForImport.filter((profile) =>
      selection.profileIds.includes(profile.id),
    );

    const selectedLocalStoredPlayerIds = new Set(
      localStoredPlayers
        .filter((player) => selection.profileIds.includes(player.id))
        .map((player) => player.id),
    );
    const localGames = filterImportableGames(selectedLocalGames);
    const skippedTeamContent = selectedLocalGames.length !== localGames.length;

    const prepared = prepareImportedData(localGames, localProfiles, {
      importLinkedProfilesFromGames: selection.profileIds.length > 0,
    });
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

    const importedProfiles = await importProfiles(prepared.profiles);
    const importedGames =
      prepared.games.length > 0 ? importGames(prepared.games) : 0;
    if (localGames.length > 0) {
      const importedLocalGameIds = new Set(localGames.map((game) => game.id));
      const remainingLocalGames = loadGuestGames().filter(
        (game) => !importedLocalGameIds.has(game.id),
      );
      saveGuestGames(remainingLocalGames);
    }
    if (selectedLocalStoredPlayerIds.size > 0 && importedProfiles > 0) {
      const remainingLocalPlayers = loadLocalPlayers().filter(
        (player) => !selectedLocalStoredPlayerIds.has(player.id),
      );

      saveLocalPlayers(remainingLocalPlayers);
      setLocalStoredPlayers(remainingLocalPlayers);
    }

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
      {
        importLinkedProfilesFromGames: selection.profiles,
      },
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
    const importedProfiles = await importProfiles(reconciled.profiles);
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
    await shareOrDownloadBackup({ contents: backupJson, filename });

    return {
      games: selection.games ? payload.games.length : 0,
      profiles: selection.profiles ? payload.profiles.length : 0,
      teams: selection.profiles ? payload.teams.length : 0,
    };
  }

  return {
    addPlayer,
    addPastLinkedPlayer,
    addTeam,
    authDialogLocalGames,
    authDialogLocalProfiles,
    authDialogOpen,
    authDialogRef,
    authEnabled,
    authLoading,
    canViewSavedData,
    cancelGameStartSplash,
    combinedGuestAndLocalProfiles,
    chooseReplayInvitedUserIds,
    confirmRef,
    createTeam,
    currentGame,
    currentGameIsLatestCompleted,
    currentWinnerStats,
    deleteGame,
    deleteProfile,
    deleteSavedTeam,
    dismissLocalSessionsHint,
    duplicateGame,
    entitlements,
    gameDisplayName,
    gameMetaItems,
    gameScreenProfiles,
    gameStartSplashCue,
    games,
    guardSessionCreation,
    handleCreateGame,
    handleDownloadBackupFile,
    handleEndCurrentGame,
    handleImportBackupFile,
    handleImportLocalData,
    handleStartQuickSetup,
    handleStoreNewGameDraft,
    handleTeamCreatedFromDashboard,
    handleTouchEnd,
    handleTouchStart,
    hasNonZeroScore,
    homeTab,
    isAppBootLoading,
    isResolvingInitialGameView,
    isResumingActiveGameView,
    managePlayersDialogRef,
    openProFeatureAuthPrompt,
    openTeamBuilderRequestToken,
    openTeamsTabFromGame,
    pendingLocalProfilesCount,
    pendingLocalSessionsCount,
    pastLinkedPlayers,
    pastInvitedPlayers,
    presetDraft,
    presetDraftIntent,
    presetDraftToken,
    proFeatureGateDialogRef,
    profiles,
    pulseById,
    reduceMotion,
    removePlayer,
    mergePlayers,
    removeProfileMemberships,
    removeTeam,
    renameGame,
    resetScores,
    returnToGameSource,
    selectGame,
    session,
    sharingOpen,
    setAuthDialogOpen,
    setGameReturnTab,
    setHomeTab,
    setOpenTeamBuilderRequestToken,
    setShouldSaveGamePlayersOnSignIn,
    setSharingOpen,
    setView,
    settingsDialogRef,
    showLocalSessionsHint,
    showToast,
    teams,
    triggerGameStartSplash,
    toggleTeamMember,
    triggerPulse,
    updateGameSettings,
    setCollaboratorsCanManage,
    updatePlayer,
    updateProfile,
    updateProfileEverywhere,
    updateScore,
    createGameInvite,
    rotateGameInvite,
    joinGameByCode,
    updateTeam,
    upsertLocalStoredPlayer,
    upsertProfile,
    view,
    visibleGames,
    visibleProfiles,
    visibleTeamMembers,
    visibleTeams,
    visibleToasts,
  };
}
