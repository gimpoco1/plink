const DEFAULT_FOREGROUND_REFRESH_COOLDOWN_MS = 1_000;

export function createForegroundRefreshHandlers(
  refresh: () => void,
  cooldownMs = DEFAULT_FOREGROUND_REFRESH_COOLDOWN_MS,
) {
  let lastRefreshAt = 0;

  function refreshOnce() {
    const now = Date.now();
    if (now - lastRefreshAt < cooldownMs) return;
    lastRefreshAt = now;
    refresh();
  }

  function refreshWhenVisible() {
    if (document.visibilityState === "visible") refreshOnce();
  }

  return {
    refreshOnFocus: refreshOnce,
    refreshWhenVisible,
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
