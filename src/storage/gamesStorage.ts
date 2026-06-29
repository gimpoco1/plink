import type { Game } from "../types";
import {
  CURRENT_GAME_ID_KEY,
  GAMES_STORAGE_KEY,
  GUEST_CURRENT_GAME_ID_KEY,
  GUEST_GAMES_STORAGE_KEY,
  STORAGE_KEY,
} from "../constants";
import { uid } from "../utils/id";
import { loadPlayers } from "./playersStorage";

function sanitizeScoreHistory(input: unknown): Game["scoreHistory"] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      if (
        typeof obj.id !== "string" ||
        typeof obj.playerId !== "string" ||
        typeof obj.playerName !== "string" ||
        typeof obj.avatarColor !== "string" ||
        typeof obj.delta !== "number" ||
        typeof obj.scoreBefore !== "number" ||
        typeof obj.scoreAfter !== "number" ||
        typeof obj.createdAt !== "number"
      ) {
        return null;
      }
      return {
        id: obj.id,
        playerId: obj.playerId,
        playerName: obj.playerName,
        avatarColor: obj.avatarColor,
        delta: obj.delta,
        scoreBefore: obj.scoreBefore,
        scoreAfter: obj.scoreAfter,
        createdAt: obj.createdAt,
      } satisfies Game["scoreHistory"][number];
    })
    .filter(Boolean) as Game["scoreHistory"];
}

export function sanitizeGames(input: unknown): Game[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((g) => {
      if (!g || typeof g !== "object") return null;
      const obj = g as Record<string, unknown>;
      if (
        typeof obj.id !== "string" ||
        typeof obj.name !== "string" ||
        typeof obj.targetPoints !== "number" ||
        typeof obj.createdAt !== "number" ||
        typeof obj.updatedAt !== "number" ||
        !Array.isArray(obj.players)
      ) {
        return null;
      }
      const isLowScoreWins = obj.isLowScoreWins === true;
      const timerEnabled = obj.timerEnabled === true;
      const timerMode =
        obj.timerMode === "stopwatch" ? "stopwatch" : "countdown";
      const timerSeconds =
        typeof obj.timerSeconds === "number" && obj.timerSeconds > 0
          ? Math.trunc(obj.timerSeconds)
          : 300;
      return {
        id: obj.id,
        name: obj.name,
        targetPoints: obj.targetPoints,
        isLowScoreWins,
        timerEnabled,
        timerMode,
        timerSeconds,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        endedAt: typeof obj.endedAt === "number" ? obj.endedAt : undefined,
        players: obj.players as Game["players"],
        scoreHistory: sanitizeScoreHistory(obj.scoreHistory),
      } satisfies Game;
    })
    .filter(Boolean) as Game[];
}

export function loadGames(storageKey = GAMES_STORAGE_KEY): Game[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeGames(parsed);
  } catch {
    return [];
  }
}

export function saveGames(games: Game[], storageKey = GAMES_STORAGE_KEY) {
  localStorage.setItem(storageKey, JSON.stringify(games));
}

export function loadCurrentGameId(storageKey = CURRENT_GAME_ID_KEY): string | null {
  return localStorage.getItem(storageKey);
}

export function saveCurrentGameId(gameId: string | null, storageKey = CURRENT_GAME_ID_KEY) {
  if (!gameId) localStorage.removeItem(storageKey);
  else localStorage.setItem(storageKey, gameId);
}

export function loadGuestGames(): Game[] {
  return loadGames(GUEST_GAMES_STORAGE_KEY);
}

export function saveGuestGames(games: Game[]) {
  saveGames(games, GUEST_GAMES_STORAGE_KEY);
}

export function loadGuestCurrentGameId(): string | null {
  return loadCurrentGameId(GUEST_CURRENT_GAME_ID_KEY);
}

export function saveGuestCurrentGameId(gameId: string | null) {
  saveCurrentGameId(gameId, GUEST_CURRENT_GAME_ID_KEY);
}

export function migrateSingleGameToGamesIfNeeded(): {
  games: Game[];
  currentGameId: string | null;
} | null {
  const existingGamesRaw = localStorage.getItem(GUEST_GAMES_STORAGE_KEY);
  if (existingGamesRaw) return null;

  const legacyPlayersRaw = localStorage.getItem(STORAGE_KEY);
  if (!legacyPlayersRaw) return null;

  const legacyPlayers = loadPlayers();
  if (!legacyPlayers.length) return null;

  const now = Date.now();
  const gameId = uid();
  const migrated: Game = {
    id: gameId,
    name: "Game",
    targetPoints: 100,
    isLowScoreWins: false,
    timerEnabled: false,
    timerMode: "countdown",
    timerSeconds: 300,
    players: legacyPlayers,
    scoreHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  saveGuestGames([migrated]);
  saveGuestCurrentGameId(gameId);
  return { games: [migrated], currentGameId: gameId };
}
