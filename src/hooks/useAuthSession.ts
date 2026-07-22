import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  hasSupabaseConfig,
  loadPersistedSupabaseSession,
  supabase,
} from "../lib/supabase";
import { PASSWORD_RECOVERY_EVENT } from "../lib/nativePlatform";
import { createForegroundRefreshHandlers } from "../utils/foregroundRefresh";

function areSessionsEquivalent(
  current: Session | null,
  next: Session | null,
) {
  if (current === next) return true;
  if (!current || !next) return false;

  return (
    current.user.id === next.user.id &&
    current.access_token === next.access_token &&
    current.refresh_token === next.refresh_token &&
    current.expires_at === next.expires_at &&
    current.user.updated_at === next.user.updated_at
  );
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(() =>
    loadPersistedSupabaseSession(),
  );
  const [passwordRecoveryRequestedAt, setPasswordRecoveryRequestedAt] =
    useState(0);
  const [loading, setLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const authClient = supabase;

    let alive = true;
    let refreshRequestId = 0;

    function updateSession(nextSession: Session | null) {
      setSession((currentSession) =>
        areSessionsEquivalent(currentSession, nextSession)
          ? currentSession
          : nextSession,
      );
    }

    async function refreshSession() {
      const requestId = ++refreshRequestId;

      try {
        const { data, error } = await authClient.auth.getSession();
        if (!alive || requestId !== refreshRequestId) return;
        if (!error) updateSession(data.session);
      } catch {
        if (!alive || requestId !== refreshRequestId) return;
      } finally {
        if (!alive || requestId !== refreshRequestId) return;
        setLoading(false);
      }
    }

    void refreshSession();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event, nextSession) => {
      updateSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryRequestedAt(Date.now());
      }
    });

    const {
      refreshOnFocus: handleWindowFocus,
      refreshWhenVisible: handleVisibilityChange,
    } = createForegroundRefreshHandlers(() => void refreshSession());

    function handleStorage(event: StorageEvent) {
      if (!event.key) return;
      if (
        event.key === "supabase.auth.token" ||
        event.key.endsWith("-auth-token") ||
        event.key.endsWith("-auth-token-user")
      ) {
        void refreshSession();
      }
    }

    function handlePasswordRecovery() {
      setPasswordRecoveryRequestedAt(Date.now());
      void refreshSession();
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("plink:app-resumed", handleWindowFocus);
    window.addEventListener(PASSWORD_RECOVERY_EVENT, handlePasswordRecovery);

    return () => {
      alive = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("plink:app-resumed", handleWindowFocus);
      window.removeEventListener(
        PASSWORD_RECOVERY_EVENT,
        handlePasswordRecovery,
      );
    };
  }, []);

  return {
    session,
    loading,
    authEnabled: !!supabase,
    passwordRecoveryRequestedAt,
  };
}
