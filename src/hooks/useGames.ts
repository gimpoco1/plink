import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Game, Player } from "../types";
import { MAX_ABS_SCORE } from "../constants";
import { supabase } from "../lib/supabase";
import { clampName, formatPlayerName } from "../utils/text";
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
import { computeRanks, hasReachedTarget, sortPlayers } from "../utils/ranking";

type CreateGameInput = {
  name: string;
  targetPoints: number;
  isLowScoreWins?: boolean;
  timerEnabled?: boolean;
  timerMode?: "countdown" | "stopwatch";
  timerSeconds?: number;
  initialPlayers?: { name: string; avatarColor: string; profileId?: string }[];
};

type UpdateGameSettingsInput = {
  name: string;
  targetPoints: number;
  isLowScoreWins: boolean;
  timerEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
};

function getGameSyncSignature(games: Game[]) {
  return games
    .map((game) => `${game.id}:${game.updatedAt}`)
    .sort()
    .join("|");
}

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Unknown sync error";
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

function shouldKeepLocalGames(localGames: Game[], remoteGames: Game[]) {
  const remoteById = new Map(remoteGames.map((game) => [game.id, game]));
  return localGames.some((localGame) => {
    const remoteGame = remoteById.get(localGame.id);
    return !!remoteGame && remoteGame.updatedAt < localGame.updatedAt;
  });
}

function getPendingGuestState(
  hasRemoteAccountLoaded: boolean,
  inMemoryGames: Game[],
  inMemoryCurrentGameId: string | null,
) {
  if (hasRemoteAccountLoaded) {
    return {
      games: loadGuestGames(),
      currentGameId: loadGuestCurrentGameId(),
    };
  }

  return {
    games: inMemoryGames,
    currentGameId: inMemoryCurrentGameId,
  };
}

export function useGames(session: Session | null, authLoading = false) {
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
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const remoteSignatureRef = useRef<string | null>(null);
  const pendingGuestGamesRef = useRef<Game[]>([]);
  const pendingGuestCurrentGameIdRef = useRef<string | null>(null);

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
          const removed = previousGames.filter(
            (game) => !remoteById.has(game.id),
          );
          const changed = previousGames.filter((game) => {
            const remote = remoteById.get(game.id);
            return remote && remote.updatedAt !== game.updatedAt;
          });
          if (removed.length > 0) {
            setSyncNotice(
              removed.length === 1
                ? `"${removed[0].name}" was removed from your account.`
                : `${removed.length} games were removed from your account.`,
            );
          } else if (changed.length > 0) {
            setSyncNotice("Your games were updated.");
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
    const pendingGuestState = getPendingGuestState(
      remoteUserId !== null,
      games,
      currentGameId,
    );
    pendingGuestGamesRef.current = pendingGuestState.games;
    pendingGuestCurrentGameIdRef.current = pendingGuestState.currentGameId;
    loadRemoteGames(session.user.id)
      .then((remoteGames) => {
        if (!alive) return;
        const mergedGames = [
          ...pendingGuestGamesRef.current.filter(
            (guestGame) =>
              !remoteGames.some((remoteGame) => remoteGame.id === guestGame.id),
          ),
          ...remoteGames,
        ];
        applyRemoteGames(mergedGames, false);
        setCurrentGameId((current) => {
          const persistedCurrent = loadCurrentGameId();
          const pendingCurrent = pendingGuestCurrentGameIdRef.current;
          if (
            pendingCurrent &&
            mergedGames.some((game) => game.id === pendingCurrent)
          ) {
            return pendingCurrent;
          }
          if (
            persistedCurrent &&
            mergedGames.some((game) => game.id === persistedCurrent)
          ) {
            return persistedCurrent;
          }
          return current && mergedGames.some((game) => game.id === current)
            ? current
            : (mergedGames[0]?.id ?? null);
        });
        pendingGuestGamesRef.current = [];
        pendingGuestCurrentGameIdRef.current = null;
        setRemoteUserId(session.user.id);
        setRemoteReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load games from Supabase", error);
        setGames([]);
        setCurrentGameId(null);
        setRemoteUserId(null);
        setSyncNotice(
          `Could not load games: ${getSyncErrorMessage(error)}`,
        );
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
          if (shouldKeepLocalGames(previousGames, remoteGames)) {
            return previousGames;
          }
          const remoteSignature = getGameSyncSignature(remoteGames);
          const previousSignature = getGameSyncSignature(previousGames);
          if (remoteSignature === previousSignature) {
            remoteSignatureRef.current = remoteSignature;
            return previousGames;
          }
          const remoteById = new Map(
            remoteGames.map((game) => [game.id, game]),
          );
          const removed = previousGames.filter(
            (game) => !remoteById.has(game.id),
          );
          const changed = previousGames.filter((game) => {
            const remote = remoteById.get(game.id);
            return remote && remote.updatedAt !== game.updatedAt;
          });
          if (removed.length > 0) {
            setSyncNotice(
              removed.length === 1
                ? `"${removed[0].name}" was removed from your account.`
                : `${removed.length} games were removed from your account.`,
            );
          } else if (changed.length > 0) {
            setSyncNotice("Your games were updated.");
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
    if (!session) {
      if (!remoteReady || remoteUserId !== null) return;
      saveGuestGames(games);
      return;
    }
    if (!remoteReady || remoteUserId !== session.user.id) return;
    void saveRemoteGames(session.user.id, games)
      .then(() => {
        remoteSignatureRef.current = getGameSyncSignature(games);
      })
      .catch((error) => {
        console.error("Failed to save games to Supabase", error);
        setSyncNotice(
          `Could not save games: ${getSyncErrorMessage(error)}`,
        );
      });
  }, [games, remoteReady, remoteUserId, session]);

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
    const targetPoints = Number.isFinite(input.targetPoints)
      ? Math.trunc(input.targetPoints)
      : 0;
    if (!name) return null;
    if (targetPoints <= 0) return null;

    const now = Date.now();
    const isLowScoreWins = input.isLowScoreWins === true;
    const timerEnabled = input.timerEnabled === true;
    const timerMode =
      input.timerMode === "stopwatch" ? "stopwatch" : "countdown";
    const timerSeconds =
      typeof input.timerSeconds === "number" && input.timerSeconds > 0
        ? Math.trunc(input.timerSeconds)
        : 300;

    const players: Player[] = (input.initialPlayers ?? []).map((p) => ({
      id: uid(),
      name: formatPlayerName(p.name),
      score: 0,
      createdAt: now,
      reachedAt: now,
      avatarColor: p.avatarColor,
      profileId: p.profileId,
    }));

    if (isLowScoreWins && players.length < 2) return null;

    const game: Game = {
      id: uid(),
      name,
      targetPoints,
      isLowScoreWins,
      timerEnabled,
      timerMode,
      timerSeconds,
      players,
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
    if (original.isLowScoreWins && original.players.length < 2) return null;

    const now = Date.now();

    const duplicatedPlayers: Player[] = original.players.map((p) => ({
      ...p,
      id: uid(),
      score: 0,
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
      players: duplicatedPlayers,
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
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        const next = updater(g);
        return { ...next, updatedAt: Date.now() };
      }),
    );
  }

  function addPlayer(
    gameId: string,
    input: { name: string; avatarColor: string; profileId?: string },
  ) {
    const name = formatPlayerName(input.name);
    if (!name) return;
    const now = Date.now();
    const player: Player = {
      id: uid(),
      name,
      score: 0,
      createdAt: now,
      reachedAt: now,
      avatarColor: input.avatarColor,
      profileId: input.profileId,
    };
    updateGame(gameId, (g) => ({ ...g, players: [player, ...g.players] }));
  }

  function removePlayer(gameId: string, playerId: string) {
    updateGame(gameId, (g) => ({
      ...g,
      players: g.players.filter((p) => p.id !== playerId),
    }));
  }

  function updatePlayer(
    gameId: string,
    playerId: string,
    updates: Partial<Pick<Player, "name" | "avatarColor" | "profileId">>,
  ) {
    updateGame(gameId, (g) => ({
      ...g,
      players: g.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          ...updates,
          name: updates.name ? formatPlayerName(updates.name) : p.name,
        };
      }),
    }));
  }

  function resetScores(gameId: string) {
    const now = Date.now();
    updateGame(gameId, (g) => ({
      ...g,
      endedAt: undefined,
      players: g.players.map((p) => ({ ...p, score: 0, reachedAt: now })),
    }));
  }

  function updateScore(gameId: string, playerId: string, delta: number) {
    if (!delta) return;
    const now = Date.now();
    updateGame(gameId, (g) => {
      const players = g.players.map((p) =>
        p.id === playerId
          ? { ...p, score: clampScore(p.score + delta), reachedAt: now }
          : p,
      );
      const hasWinner = hasReachedTarget(players, g.targetPoints);
      return {
        ...g,
        players,
        endedAt: hasWinner ? (g.endedAt ?? now) : undefined,
      };
    });
  }

  function updateGameSettings(gameId: string, input: UpdateGameSettingsInput) {
    const name = clampName(input.name).toUpperCase();
    const targetPoints = Number.isFinite(input.targetPoints)
      ? Math.trunc(input.targetPoints)
      : 0;
    const timerSeconds = Number.isFinite(input.timerSeconds)
      ? Math.trunc(input.timerSeconds)
      : 0;
    if (!name || targetPoints <= 0) return false;
    if (input.timerEnabled && timerSeconds <= 0) return false;

    const now = Date.now();
    updateGame(gameId, (g) => {
      const hasWinner = hasReachedTarget(g.players, targetPoints);
      return {
        ...g,
        name,
        targetPoints,
        isLowScoreWins: input.isLowScoreWins,
        timerEnabled: input.timerEnabled,
        timerMode: input.timerMode,
        timerSeconds: timerSeconds > 0 ? timerSeconds : 300,
        endedAt: hasWinner ? (g.endedAt ?? now) : undefined,
      };
    });
    return true;
  }

  function syncProfile(
    profileId: string,
    updates: Partial<Pick<Player, "name" | "avatarColor">>,
  ) {
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        players: g.players.map((p) => {
          if (p.profileId === profileId) {
            return { ...p, ...updates };
          }
          return p;
        }),
      })),
    );
  }

  function importGames(incomingGames: Game[]) {
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
    return mergedGames.length - games.length;
  }

  const sortedPlayers = useMemo(() => {
    if (!currentGame) return [];
    return [...currentGame.players].sort((a, b) =>
      sortPlayers(a, b, currentGame.isLowScoreWins),
    );
  }, [currentGame]);

  const ranks = useMemo(() => computeRanks(sortedPlayers), [sortedPlayers]);
  const allZero = useMemo(
    () =>
      !!currentGame &&
      currentGame.players.length > 0 &&
      currentGame.players.every((p) => p.score === 0),
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
    removePlayer,
    updatePlayer,
    resetScores,
    updateScore,
    updateGameSettings,
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
