import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Game, LiveScoreLocalAction } from "../../types";
import { useTheme } from "../../theme/ThemeContext";
import { selectLiveScoreGame } from "./selectLiveScoreGame";
import {
  endLiveScoreActivity,
  synchronizeLiveScoreActivity,
  getLocalLiveScoreActions,
  acknowledgeLocalLiveScoreActions,
} from "./liveScoreActivity";

type UseLiveScoreActivityInput = {
  games: Game[];
  session: Session | null;
  ready: boolean;
  restoreActions: (actions: LiveScoreLocalAction[]) => Promise<void>;
};

export function useLiveScoreActivity({
  games,
  session,
  ready,
  restoreActions,
}: UseLiveScoreActivityInput) {
  const previousGameIdRef = useRef<string | null>(null);
  const restoreActionsRef = useRef(restoreActions);
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
    const previousGameId = previousGameIdRef.current;
    previousGameIdRef.current = game?.id ?? null;

    async function synchronize() {
      if (cancelled || !ready) return;
      const actions = await getLocalLiveScoreActions(session?.user.id ?? "guest");
      if (cancelled) return;
      if (actions.length > 0) {
        await restoreActionsRef.current(actions);
        await acknowledgeLocalLiveScoreActions(actions.map((action) => action.id));
        return;
      }
      if (previousGameId && previousGameId !== game?.id) {
        await endLiveScoreActivity(previousGameId);
      }
      if (!game) return;
      await synchronizeLiveScoreActivity(game, session, theme);
    }

    workQueueRef.current = workQueueRef.current.then(synchronize).catch((error: unknown) => {
      if (!cancelled) {
        console.error("Live Score activity synchronization failed", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [game, session, theme, resumeVersion, ready]);
}
