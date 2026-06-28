import type { Game, PlayerProfile } from "../types";
import { uid } from "../utils/id";
import { sanitizeGames } from "./gamesStorage";
import { sanitizeProfiles } from "./profilesStorage";

export type BackupSelection = {
  games: boolean;
  profiles: boolean;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  games: Game[];
  profiles: PlayerProfile[];
};

export function createBackupPayload(
  games: Game[],
  profiles: PlayerProfile[],
  selection: BackupSelection,
): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    games: selection.games ? games : [],
    profiles: selection.profiles ? profiles : [],
  };
}

export function parseBackupPayload(raw: string): BackupPayload {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Backup file is not valid JSON.");
  }

  const payload = parsed as Record<string, unknown>;
  if (payload.version !== 1) {
    throw new Error("Backup file version is not supported.");
  }

  return {
    version: 1,
    exportedAt:
      typeof payload.exportedAt === "string"
        ? payload.exportedAt
        : new Date().toISOString(),
    games: sanitizeGames(payload.games),
    profiles: sanitizeProfiles(payload.profiles),
  };
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getGameImportSignature(game: Game) {
  return JSON.stringify({
    name: game.name,
    targetPoints: game.targetPoints,
    isLowScoreWins: game.isLowScoreWins,
    timerEnabled: game.timerEnabled,
    timerMode: game.timerMode,
    timerSeconds: game.timerSeconds,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    endedAt: game.endedAt ?? null,
    players: game.players.map((player) => ({
      name: player.name,
      score: player.score,
      createdAt: player.createdAt,
      reachedAt: player.reachedAt,
      avatarColor: player.avatarColor,
    })),
  });
}

export function prepareBackupImport(
  backup: BackupPayload,
  options: {
    importGames: boolean;
    importProfiles: boolean;
    existingGames: Game[];
    existingProfiles: PlayerProfile[];
  },
) {
  const existingProfilesById = new Map(
    options.existingProfiles.map((profile) => [profile.id, profile]),
  );
  const existingProfilesByName = new Map(
    options.existingProfiles.map((profile) => [
      normalizeName(profile.name),
      profile,
    ]),
  );
  const backupProfilesById = new Map(
    backup.profiles.map((profile) => [profile.id, profile]),
  );
  const profileIdMap = new Map<string, string | undefined>();
  const importedProfiles: PlayerProfile[] = [];

  for (const profile of backup.profiles) {
    if (existingProfilesById.has(profile.id)) {
      profileIdMap.set(profile.id, profile.id);
      importedProfiles.push(profile);
      continue;
    }

    const existingByName = existingProfilesByName.get(
      normalizeName(profile.name),
    );
    if (existingByName) {
      profileIdMap.set(profile.id, existingByName.id);
      continue;
    }

    if (!options.importProfiles) continue;

    const clonedProfile = {
      ...profile,
      id: uid(),
    };
    importedProfiles.push(clonedProfile);
    existingProfilesById.set(clonedProfile.id, clonedProfile);
    existingProfilesByName.set(normalizeName(clonedProfile.name), clonedProfile);
    profileIdMap.set(profile.id, clonedProfile.id);
  }

  const existingGameIds = new Set(options.existingGames.map((game) => game.id));
  const seenGameSignatures = new Set(
    options.existingGames.map(getGameImportSignature),
  );
  const importedGames: Game[] = [];

  for (const game of backup.games) {
    const gameSignature = getGameImportSignature(game);
    if (seenGameSignatures.has(gameSignature)) continue;

    if (existingGameIds.has(game.id)) {
      importedGames.push(game);
      seenGameSignatures.add(gameSignature);
      continue;
    }

    if (!options.importGames) continue;

    const clonedGame: Game = {
      ...game,
      id: uid(),
      players: game.players.map((player) => {
        const originalProfileId = player.profileId;
        let profileId = originalProfileId;
        if (originalProfileId) {
          profileId = profileIdMap.get(originalProfileId);
          if (profileId === undefined) {
            const backupProfile = backupProfilesById.get(originalProfileId);
            const matchedProfile = backupProfile
              ? existingProfilesByName.get(normalizeName(backupProfile.name))
              : undefined;
            profileId = matchedProfile?.id;
          }
        }

        return {
          ...player,
          id: uid(),
          profileId,
        };
      }),
    };

    importedGames.push(clonedGame);
    seenGameSignatures.add(gameSignature);
  }

  return {
    games: options.importGames ? importedGames : [],
    profiles: options.importProfiles ? importedProfiles : [],
  };
}
