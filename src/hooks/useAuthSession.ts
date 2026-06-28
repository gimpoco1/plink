import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  hasSupabaseConfig,
  loadPersistedSupabaseSession,
  supabase,
} from "../lib/supabase";

export function useAuthSession() {
  const initialPersistedSession = loadPersistedSupabaseSession();
  const [session, setSession] = useState<Session | null>(initialPersistedSession);
  const [loading, setLoading] = useState(
    hasSupabaseConfig && !initialPersistedSession,
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error) setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, authEnabled: !!supabase };
}
