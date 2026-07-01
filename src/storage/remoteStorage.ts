import type { Game, PlayerProfile } from "../types";
import { supabase } from "../lib/supabase";

const GAMES_TABLE = "games";
const PROFILES_TABLE = "player_profiles";
const GAME_SELECT_COLUMNS =
  "id,user_id,name,score_direction,starting_score,target_score,win_condition,win_by_two,manual_end_only,timer_enabled,timer_mode,timer_seconds,players,score_history,created_at,updated_at,ended_at";
const LEGACY_GAME_SELECT_COLUMNS =
  "id,user_id,name,score_direction,starting_score,target_score,win_condition,timer_enabled,timer_mode,timer_seconds,players,created_at,updated_at,ended_at";
const PROFILE_SELECT_COLUMNS =
  "id,user_id,name,avatar_color,is_account_player,created_at,updated_at";
const LEGACY_PROFILE_SELECT_COLUMNS =
  "id,user_id,name,avatar_color,created_at,updated_at";

type GameRow = {
  id: string;
  user_id: string;
  name: string;
  score_direction: Game["scoreDirection"];
  starting_score: number;
  target_score: number;
  win_condition: Game["winCondition"];
  win_by_two?: boolean | null;
  manual_end_only?: boolean | null;
  target_points?: number;
  is_low_score_wins?: boolean;
  timer_enabled: boolean;
  timer_mode: "countdown" | "stopwatch";
  timer_seconds: number;
  players: Game["players"];
  score_history?: Game["scoreHistory"] | null;
  created_at: number;
  updated_at: number;
  ended_at: number | null;
};

type LegacyCompatibleGameRow = GameRow & {
  target_points: number;
  is_low_score_wins: boolean;
};

type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  is_account_player?: boolean | null;
  created_at: number;
  updated_at: number;
};

function gameToRow(userId: string, game: Game): GameRow {
  return {
    id: game.id,
    user_id: userId,
    name: game.name,
    score_direction: game.scoreDirection,
    starting_score: game.startingScore,
    target_score: game.targetScore,
    win_condition: game.winCondition,
    win_by_two: game.winByTwo,
    manual_end_only: game.manualEndOnly,
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

function gameToLegacyCompatibleRow(
  userId: string,
  game: Game,
): LegacyCompatibleGameRow {
  return {
    ...gameToRow(userId, game),
    target_points:
      game.winCondition === "reach_zero" ? game.startingScore : game.targetScore,
    is_low_score_wins:
      game.winCondition === "lowest" || game.winCondition === "reach_zero",
  };
}

function sanitizeRemotePlayers(
  players: Game["players"],
  startingScore: number,
): Game["players"] {
  return Array.isArray(players)
    ? players.map((player) => ({
        ...player,
        score:
          typeof player.score === "number" && Number.isFinite(player.score)
            ? player.score
            : startingScore,
      }))
    : [];
}

function rowToGame(row: GameRow): Game {
  const scoreDirection = row.score_direction === "down" ? "down" : "up";
  const startingScore =
    typeof row.starting_score === "number" ? row.starting_score : 0;
  const targetScore =
    typeof row.target_score === "number" ? row.target_score : 100;
  const winCondition =
    row.win_condition === "reach_zero" || row.win_condition === "lowest"
      ? row.win_condition
      : "reach_target";

  return {
    id: row.id,
    name: row.name,
    scoreDirection,
    startingScore,
    targetScore,
    winCondition,
    winByTwo: row.win_by_two === true,
    manualEndOnly: row.manual_end_only === true,
    timerEnabled: row.timer_enabled,
    timerMode: row.timer_mode,
    timerSeconds: row.timer_seconds,
    players: sanitizeRemotePlayers(row.players, startingScore),
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

function isMissingGameRuleColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  return (
    value.code === "42703" ||
    (typeof value.message === "string" &&
      (value.message.toLowerCase().includes("win_by_two") ||
        value.message.toLowerCase().includes("manual_end_only")))
  );
}

function isMissingLegacyRequiredColumnValue(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { message?: unknown };
  return (
    typeof value.message === "string" &&
    value.message.includes("target_points") &&
    value.message.includes("not-null constraint")
  );
}

function profileToRow(userId: string, profile: PlayerProfile): ProfileRow {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    avatar_color: profile.avatarColor,
    is_account_player: profile.isAccountPlayer === true,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function rowToProfile(row: ProfileRow): PlayerProfile {
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color,
    isAccountPlayer: row.is_account_player === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingAccountPlayerColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  return (
    value.code === "42703" ||
    (typeof value.message === "string" &&
      value.message.toLowerCase().includes("is_account_player"))
  );
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
  if (
    !isMissingScoreHistoryColumn(result.error) &&
    !isMissingGameRuleColumn(result.error)
  ) {
    throw result.error;
  }

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
      if (isMissingLegacyRequiredColumnValue(error)) {
        const legacyRows = games.map((game) =>
          gameToLegacyCompatibleRow(userId, game),
        );
        const { error: legacyConstraintError } = await supabase
          .from(GAMES_TABLE)
          .upsert(legacyRows, { onConflict: "id" });
        if (legacyConstraintError) {
          if (
            !isMissingScoreHistoryColumn(legacyConstraintError) &&
            !isMissingGameRuleColumn(legacyConstraintError)
          ) {
            throw legacyConstraintError;
          }
          const legacyFallbackRows = legacyRows.map(
            ({ score_history, win_by_two, manual_end_only, ...row }) => row,
          );
          const { error: legacyFallbackError } = await supabase
            .from(GAMES_TABLE)
            .upsert(legacyFallbackRows, { onConflict: "id" });
          if (legacyFallbackError) throw legacyFallbackError;
        }
      } else if (
        !isMissingScoreHistoryColumn(error) &&
        !isMissingGameRuleColumn(error)
      ) throw error;
      else {
        const legacyRows = games.map((game) => {
          const {
            score_history,
            win_by_two,
            manual_end_only,
            ...row
          } = gameToLegacyCompatibleRow(userId, game);
          return row;
        });
        const { error: legacyError } = await supabase
          .from(GAMES_TABLE)
          .upsert(legacyRows, { onConflict: "id" });
        if (legacyError) throw legacyError;
      }
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
  const result = await supabase
    .from(PROFILES_TABLE)
    .select(PROFILE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (!result.error) {
    return (result.data ?? []).map((row) => rowToProfile(row as ProfileRow));
  }
  if (!isMissingAccountPlayerColumn(result.error)) throw result.error;

  const legacyResult = await supabase
    .from(PROFILES_TABLE)
    .select(LEGACY_PROFILE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (legacyResult.error) throw legacyResult.error;
  return (legacyResult.data ?? []).map((row) =>
    rowToProfile(row as ProfileRow),
  );
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
    if (error) {
      if (!isMissingAccountPlayerColumn(error)) throw error;
      const legacyRows = rows.map(({ is_account_player, ...row }) => row);
      const { error: legacyError } = await supabase
        .from(PROFILES_TABLE)
        .upsert(legacyRows, { onConflict: "id" });
      if (legacyError) throw legacyError;
    }
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
