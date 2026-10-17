import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  hasSupabaseConfig,
  loadPersistedSupabaseSession,
  supabase,
} from "../lib/supabase";
import { PASSWORD_RECOVERY_EVENT } from "../lib/nativePlatform";
import { getNativeLiveScoreSession, clearNativeLiveScoreSession } from "../features/live-score/liveScoreActivity";
import { subscribeToForegroundRefresh } from "../utils/foregroundRefresh";

function areSessionsEquivalent(current: Session | null, next: Session | null) {
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
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const authClient = supabase;

    let alive = true;
    let refreshRequestId = 0;

    function updateSession(nextSession: Session | null) {
      sessionRef.current = nextSession;
      setSession((currentSession) =>
        areSessionsEquivalent(currentSession, nextSession)
          ? currentSession
          : nextSession,
      );
    }

    async function refreshSession() {
      const requestId = ++refreshRequestId;

      try {
        const currentSession = sessionRef.current;
        const nativeSession = currentSession ? await getNativeLiveScoreSession(currentSession.user.id) : null;
        if (!alive || requestId !== refreshRequestId || sessionRef.current !== currentSession) return;
        if (
          nativeSession &&
          nativeSession.expiresAt > (currentSession?.expires_at ?? 0)
        ) {
          const { data, error } = await authClient.auth.setSession({
            access_token: nativeSession.accessToken,
            refresh_token: nativeSession.refreshToken,
          });
          if (error) throw error;
          if (!alive || requestId !== refreshRequestId) return;
          updateSession(data.session);
        }
        const { data, error } = await authClient.auth.getSession();
        if (!alive || requestId !== refreshRequestId) return;
        if (!error) updateSession(data.session);
      } catch (error) {
        console.error("Failed to restore the authenticated session", error);
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
      if (event === "SIGNED_OUT") {
        refreshRequestId += 1;
        void clearNativeLiveScoreSession().catch((error: unknown) => {
          console.error("Failed to clear the native Live Score session", error);
        });
      }
      updateSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryRequestedAt(Date.now());
      }
    });

    const unsubscribeForegroundRefresh = subscribeToForegroundRefresh(
      () => void refreshSession(),
    );

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

    window.addEventListener("storage", handleStorage);
    window.addEventListener("plink:app-resumed", refreshSession);
    window.addEventListener(PASSWORD_RECOVERY_EVENT, handlePasswordRecovery);

    return () => {
      alive = false;
      subscription.unsubscribe();
      unsubscribeForegroundRefresh();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("plink:app-resumed", refreshSession);
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
