import type { Game, Player, PlayerProfile } from "../types";

function getReplayNameKey(name: string) {
  return name.trim().replace(/\s+#\d+$/i, "").toLocaleLowerCase();
}

export function getSavedReplayProfile(
  player: Player,
  profiles: PlayerProfile[],
): PlayerProfile | undefined {
  const matchingId = player.profileId
    ? profiles.find((profile) => profile.id === player.profileId)
    : undefined;
  if (matchingId) return matchingId;

  const nameKey = getReplayNameKey(player.name);
  const matchingNames = profiles.filter(
    (profile) => getReplayNameKey(profile.name) === nameKey,
  );
  return matchingNames.length === 1 ? matchingNames[0] : undefined;
}

export function getUnsavedReplayPlayers(
  game: Game,
  profiles: PlayerProfile[],
): Player[] {
  if (!game.isShared) return [];
  return game.players.filter(
    (player) => !getSavedReplayProfile(player, profiles),
  );
}
