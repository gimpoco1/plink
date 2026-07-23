export type Player = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
  reachedAt: number;
  avatarColor: string;
  profileId?: string;
  teamId?: string;
  joinedViaInvite?: boolean;
  isGameOwner?: boolean;
};

export type GameTeam = {
  id: string;
  name: string;
  icon?: string;
  sourceTeamId?: string;
  createdAt: number;
  updatedAt?: number;
};

export type TeamMember = {
  teamId: string;
  profileId: string;
  createdAt: number;
};

export type PlayerProfile = {
  id: string;
  name: string;
  avatarColor: string;
  isAccountPlayer?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type PastLinkedPlayer = {
  userId: string;
  profileId: string;
  name: string;
  avatarColor: string;
  lastLinkedAt: number;
};

export type ScoreHistoryEntry = {
  id: string;
  playerId: string;
  playerName: string;
  avatarColor: string;
  updatedByPlayerId?: string;
  updatedByPlayerName?: string;
  updatedByAvatarColor?: string;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  createdAt: number;
};

export type ScoreDirection = "up" | "down";
export type WinCondition = "reach_target" | "reach_zero" | "lowest";
export type CompletionMode = "winner" | "no_winner" | "draw";
export type QuickScoreValues = [number, number];

export type Game = {
  id: string;
  ownerId?: string;
  accessRole?: "owner" | "collaborator";
  isShared?: boolean;
  linkedPlayerIdForCurrentUser?: string;
  hasCollaborators?: boolean;
  invitedUserIdsByPlayerId?: Record<string, string>;
  collaboratorsCanManage: boolean;
  name: string;
  participantMode?: "players" | "teams";
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  diceEnabled: boolean;
  quickScoreValues: QuickScoreValues;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  teams: GameTeam[];
  players: Player[];
  scoreHistory: ScoreHistoryEntry[];
  completionMode?: CompletionMode;
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
};

export type ToastTone = "default" | "success" | "error";

export type ToastState = {
  message: string;
  tone: ToastTone;
};

export type HomeTab = "home" | "sessions" | "players" | "stats";
