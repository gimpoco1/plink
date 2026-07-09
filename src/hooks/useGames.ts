import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CompletionMode,
  Game,
  GameTeam,
  Player,
  ScoreDirection,
  ToastState,
  WinCondition,
} from "../types";
import { MAX_ABS_SCORE, DEFAULT_TEAM_ICON } from "../constants";
import { supabase } from "../lib/supabase";
import { clampName, formatPlayerName, formatTeamName } from "../utils/text";
import { uid } from "../utils/id";
import {
  loadCurrentGameId,
  loadGuestCurrentGameId,
  loadGuestGames,
  migrateSingleGameToGamesIfNeeded,
  saveCurrentGameId,
  saveGuestCurrentGameId,
  saveGuestGames,
} from "../storage/gamesStorage";
import { loadRemoteGames, saveRemoteGames } from "../storage/remoteStorage";
import { computeRanks, sortPlayers } from "../utils/ranking";
import {
  clampScoreForGame,
  hasGameEnded,
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
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  diceEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
};

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

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Unknown sync error";
}

function isTransientFetchError(error: unknown) {
  const message = getSyncErrorMessage(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror")
  );
}

function mergeGamesById(baseGames: Game[], incomingGames: Game[]) {
  const merged = new Map(baseGames.map((game) => [game.id, game]));

  for (const incoming of incomingGames) {
    const existing = merged.get(incoming.id);
    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      merged.set(incoming.id, incoming);
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

export function useGames(session: Session | null, authLoading = false) {
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
  const [remoteReady, setRemoteReady] = useState(!session && !authLoading);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<ToastState | null>(null);
  const [saveRetryTick, setSaveRetryTick] = useState(0);
  const remoteSignatureRef = useRef<string | null>(null);
  const failedSaveNoticeSignatureRef = useRef<string | null>(null);
  const saveRetryTimeoutRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveInFlightUserIdRef = useRef<string | null>(null);
  const queuedSaveSignatureRef = useRef<string | null>(null);
  const latestSessionUserIdRef = useRef<string | null>(sessionUserId);

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
              message:
                removed.length === 1
                  ? `"${removed[0].name}" was removed from your account.`
                  : `${removed.length} games were removed from your account.`,
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

    if (!session) {
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
    loadRemoteGames(session.user.id)
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
        setRemoteUserId(session.user.id);
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
  }, [authLoading, migrated, session]);

  useEffect(() => {
    if (!session || remoteUserId !== session.user.id) return;
    let alive = true;

    async function refreshRemoteGames() {
      try {
        const remoteGames = await loadRemoteGames(session!.user.id);
        if (!alive) return;
        let appliedRemoteState = false;
        setGames((previousGames) => {
          const remoteSignature = getGameSyncSignature(remoteGames);
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
              message:
                removed.length === 1
                  ? `"${removed[0].name}" was removed from your account.`
                  : `${removed.length} games were removed from your account.`,
              tone: "default",
            });
          } else if (changed.length > 0) {
            setSyncNotice({
              message: "Your games were updated.",
              tone: "default",
            });
          }
          remoteSignatureRef.current = remoteSignature;
          appliedRemoteState = true;
          return remoteGames;
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
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshRemoteGames();
    }

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    if (supabase) {
      channel = supabase.channel(`games:${session.user.id}`);
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          void refreshRemoteGames();
        },
      );
      void channel.subscribe();
    }

    const intervalId = window.setInterval(refreshRemoteGames, 5000);
    window.addEventListener("focus", refreshRemoteGames);
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
      window.removeEventListener("focus", refreshRemoteGames);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [remoteUserId, session]);

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

    void saveRemoteGames(sessionUserId, games)
      .then(() => {
        if (latestSessionUserIdRef.current !== sessionUserId) return;
        remoteSignatureRef.current = nextSignature;
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
    if (!session) {
      const guestGameIds = new Set(loadGuestGames().map((game) => game.id));
      if (currentGameId === null || guestGameIds.has(currentGameId)) {
        saveGuestCurrentGameId(currentGameId);
      }
      return;
    }

    saveCurrentGameId(currentGameId);
  }, [currentGameId, session]);

  const currentGame = useMemo(
    () =>
      currentGameId
        ? (games.find((g) => g.id === currentGameId) ?? null)
        : null,
    [games, currentGameId],
  );

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

  function deleteGame(gameId: string) {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setCurrentGameId((prev) => (prev === gameId ? null : prev));
  }

  function duplicateGame(gameId: string): Game | null {
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

    const duplicatedPlayers: Player[] = original.players.map((p) => ({
      ...p,
      id: uid(),
      score: original.startingScore,
      createdAt: now,
      reachedAt: now,
    }));

    // Find the next available number if duplicating multiple times
    // Matches "NAME (N)" and extracts N
    const baseName = original.name.replace(/\s\(\d+\)$/, "");
    const siblings = games.filter((g) => g.name.startsWith(baseName));
    let maxNum = 0;
    for (const s of siblings) {
      const match = s.name.match(/\((\d+)\)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      } else if (s.name === baseName) {
        // Technically the base name is "0", but we start with (1)
      }
    }

    const nextName = `${baseName} (${maxNum + 1})`.toUpperCase();

    const next: Game = {
      ...original,
      id: uid(),
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

  function renameGame(gameId: string, name: string) {
    const trimmed = clampName(name).toUpperCase();
    if (!trimmed) return;
    updateGame(gameId, (g) => ({ ...g, name: trimmed }));
  }

  function updateGame(gameId: string, updater: (game: Game) => Game) {
    setGames((prev) => {
      let didChange = false;

      const nextGames = prev.map((g) => {
        if (g.id !== gameId) return g;
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

  function addPlayer(
    gameId: string,
    input: {
      name: string;
      avatarColor: string;
      profileId?: string;
      teamId?: string;
    },
  ) {
    const name = formatPlayerName(input.name);
    if (!name) return;
    const now = Date.now();
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
  }

  function removePlayer(gameId: string, playerId: string) {
    const now = Date.now();
    updateGame(gameId, (g) => {
      const players = g.players.filter((p) => p.id !== playerId);
      return {
        ...g,
        ...reconcileGameCompletion(g, players, g.teams, now),
      };
    });
  }

  function updatePlayer(
    gameId: string,
    playerId: string,
    updates: Partial<
      Pick<Player, "name" | "avatarColor" | "profileId" | "teamId">
    >,
  ) {
    const now = Date.now();
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

  function resetScores(gameId: string) {
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
  }

  function updateScore(gameId: string, playerId: string, delta: number) {
    if (!delta) return;
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
  }

  function updateGameSettings(gameId: string, input: UpdateGameSettingsInput) {
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

    const now = Date.now();
    updateGame(gameId, (g) => {
      const participantCount =
        g.participantMode === "teams" ? g.teams.length : g.players.length;
      if (
        (input.winCondition === "lowest" || input.winByTwo) &&
        participantCount < 2
      ) {
        return g;
      }
      const nextGame = {
        ...g,
        scoreDirection: input.scoreDirection,
        startingScore,
        targetScore,
        winCondition: input.winCondition,
        winByTwo: input.winByTwo,
        manualEndOnly: input.manualEndOnly,
      };
      const hasWinner = hasGameEnded(g.players, nextGame);
      return {
        ...g,
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
        completionMode: undefined,
        endedAt: hasWinner ? (g.endedAt ?? now) : undefined,
      };
    });
    return true;
  }

  function finishGame(gameId: string, completionMode?: CompletionMode) {
    updateGame(gameId, (g) => {
      if (!g.players.length || g.endedAt) return g;
      return {
        ...g,
        completionMode,
        endedAt: Date.now(),
      };
    });
  }

  function syncProfile(
    profileId: string,
    updates: Partial<Pick<Player, "name" | "avatarColor">>,
  ) {
    setGames((prev) => {
      let didChange = false;

      const nextGames = prev.map((g) => {
        let didChangeGame = false;

        const players = g.players.map((p) => {
          if (p.profileId === profileId) {
            const nextName =
              updates.name !== undefined ? formatPlayerName(updates.name) : p.name;
            const nextAvatarColor =
              updates.avatarColor !== undefined
                ? updates.avatarColor
                : p.avatarColor;

            if (
              nextName === p.name &&
              nextAvatarColor === p.avatarColor
            ) {
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
    removeTeam,
    updatePlayer,
    resetScores,
    updateScore,
    updateGameSettings,
    finishGame,
    syncProfile,
    sortedPlayers,
    ranks,
    allZero,
    remoteReady,
    syncNotice,
    updateGame,
    importGames,
  };
}
