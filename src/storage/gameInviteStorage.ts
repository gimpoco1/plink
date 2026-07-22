const GAME_INVITE_CODES_STORAGE_KEY = "plink.gameInviteCodes.v1";

function loadInviteCodes(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(GAME_INVITE_CODES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([gameId, code]) =>
          gameId.length > 0 &&
          typeof code === "string" &&
          /^[A-F0-9]{8}$/.test(code),
      ),
    );
  } catch {
    return {};
  }
}

export function loadGameInviteCode(gameId: string) {
  return loadInviteCodes()[gameId] ?? null;
}

export function saveGameInviteCode(gameId: string, code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!gameId || !/^[A-F0-9]{8}$/.test(normalizedCode)) return;
  try {
    window.localStorage.setItem(
      GAME_INVITE_CODES_STORAGE_KEY,
      JSON.stringify({ ...loadInviteCodes(), [gameId]: normalizedCode }),
    );
  } catch {
    // The invite still works when browser storage is unavailable.
  }
}

export function removeGameInviteCode(gameId: string) {
  const inviteCodes = loadInviteCodes();
  if (!(gameId in inviteCodes)) return;
  delete inviteCodes[gameId];
  try {
    window.localStorage.setItem(
      GAME_INVITE_CODES_STORAGE_KEY,
      JSON.stringify(inviteCodes),
    );
  } catch {
    // Nothing else needs to happen if browser storage is unavailable.
  }
}
