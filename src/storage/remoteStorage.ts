import type {
  Game,
  GameTeam,
  PastLinkedPlayer,
  PlayerProfile,
  TeamMember,
} from "../types";
import { supabase } from "../lib/supabase";
import { DEFAULT_TEAM_ICON } from "../constants";
import { sanitizeQuickScoreValues } from "../utils/scoring";

const GAMES_TABLE = "games";
const GAME_COLLABORATORS_TABLE = "game_collaborators";
const PROFILES_TABLE = "player_profiles";
const TEAMS_TABLE = "teams";
const TEAM_MEMBERS_TABLE = "team_members";
export const GAME_REMOVAL_NOTIFICATIONS_TABLE =
  "game_removal_notifications";
export const GAME_JOIN_NOTIFICATIONS_TABLE = "game_join_notifications";
const GAME_SELECT_COLUMNS =
  "id,user_id,is_shared,collaborators_can_manage,name,participant_mode,score_direction,starting_score,target_score,win_condition,win_by_two,manual_end_only,timer_enabled,dice_enabled,quick_score_value_1,quick_score_value_2,timer_mode,timer_seconds,completion_mode,teams,players,score_history,created_at,updated_at,ended_at";
const LEGACY_GAME_SELECT_COLUMNS =
  "id,user_id,name,score_direction,starting_score,target_score,win_condition,timer_enabled,timer_mode,timer_seconds,players,created_at,updated_at,ended_at";
const PROFILE_SELECT_COLUMNS =
  "id,user_id,name,avatar_color,is_account_player,created_at,updated_at";
const LEGACY_PROFILE_SELECT_COLUMNS =
  "id,user_id,name,avatar_color,created_at,updated_at";

type GameRow = {
  id: string;
  user_id: string;
  is_shared?: boolean | null;
  collaborators_can_manage?: boolean | null;
  name: string;
  participant_mode?: Game["participantMode"] | null;
  score_direction: Game["scoreDirection"];
  starting_score: number;
  target_score: number;
  win_condition: Game["winCondition"];
  win_by_two?: boolean | null;
  manual_end_only?: boolean | null;
  dice_enabled?: boolean | null;
  quick_score_value_1?: number | null;
  quick_score_value_2?: number | null;
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

type PastLinkedPlayerRow = {
  collaborator_user_id: string;
  profile_id: string;
  player_name: string;
  avatar_color: string;
  last_linked_at: number;
};

export type GameRemovalNotification = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  createdAt: number;
};

export type GameJoinNotification = {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  playerName: string;
  createdAt: number;
};

export function parseRemoteGameJoinNotification(
  input: unknown,
): GameJoinNotification | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.game_id !== "string" ||
    typeof row.game_name !== "string" ||
    typeof row.player_name !== "string" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    gameName: row.game_name,
    playerName: row.player_name,
    createdAt: row.created_at,
  };
}

export function parseRemoteGameRemovalNotification(
  input: unknown,
): GameRemovalNotification | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.game_id !== "string" ||
    typeof row.game_name !== "string" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    gameName: row.game_name,
    createdAt: row.created_at,
  };
}

function gameToRow(userId: string, game: Game): GameRow {
  return {
    id: game.id,
    user_id: game.ownerId ?? userId,
    collaborators_can_manage: game.collaboratorsCanManage,
    name: game.name,
    participant_mode: game.participantMode ?? "players",
    score_direction: game.scoreDirection,
    starting_score: game.startingScore,
    target_score: game.targetScore,
    win_condition: game.winCondition,
    win_by_two: game.winByTwo,
    manual_end_only: game.manualEndOnly,
    dice_enabled: game.diceEnabled,
    quick_score_value_1: game.quickScoreValues[0],
    quick_score_value_2: game.quickScoreValues[1],
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
      game.winCondition === "reach_zero"
        ? game.startingScore
        : game.targetScore,
    is_low_score_wins:
      game.winCondition === "lowest" || game.winCondition === "reach_zero",
  };
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const value = error as {
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };
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

function rowToGame(row: GameRow, currentUserId?: string): Game {
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
    ownerId: row.user_id,
    accessRole:
      currentUserId && row.user_id !== currentUserId ? "collaborator" : "owner",
    isShared: row.is_shared === true,
    collaboratorsCanManage: row.collaborators_can_manage === true,
    name: row.name,
    participantMode: row.participant_mode === "teams" ? "teams" : "players",
    scoreDirection,
    startingScore,
    targetScore,
    winCondition,
    winByTwo: row.win_by_two === true,
    manualEndOnly: row.manual_end_only === true,
    diceEnabled: row.dice_enabled === true,
    quickScoreValues: sanitizeQuickScoreValues([
      row.quick_score_value_1,
      row.quick_score_value_2,
    ]),
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

export function parseRemoteGameChange(
  input: unknown,
  currentUserId: string,
): Game | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    !Array.isArray(row.players) ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }
  return rowToGame(input as GameRow, currentUserId);
}

function isMissingScoreHistoryColumn(error: unknown) {
  return getErrorMessage(error).includes("score_history");
}

function isMissingGameRuleColumn(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("win_by_two") ||
    message.includes("manual_end_only") ||
    message.includes("dice_enabled") ||
    message.includes("completion_mode") ||
    message.includes("collaborators_can_manage")
  );
}

function isMissingDiceEnabledColumn(error: unknown) {
  return getErrorMessage(error).includes("dice_enabled");
}

function isMissingQuickScoreColumn(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("quick_score_value_1") ||
    message.includes("quick_score_value_2")
  );
}

function isMissingSharedGameColumn(error: unknown) {
  return getErrorMessage(error).includes("is_shared");
}

function isMissingCollaboratorManagementColumn(error: unknown) {
  return getErrorMessage(error).includes("collaborators_can_manage");
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
    message.includes("target_points") && message.includes("not-null constraint")
  );
}

function isMissingLegacyCompatibilityColumn(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("target_points") || message.includes("is_low_score_wins")
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

async function attachCollaborationMetadata(
  userId: string,
  games: Game[],
) {
  if (!supabase || !games.some((game) => game.isShared)) {
    return games;
  }

  const { data, error } = await supabase
    .from(GAME_COLLABORATORS_TABLE)
    .select("game_id,user_id,player_id");
  if (error) return games;

  const collaboratorGameIds = new Set(
    (data ?? []).map((row) => row.game_id as string),
  );
  const playerIdByGameId = new Map<string, string>();
  const invitedUserIdsByGameId = new Map<string, Record<string, string>>();
  (data ?? []).forEach((row) => {
    const gameId = row.game_id as string;
    const playerId = row.player_id as string;
    const collaboratorUserId = row.user_id as string;
    invitedUserIdsByGameId.set(gameId, {
      ...invitedUserIdsByGameId.get(gameId),
      [playerId]: collaboratorUserId,
    });
    if (row.user_id === userId) {
      playerIdByGameId.set(gameId, playerId);
    }
  });
  return games.map((game) => {
    const linkedPlayerId = playerIdByGameId.get(game.id);
    return {
      ...game,
      linkedPlayerIdForCurrentUser: linkedPlayerId,
      hasCollaborators: collaboratorGameIds.has(game.id),
      invitedUserIdsByPlayerId: invitedUserIdsByGameId.get(game.id),
    };
  });
}

export async function loadRemoteGames(userId: string): Promise<Game[]> {
  if (!supabase) return [];
  const omittedColumns = new Set<string>();
  let ownerOnly = false;
  let modernError: unknown = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const columns = GAME_SELECT_COLUMNS.split(",")
      .filter((column) => !omittedColumns.has(column))
      .join(",");
    const query = supabase.from(GAMES_TABLE).select(columns);
    const result = ownerOnly
      ? await query
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
      : await query.order("updated_at", { ascending: false });

    if (!result.error) {
      return attachCollaborationMetadata(
        userId,
        (result.data ?? []).map((row) =>
          rowToGame(row as unknown as GameRow, userId),
        ),
      );
    }

    modernError = result.error;
    if (isMissingQuickScoreColumn(modernError)) {
      omittedColumns.add("quick_score_value_1");
      omittedColumns.add("quick_score_value_2");
      continue;
    }
    if (isMissingCollaboratorManagementColumn(modernError)) {
      omittedColumns.add("collaborators_can_manage");
      continue;
    }
    if (isMissingSharedGameColumn(modernError)) {
      omittedColumns.add("is_shared");
      omittedColumns.add("collaborators_can_manage");
      ownerOnly = true;
      continue;
    }
    if (isMissingDiceEnabledColumn(modernError)) {
      omittedColumns.add("dice_enabled");
      continue;
    }
    break;
  }

  if (
    !isMissingScoreHistoryColumn(modernError) &&
    !isMissingGameRuleColumn(modernError) &&
    !isMissingTeamsColumn(modernError) &&
    !isMissingParticipantModeColumn(modernError)
  ) {
    throw modernError;
  }

  const legacyResult = await supabase
    .from(GAMES_TABLE)
    .select(LEGACY_GAME_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (legacyResult.error) throw legacyResult.error;
  return attachCollaborationMetadata(
    userId,
    (legacyResult.data ?? []).map((row) => rowToGame(row as GameRow, userId)),
  );
}

export async function loadRemoteGameRemovalNotifications(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(GAME_REMOVAL_NOTIFICATIONS_TABLE)
    .select("id,user_id,game_id,game_name,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map(parseRemoteGameRemovalNotification)
    .filter(
      (notification): notification is GameRemovalNotification =>
        notification !== null,
    );
}

export async function dismissRemoteGameRemovalNotification(
  userId: string,
  notificationId: string,
) {
  if (!supabase) return;
  const { error } = await supabase
    .from(GAME_REMOVAL_NOTIFICATIONS_TABLE)
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function loadRemoteGameJoinNotifications(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(GAME_JOIN_NOTIFICATIONS_TABLE)
    .select("id,user_id,game_id,game_name,player_name,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map(parseRemoteGameJoinNotification)
    .filter(
      (notification): notification is GameJoinNotification =>
        notification !== null,
    );
}

export async function dismissRemoteGameJoinNotification(
  userId: string,
  notificationId: string,
) {
  if (!supabase) return;
  const { error } = await supabase
    .from(GAME_JOIN_NOTIFICATIONS_TABLE)
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createRemoteGameInvite(gameId: string) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const { data, error } = await supabase.rpc("create_game_invite", {
    p_game_id: gameId,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Could not create an invitation code.");
  }
  return data;
}

export async function rotateRemoteGameInvite(gameId: string) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const { data, error } = await supabase.rpc("rotate_game_invite", {
    p_game_id: gameId,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Could not generate a new invitation code.");
  }
  return data;
}

export async function joinRemoteGame(code: string) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const { data, error } = await supabase.rpc("join_game_by_code", {
    p_code: code,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Could not join that game.");
  }
  return data;
}

export async function applyRemoteSharedScoreDelta(
  userId: string,
  gameId: string,
  playerId: string,
  delta: number,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("apply_shared_game_score_delta", {
      p_game_id: gameId,
      p_player_id: playerId,
      p_delta: Math.trunc(delta),
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function resetRemoteSharedGame(
  userId: string,
  gameId: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("reset_shared_game_scores", { p_game_id: gameId })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function finishRemoteSharedGame(
  userId: string,
  gameId: string,
  completionMode: NonNullable<Game["completionMode"]>,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("finish_shared_game", {
      p_game_id: gameId,
      p_completion_mode: completionMode,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function updateRemoteSharedGameSettings(
  userId: string,
  gameId: string,
  settings: Pick<
    Game,
    | "name"
    | "scoreDirection"
    | "startingScore"
    | "targetScore"
    | "winCondition"
    | "winByTwo"
    | "manualEndOnly"
    | "timerEnabled"
    | "diceEnabled"
    | "quickScoreValues"
    | "timerMode"
    | "timerSeconds"
    | "collaboratorsCanManage"
  >,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("update_shared_game_settings_v3", {
      p_game_id: gameId,
      p_name: settings.name,
      p_score_direction: settings.scoreDirection,
      p_starting_score: settings.startingScore,
      p_target_score: settings.targetScore,
      p_win_condition: settings.winCondition,
      p_win_by_two: settings.winByTwo,
      p_manual_end_only: settings.manualEndOnly,
      p_timer_enabled: settings.timerEnabled,
      p_dice_enabled: settings.diceEnabled,
      p_quick_score_value_1: settings.quickScoreValues[0],
      p_quick_score_value_2: settings.quickScoreValues[1],
      p_timer_mode: settings.timerMode,
      p_timer_seconds: settings.timerSeconds,
      p_collaborators_can_manage: settings.collaboratorsCanManage,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function renameRemoteSharedGame(
  userId: string,
  gameId: string,
  name: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("rename_shared_game", { p_game_id: gameId, p_name: name })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function addRemoteSharedGamePlayer(
  userId: string,
  gameId: string,
  player: Pick<PlayerProfile, "name" | "avatarColor"> & {
    id: string;
    profileId?: string;
  },
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("add_shared_game_player", {
      p_game_id: gameId,
      p_player_id: player.id,
      p_name: player.name,
      p_avatar_color: player.avatarColor,
      p_profile_id: player.profileId ?? null,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function loadRemotePastLinkedPlayers(
  gameId: string,
): Promise<PastLinkedPlayer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_past_linked_players", {
    p_game_id: gameId,
  });
  if (error) throw error;
  return ((data ?? []) as PastLinkedPlayerRow[]).map((row) => ({
    userId: row.collaborator_user_id,
    profileId: row.profile_id,
    name: row.player_name,
    avatarColor: row.avatar_color,
    lastLinkedAt: row.last_linked_at,
  }));
}

export async function loadRemotePastInvitedPlayers(): Promise<
  PastLinkedPlayer[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_past_invited_players");
  if (error) throw error;
  return ((data ?? []) as PastLinkedPlayerRow[]).map((row) => ({
    userId: row.collaborator_user_id,
    profileId: row.profile_id,
    name: row.player_name,
    avatarColor: row.avatar_color,
    lastLinkedAt: row.last_linked_at,
  }));
}

export async function addRemotePastLinkedPlayerToGame(
  userId: string,
  gameId: string,
  collaboratorUserId: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("add_past_linked_player_to_game", {
      p_game_id: gameId,
      p_collaborator_user_id: collaboratorUserId,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function replayRemoteSharedGame(
  userId: string,
  gameId: string,
  newGameId: string,
  name: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("replay_shared_game", {
      p_game_id: gameId,
      p_new_game_id: newGameId,
      p_name: name,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  const game = rowToGame(result.data as GameRow, userId);
  return {
    ...game,
    hasCollaborators: game.isShared === true,
  };
}

export async function updateRemoteSharedGamePlayer(
  userId: string,
  gameId: string,
  player: Game["players"][number],
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("update_shared_game_player", {
      p_game_id: gameId,
      p_player_id: player.id,
      p_name: player.name,
      p_avatar_color: player.avatarColor,
      p_profile_id: player.profileId ?? null,
      p_team_id: player.teamId ?? null,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function setRemoteSharedCollaboratorManagement(
  userId: string,
  gameId: string,
  enabled: boolean,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("set_shared_game_collaborator_management", {
      p_game_id: gameId,
      p_enabled: enabled,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function deleteRemoteSharedGame(
  userId: string,
  gameId: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const { error } = await supabase
    .from(GAMES_TABLE)
    .delete()
    .eq("id", gameId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeRemoteSharedGamePlayer(
  userId: string,
  gameId: string,
  playerId: string,
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("remove_shared_game_player", {
      p_game_id: gameId,
      p_player_id: playerId,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  return rowToGame(result.data as GameRow, userId);
}

export async function mergeRemoteSharedGamePlayers(
  userId: string,
  gameId: string,
  linkedPlayerId: string,
  rosterPlayerId: string,
  keepPlayer: "linked" | "local",
) {
  if (!supabase) throw new Error("Cloud games are not configured.");
  const result = await supabase
    .rpc("merge_shared_game_players", {
      p_game_id: gameId,
      p_linked_player_id: linkedPlayerId,
      p_roster_player_id: rosterPlayerId,
      p_keep_player: keepPlayer,
    })
    .select(GAME_SELECT_COLUMNS)
    .single();
  if (result.error) throw result.error;
  const game = rowToGame(result.data as GameRow, userId);
  if (keepPlayer === "linked") {
    return { ...game, hasCollaborators: true };
  }
  const collaboratorResult = await supabase
    .from(GAME_COLLABORATORS_TABLE)
    .select("game_id", { count: "exact", head: true })
    .eq("game_id", gameId);
  if (collaboratorResult.error) throw collaboratorResult.error;
  return {
    ...game,
    hasCollaborators: (collaboratorResult.count ?? 0) > 0,
  };
}

export async function saveRemoteGames(
  userId: string,
  games: Game[],
  changedGameIds?: ReadonlySet<string>,
) {
  if (!supabase) return;
  const ownedGames = games.filter(
    (game) =>
      !game.isShared && (!game.ownerId || game.ownerId === userId),
  );
  const gamesToUpsert = changedGameIds
    ? ownedGames.filter((game) => changedGameIds.has(game.id))
    : ownedGames;
  const rows = gamesToUpsert.map((game) =>
    gameToLegacyCompatibleRow(userId, game),
  );
  if (rows.length > 0) {
    let quickScoreColumnsUnavailable = false;
    let { error } = await supabase
      .from(GAMES_TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error && isMissingQuickScoreColumn(error)) {
      quickScoreColumnsUnavailable = true;
      const rowsWithoutQuickScores = rows.map(
        ({ quick_score_value_1, quick_score_value_2, ...row }) => row,
      );
      const retryResult = await supabase
        .from(GAMES_TABLE)
        .upsert(rowsWithoutQuickScores, { onConflict: "id" });
      error = retryResult.error;
    }
    if (error && isMissingLegacyCompatibilityColumn(error)) {
      const message = getErrorMessage(error);
      const fallbackRows = rows.map((row) => {
        const {
          target_points,
          is_low_score_wins,
          quick_score_value_1,
          quick_score_value_2,
          ...modernRowWithoutQuickScores
        } = row;
        const modernRow = quickScoreColumnsUnavailable
          ? modernRowWithoutQuickScores
          : {
              ...modernRowWithoutQuickScores,
              quick_score_value_1,
              quick_score_value_2,
            };
        if (
          message.includes("target_points") &&
          message.includes("is_low_score_wins")
        ) {
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
      if (isMissingDiceEnabledColumn(error)) {
        const noDiceRows = rows.map(
          ({
            dice_enabled,
            quick_score_value_1,
            quick_score_value_2,
            ...row
          }) => row,
        );
        const { error: noDiceError } = await supabase
          .from(GAMES_TABLE)
          .upsert(noDiceRows, { onConflict: "id" });
        if (noDiceError) throw noDiceError;
      } else if (isMissingTeamsColumn(error)) {
        throw new Error(
          "Missing games.teams column in Supabase. Run the latest database migration before using team support.",
        );
      }
      if (isMissingParticipantModeColumn(error)) {
        const legacyRows = rows.map(
          ({
            participant_mode,
            quick_score_value_1,
            quick_score_value_2,
            ...row
          }) => row,
        );
        const { error: legacyError } = await supabase
          .from(GAMES_TABLE)
          .upsert(legacyRows, { onConflict: "id" });
        if (legacyError) throw legacyError;
      } else if (isMissingLegacyRequiredColumnValue(error)) {
        const legacyRows = gamesToUpsert.map((game) =>
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
              dice_enabled,
              quick_score_value_1,
              quick_score_value_2,
              completion_mode,
              collaborators_can_manage,
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
      )
        throw error;
      else {
        const legacyRows = gamesToUpsert.map((game) => {
          const {
            score_history,
            win_by_two,
            manual_end_only,
            dice_enabled,
            quick_score_value_1,
            quick_score_value_2,
            completion_mode,
            collaborators_can_manage,
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

  let { data, error: loadError } = await supabase
    .from(GAMES_TABLE)
    .select("id")
    .eq("user_id", userId)
    .eq("is_shared", false);
  if (loadError && isMissingSharedGameColumn(loadError)) {
    const legacyResult = await supabase
      .from(GAMES_TABLE)
      .select("id")
      .eq("user_id", userId);
    data = legacyResult.data;
    loadError = legacyResult.error;
  }
  if (loadError) throw loadError;

  const nextIds = new Set(ownedGames.map((game) => game.id));
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

export async function loadRemoteTeamMembers(
  userId: string,
): Promise<TeamMember[]> {
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
    const { error } = await supabase.from(TEAM_MEMBERS_TABLE).insert(rows);
    if (error) throw error;
  }
}
