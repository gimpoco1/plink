export type Player = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
  reachedAt: number;
  avatarColor: string;
  profileId?: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  avatarColor: string;
  isAccountPlayer?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ScoreHistoryEntry = {
  id: string;
  playerId: string;
  playerName: string;
  avatarColor: string;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  createdAt: number;
};

export type Game = {
  id: string;
  name: string;
  targetPoints: number;
  isLowScoreWins: boolean;
  timerEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  players: Player[];
  scoreHistory: ScoreHistoryEntry[];
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
