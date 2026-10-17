import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Game, LiveScoreLocalAction } from "../../types";
import { useTheme } from "../../theme/ThemeContext";
import { selectLiveScoreGame } from "./selectLiveScoreGame";
import {
  endLiveScoreActivity,
  endAllLiveScoreActivities,
  synchronizeLiveScoreActivity,
  getLocalLiveScoreActions,
  acknowledgeLocalLiveScoreActions,
} from "./liveScoreActivity";

type UseLiveScoreActivityInput = {
  games: Game[];
  session: Session | null;
  ready: boolean;
  restoreActions: (actions: LiveScoreLocalAction[]) => Promise<void>;
  reportError: (message: string) => void;
};

export function useLiveScoreActivity({
  games,
  session,
  ready,
  restoreActions,
  reportError,
}: UseLiveScoreActivityInput) {
  const previousGameIdRef = useRef<string | null>(null);
  const restoreActionsRef = useRef(restoreActions);
  const reportErrorRef = useRef(reportError);
  reportErrorRef.current = reportError;
  restoreActionsRef.current = restoreActions;
  const workQueueRef = useRef<Promise<void>>(Promise.resolve());
  const { theme } = useTheme();
  const game = selectLiveScoreGame(games);
  const [resumeVersion, setResumeVersion] = useState(0);

  useEffect(() => {
    function queueSynchronization() {
      setResumeVersion((version) => version + 1);
    }
    window.addEventListener("plink:app-resumed", queueSynchronization);
    window.addEventListener("online", queueSynchronization);
    return () => {
      window.removeEventListener("plink:app-resumed", queueSynchronization);
      window.removeEventListener("online", queueSynchronization);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const previousGameId = previousGameIdRef.current;
    previousGameIdRef.current = game?.id ?? null;

    async function synchronize() {
      if (cancelled || !ready) return;
      const actions = await getLocalLiveScoreActions(session?.user.id ?? "guest");
      if (cancelled) return;
      if (actions.length > 0) {
        await restoreActionsRef.current(actions);
        await acknowledgeLocalLiveScoreActions(actions.map((action) => action.id));
        if (!cancelled) setResumeVersion((version) => version + 1);
        return;
      }
      if (previousGameId && previousGameId !== game?.id) {
        await endLiveScoreActivity(previousGameId);
      }
      if (!game) {
        await endAllLiveScoreActivities();
        return;
      }
      await synchronizeLiveScoreActivity(game, session, theme, controller.signal);
    }

    workQueueRef.current = workQueueRef.current.then(synchronize).catch((error: unknown) => {
      console.error("Live Score activity synchronization failed", error);
      if (!cancelled) reportErrorRef.current(error instanceof Error ? error.message : "Live Score synchronization failed.");
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [game, session, theme, resumeVersion, ready]);
}
