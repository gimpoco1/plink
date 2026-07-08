import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  hasSupabaseConfig,
  loadPersistedSupabaseSession,
  supabase,
} from "../lib/supabase";

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

    let alive = true;
    let refreshRequestId = 0;

    async function refreshSession() {
      const requestId = ++refreshRequestId;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive || requestId !== refreshRequestId) return;
        if (!error) setSession(data.session);
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryRequestedAt(Date.now());
      }
    });

    function handleWindowFocus() {
      void refreshSession();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    }

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

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      alive = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    session,
    loading,
    authEnabled: !!supabase,
    passwordRecoveryRequestedAt,
  };
}
