import type { Game, GameTeam, PlayerProfile, TeamMember } from "../types";
import { supabase } from "../lib/supabase";
import { DEFAULT_TEAM_ICON } from "../constants";

const GAMES_TABLE = "games";
const PROFILES_TABLE = "player_profiles";
const TEAMS_TABLE = "teams";
const TEAM_MEMBERS_TABLE = "team_members";
const GAME_SELECT_COLUMNS =
  "id,user_id,name,participant_mode,score_direction,starting_score,target_score,win_condition,win_by_two,manual_end_only,timer_enabled,timer_mode,timer_seconds,completion_mode,teams,players,score_history,created_at,updated_at,ended_at";
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
  participant_mode?: Game["participantMode"] | null;
  score_direction: Game["scoreDirection"];
  starting_score: number;
  target_score: number;
  win_condition: Game["winCondition"];
  win_by_two?: boolean | null;
  manual_end_only?: boolean | null;
  completion_mode?: Game["completionMode"] | null;
  target_points?: number;
  is_low_score_wins?: boolean;
  timer_enabled: boolean;
  timer_mode: "countdown" | "stopwatch";
  timer_seconds: number;
  teams?: Game["teams"] | null;
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

type TeamRow = {
  id: string;
  user_id: string;
  name: string;
  icon?: string | null;
  created_at: number;
  updated_at: number;
};

type TeamMemberRow = {
  team_id: string;
  profile_id: string;
  created_at: number;
};

function gameToRow(userId: string, game: Game): GameRow {
  return {
    id: game.id,
    user_id: userId,
    name: game.name,
    participant_mode: game.participantMode ?? "players",
    score_direction: game.scoreDirection,
    starting_score: game.startingScore,
    target_score: game.targetScore,
    win_condition: game.winCondition,
    win_by_two: game.winByTwo,
    manual_end_only: game.manualEndOnly,
    completion_mode: game.completionMode ?? null,
    timer_enabled: game.timerEnabled,
    timer_mode: game.timerMode,
    timer_seconds: game.timerSeconds,
    teams: game.teams,
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

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const value = error as { details?: unknown; hint?: unknown; message?: unknown };
  return [value.message, value.details, value.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
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

function sanitizeRemoteTeams(
  teams: Game["teams"] | null | undefined,
): Game["teams"] {
  return Array.isArray(teams)
    ? teams
        .filter(
          (team): team is Game["teams"][number] =>
          !!team &&
          typeof team === "object" &&
          typeof team.id === "string" &&
          typeof team.name === "string" &&
          typeof team.createdAt === "number",
        )
        .map((team) => ({
          ...team,
          sourceTeamId:
            typeof team.sourceTeamId === "string"
              ? team.sourceTeamId
              : undefined,
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
    participantMode: row.participant_mode === "teams" ? "teams" : "players",
    scoreDirection,
    startingScore,
    targetScore,
    winCondition,
    winByTwo: row.win_by_two === true,
    manualEndOnly: row.manual_end_only === true,
    completionMode:
      row.completion_mode === "winner" ||
      row.completion_mode === "no_winner" ||
      row.completion_mode === "draw"
        ? row.completion_mode
        : undefined,
    timerEnabled: row.timer_enabled,
    timerMode: row.timer_mode,
    timerSeconds: row.timer_seconds,
    teams: sanitizeRemoteTeams(row.teams),
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
  return getErrorMessage(error).includes("score_history");
}

function isMissingGameRuleColumn(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("win_by_two") ||
    message.includes("manual_end_only") ||
    message.includes("completion_mode")
  );
}

function isMissingTeamsColumn(error: unknown) {
  return getErrorMessage(error).includes("teams");
}

function isMissingParticipantModeColumn(error: unknown) {
  return getErrorMessage(error).includes("participant_mode");
}

function isMissingLegacyRequiredColumnValue(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("target_points") &&
    message.includes("not-null constraint")
  );
}

function isMissingLegacyCompatibilityColumn(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("target_points") ||
    message.includes("is_low_score_wins")
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

function teamToRow(userId: string, team: GameTeam): TeamRow {
  return {
    id: team.id,
    user_id: userId,
    name: team.name,
    icon: team.icon ?? DEFAULT_TEAM_ICON,
    created_at: team.createdAt,
    updated_at: team.updatedAt ?? team.createdAt,
  };
}

function rowToTeam(row: TeamRow): GameTeam {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? DEFAULT_TEAM_ICON,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function teamMemberToRow(member: TeamMember): TeamMemberRow {
  return {
    team_id: member.teamId,
    profile_id: member.profileId,
    created_at: member.createdAt,
  };
}

function rowToTeamMember(row: TeamMemberRow): TeamMember {
  return {
    teamId: row.team_id,
    profileId: row.profile_id,
    createdAt: row.created_at,
  };
}

function dedupeTeamMembers(members: TeamMember[]): TeamMember[] {
  const unique = new Map<string, TeamMember>();
  for (const member of members) {
    const key = `${member.teamId}:${member.profileId}`;
    const existing = unique.get(key);
    if (!existing || member.createdAt < existing.createdAt) {
      unique.set(key, member);
    }
  }
  return [...unique.values()];
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

function isMissingTeamIconColumn(error: unknown) {
  return getErrorMessage(error).includes("icon");
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
    !isMissingGameRuleColumn(result.error) &&
    !isMissingTeamsColumn(result.error) &&
    !isMissingParticipantModeColumn(result.error)
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
  const rows = games.map((game) => gameToLegacyCompatibleRow(userId, game));
  if (rows.length > 0) {
    let { error } = await supabase
      .from(GAMES_TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error && isMissingLegacyCompatibilityColumn(error)) {
      const message = getErrorMessage(error);
      const fallbackRows = rows.map((row) => {
        const { target_points, is_low_score_wins, ...modernRow } = row;
        if (message.includes("target_points") && message.includes("is_low_score_wins")) {
          return modernRow;
        }
        if (message.includes("target_points")) {
          return { ...modernRow, is_low_score_wins };
        }
        return { ...modernRow, target_points };
      });
      const retryResult = await supabase
        .from(GAMES_TABLE)
        .upsert(fallbackRows, { onConflict: "id" });
      error = retryResult.error;
    }
    if (error) {
      if (isMissingTeamsColumn(error)) {
        throw new Error(
          "Missing games.teams column in Supabase. Run the latest database migration before using team support.",
        );
      }
      if (isMissingParticipantModeColumn(error)) {
        const legacyRows = rows.map(({ participant_mode, ...row }) => row);
        const { error: legacyError } = await supabase
          .from(GAMES_TABLE)
          .upsert(legacyRows, { onConflict: "id" });
        if (legacyError) throw legacyError;
      } else if (isMissingLegacyRequiredColumnValue(error)) {
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
            ({
              score_history,
              win_by_two,
              manual_end_only,
              completion_mode,
              ...row
            }) => row,
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
            completion_mode,
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

export async function loadRemoteTeams(userId: string): Promise<GameTeam[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TEAMS_TABLE)
    .select("id,user_id,name,icon,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    if (!isMissingTeamIconColumn(error)) throw error;
    const legacyResult = await supabase
      .from(TEAMS_TABLE)
      .select("id,user_id,name,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (legacyResult.error) throw legacyResult.error;
    return (legacyResult.data ?? []).map((row) => rowToTeam(row as TeamRow));
  }
  return (data ?? []).map((row) => rowToTeam(row as TeamRow));
}

export async function saveRemoteTeams(userId: string, teams: GameTeam[]) {
  if (!supabase) return;
  const rows = teams.map((team) => teamToRow(userId, team));
  if (rows.length > 0) {
    const { error } = await supabase
      .from(TEAMS_TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error) {
      if (!isMissingTeamIconColumn(error)) throw error;
      const legacyRows = rows.map(({ icon, ...row }) => row);
      const { error: legacyError } = await supabase
        .from(TEAMS_TABLE)
        .upsert(legacyRows, { onConflict: "id" });
      if (legacyError) throw legacyError;
    }
  }

  const { data, error: loadError } = await supabase
    .from(TEAMS_TABLE)
    .select("id")
    .eq("user_id", userId);
  if (loadError) throw loadError;

  const nextIds = new Set(teams.map((team) => team.id));
  const staleIds = (data ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !nextIds.has(id));

  for (const id of staleIds) {
    const { error } = await supabase
      .from(TEAMS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  }
}

export async function loadRemoteTeamMembers(userId: string): Promise<TeamMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TEAM_MEMBERS_TABLE)
    .select("team_id,profile_id,created_at,teams!inner(user_id)")
    .eq("teams.user_id", userId);
  if (error) throw error;
  return dedupeTeamMembers(
    (data ?? []).map((row) => {
      const value = row as Record<string, unknown>;
      return rowToTeamMember({
        team_id: String(value.team_id),
        profile_id: String(value.profile_id),
        created_at:
          typeof value.created_at === "number" ? value.created_at : Date.now(),
      });
    }),
  );
}

export async function saveRemoteTeamMembers(
  userId: string,
  teamMembers: TeamMember[],
) {
  if (!supabase) return;
  const teamIdsResult = await supabase
    .from(TEAMS_TABLE)
    .select("id")
    .eq("user_id", userId);
  if (teamIdsResult.error) throw teamIdsResult.error;
  const validTeamIds = new Set(
    (teamIdsResult.data ?? []).map((row) => (row as { id: string }).id),
  );
  if (validTeamIds.size === 0) return;

  const scopedMembers = dedupeTeamMembers(
    teamMembers.filter((member) => validTeamIds.has(member.teamId)),
  );
  const rows = scopedMembers.map((member) => teamMemberToRow(member));

  const { error: deleteError } = await supabase
    .from(TEAM_MEMBERS_TABLE)
    .delete()
    .in("team_id", Array.from(validTeamIds));
  if (deleteError) throw deleteError;

  if (rows.length > 0) {
    const { error } = await supabase
      .from(TEAM_MEMBERS_TABLE)
      .insert(rows);
    if (error) throw error;
  }
}
