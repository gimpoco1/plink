import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createForegroundRefreshHandlers,
  createRealtimeReconnectHandler,
} from "../utils/foregroundRefresh";
import type {
  CompletionMode,
  Game,
  GameTeam,
  PastLinkedPlayer,
  Player,
  PlayerProfile,
  QuickScoreValues,
  ScoreDirection,
  ToastState,
  ToastTone,
  WinCondition,
} from "../types";
import { MAX_ABS_SCORE, DEFAULT_TEAM_ICON } from "../constants";
import { supabase } from "../lib/supabase";
import { clampName, formatPlayerName, formatTeamName } from "../utils/text";
import { uid } from "../utils/id";
import { getSavedReplayProfile } from "../utils/replay";
import {
  loadCurrentGameId,
  loadGuestCurrentGameId,
  loadGuestGames,
  migrateSingleGameToGamesIfNeeded,
  saveCurrentGameId,
  saveGuestCurrentGameId,
  saveGuestGames,
} from "../storage/gamesStorage";
import {
  removeGameInviteCode,
  saveGameInviteCode,
} from "../storage/gameInviteStorage";
import {
  addRemoteSharedGamePlayer,
  addRemotePastLinkedPlayerToGame,
  applyRemoteSharedScoreDelta,
  createRemoteGameInvite,
  deleteRemoteSharedGame,
  dismissRemoteGameJoinNotification,
  dismissRemoteGameRemovalNotification,
  finishRemoteSharedGame,
  GAME_JOIN_NOTIFICATIONS_TABLE,
  GAME_REMOVAL_NOTIFICATIONS_TABLE,
  joinRemoteGame,
  loadRemoteGameJoinNotifications,
  loadRemoteGameRemovalNotifications,
  loadRemoteGames,
  loadRemotePastLinkedPlayers,
  mergeRemoteSharedGamePlayers,
  parseRemoteGameJoinNotification,
  parseRemoteGameChange,
  parseRemoteGameRemovalNotification,
  replayRemoteSharedGame,
  renameRemoteSharedGame,
  removeRemoteSharedGamePlayer,
  resetRemoteSharedGame,
  rotateRemoteGameInvite,
  saveRemoteGames,
  setRemoteSharedCollaboratorManagement,
  updateRemoteSharedGamePlayer,
  updateRemoteSharedGameSettings,
} from "../storage/remoteStorage";
import { computeRanks, sortPlayers } from "../utils/ranking";
import {
  clampScoreForGame,
  hasGameEnded,
  sanitizeQuickScoreValues,
  shouldSortLowToHigh,
} from "../utils/scoring";

type CreateGameInput = {
  name: string;
  participantMode?: "players" | "teams";
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo?: boolean;
  manualEndOnly?: boolean;
  timerEnabled?: boolean;
  diceEnabled?: boolean;
  quickScoreValues?: QuickScoreValues;
  timerMode?: "countdown" | "stopwatch";
  timerSeconds?: number;
  initialPlayers?: { name: string; avatarColor: string; profileId?: string }[];
  initialTeams?: Array<{
    id: string;
    name: string;
    icon?: string;
    members: Array<{
      profileId?: string;
      name: string;
      avatarColor: string;
    }>;
  }>;
};

type UpdateGameSettingsInput = {
  name: string;
  collaboratorsCanManage: boolean;
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  diceEnabled: boolean;
  quickScoreValues: QuickScoreValues;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
};

const GAME_SYNC_FALLBACK_INTERVAL_MS = 60_000;

function getGameSyncSignature(games: Game[]) {
  return games
    .map((game) => `${game.id}:${game.updatedAt}`)
    .sort()
    .join("|");
}

function getSyncedGameIds(signature: string | null) {
  if (!signature) return new Set<string>();
  return new Set(
    signature
      .split("|")
      .map((entry) => entry.split(":")[0])
      .filter(Boolean),
  );
}

function getSyncedGameVersions(signature: string | null) {
  const versions = new Map<string, number>();
  if (!signature) return versions;
  signature.split("|").forEach((entry) => {
    const separatorIndex = entry.lastIndexOf(":");
    if (separatorIndex <= 0) return;
    const id = entry.slice(0, separatorIndex);
    const updatedAt = Number(entry.slice(separatorIndex + 1));
    if (id && Number.isFinite(updatedAt)) versions.set(id, updatedAt);
  });
  return versions;
}

function markGameVersionSynced(signature: string | null, game: Game) {
  const versions = getSyncedGameVersions(signature);
  versions.set(game.id, game.updatedAt);
  return [...versions.entries()]
    .map(([id, updatedAt]) => `${id}:${updatedAt}`)
    .sort()
    .join("|");
}

function markGameDeletedSynced(signature: string | null, gameId: string) {
  const versions = getSyncedGameVersions(signature);
  versions.delete(gameId);
  return [...versions.entries()]
    .map(([id, updatedAt]) => `${id}:${updatedAt}`)
    .sort()
    .join("|");
}

function markGameSaveSynced(
  signature: string | null,
  games: Game[],
  changedGameIds: ReadonlySet<string>,
) {
  const versions = getSyncedGameVersions(signature);
  const currentIds = new Set(games.map((game) => game.id));
  [...versions.keys()].forEach((id) => {
    if (!currentIds.has(id)) versions.delete(id);
  });
  games.forEach((game) => {
    if (changedGameIds.has(game.id)) versions.set(game.id, game.updatedAt);
  });
  return [...versions.entries()]
    .map(([id, updatedAt]) => `${id}:${updatedAt}`)
    .sort()
    .join("|");
}

function getChangedGameIds(
  games: Game[],
  signature: string | null,
  userId: string,
) {
  const versions = getSyncedGameVersions(signature);
  return new Set(
    games
      .filter(
        (game) =>
          !game.isShared &&
          (!game.ownerId || game.ownerId === userId) &&
          versions.get(game.id) !== game.updatedAt,
      )
      .map((game) => game.id),
  );
}

function getSyncErrorMessage(error: unknown) {
  let message = "";
  if (error instanceof Error && error.message) message = error.message;
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value) message = value;
  }
  if (!message) return "Unknown sync error";
  return message
    .replace(/collaborators/gi, "invited players")
    .replace(/collaborator/gi, "invited player")
    .replace(/collaboration settings/gi, "invited-player settings");
}

function isTransientFetchError(error: unknown) {
  const message = getSyncErrorMessage(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror")
  );
}

function getRemovedGamesNotice(removedGames: Game[]) {
  if (
    removedGames.length === 1 &&
    removedGames[0].accessRole === "collaborator"
  ) {
    return `You've been removed from ${removedGames[0].name}`;
  }
  return removedGames.length === 1
    ? `"${removedGames[0].name}" was removed from your account.`
    : `${removedGames.length} games were removed from your account.`;
}

function mergeGamesById(baseGames: Game[], incomingGames: Game[]) {
  const merged = new Map(baseGames.map((game) => [game.id, game]));

  for (const incoming of incomingGames) {
    const existing = merged.get(incoming.id);
    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      merged.set(incoming.id, {
        ...incoming,
        linkedPlayerIdForCurrentUser:
          incoming.linkedPlayerIdForCurrentUser ??
          existing?.linkedPlayerIdForCurrentUser,
        hasCollaborators:
          incoming.hasCollaborators ?? existing?.hasCollaborators,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function clampScore(value: number) {
  return Math.max(-MAX_ABS_SCORE, Math.min(MAX_ABS_SCORE, value));
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function useGames(
  session: Session | null,
  authLoading = false,
  onToast?: (message: string, tone?: ToastTone) => void,
) {
  const sessionUserId = session?.user.id ?? null;
  const migrated = useMemo(() => migrateSingleGameToGamesIfNeeded(), []);
  const [games, setGames] = useState<Game[]>(
    () => migrated?.games ?? loadGuestGames(),
  );
  const [currentGameId, setCurrentGameId] = useState<string | null>(
    () =>
      migrated?.currentGameId ??
      loadCurrentGameId() ??
      loadGuestCurrentGameId(),
  );
  const [remoteReady, setRemoteReady] = useState(
    !sessionUserId && !authLoading,
  );
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<ToastState | null>(null);
  const [pastLinkedPlayers, setPastLinkedPlayers] = useState<
    PastLinkedPlayer[]
  >([]);
  const [saveRetryTick, setSaveRetryTick] = useState(0);
  const remoteSignatureRef = useRef<string | null>(null);
  const handledJoinNotificationIdsRef = useRef(new Set<string>());
  const handledRemovalNotificationIdsRef = useRef(new Set<string>());
  const onToastRef = useRef(onToast);
  const failedSaveNoticeSignatureRef = useRef<string | null>(null);
  const saveRetryTimeoutRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveInFlightUserIdRef = useRef<string | null>(null);
  const queuedSaveSignatureRef = useRef<string | null>(null);
  const latestSessionUserIdRef = useRef<string | null>(sessionUserId);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  function showGameToast(message: string, tone: ToastTone = "default") {
    if (onToastRef.current) {
      onToastRef.current(message, tone);
      return;
    }
    setSyncNotice({ message, tone });
  }

  useEffect(() => {
    latestSessionUserIdRef.current = sessionUserId;
  }, [sessionUserId]);

  useEffect(() => {
    let alive = true;

    function applyRemoteGames(remoteGames: Game[], notify: boolean) {
      setGames((previousGames) => {
        const remoteSignature = getGameSyncSignature(remoteGames);
        const previousSignature = getGameSyncSignature(previousGames);
        if (remoteSignature === previousSignature) {
          remoteSignatureRef.current = remoteSignature;
          return previousGames;
        }
        if (notify) {
          const remoteById = new Map(
            remoteGames.map((game) => [game.id, game]),
          );
          const lastSyncedIds = getSyncedGameIds(remoteSignatureRef.current);
          const removed = previousGames.filter(
            (game) => lastSyncedIds.has(game.id) && !remoteById.has(game.id),
          );
          const changed = previousGames.filter((game) => {
            const remote = remoteById.get(game.id);
            return remote && remote.updatedAt !== game.updatedAt;
          });
          if (removed.length > 0) {
            setSyncNotice({
              message: getRemovedGamesNotice(removed),
              tone: "default",
            });
          } else if (changed.length > 0) {
            setSyncNotice({
              message: "Your games were updated.",
              tone: "default",
            });
          }
        }
        remoteSignatureRef.current = remoteSignature;
        return remoteGames;
      });
      setCurrentGameId((current) =>
        current && remoteGames.some((game) => game.id === current)
          ? current
          : null,
      );
    }

    if (authLoading) {
      setRemoteReady(false);
      return () => {
        alive = false;
      };
    }

    if (!sessionUserId) {
      setRemoteUserId(null);
      setSyncNotice(null);
      remoteSignatureRef.current = null;
      setGames(migrated?.games ?? loadGuestGames());
      setCurrentGameId(migrated?.currentGameId ?? loadGuestCurrentGameId());
      setRemoteReady(true);
      return () => {
        alive = false;
      };
    }

    setRemoteReady(false);
    setRemoteUserId(null);
    remoteSignatureRef.current = null;
    setGames([]);
    loadRemoteGames(sessionUserId)
      .then((remoteGames) => {
        if (!alive) return;
        applyRemoteGames(remoteGames, false);
        setCurrentGameId((current) => {
          const persistedCurrent = loadCurrentGameId();
          if (
            persistedCurrent &&
            remoteGames.some((game) => game.id === persistedCurrent)
          ) {
            return persistedCurrent;
          }
          return current && remoteGames.some((game) => game.id === current)
            ? current
            : (remoteGames[0]?.id ?? null);
        });
        setRemoteUserId(sessionUserId);
        setRemoteReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load games from Supabase", error);
        setGames([]);
        setCurrentGameId(null);
        setRemoteUserId(null);
        setSyncNotice({
          message: `Could not load games: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        setRemoteReady(true);
      });

    return () => {
      alive = false;
    };
  }, [authLoading, migrated, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || remoteUserId !== sessionUserId) return;
    const activeUserId = sessionUserId;
    let alive = true;
    let gameRefreshInFlight = false;
    let gameRefreshQueued = false;

    function handleRemovalNotification(
      notification: NonNullable<
        ReturnType<typeof parseRemoteGameRemovalNotification>
      >,
    ) {
      if (
        !alive ||
        notification.userId !== activeUserId ||
        handledRemovalNotificationIdsRef.current.has(notification.id)
      ) {
        return;
      }

      handledRemovalNotificationIdsRef.current.add(notification.id);
      removeGameInviteCode(notification.gameId);
      setGames((previousGames) =>
        previousGames.filter((game) => game.id !== notification.gameId),
      );
      setCurrentGameId((current) =>
        current === notification.gameId ? null : current,
      );
      showGameToast(`You've been removed from ${notification.gameName}`);
      void dismissRemoteGameRemovalNotification(
        activeUserId,
        notification.id,
      ).catch(() => {
        handledRemovalNotificationIdsRef.current.delete(notification.id);
      });
    }

    function handleJoinNotification(
      notification: NonNullable<
        ReturnType<typeof parseRemoteGameJoinNotification>
      >,
    ) {
      if (
        !alive ||
        notification.userId !== activeUserId ||
        handledJoinNotificationIdsRef.current.has(notification.id)
      ) {
        return;
      }

      handledJoinNotificationIdsRef.current.add(notification.id);
      showGameToast(
        `${notification.playerName} joined ${notification.gameName}`,
      );
      void dismissRemoteGameJoinNotification(
        activeUserId,
        notification.id,
      ).catch(() => {
        handledJoinNotificationIdsRef.current.delete(notification.id);
      });
    }

    async function refreshJoinNotifications() {
      try {
        const notifications = await loadRemoteGameJoinNotifications(
          activeUserId,
        );
        if (!alive) return;
        notifications.forEach(handleJoinNotification);
      } catch {
        // The next realtime event or background refresh will retry delivery.
      }
    }

    async function refreshRemovalNotifications() {
      try {
        const notifications = await loadRemoteGameRemovalNotifications(
          activeUserId,
        );
        if (!alive) return;
        notifications.forEach(handleRemovalNotification);
      } catch {
        // The game refresh remains the fallback if notifications cannot load.
      }
    }

    async function refreshRemoteGames() {
      if (gameRefreshInFlight) {
        gameRefreshQueued = true;
        return;
      }

      gameRefreshInFlight = true;
      try {
        const remoteGames = await loadRemoteGames(activeUserId);
        if (!alive) return;
        let appliedRemoteState = false;
        setGames((previousGames) => {
          const previousById = new Map(
            previousGames.map((game) => [game.id, game]),
          );
          const reconciledRemoteGames = remoteGames.map((remoteGame) => {
            const previousGame = previousById.get(remoteGame.id);
            return previousGame &&
              previousGame.updatedAt > remoteGame.updatedAt
              ? previousGame
              : remoteGame;
          });
          const remoteSignature = getGameSyncSignature(
            reconciledRemoteGames,
          );
          const previousSignature = getGameSyncSignature(previousGames);
          const lastSyncedSignature = remoteSignatureRef.current;

          if (
            lastSyncedSignature &&
            previousSignature !== lastSyncedSignature &&
            remoteSignature === lastSyncedSignature
          ) {
            return previousGames;
          }

          if (remoteSignature === previousSignature) {
            remoteSignatureRef.current = remoteSignature;
            return previousGames;
          }
          const remoteById = new Map(
            reconciledRemoteGames.map((game) => [game.id, game]),
          );
          const lastSyncedIds = getSyncedGameIds(remoteSignatureRef.current);
          const removed = previousGames.filter(
            (game) => lastSyncedIds.has(game.id) && !remoteById.has(game.id),
          );
          const changed = previousGames.filter((game) => {
            const remote = remoteById.get(game.id);
            return remote && remote.updatedAt !== game.updatedAt;
          });
          const includesJoinedPlayer = changed.some((game) => {
            const remote = remoteById.get(game.id);
            if (!remote || game.accessRole === "collaborator") return false;
            const previousProfileIds = new Set(
              game.players
                .map((player) => player.profileId)
                .filter((profileId): profileId is string => !!profileId),
            );
            return remote.players.some(
              (player) =>
                !!player.profileId &&
                !previousProfileIds.has(player.profileId),
            );
          });
          if (removed.length > 0) {
            setSyncNotice({
              message: getRemovedGamesNotice(removed),
              tone: "default",
            });
          } else if (changed.length > 0 && !includesJoinedPlayer) {
            setSyncNotice({
              message: "Your games were updated.",
              tone: "default",
            });
          }
          remoteSignatureRef.current = remoteSignature;
          appliedRemoteState = true;
          return reconciledRemoteGames;
        });
        if (appliedRemoteState) {
          setCurrentGameId((current) =>
            current && remoteGames.some((game) => game.id === current)
              ? current
              : null,
          );
        }
      } catch {
        // Keep local in-memory state if a background refresh fails.
      } finally {
        gameRefreshInFlight = false;
        if (alive && gameRefreshQueued) {
          gameRefreshQueued = false;
          void refreshRemoteGames();
        }
      }
    }

    function refreshAll() {
      void refreshRemoteGames();
      void refreshJoinNotifications();
      void refreshRemovalNotifications();
    }

    const {
      refreshOnFocus,
      refreshWhenVisible,
    } = createForegroundRefreshHandlers(refreshAll);

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    if (supabase) {
      channel = supabase.channel(`games:${activeUserId}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: GAME_JOIN_NOTIFICATIONS_TABLE,
          filter: `user_id=eq.${activeUserId}`,
        },
        (payload) => {
          const notification = parseRemoteGameJoinNotification(payload.new);
          if (notification) handleJoinNotification(notification);
        },
      );
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
        },
        (payload) => {
          const changedGame = parseRemoteGameChange(
            payload.new,
            activeUserId,
          );
          if (changedGame) {
            remoteSignatureRef.current = markGameVersionSynced(
              remoteSignatureRef.current,
              changedGame,
            );
            setGames((previousGames) =>
              mergeGamesById(previousGames, [changedGame]),
            );
            return;
          }
          // Deletes and incompatible payloads still need a full reconciliation.
          void refreshRemoteGames();
        },
      );
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: GAME_REMOVAL_NOTIFICATIONS_TABLE,
          filter: `user_id=eq.${activeUserId}`,
        },
        (payload) => {
          const notification = parseRemoteGameRemovalNotification(payload.new);
          if (notification) handleRemovalNotification(notification);
        },
      );
      void channel.subscribe(
        createRealtimeReconnectHandler(refreshAll),
      );
    }

    void refreshJoinNotifications();
    void refreshRemovalNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRemoteGames();
    }, GAME_SYNC_FALLBACK_INTERVAL_MS);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      if (channel) {
        void channel.unsubscribe();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [remoteUserId, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      if (!remoteReady || remoteUserId !== null) return;
      saveGuestGames(games);
      return;
    }
    if (!remoteReady || remoteUserId !== sessionUserId) return;
    const nextSignature = getGameSyncSignature(games);
    if (nextSignature === remoteSignatureRef.current) return;

    if (saveRetryTimeoutRef.current !== null) {
      window.clearTimeout(saveRetryTimeoutRef.current);
      saveRetryTimeoutRef.current = null;
    }

    if (
      saveInFlightRef.current &&
      saveInFlightUserIdRef.current === sessionUserId
    ) {
      queuedSaveSignatureRef.current = nextSignature;
      return;
    }

    saveInFlightRef.current = true;
    saveInFlightUserIdRef.current = sessionUserId;
    queuedSaveSignatureRef.current = null;

    const changedGameIds = getChangedGameIds(
      games,
      remoteSignatureRef.current,
      sessionUserId,
    );
    void saveRemoteGames(sessionUserId, games, changedGameIds)
      .then(() => {
        if (latestSessionUserIdRef.current !== sessionUserId) return;
        remoteSignatureRef.current = markGameSaveSynced(
          remoteSignatureRef.current,
          games,
          changedGameIds,
        );
        failedSaveNoticeSignatureRef.current = null;
      })
      .catch((error) => {
        if (latestSessionUserIdRef.current !== sessionUserId) return;
        if (isTransientFetchError(error)) {
          console.warn("Could not reach Supabase while saving games", error);
          saveRetryTimeoutRef.current = window.setTimeout(() => {
            saveRetryTimeoutRef.current = null;
            setSaveRetryTick((value) => value + 1);
          }, 5000);
          return;
        }

        if (failedSaveNoticeSignatureRef.current === nextSignature) return;
        failedSaveNoticeSignatureRef.current = nextSignature;
        console.error("Failed to save games to Supabase", error);
        setSyncNotice({
          message: `Could not save games: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
      })
      .finally(() => {
        if (saveInFlightUserIdRef.current === sessionUserId) {
          saveInFlightRef.current = false;
          saveInFlightUserIdRef.current = null;
        }
        if (latestSessionUserIdRef.current !== sessionUserId) return;
        if (
          queuedSaveSignatureRef.current &&
          queuedSaveSignatureRef.current !== remoteSignatureRef.current
        ) {
          queuedSaveSignatureRef.current = null;
          setSaveRetryTick((value) => value + 1);
        }
      });
  }, [games, remoteReady, remoteUserId, saveRetryTick, sessionUserId]);

  useEffect(() => {
    return () => {
      if (saveRetryTimeoutRef.current !== null) {
        window.clearTimeout(saveRetryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      const guestGameIds = new Set(loadGuestGames().map((game) => game.id));
      if (currentGameId === null || guestGameIds.has(currentGameId)) {
        saveGuestCurrentGameId(currentGameId);
      }
      return;
    }

    saveCurrentGameId(currentGameId);
  }, [currentGameId, sessionUserId]);

  const currentGame = useMemo(
    () =>
      currentGameId
        ? (games.find((g) => g.id === currentGameId) ?? null)
        : null,
    [games, currentGameId],
  );

  useEffect(() => {
    let alive = true;
    if (
      !sessionUserId ||
      !remoteReady ||
      !currentGame ||
      currentGame.accessRole === "collaborator" ||
      currentGame.participantMode === "teams"
    ) {
      setPastLinkedPlayers([]);
      return () => {
        alive = false;
      };
    }

    setPastLinkedPlayers([]);
    loadRemotePastLinkedPlayers(currentGame.id)
      .then((players) => {
        if (alive) setPastLinkedPlayers(players);
      })
      .catch(() => {
        if (alive) setPastLinkedPlayers([]);
      });

    return () => {
      alive = false;
    };
  }, [
    currentGame?.accessRole,
    currentGame?.id,
    currentGame?.participantMode,
    currentGame?.players.length,
    remoteReady,
    sessionUserId,
  ]);

  const gamesByUpdated = useMemo(() => {
    return [...games].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [games]);

  function createGame(input: CreateGameInput): Game | null {
    const name = clampName(input.name).toUpperCase();
    const startingScore = Number.isFinite(input.startingScore)
      ? Math.trunc(input.startingScore)
      : 0;
    const targetScore = Number.isFinite(input.targetScore)
      ? Math.trunc(input.targetScore)
      : 0;
    if (!name) return null;
    const manualEndOnly = input.manualEndOnly === true;
    if (
      !manualEndOnly &&
      input.winCondition !== "reach_zero" &&
      targetScore <= 0
    )
      return null;
    if (input.winCondition === "reach_zero" && startingScore <= targetScore)
      return null;

    const now = Date.now();
    const scoreDirection = input.scoreDirection === "down" ? "down" : "up";
    const winCondition =
      input.winCondition === "reach_zero" || input.winCondition === "lowest"
        ? input.winCondition
        : "reach_target";
    const timerEnabled = input.timerEnabled === true;
    const diceEnabled = input.diceEnabled === true;
    const quickScoreValues = sanitizeQuickScoreValues(input.quickScoreValues);
    const timerMode =
      input.timerMode === "stopwatch" ? "stopwatch" : "countdown";
    const timerSeconds =
      typeof input.timerSeconds === "number" && input.timerSeconds > 0
        ? Math.trunc(input.timerSeconds)
        : 300;
    const participantMode =
      input.participantMode === "teams" ? "teams" : "players";
    const teamIdMap = new Map<string, string>();
    const teams: GameTeam[] =
      participantMode === "teams"
        ? (input.initialTeams ?? []).map((team) => {
            const gameTeamId = uid();
            teamIdMap.set(team.id, gameTeamId);
            return {
              id: gameTeamId,
              name: formatTeamName(team.name),
              icon: team.icon ?? DEFAULT_TEAM_ICON,
              sourceTeamId: team.id,
              createdAt: now,
              updatedAt: now,
            };
          })
        : [];

    const players: Player[] =
      participantMode === "teams"
        ? (input.initialTeams ?? []).flatMap((team) =>
            team.members.map((member) => ({
              id: uid(),
              name: formatPlayerName(member.name),
              score: startingScore,
              createdAt: now,
              reachedAt: now,
              avatarColor: member.avatarColor,
              profileId: member.profileId,
              teamId: teamIdMap.get(team.id),
            })),
          )
        : (input.initialPlayers ?? []).map((p) => ({
            id: uid(),
            name: formatPlayerName(p.name),
            score: startingScore,
            createdAt: now,
            reachedAt: now,
            avatarColor: p.avatarColor,
            profileId: p.profileId,
          }));

    const participantCount =
      participantMode === "teams" ? teams.length : players.length;

    if (
      (winCondition === "lowest" || input.winByTwo === true) &&
      participantCount < 2
    ) {
      return null;
    }

    const game: Game = {
      id: uid(),
      ownerId: sessionUserId ?? undefined,
      accessRole: sessionUserId ? "owner" : undefined,
      isShared: false,
      collaboratorsCanManage: false,
      name,
      participantMode,
      scoreDirection,
      startingScore,
      targetScore,
      winCondition,
      winByTwo: input.winByTwo === true,
      manualEndOnly,
      timerEnabled,
      diceEnabled,
      quickScoreValues,
      timerMode,
      timerSeconds,
      teams,
      players,
      scoreHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    setGames((prev) => [game, ...prev]);
    setCurrentGameId(game.id);
    return game;
  }

  function selectGame(gameId: string | null) {
    setCurrentGameId(gameId);
  }

  async function deleteGame(gameId: string) {
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        await deleteRemoteSharedGame(sessionUserId, gameId);
        remoteSignatureRef.current = markGameDeletedSynced(
          remoteSignatureRef.current,
          gameId,
        );
      } catch (error) {
        console.error("Failed to delete the shared game", error);
        setSyncNotice({
          message: `Could not delete game: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    removeGameInviteCode(gameId);
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setCurrentGameId((prev) => (prev === gameId ? null : prev));
    return true;
  }

  async function duplicateGame(
    gameId: string,
    savedProfiles: PlayerProfile[],
  ): Promise<Game | null> {
    const original = games.find((g) => g.id === gameId);
    if (!original) return null;
    const participantCount =
      original.participantMode === "teams"
        ? original.teams.length
        : original.players.length;
    if (
      (original.winCondition === "lowest" || original.winByTwo) &&
      participantCount < 2
    )
      return null;

    const now = Date.now();

    // Treat the unnumbered original as game #1, then find the highest
    // existing duplicate number so the first duplicate starts at #2.
    const baseName = original.name.replace(/\s\(\d+\)$/, "");
    const siblings = games.filter((g) => g.name.startsWith(baseName));
    let maxNum = 1;
    for (const s of siblings) {
      const match = s.name.match(/\((\d+)\)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    }

    const nextName = `${baseName} (${maxNum + 1})`.toUpperCase();

    if (
      original.isShared &&
      original.accessRole !== "collaborator" &&
      sessionUserId
    ) {
      try {
        const replayedGame = await replayRemoteSharedGame(
          sessionUserId,
          original.id,
          uid(),
          nextName,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          replayedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [replayedGame]),
        );
        setCurrentGameId(replayedGame.id);
        return replayedGame;
      } catch (error) {
        console.error("Failed to replay the shared game", error);
        setSyncNotice({
          message: `Could not start game: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return null;
      }
    }

    const duplicatedPlayers: Player[] = original.players.map((p) => {
      const savedProfile = getSavedReplayProfile(p, savedProfiles);
      return {
        ...p,
        id: uid(),
        name: savedProfile?.name ?? p.name,
        avatarColor: savedProfile?.avatarColor ?? p.avatarColor,
        profileId: savedProfile?.id,
        joinedViaInvite: undefined,
        isGameOwner: undefined,
        score: original.startingScore,
        createdAt: now,
        reachedAt: now,
      };
    });

    const next: Game = {
      ...original,
      id: uid(),
      ownerId: sessionUserId ?? undefined,
      accessRole: sessionUserId ? "owner" : undefined,
      isShared: false,
      linkedPlayerIdForCurrentUser: undefined,
      hasCollaborators: false,
      collaboratorsCanManage: false,
      name: nextName,
      teams: original.teams.map((team) => ({ ...team })),
      players: duplicatedPlayers,
      scoreHistory: [],
      completionMode: undefined,
      createdAt: now,
      updatedAt: now,
      endedAt: undefined,
    };

    setGames((prev) => [next, ...prev]);
    setCurrentGameId(next.id);
    return next;
  }

  async function renameGame(gameId: string, name: string) {
    const trimmed = clampName(name).toUpperCase();
    if (!trimmed) return false;
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const updatedGame = await renameRemoteSharedGame(
          sessionUserId,
          gameId,
          trimmed,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to rename the shared game", error);
        setSyncNotice({
          message: `Could not rename game: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }
    updateGame(gameId, (g) => ({ ...g, name: trimmed }));
    return true;
  }

  function updateGame(gameId: string, updater: (game: Game) => Game) {
    setGames((prev) => {
      let didChange = false;

      const nextGames = prev.map((g) => {
        if (g.id !== gameId) return g;
        if (g.isShared) return g;
        const next = updater(g);
        if (next === g) return g;
        didChange = true;
        return { ...next, updatedAt: Date.now() };
      });

      return didChange ? nextGames : prev;
    });
  }

  function reconcileGameCompletion(
    game: Game,
    players: Player[],
    teams = game.teams,
    now = Date.now(),
  ) {
    const stillEnded = hasGameEnded(players, {
      ...game,
      teams,
      endedAt: undefined,
    });

    return {
      teams,
      players,
      completionMode: undefined,
      endedAt: stillEnded ? (game.endedAt ?? now) : undefined,
    };
  }

  async function addPlayer(
    gameId: string,
    input: {
      name: string;
      avatarColor: string;
      profileId?: string;
      teamId?: string;
    },
  ) {
    const name = formatPlayerName(input.name);
    if (!name) return false;
    const now = Date.now();
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const updatedGame = await addRemoteSharedGamePlayer(
          sessionUserId,
          gameId,
          {
            id: uid(),
            name,
            avatarColor: input.avatarColor,
            profileId: input.profileId,
          },
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to add a player to the shared game", error);
        setSyncNotice({
          message: `Could not add player: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }
    updateGame(gameId, (g) => {
      const player: Player = {
        id: uid(),
        name,
        score: g.startingScore,
        createdAt: now,
        reachedAt: now,
        avatarColor: input.avatarColor,
        profileId: input.profileId,
        teamId: input.teamId,
      };
      const players = [player, ...g.players];
      return {
        ...g,
        ...reconcileGameCompletion(g, players, g.teams, now),
      };
    });
    return true;
  }

  async function removePlayer(gameId: string, playerId: string) {
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const remoteGame = await removeRemoteSharedGamePlayer(
          sessionUserId,
          gameId,
          playerId,
        );
        const removedLinkedPlayer = game.players.some(
          (player) =>
            player.id === playerId && player.joinedViaInvite === true,
        );
        const remainingLinkedPlayers = game.players.filter(
          (player) =>
            player.id !== playerId && player.joinedViaInvite === true,
        ).length;
        const updatedGame = removedLinkedPlayer
          ? {
              ...remoteGame,
              hasCollaborators: remainingLinkedPlayers > 0,
            }
          : remoteGame;
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        removeGameInviteCode(gameId);
        return true;
      } catch (error) {
        console.error("Failed to remove the shared game player", error);
        setSyncNotice({
          message: `Could not remove player: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    const now = Date.now();
    updateGame(gameId, (g) => {
      const players = g.players.filter((p) => p.id !== playerId);
      return {
        ...g,
        ...reconcileGameCompletion(g, players, g.teams, now),
      };
    });
    return true;
  }

  async function mergePlayers(
    gameId: string,
    linkedPlayerId: string,
    rosterPlayerId: string,
    keepPlayer: "linked" | "local",
  ) {
    if (!sessionUserId) return false;
    try {
      const updatedGame = await mergeRemoteSharedGamePlayers(
        sessionUserId,
        gameId,
        linkedPlayerId,
        rosterPlayerId,
        keepPlayer,
      );
      remoteSignatureRef.current = markGameVersionSynced(
        remoteSignatureRef.current,
        updatedGame,
      );
      setGames((previousGames) =>
        mergeGamesById(previousGames, [updatedGame]),
      );
      return true;
    } catch (error) {
      console.error("Failed to merge the shared game players", error);
      setSyncNotice({
        message: `Could not merge players: ${getSyncErrorMessage(error)}`,
        tone: "error",
      });
      return false;
    }
  }

  async function addPastLinkedPlayer(
    gameId: string,
    collaboratorUserId: string,
  ) {
    if (!sessionUserId) return false;
    try {
      const updatedGame = await addRemotePastLinkedPlayerToGame(
        sessionUserId,
        gameId,
        collaboratorUserId,
      );
      remoteSignatureRef.current = markGameVersionSynced(
        remoteSignatureRef.current,
        updatedGame,
      );
      setGames((previousGames) =>
        mergeGamesById(previousGames, [updatedGame]),
      );
      setPastLinkedPlayers((players) =>
        players.filter((player) => player.userId !== collaboratorUserId),
      );
      return true;
    } catch (error) {
      console.error("Failed to add the past linked player", error);
      setSyncNotice({
        message: `Could not add invited player: ${getSyncErrorMessage(error)}`,
        tone: "error",
      });
      return false;
    }
  }

  async function updatePlayer(
    gameId: string,
    playerId: string,
    updates: Partial<
      Pick<Player, "name" | "avatarColor" | "profileId" | "teamId">
    >,
  ) {
    const now = Date.now();
    const game = games.find((item) => item.id === gameId);
    const currentPlayer = game?.players.find((player) => player.id === playerId);
    if (!currentPlayer) return false;

    if (game?.isShared && sessionUserId) {
      const nextPlayer: Player = {
        ...currentPlayer,
        name: hasOwn(updates, "name")
          ? formatPlayerName(String(updates.name ?? currentPlayer.name))
          : currentPlayer.name,
        avatarColor: hasOwn(updates, "avatarColor")
          ? ((updates.avatarColor as string | undefined) ??
            currentPlayer.avatarColor)
          : currentPlayer.avatarColor,
        profileId: hasOwn(updates, "profileId")
          ? (updates.profileId as string | undefined)
          : currentPlayer.profileId,
        teamId: hasOwn(updates, "teamId")
          ? (updates.teamId as string | undefined)
          : currentPlayer.teamId,
      };
      if (!nextPlayer.name) return false;
      if (
        nextPlayer.name === currentPlayer.name &&
        nextPlayer.avatarColor === currentPlayer.avatarColor &&
        nextPlayer.profileId === currentPlayer.profileId &&
        nextPlayer.teamId === currentPlayer.teamId
      ) {
        return true;
      }
      try {
        const updatedGame = await updateRemoteSharedGamePlayer(
          sessionUserId,
          gameId,
          nextPlayer,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to update the shared game player", error);
        setSyncNotice({
          message: `Could not update player: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    updateGame(gameId, (g) => {
      let didChange = false;

      const players = g.players.map((p) => {
        if (p.id !== playerId) return p;

        const nextName = hasOwn(updates, "name")
          ? formatPlayerName(String(updates.name ?? p.name))
          : p.name;
        const nextAvatarColor = hasOwn(updates, "avatarColor")
          ? (updates.avatarColor as string | undefined)
          : p.avatarColor;
        const nextProfileId = hasOwn(updates, "profileId")
          ? (updates.profileId as string | undefined)
          : p.profileId;
        const nextTeamId = hasOwn(updates, "teamId")
          ? (updates.teamId as string | undefined)
          : p.teamId;

        if (
          nextName === p.name &&
          nextAvatarColor === p.avatarColor &&
          nextProfileId === p.profileId &&
          nextTeamId === p.teamId
        ) {
          return p;
        }

        didChange = true;
        return {
          ...p,
          name: nextName,
          avatarColor: nextAvatarColor ?? p.avatarColor,
          profileId: nextProfileId,
          teamId: nextTeamId,
        };
      });

      if (!didChange) return g;

      return {
        ...g,
        ...reconcileGameCompletion(g, players, g.teams, now),
      };
    });
    return true;
  }

  function addTeam(
    gameId: string,
    rawName: string,
    icon?: string,
    members: Array<{
      name: string;
      avatarColor: string;
      profileId?: string;
    }> = [],
  ): GameTeam | null {
    const name = formatTeamName(rawName);
    if (!name) return null;

    let createdTeam: GameTeam | null = null;
    const now = Date.now();

    updateGame(gameId, (g) => {
      if (
        g.teams.some((team) => team.name.toLowerCase() === name.toLowerCase())
      ) {
        return g;
      }

      createdTeam = {
        id: uid(),
        name,
        icon,
        createdAt: now,
      };
      const teams = [...g.teams, createdTeam];
      const nextPlayers =
        members.length > 0
          ? [
              ...members.map((member, index) => ({
                id: uid(),
                name: formatPlayerName(member.name),
                score: g.startingScore,
                createdAt: now + index,
                reachedAt: now + index,
                avatarColor: member.avatarColor,
                profileId: member.profileId,
                teamId: createdTeam!.id,
              })),
              ...g.players,
            ].filter((player) => player.name)
          : g.players;
      return {
        ...g,
        ...reconcileGameCompletion(g, nextPlayers, teams, now),
      };
    });

    return createdTeam;
  }

  function removeTeam(gameId: string, teamId: string) {
    const now = Date.now();
    updateGame(gameId, (g) => {
      const teams = g.teams.filter((team) => team.id !== teamId);
      const players =
        g.participantMode === "teams"
          ? g.players.filter((player) => player.teamId !== teamId)
          : g.players.map((player) =>
              player.teamId === teamId
                ? { ...player, teamId: undefined }
                : player,
            );

      return {
        ...g,
        ...reconcileGameCompletion(g, players, teams, now),
      };
    });
  }

  async function resetScores(gameId: string) {
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const updatedGame = await resetRemoteSharedGame(sessionUserId, gameId);
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to reset the shared game", error);
        setSyncNotice({
          message: `Could not reset game: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    const now = Date.now();
    updateGame(gameId, (g) => ({
      ...g,
      completionMode: undefined,
      endedAt: undefined,
      scoreHistory: [],
      players: g.players.map((p) => ({
        ...p,
        score: g.startingScore,
        reachedAt: now,
      })),
    }));
    return true;
  }

  async function updateScore(gameId: string, playerId: string, delta: number) {
    if (!delta) return false;
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const updatedGame = await applyRemoteSharedScoreDelta(
          sessionUserId,
          gameId,
          playerId,
          delta,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to update the shared game score", error);
        setSyncNotice({
          message: `Could not update score: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    const now = Date.now();
    updateGame(gameId, (g) => {
      let scoreHistory = g.scoreHistory ?? [];
      let didUpdateScore = false;
      const targetPlayer = g.players.find((player) => player.id === playerId);
      const teamScoreTargetId =
        g.participantMode === "teams" ? targetPlayer?.teamId : undefined;
      const players = g.players.map((p) => {
        const shouldUpdate =
          p.id === playerId ||
          (teamScoreTargetId !== undefined && p.teamId === teamScoreTargetId);
        if (!shouldUpdate) return p;

        const scoreBefore =
          typeof p.score === "number" && Number.isFinite(p.score)
            ? p.score
            : g.startingScore;
        const scoreAfter = clampScoreForGame(
          scoreBefore + delta,
          g,
          clampScore,
        );
        const actualDelta = scoreAfter - scoreBefore;
        if (actualDelta === 0) return p;

        didUpdateScore = true;
        scoreHistory = [
          {
            id: uid(),
            playerId: p.id,
            playerName: p.name,
            avatarColor: p.avatarColor,
            delta: actualDelta,
            scoreBefore,
            scoreAfter,
            createdAt: now,
          },
          ...scoreHistory,
        ];
        return { ...p, score: scoreAfter, reachedAt: now };
      });

      if (!didUpdateScore) return g;
      const hasWinner = hasGameEnded(players, { ...g, endedAt: undefined });
      return {
        ...g,
        players,
        scoreHistory,
        completionMode: undefined,
        endedAt: hasWinner ? (g.endedAt ?? now) : undefined,
      };
    });
    return true;
  }

  async function createGameInvite(gameId: string) {
    if (!sessionUserId) throw new Error("Sign in to invite players.");
    const game = games.find((item) => item.id === gameId);
    if (!game?.isShared) {
      await saveRemoteGames(sessionUserId, games, new Set([gameId]));
    }
    const code = await createRemoteGameInvite(gameId);
    saveGameInviteCode(gameId, code);
    setGames((currentGames) =>
      currentGames.map((currentGame) =>
        currentGame.id === gameId
          ? { ...currentGame, isShared: true }
          : currentGame,
      ),
    );
    return code;
  }

  async function rotateGameInvite(gameId: string) {
    if (!sessionUserId) throw new Error("Sign in to generate a new code.");
    const code = await rotateRemoteGameInvite(gameId);
    saveGameInviteCode(gameId, code);
    return code;
  }

  async function joinGameByCode(code: string) {
    if (!sessionUserId) throw new Error("Sign in to join a game.");
    const gameId = await joinRemoteGame(code);
    const remoteGames = await loadRemoteGames(sessionUserId);
    const joinedGame = remoteGames.find((game) => game.id === gameId);
    if (!joinedGame) throw new Error("The shared game could not be loaded.");
    saveGameInviteCode(gameId, code);
    remoteSignatureRef.current = markGameVersionSynced(
      remoteSignatureRef.current,
      joinedGame,
    );
    setGames((currentGames) =>
      mergeGamesById(currentGames, [joinedGame]),
    );
    setCurrentGameId(gameId);
    return joinedGame;
  }

  async function updateGameSettings(
    gameId: string,
    input: UpdateGameSettingsInput,
  ) {
    const name = clampName(input.name).toUpperCase();
    const startingScore = Number.isFinite(input.startingScore)
      ? Math.trunc(input.startingScore)
      : 0;
    const targetScore = Number.isFinite(input.targetScore)
      ? Math.trunc(input.targetScore)
      : 0;
    const timerSeconds = Number.isFinite(input.timerSeconds)
      ? Math.trunc(input.timerSeconds)
      : 0;
    const quickScoreValues = sanitizeQuickScoreValues(input.quickScoreValues);
    if (!name) return false;
    if (
      !input.manualEndOnly &&
      input.winCondition !== "reach_zero" &&
      targetScore <= 0
    )
      return false;
    if (input.winCondition === "reach_zero" && startingScore <= targetScore)
      return false;
    if (input.timerEnabled && timerSeconds <= 0) return false;

    const game = games.find((item) => item.id === gameId);
    if (!game) return false;
    const participantCount =
      game.participantMode === "teams"
        ? game.teams.length
        : game.players.length;
    if (
      (input.winCondition === "lowest" || input.winByTwo) &&
      participantCount < 2
    ) {
      return false;
    }

    if (game.isShared && sessionUserId) {
      try {
        const updatedGame = await updateRemoteSharedGameSettings(
          sessionUserId,
          gameId,
          {
            name,
            scoreDirection: input.scoreDirection,
            startingScore,
            targetScore,
            winCondition: input.winCondition,
            winByTwo: input.winByTwo,
            manualEndOnly: input.manualEndOnly,
            timerEnabled: input.timerEnabled,
            diceEnabled: input.diceEnabled,
            timerMode: input.timerMode,
            timerSeconds: timerSeconds > 0 ? timerSeconds : 300,
            collaboratorsCanManage: input.collaboratorsCanManage,
          },
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to update the shared game settings", error);
        setSyncNotice({
          message: `Could not update settings: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    const now = Date.now();
    updateGame(gameId, (g) => {
      const nextGame = {
        ...g,
        scoreDirection: input.scoreDirection,
        startingScore,
        targetScore,
        winCondition: input.winCondition,
        winByTwo: input.winByTwo,
        manualEndOnly: input.manualEndOnly,
      };
      const wasAlreadyEnded = g.endedAt !== undefined;
      const hasWinner =
        wasAlreadyEnded ||
        hasGameEnded(g.players, {
          ...nextGame,
          endedAt: undefined,
        });
      return {
        ...g,
        name,
        collaboratorsCanManage: input.collaboratorsCanManage,
        scoreDirection: input.scoreDirection,
        startingScore,
        targetScore,
        winCondition: input.winCondition,
        winByTwo: input.winByTwo,
        manualEndOnly: input.manualEndOnly,
        timerEnabled: input.timerEnabled,
        diceEnabled: input.diceEnabled,
        quickScoreValues,
        timerMode: input.timerMode,
        timerSeconds: timerSeconds > 0 ? timerSeconds : 300,
        completionMode: wasAlreadyEnded ? g.completionMode : undefined,
        endedAt: hasWinner ? (g.endedAt ?? now) : undefined,
      };
    });
    return true;
  }

  async function setCollaboratorsCanManage(
    gameId: string,
    enabled: boolean,
  ) {
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      if (game.accessRole === "collaborator") return false;
      if (game.collaboratorsCanManage === enabled) return true;
      try {
        const updatedGame = await setRemoteSharedCollaboratorManagement(
          sessionUserId,
          gameId,
          enabled,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to update collaborator permissions", error);
        setSyncNotice({
          message: `Could not update permissions: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    updateGame(gameId, (game) => {
      if (
        game.accessRole === "collaborator" ||
        game.collaboratorsCanManage === enabled
      ) {
        return game;
      }
      return { ...game, collaboratorsCanManage: enabled };
    });
    return true;
  }

  async function finishGame(
    gameId: string,
    completionMode: CompletionMode = "no_winner",
  ) {
    const game = games.find((item) => item.id === gameId);
    if (game?.isShared && sessionUserId) {
      try {
        const updatedGame = await finishRemoteSharedGame(
          sessionUserId,
          gameId,
          completionMode,
        );
        remoteSignatureRef.current = markGameVersionSynced(
          remoteSignatureRef.current,
          updatedGame,
        );
        setGames((previousGames) =>
          mergeGamesById(previousGames, [updatedGame]),
        );
        return true;
      } catch (error) {
        console.error("Failed to end the shared game", error);
        setSyncNotice({
          message: `Could not end game: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        return false;
      }
    }

    updateGame(gameId, (g) => {
      if (!g.players.length || g.endedAt) return g;
      return {
        ...g,
        completionMode,
        endedAt: Date.now(),
      };
    });
    return true;
  }

  function syncProfile(
    profileId: string,
    updates: Partial<Pick<Player, "name" | "avatarColor">>,
  ) {
    games.forEach((game) => {
      if (!game.isShared || game.accessRole === "collaborator") return;
      game.players.forEach((player) => {
        if (
          player.profileId !== profileId ||
          player.joinedViaInvite === true
        ) {
          return;
        }
        void updatePlayer(game.id, player.id, updates);
      });
    });

    setGames((prev) => {
      let didChange = false;

      const nextGames = prev.map((g) => {
        if (g.isShared) return g;
        let didChangeGame = false;

        const players = g.players.map((p) => {
          const canSyncProfile =
            p.profileId === profileId &&
            (g.accessRole !== "collaborator" ||
              p.id === g.linkedPlayerIdForCurrentUser);
          if (canSyncProfile) {
            const nextName =
              updates.name !== undefined && p.joinedViaInvite !== true
                ? formatPlayerName(updates.name)
                : p.name;
            const nextAvatarColor =
              updates.avatarColor !== undefined
                ? updates.avatarColor
                : p.avatarColor;

            if (nextName === p.name && nextAvatarColor === p.avatarColor) {
              return p;
            }

            didChange = true;
            didChangeGame = true;
            return {
              ...p,
              name: nextName,
              avatarColor: nextAvatarColor,
            };
          }
          return p;
        });

        if (!didChangeGame) return g;

        return {
          ...g,
          players,
          updatedAt: Date.now(),
        };
      });

      return didChange ? nextGames : prev;
    });
  }

  function importGames(incomingGames: Game[]) {
    if (incomingGames.length === 0) return 0;

    const existingGamesById = new Map(games.map((game) => [game.id, game]));

    const changedCount = incomingGames.reduce((count, incomingGame) => {
      const existingGame = existingGamesById.get(incomingGame.id);

      if (!existingGame) return count + 1;

      return incomingGame.updatedAt > existingGame.updatedAt
        ? count + 1
        : count;
    }, 0);

    if (changedCount === 0) return 0;

    const mergedGames = mergeGamesById(games, incomingGames);

    setGames(mergedGames);

    if (
      currentGameId &&
      mergedGames.some((game) => game.id === currentGameId)
    ) {
      setCurrentGameId(currentGameId);
    } else if (
      incomingGames[0]?.id &&
      mergedGames.some((game) => game.id === incomingGames[0]?.id)
    ) {
      setCurrentGameId(incomingGames[0].id);
    }

    return changedCount;
  }
  const sortedPlayers = useMemo(() => {
    if (!currentGame) return [];
    return [...currentGame.players].sort((a, b) =>
      sortPlayers(a, b, shouldSortLowToHigh(currentGame)),
    );
  }, [currentGame]);

  const ranks = useMemo(() => computeRanks(sortedPlayers), [sortedPlayers]);
  const allZero = useMemo(
    () =>
      !!currentGame &&
      currentGame.players.length > 0 &&
      currentGame.players.every((p) => p.score === currentGame.startingScore),
    [currentGame],
  );

  return {
    games: gamesByUpdated,
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
    mergePlayers,
    addPastLinkedPlayer,
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
    sortedPlayers,
    ranks,
    allZero,
    remoteReady,
    pastLinkedPlayers,
    syncNotice,
    updateGame,
    importGames,
  };
}
