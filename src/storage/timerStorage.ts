import { GAME_TIMER_STORAGE_KEY } from "../constants";

type TimerSnapshot = {
  mode: "countdown" | "stopwatch";
  durationSeconds: number;
  elapsedMs: number;
};

function getTimerStorageKey(gameId: string) {
  return `${GAME_TIMER_STORAGE_KEY}:${gameId}`;
}

export function loadTimerSnapshot(gameId: string): TimerSnapshot | null {
  try {
    const raw = localStorage.getItem(getTimerStorageKey(gameId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const snapshot = parsed as Record<string, unknown>;
    if (
      (snapshot.mode !== "countdown" && snapshot.mode !== "stopwatch") ||
      typeof snapshot.durationSeconds !== "number" ||
      snapshot.durationSeconds <= 0 ||
      typeof snapshot.elapsedMs !== "number" ||
      snapshot.elapsedMs < 0
    ) {
      return null;
    }

    return {
      mode: snapshot.mode,
      durationSeconds: Math.trunc(snapshot.durationSeconds),
      elapsedMs: Math.trunc(snapshot.elapsedMs),
    };
  } catch {
    return null;
  }
}

export function saveTimerSnapshot(gameId: string, snapshot: TimerSnapshot | null) {
  const storageKey = getTimerStorageKey(gameId);
  if (!snapshot || snapshot.elapsedMs <= 0) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}
