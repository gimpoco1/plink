import {
  createClient,
  type Session,
  type SupabaseClient,
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

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: SUPABASE_AUTH_STORAGE_KEY
          ? {
              storageKey: SUPABASE_AUTH_STORAGE_KEY,
            }
          : undefined,
      })
    : null;

function isSessionLike(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.access_token === "string" &&
    typeof session.refresh_token === "string" &&
    !!session.user &&
    typeof session.user === "object"
  );
}

export function loadPersistedSupabaseSession(): Session | null {
  if (!SUPABASE_AUTH_STORAGE_KEY) return null;

  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (isSessionLike(parsed)) return parsed;

    if (
      parsed &&
      typeof parsed === "object" &&
      "currentSession" in parsed &&
      isSessionLike((parsed as { currentSession?: unknown }).currentSession)
    ) {
      return (parsed as { currentSession: Session }).currentSession;
    }

    return null;
  } catch {
    return null;
  }
}
