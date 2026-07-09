export type LocalPlayer = {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
  updatedAt: number;
};

export const LOCAL_PLAYERS_STORAGE_KEY = "plink.localPlayers";
export const LOCAL_PLAYERS_CHANGED_EVENT = "plink:local-players-changed";

function sanitizeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitizeLocalPlayer(input: unknown): LocalPlayer | null {
  if (!input || typeof input !== "object") return null;

  const player = input as {
    id?: unknown;
    name?: unknown;
    avatarColor?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (
    typeof player.id !== "string" ||
    typeof player.name !== "string" ||
    typeof player.avatarColor !== "string"
  ) {
    return null;
  }

  const createdAt = sanitizeTimestamp(player.createdAt);
  const updatedAt = sanitizeTimestamp(player.updatedAt) || createdAt;

  return {
    id: player.id,
    name: player.name,
    avatarColor: player.avatarColor,
    createdAt,
    updatedAt,
  };
}

function getLocalPlayersSignature(players: LocalPlayer[]) {
  return players
    .map(
      (player) =>
        `${player.id}:${player.name}:${player.avatarColor}:${player.createdAt}:${player.updatedAt}`,
    )
    .join("|");
}

export function areLocalPlayersEqual(
  left: LocalPlayer[],
  right: LocalPlayer[],
) {
  return getLocalPlayersSignature(left) === getLocalPlayersSignature(right);
}

export function loadLocalPlayers(): LocalPlayer[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_PLAYERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((player) => sanitizeLocalPlayer(player))
      .filter(Boolean) as LocalPlayer[];
  } catch {
    return [];
  }
}

export function saveLocalPlayers(players: LocalPlayer[]) {
  if (typeof window === "undefined") return;

  const nextRaw = JSON.stringify(players);
  const currentRaw = window.localStorage.getItem(LOCAL_PLAYERS_STORAGE_KEY);
  if (currentRaw === nextRaw) return;

  window.localStorage.setItem(LOCAL_PLAYERS_STORAGE_KEY, nextRaw);

  window.dispatchEvent(new Event(LOCAL_PLAYERS_CHANGED_EVENT));
}
