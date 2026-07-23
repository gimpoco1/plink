const FOREGROUND_REFRESH_STALE_AFTER_MS = 30_000;
const FOREGROUND_REFRESH_COOLDOWN_MS = 1_000;

const foregroundRefreshSubscribers = new Set<() => void>();
let backgroundedAt: number | null = null;
let lastRefreshAt = 0;
let foregroundListenersAttached = false;

function markBackgrounded() {
  backgroundedAt ??= Date.now();
}

function refreshIfStale() {
  const now = Date.now();
  const backgroundedDuration =
    backgroundedAt === null ? 0 : now - backgroundedAt;
  backgroundedAt = null;

  if (backgroundedDuration < FOREGROUND_REFRESH_STALE_AFTER_MS) return;
  if (now - lastRefreshAt < FOREGROUND_REFRESH_COOLDOWN_MS) return;

  lastRefreshAt = now;
  foregroundRefreshSubscribers.forEach((refresh) => refresh());
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    markBackgrounded();
    return;
  }
  refreshIfStale();
}

function attachForegroundListeners() {
  if (foregroundListenersAttached) return;
  foregroundListenersAttached = true;
  backgroundedAt =
    document.visibilityState === "hidden" ? Date.now() : null;
  window.addEventListener("blur", markBackgrounded);
  window.addEventListener("focus", refreshIfStale);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

function detachForegroundListeners() {
  if (!foregroundListenersAttached) return;
  foregroundListenersAttached = false;
  backgroundedAt = null;
  window.removeEventListener("blur", markBackgrounded);
  window.removeEventListener("focus", refreshIfStale);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

export function subscribeToForegroundRefresh(refresh: () => void) {
  foregroundRefreshSubscribers.add(refresh);
  attachForegroundListeners();

  return () => {
    foregroundRefreshSubscribers.delete(refresh);
    if (foregroundRefreshSubscribers.size === 0) {
      detachForegroundListeners();
    }
  };
}

export function createRealtimeReconnectHandler(refresh: () => void) {
  let hasConnected = false;

  return (status: string) => {
    if (status !== "SUBSCRIBED") return;
    if (hasConnected) refresh();
    hasConnected = true;
  };
}
