import type { Game, PlayerProfile } from "../types";
import { supabase } from "../lib/supabase";

const GAMES_TABLE = "games";
const PROFILES_TABLE = "player_profiles";
const GAME_SELECT_COLUMNS =
  "id,user_id,name,target_points,is_low_score_wins,timer_enabled,timer_mode,timer_seconds,players,score_history,created_at,updated_at,ended_at";
const LEGACY_GAME_SELECT_COLUMNS =
  "id,user_id,name,target_points,is_low_score_wins,timer_enabled,timer_mode,timer_seconds,players,created_at,updated_at,ended_at";

type GameRow = {
  id: string;
  user_id: string;
  name: string;
  target_points: number;
  is_low_score_wins: boolean;
  timer_enabled: boolean;
  timer_mode: "countdown" | "stopwatch";
  timer_seconds: number;
  players: Game["players"];
  score_history?: Game["scoreHistory"] | null;
  created_at: number;
  updated_at: number;
  ended_at: number | null;
};

type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  created_at: number;
  updated_at: number;
};

function gameToRow(userId: string, game: Game): GameRow {
  return {
    id: game.id,
    user_id: userId,
    name: game.name,
    target_points: game.targetPoints,
    is_low_score_wins: game.isLowScoreWins,
    timer_enabled: game.timerEnabled,
    timer_mode: game.timerMode,
    timer_seconds: game.timerSeconds,
    players: game.players,
    score_history: game.scoreHistory,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
    ended_at: game.endedAt ?? null,
  };
}

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    targetPoints: row.target_points,
    isLowScoreWins: row.is_low_score_wins,
    timerEnabled: row.timer_enabled,
    timerMode: row.timer_mode,
    timerSeconds: row.timer_seconds,
    players: Array.isArray(row.players) ? (row.players as Game["players"]) : [],
    scoreHistory: Array.isArray(row.score_history)
      ? (row.score_history as Game["scoreHistory"])
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at ?? undefined,
  };
}

function isMissingScoreHistoryColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  return (
    value.code === "42703" ||
    (typeof value.message === "string" &&
      value.message.toLowerCase().includes("score_history"))
  );
}

function profileToRow(userId: string, profile: PlayerProfile): ProfileRow {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    avatar_color: profile.avatarColor,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function rowToProfile(row: ProfileRow): PlayerProfile {
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadRemoteGames(userId: string): Promise<Game[]> {
  if (!supabase) return [];
  const result = await supabase
    .from(GAMES_TABLE)
    .select(GAME_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (!result.error) {
    return (result.data ?? []).map((row) => rowToGame(row as GameRow));
  }
  if (!isMissingScoreHistoryColumn(result.error)) throw result.error;

  const legacyResult = await supabase
    .from(GAMES_TABLE)
    .select(LEGACY_GAME_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (legacyResult.error) throw legacyResult.error;
  return (legacyResult.data ?? []).map((row) => rowToGame(row as GameRow));
}

export async function saveRemoteGames(userId: string, games: Game[]) {
  if (!supabase) return;
  const rows = games.map((game) => gameToRow(userId, game));
  if (rows.length > 0) {
    const { error } = await supabase
      .from(GAMES_TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error) {
      if (!isMissingScoreHistoryColumn(error)) throw error;
      const legacyRows = rows.map(({ score_history, ...row }) => row);
      const { error: legacyError } = await supabase
        .from(GAMES_TABLE)
        .upsert(legacyRows, { onConflict: "id" });
      if (legacyError) throw legacyError;
    }
  }

  const { data, error: loadError } = await supabase
    .from(GAMES_TABLE)
    .select("id")
    .eq("user_id", userId);
  if (loadError) throw loadError;

  const nextIds = new Set(games.map((game) => game.id));
  const staleIds = (data ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !nextIds.has(id));

  for (const id of staleIds) {
    const { error } = await supabase
      .from(GAMES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  }
}

export async function loadRemoteProfiles(
  userId: string,
): Promise<PlayerProfile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id,user_id,name,avatar_color,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToProfile(row as ProfileRow));
}

export async function saveRemoteProfiles(
  userId: string,
  profiles: PlayerProfile[],
) {
  if (!supabase) return;
  const rows = profiles.map((profile) => profileToRow(userId, profile));
  if (rows.length > 0) {
    const { error } = await supabase
      .from(PROFILES_TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  const { data, error: loadError } = await supabase
    .from(PROFILES_TABLE)
    .select("id")
    .eq("user_id", userId);
  if (loadError) throw loadError;

  const nextIds = new Set(profiles.map((profile) => profile.id));
  const staleIds = (data ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !nextIds.has(id));

  for (const id of staleIds) {
    const { error } = await supabase
      .from(PROFILES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  }
}
