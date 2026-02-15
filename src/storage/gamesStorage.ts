import type { Game } from "../types";
import {
  CURRENT_GAME_ID_KEY,
  GAMES_STORAGE_KEY,
  STORAGE_KEY,
} from "../constants";
import { uid } from "../utils/id";
import { loadPlayers } from "./playersStorage";

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
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
        const accentColor =
          typeof obj.accentColor === "string" ? obj.accentColor : "#94a3b8";
        const isLowScoreWins = obj.isLowScoreWins === true;
        const timerEnabled = obj.timerEnabled === true;
        const timerMode =
          obj.timerMode === "stopwatch" ? "stopwatch" : "countdown";
        const timerSeconds =
          typeof obj.timerSeconds === "number" && obj.timerSeconds > 0
            ? Math.trunc(obj.timerSeconds)
            : 300;
        // trust player validation from existing player loader (migration-safe)
        return {
          id: obj.id,
          name: obj.name,
          targetPoints: obj.targetPoints,
          isLowScoreWins,
          timerEnabled,
          timerMode,
          timerSeconds,
          accentColor,
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
          endedAt: typeof obj.endedAt === "number" ? obj.endedAt : undefined,
          players: obj.players as Game["players"],
        } satisfies Game;
      })
      .filter(Boolean) as Game[];
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]) {
  localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
}

export function loadCurrentGameId(): string | null {
  return localStorage.getItem(CURRENT_GAME_ID_KEY);
}

export function saveCurrentGameId(gameId: string | null) {
  if (!gameId) localStorage.removeItem(CURRENT_GAME_ID_KEY);
  else localStorage.setItem(CURRENT_GAME_ID_KEY, gameId);
}

export function migrateSingleGameToGamesIfNeeded(): {
  games: Game[];
  currentGameId: string | null;
} | null {
  const existingGamesRaw = localStorage.getItem(GAMES_STORAGE_KEY);
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
    accentColor: "#94a3b8",
    players: legacyPlayers,
    createdAt: now,
    updatedAt: now,
  };

  saveGames([migrated]);
  saveCurrentGameId(gameId);
  return { games: [migrated], currentGameId: gameId };
}
