import { useEffect, useMemo, useState } from "react";
import type { Game, Player } from "../types";
import { clampName, formatPlayerName } from "../utils/text";
import { uid } from "../utils/id";
import {
  loadGames,
  loadCurrentGameId,
  migrateSingleGameToGamesIfNeeded,
  saveGames,
  saveCurrentGameId,
} from "../storage/gamesStorage";
import { computeRanks, hasReachedTarget, sortPlayers } from "../utils/ranking";
import { GAME_ACCENT_COLORS } from "../constants";

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

export function useGames() {
  const migrated = useMemo(() => migrateSingleGameToGamesIfNeeded(), []);
  const [games, setGames] = useState<Game[]>(
    () => migrated?.games ?? loadGames(),
  );
  const [currentGameId, setCurrentGameId] = useState<string | null>(
    () => migrated?.currentGameId ?? loadCurrentGameId(),
  );

  function pickUniqueAccent(used: Set<string>): string {
    const available = GAME_ACCENT_COLORS.filter((c) => !used.has(c));
    if (available.length) {
      return (
        available[Math.floor(Math.random() * available.length)] ?? "#94a3b8"
      );
    }

    // Fallback: generate a mostly-unique color (still stored) if palette is exhausted.
    for (let i = 0; i < 24; i++) {
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue} 65% 70%)`;
      if (!used.has(color)) return color;
    }
    return `hsl(${Math.floor(Math.random() * 360)} 65% 70%)`;
  }

  useEffect(() => {
    // Ensure each game has its own accent color (fix older duplicates/missing values).
    const used = new Set<string>();
    let changed = false;
    const next = games
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((g) => {
        const color = g.accentColor?.trim();
        if (!color || used.has(color)) {
          const accentColor = pickUniqueAccent(used);
          used.add(accentColor);
          changed = true;
          return { ...g, accentColor };
        }
        used.add(color);
        return g;
      });

    if (changed) {
      // Preserve original ordering by updatedAt in state; we only changed accentColor values.
      const byId = new Map(next.map((g) => [g.id, g] as const));
      setGames((prev) => prev.map((g) => byId.get(g.id) ?? g));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveGames(games);
  }, [games]);

  useEffect(() => {
    saveCurrentGameId(currentGameId);
  }, [currentGameId]);

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
    const used = new Set(games.map((g) => g.accentColor).filter(Boolean));
    const accentColor = pickUniqueAccent(used);
    const isLowScoreWins = input.isLowScoreWins === true;
    const timerEnabled = input.timerEnabled === true;
    const timerMode = input.timerMode === "stopwatch" ? "stopwatch" : "countdown";
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

    const game: Game = {
      id: uid(),
      name,
      targetPoints,
      isLowScoreWins,
      timerEnabled,
      timerMode,
      timerSeconds,
      accentColor,
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

    const now = Date.now();
    const used = new Set(games.map((g) => g.accentColor).filter(Boolean));
    const accentColor = pickUniqueAccent(used);

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
      accentColor,
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
          ? { ...p, score: p.score + delta, reachedAt: now }
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
    resetScores,
    updateScore,
    updateGameSettings,
    syncProfile,
    sortedPlayers,
    ranks,
    allZero,
    updateGame,
  };
}
