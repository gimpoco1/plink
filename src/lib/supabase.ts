import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const supabaseProjectRef = supabaseUrl
  ? new URL(supabaseUrl).hostname.split(".")[0]
  : null;
export const SUPABASE_AUTH_STORAGE_KEY = supabaseProjectRef
  ? `sb-${supabaseProjectRef}-auth-token`
  : null;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

function getBrowserStorage() {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: SUPABASE_AUTH_STORAGE_KEY
          ? {
              autoRefreshToken: true,
              persistSession: true,
              storageKey: SUPABASE_AUTH_STORAGE_KEY,
              storage: getBrowserStorage(),
            }
          : undefined,
      })
    : null;

function isUserLike(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string";
}

function isStoredSessionLike(
  value: unknown,
): value is Omit<Session, "user"> & { user?: User } {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.access_token === "string" &&
    typeof session.refresh_token === "string" &&
    (!("user" in session) || session.user == null || isUserLike(session.user))
  );
}

export function loadPersistedSupabaseSession(): Session | null {
  if (!SUPABASE_AUTH_STORAGE_KEY) return null;

  const storage = getBrowserStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (isStoredSessionLike(parsed)) {
      if (parsed.user) return parsed as Session;

      const rawUser = storage.getItem(`${SUPABASE_AUTH_STORAGE_KEY}-user`);
      if (!rawUser) return null;

      const parsedUser = JSON.parse(rawUser) as unknown;
      if (
        parsedUser &&
        typeof parsedUser === "object" &&
        "user" in parsedUser &&
        isUserLike((parsedUser as { user?: unknown }).user)
      ) {
        return {
          ...parsed,
          user: (parsedUser as { user: User }).user,
        } as Session;
      }
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "currentSession" in parsed &&
      isStoredSessionLike((parsed as { currentSession?: unknown }).currentSession)
    ) {
      const currentSession = (parsed as {
        currentSession: Omit<Session, "user"> & { user?: User };
      }).currentSession;
      if (currentSession.user) return currentSession as Session;

      const rawUser = storage.getItem(`${SUPABASE_AUTH_STORAGE_KEY}-user`);
      if (!rawUser) return null;

      const parsedUser = JSON.parse(rawUser) as unknown;
      if (
        parsedUser &&
        typeof parsedUser === "object" &&
        "user" in parsedUser &&
        isUserLike((parsedUser as { user?: unknown }).user)
      ) {
        return {
          ...currentSession,
          user: (parsedUser as { user: User }).user,
        } as Session;
      }
    }

    return null;
  } catch {
    return null;
  }
}
