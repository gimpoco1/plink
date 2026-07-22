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
        updatedByPlayerId:
          typeof obj.updatedByPlayerId === "string"
            ? obj.updatedByPlayerId
            : undefined,
        updatedByPlayerName:
          typeof obj.updatedByPlayerName === "string"
            ? obj.updatedByPlayerName
            : undefined,
        updatedByAvatarColor:
          typeof obj.updatedByAvatarColor === "string"
            ? obj.updatedByAvatarColor
            : undefined,
        delta: obj.delta,
        scoreBefore: obj.scoreBefore,
        scoreAfter: obj.scoreAfter,
        createdAt: obj.createdAt,
      } satisfies Game["scoreHistory"][number];
    })
    .filter(Boolean) as Game["scoreHistory"];
}

function sanitizePlayers(
  input: unknown,
  startingScore: number,
): Game["players"] {
  if (!Array.isArray(input)) return [];
  return input
    .map((player) => {
      if (!player || typeof player !== "object") return null;
      const obj = player as Record<string, unknown>;
      if (
        typeof obj.id !== "string" ||
        typeof obj.name !== "string" ||
        typeof obj.createdAt !== "number" ||
        typeof obj.reachedAt !== "number" ||
        typeof obj.avatarColor !== "string"
      ) {
        return null;
      }
      return {
        id: obj.id,
        name: obj.name,
        score: typeof obj.score === "number" ? obj.score : startingScore,
        createdAt: obj.createdAt,
        reachedAt: obj.reachedAt,
        avatarColor: obj.avatarColor,
        profileId:
          typeof obj.profileId === "string" ? obj.profileId : undefined,
        teamId: typeof obj.teamId === "string" ? obj.teamId : undefined,
        joinedViaInvite: obj.joinedViaInvite === true ? true : undefined,
        isGameOwner: obj.isGameOwner === true ? true : undefined,
      };
    })
    .filter(Boolean) as Game["players"];
}

function sanitizeTeams(input: unknown): Game["teams"] {
  if (!Array.isArray(input)) return [];
  return input
    .map((team) => {
      if (!team || typeof team !== "object") return null;
      const obj = team as Record<string, unknown>;
      if (
        typeof obj.id !== "string" ||
        typeof obj.name !== "string" ||
        typeof obj.createdAt !== "number"
      ) {
        return null;
      }
      return {
        id: obj.id,
        name: obj.name,
        icon: typeof obj.icon === "string" ? obj.icon : undefined,
        sourceTeamId:
          typeof obj.sourceTeamId === "string" ? obj.sourceTeamId : undefined,
        createdAt: obj.createdAt,
        updatedAt:
          typeof obj.updatedAt === "number" ? obj.updatedAt : obj.createdAt,
      } satisfies Game["teams"][number];
    })
    .filter(Boolean) as Game["teams"];
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
        (obj.scoreDirection !== "up" && obj.scoreDirection !== "down") ||
        typeof obj.startingScore !== "number" ||
        typeof obj.targetScore !== "number" ||
        (obj.winCondition !== "reach_target" &&
          obj.winCondition !== "reach_zero" &&
          obj.winCondition !== "lowest") ||
        typeof obj.createdAt !== "number" ||
        typeof obj.updatedAt !== "number" ||
        !Array.isArray(obj.players)
      ) {
        return null;
      }
      const timerEnabled = obj.timerEnabled === true;
      const timerMode =
        obj.timerMode === "stopwatch" ? "stopwatch" : "countdown";
      const timerSeconds =
        typeof obj.timerSeconds === "number" && obj.timerSeconds > 0
          ? Math.trunc(obj.timerSeconds)
          : 300;
      const startingScore = obj.startingScore;
      return {
        id: obj.id,
        collaboratorsCanManage: obj.collaboratorsCanManage === true,
        name: obj.name,
        participantMode: obj.participantMode === "teams" ? "teams" : "players",
        scoreDirection: obj.scoreDirection,
        startingScore,
        targetScore: obj.targetScore,
        winCondition: obj.winCondition,
        winByTwo: obj.winByTwo === true,
        manualEndOnly: obj.manualEndOnly === true,
        timerEnabled,
        diceEnabled: obj.diceEnabled === true,
        timerMode,
        timerSeconds,
        teams: sanitizeTeams(obj.teams),
        completionMode:
          obj.completionMode === "winner" ||
          obj.completionMode === "no_winner" ||
          obj.completionMode === "draw"
            ? obj.completionMode
            : undefined,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        endedAt: typeof obj.endedAt === "number" ? obj.endedAt : undefined,
        players: sanitizePlayers(obj.players, startingScore),
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

export function loadCurrentGameId(
  storageKey = CURRENT_GAME_ID_KEY,
): string | null {
  return localStorage.getItem(storageKey);
}

export function saveCurrentGameId(
  gameId: string | null,
  storageKey = CURRENT_GAME_ID_KEY,
) {
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
    collaboratorsCanManage: false,
    name: "Game",
    participantMode: "players",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 100,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    diceEnabled: false,
    timerMode: "countdown",
    timerSeconds: 300,
    teams: [],
    players: legacyPlayers,
    scoreHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  saveGuestGames([migrated]);
  saveGuestCurrentGameId(gameId);
  return { games: [migrated], currentGameId: gameId };
}
