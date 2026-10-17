import { registerPlugin } from "@capacitor/core";
import type { Session } from "@supabase/supabase-js";
import type { Game, LiveScoreLocalAction } from "../../types";
import { isNativeIOSApp } from "../../lib/nativePlatform";
import type { Theme } from "../../theme/ThemeContext";

type LiveScorePlayer = {
  id: string;
  name: string;
  score: number;
  avatarColor: string;
};

type LiveScorePlugin = {
  getAvailability(): Promise<{ supported: boolean; enabled: boolean }>;
  getLocalActions(): Promise<{ actions: LiveScoreLocalAction[] }>;
  acknowledgeLocalActions(options: { ids: string[] }): Promise<void>;
  configure(options: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    supabaseUrl: string;
    supabasePublishableKey: string;
  }): Promise<void>;
  clearSession(): Promise<void>;
  endAll(): Promise<void>;
  getSession(options: { userId: string }): Promise<{
    session: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    } | null;
  }>;
  startOrUpdate(options: {
    gameId: string;
    gameName: string;
    updatedAt: number;
    isShared: boolean;
    ownerKey: string;
    theme: Theme;
    targetScore: number;
    startingScore: number;
    winCondition: Game["winCondition"];
    scoreDirection: Game["scoreDirection"];
    manualEndOnly: boolean;
    winByTwo: boolean;
    players: LiveScorePlayer[];
  }): Promise<void>;
  end(options: { gameId: string }): Promise<void>;
};

const LiveScore = registerPlugin<LiveScorePlugin>("LiveScore");

function getSupabaseConfiguration() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Live Score requires a configured Supabase project.");
  }
  return { supabaseUrl, supabasePublishableKey };
}

export async function getLocalLiveScoreActions(ownerKey: string) {
  if (!isNativeIOSApp()) return [];
  const { actions } = await LiveScore.getLocalActions();
  if (!Array.isArray(actions) || !actions.every((action) =>
    action !== null && typeof action === "object" &&
    typeof action.id === "string" && typeof action.gameId === "string" &&
    typeof action.ownerKey === "string" && typeof action.playerId === "string" &&
    Number.isSafeInteger(action.createdAt) && (action.delta === -1 || action.delta === 1)
  )) throw new Error("Live Score returned invalid local score actions.");
  return actions.filter((action) => action.ownerKey === ownerKey);
}

export async function acknowledgeLocalLiveScoreActions(ids: string[]) {
  await LiveScore.acknowledgeLocalActions({ ids });
}

export function supportsLiveScoreActivity(game: Game) {
  return (
    isNativeIOSApp() &&
    game.participantMode !== "teams" &&
    game.endedAt === undefined &&
    game.players.length >= 2 && game.players.length <= 3
  );
}

export async function synchronizeLiveScoreActivity(
  game: Game,
  session: Session | null,
  theme: Theme,
  signal: AbortSignal,
) {
  if (!isNativeIOSApp()) return;
  const availability = await LiveScore.getAvailability();
  if (!availability.supported || !availability.enabled || signal.aborted) return;
  if (!supportsLiveScoreActivity(game)) {
    await LiveScore.end({ gameId: game.id });
    return;
  }

  if (game.isShared) {
    if (!session) throw new Error("Sign in before scoring a shared game from the Lock Screen.");
    const configuration = getSupabaseConfiguration();
    await LiveScore.configure({
    userId: session.user.id,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    ...configuration,
    });
  }
  if (signal.aborted) return;
  await LiveScore.startOrUpdate({
    gameId: game.id,
    gameName: game.name,
    updatedAt: game.updatedAt,
    isShared: game.isShared === true,
    ownerKey: session?.user.id ?? "guest",
    theme,
    targetScore: game.targetScore,
    startingScore: game.startingScore,
    winCondition: game.winCondition,
    scoreDirection: game.scoreDirection,
    manualEndOnly: game.manualEndOnly,
    winByTwo: game.winByTwo,
    players: game.players.map(({ id, name, score, avatarColor }) => ({ id, name, score, avatarColor })),
  });
}

export async function getNativeLiveScoreSession(userId: string) {
  if (!isNativeIOSApp()) return null;
  const result = await LiveScore.getSession({ userId });
  return result.session;
}

export async function clearNativeLiveScoreSession() {
  if (!isNativeIOSApp()) return;
  await LiveScore.clearSession();
}

export async function endAllLiveScoreActivities() {
  if (!isNativeIOSApp()) return;
  await LiveScore.endAll();
}

export async function endLiveScoreActivity(gameId: string) {
  if (!isNativeIOSApp()) return;
  await LiveScore.end({ gameId });
}
