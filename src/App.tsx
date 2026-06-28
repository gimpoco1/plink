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
import { TopBar } from "./components/TopBar/TopBar";
import { useProfiles } from "./hooks/useProfiles";
import { useGames } from "./hooks/useGames";
import { useScorePulse } from "./hooks/useScorePulse";
import { useAuthSession } from "./hooks/useAuthSession";
import { DashboardScreen } from "./screens/DashboardScreen";
import { GameScreen } from "./screens/GameScreen";
import {
  GameSettingsDialog,
  GameSettingsDialogHandle,
} from "./components/GameSettingsDialog/GameSettingsDialog";
import { ManagePlayersDialogHandle } from "./components/ManagePlayersDialog/ManagePlayersDialog";
import DotGrid from "./components/DotGrid/DotGrid";
import { capitalizeFirst, getGameDisplayName } from "./utils/text";
import { findWinner } from "./utils/ranking";
import {
  computeProfileStats,
  createEmptyProfileStats,
} from "./utils/profileStats";
import {
  createBackupPayload,
  parseBackupPayload,
  prepareBackupImport,
  type BackupSelection,
} from "./storage/backupFile";
import { loadGuestGames } from "./storage/gamesStorage";
import { loadProfiles } from "./storage/profilesStorage";
import { APP_VIEW_STORAGE_KEY, HOME_TAB_STORAGE_KEY } from "./constants";

export default function App() {
  const reduceMotion = useReducedMotion();
  const { session, loading: authLoading, authEnabled } = useAuthSession();
  const {
    profiles,
    upsertProfile,
    deleteProfile,
    updateProfile,
    importProfiles,
    remoteReady: profilesReady,
    syncNotice: profileSyncNotice,
  } = useProfiles(session);
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
    removePlayer,
    updatePlayer,
    resetScores,
    updateScore,
    updateGameSettings,
    syncProfile,
    importGames,
    remoteReady: gamesReady,
    syncNotice: gameSyncNotice,
  } = useGames(session, authLoading);
  const { pulseById, triggerPulse } = useScorePulse();
  const confirmRef = useRef<ConfirmDialogHandle>(null!);
  const managePlayersDialogRef = useRef<ManagePlayersDialogHandle>(null!);
  const settingsDialogRef = useRef<GameSettingsDialogHandle>(null!);
  const authDialogRef = useRef<AuthDialogHandle>(null!);
  const wantsRestoredGameView = useMemo(() => {
    try {
      return localStorage.getItem(APP_VIEW_STORAGE_KEY) === "game";
    } catch {
      return false;
    }
  }, []);
  const [view, setView] = useState<"home" | "game">(() => {
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [visibleSyncNotice, setVisibleSyncNotice] = useState<string | null>(
    null,
  );
  const [localDataVersion, setLocalDataVersion] = useState(0);
  const [shouldSaveGamePlayersOnSignIn, setShouldSaveGamePlayersOnSignIn] =
    useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [presetDraft, setPresetDraft] = useState<NewGameInput | null>(null);
  const [presetDraftToken, setPresetDraftToken] = useState(0);
  const profileStats = useMemo(() => computeProfileStats(games), [games]);
  const canViewSavedData = !!session;
  const visibleGames = games;
  const visibleProfiles = canViewSavedData ? profiles : [];
  const localGamesCount = useMemo(
    () => loadGuestGames().length,
    [localDataVersion],
  );
  const localProfilesCount = useMemo(
    () => loadProfiles().length,
    [localDataVersion],
  );
  const localGuestGames = useMemo(() => loadGuestGames(), [localDataVersion]);
  const localGuestProfiles = useMemo(() => loadProfiles(), [localDataVersion]);

  const gameMetaItems = useMemo(() => {
    if (!currentGame) return [];

    const items: Array<{ label: string; tone?: "accent" | "muted" }> = [];
    const winner = findWinner(
      currentGame.players,
      currentGame.targetPoints,
      currentGame.isLowScoreWins,
    );

    if (winner) {
      items.push({ label: `Winner ${winner.name}`, tone: "accent" });
    }

    items.push({
      label: currentGame.isLowScoreWins
        ? `Lowest wins · ${currentGame.targetPoints}`
        : `Target ${currentGame.targetPoints} pts`,
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
    return currentGame.players.some((p) => p.score !== 0);
  }, [currentGame]);

  const currentWinnerStats = useMemo(() => {
    if (!currentGame) return null;
    const winner = findWinner(
      currentGame.players,
      currentGame.targetPoints,
      currentGame.isLowScoreWins,
    );
    if (!winner?.profileId) return null;
    return profileStats.get(winner.profileId) ?? createEmptyProfileStats();
  }, [currentGame, profileStats]);

  useEffect(() => {
    const nextNotice = gameSyncNotice ?? profileSyncNotice;
    if (!nextNotice) return;
    setVisibleSyncNotice(nextNotice);
    const timeout = window.setTimeout(() => setVisibleSyncNotice(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [gameSyncNotice, profileSyncNotice]);

  useEffect(() => {
    localStorage.setItem(APP_VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(HOME_TAB_STORAGE_KEY, homeTab);
  }, [homeTab]);

  useEffect(() => {
    if (
      hasCompletedInitialViewRestore &&
      view === "game" &&
      gamesReady &&
      !currentGameId
    ) {
      setView("home");
    }
  }, [currentGameId, gamesReady, hasCompletedInitialViewRestore, view]);

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

    setVisibleSyncNotice("Saved players from this game to your account.");
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

  async function handleCreateGame(input: Parameters<typeof createGame>[0]) {
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
        { label: "Points to win", value: String(input.targetPoints) },
        {
          label: "Win mode",
          value: input.isLowScoreWins
            ? "Lowest score wins"
            : "Highest score wins",
        },
        { label: "Timer", value: timerValue },
      ],
      players: details.players,
      message: details.players.length ? "Players" : "",
      hideCancelAction: true,
      extraActionText: "Edit",
      confirmText: "Start new game",
      cancelText: "Cancel",
      layout: "feature",
    });
    if (result === "extra") {
      setPresetDraft(input);
      setPresetDraftToken((value) => value + 1);
      setHomeTab("home");
      setView("home");
      return;
    }
    if (result !== "confirm") return;
    await handleCreateGame(input);
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
    setTouchStartX(event.touches[0]?.clientX ?? null);
    setTouchStartY(event.touches[0]?.clientY ?? null);
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX === null || touchStartY === null) return;

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - touchStartY;
    if (view === "game" && deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setView("home");
    }

    setTouchStartX(null);
    setTouchStartY(null);
  }

  async function handleImportLocalData(selection: {
    gameIds: string[];
    profileIds: string[];
  }) {
    const localGames = localGuestGames.filter((game) =>
      selection.gameIds.includes(game.id),
    );
    const localProfiles = localGuestProfiles.filter((profile) =>
      selection.profileIds.includes(profile.id),
    );

    const importedGames = importGames(localGames);
    const importedProfiles = importProfiles(localProfiles);

    setLocalDataVersion((value) => value + 1);
    return { games: importedGames, profiles: importedProfiles };
  }

  async function handleImportBackupFile(
    file: File,
    selection: BackupSelection,
  ) {
    const raw = await file.text();
    const backup = parseBackupPayload(raw);
    const prepared = prepareBackupImport(backup, {
      importGames: selection.games,
      importProfiles: selection.profiles,
      existingGames: games,
      existingProfiles: profiles,
    });

    const importedGames = selection.games ? importGames(prepared.games) : 0;
    const importedProfiles = selection.profiles
      ? importProfiles(prepared.profiles)
      : 0;

    return { games: importedGames, profiles: importedProfiles };
  }

  async function handleDownloadBackupFile(selection: BackupSelection) {
    const payload = createBackupPayload(games, profiles, selection);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `point-tracker-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return {
      games: selection.games ? payload.games.length : 0,
      profiles: selection.profiles ? payload.profiles.length : 0,
    };
  }

  return (
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
          title={view === "game" && currentGame ? gameDisplayName.title : ""}
          titleSuffix={
            view === "game" && currentGame && gameDisplayName.replayNumber
              ? `#${gameDisplayName.replayNumber}`
              : undefined
          }
          showBackButton={view === "game" && !!currentGame}
          showActionMenu={view === "game" && !!currentGame}
          primaryActionLabel={
            view === "home" &&
            homeTab !== "home" &&
            (homeTab !== "players" || !!session)
              ? homeTab === "players"
                ? "New Player"
                : "New game"
              : undefined
          }
          authLabel={
            view === "home"
              ? authLoading
                ? "Loading..."
                : authEnabled
                  ? session
                    ? "Account"
                    : "Sign in"
                  : "Local only"
              : undefined
          }
          metaItems={view === "game" && currentGame ? gameMetaItems : undefined}
          showReset={view === "game" && hasNonZeroScore}
          onBack={() => setView("home")}
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
          onAddPlayer={() => managePlayersDialogRef.current?.open()}
          onOpenSettings={
            view === "game" && currentGame
              ? () => settingsDialogRef.current?.open()
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
        {isResolvingInitialGameView ? null : view === "game" && currentGame ? (
          <motion.div
            className="appView"
            key={`view-game-${currentGame.id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -16, scale: 0.995 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: "easeOut" }}
          >
            <GameScreen
              game={currentGame}
              profiles={visibleProfiles}
              isAuthenticated={canViewSavedData}
              pulseById={pulseById}
              onTriggerPulse={triggerPulse}
              managePlayersDialogRef={managePlayersDialogRef}
              onDeleteProfile={async (profileId) => {
                const profile = profiles.find((p) => p.id === profileId);
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
              onUpdatePlayer={(playerId, updates) =>
                updatePlayer(currentGame.id, playerId, updates)
              }
              winnerStats={currentWinnerStats}
              onReplayGame={() => {
                const duplicated = duplicateGame(currentGame.id);
                if (duplicated) setView("game");
              }}
              onBackToHome={() => {
                setHomeTab("sessions");
                setView("home");
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            className="appView"
            key="view-home"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -14, scale: 0.995 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
          >
            <DashboardScreen
              games={visibleGames}
              profiles={visibleProfiles}
              isAuthenticated={canViewSavedData}
              presetDraft={presetDraft}
              presetDraftToken={presetDraftToken}
              onOpenAuth={() => {
                setShouldSaveGamePlayersOnSignIn(false);
                authDialogRef.current?.open();
              }}
              activeTab={homeTab}
              onActiveTabChange={setHomeTab}
              onCreate={handleCreateGame}
              onStartQuickSetup={handleStartQuickSetup}
              onUpsertProfile={upsertProfile}
              onUpdateProfile={(id, updates) => {
                updateProfile(id, updates);
                syncProfile(id, updates);
              }}
              onDeleteProfile={async (profileId) => {
                const profile = profiles.find((p) => p.id === profileId);
                const ok = await confirmRef.current?.confirm({
                  title: "Delete saved player",
                  message: `Delete "${profile?.name || "this player"}"? They will be removed from your list.`,
                  confirmText: "Delete",
                  tone: "danger",
                });
                if (ok) deleteProfile(profileId);
              }}
              onDuplicate={(gameId) => {
                const duplicated = duplicateGame(gameId);
                if (duplicated) setView("game");
              }}
              onRename={(gameId) => {
                const g = games.find((x) => x.id === gameId);
                if (!g) return;
                const nextName = window.prompt("Rename game", g.name);
                if (nextName !== null) {
                  renameGame(gameId, nextName);
                }
              }}
              onEnter={(gameId) => {
                selectGame(gameId);
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
          onSave={(input) => {
            updateGameSettings(currentGame.id, input);
          }}
        />
      ) : null}

      <AuthDialog
        ref={authDialogRef}
        session={session}
        onOpenChange={setAuthDialogOpen}
        localGamesCount={localGamesCount}
        localProfilesCount={localProfilesCount}
        localGames={localGuestGames}
        localProfiles={localGuestProfiles}
        accountGamesCount={games.length}
        accountProfilesCount={profiles.length}
        accountGames={games}
        accountProfiles={profiles}
        onImportLocalData={handleImportLocalData}
        onImportBackupFile={handleImportBackupFile}
        onDownloadBackupFile={handleDownloadBackupFile}
      />
      <ConfirmDialog ref={confirmRef} />
      <AnimatePresence>
        {visibleSyncNotice ? (
          <motion.div
            className="syncNotice"
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            {visibleSyncNotice}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
