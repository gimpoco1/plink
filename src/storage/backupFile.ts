import type { Game, GameTeam, PlayerProfile, TeamMember } from "../types";
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
  teams: GameTeam[];
  teamMembers: TeamMember[];
};

export function createBackupPayload(
  games: Game[],
  profiles: PlayerProfile[],
  teams: GameTeam[],
  teamMembers: TeamMember[],
  selection: BackupSelection,
): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    games: selection.games ? games : [],
    profiles: selection.profiles ? profiles : [],
    teams: selection.profiles ? teams : [],
    teamMembers: selection.profiles ? teamMembers : [],
  };
}

function sanitizeBackupTeams(input: unknown): GameTeam[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((team) => {
      if (!team || typeof team !== "object") return null;
      const value = team as Record<string, unknown>;
      if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        typeof value.createdAt !== "number"
      ) {
        return null;
      }

      return {
        id: value.id,
        name: value.name,
        icon: typeof value.icon === "string" ? value.icon : undefined,
        sourceTeamId:
          typeof value.sourceTeamId === "string"
            ? value.sourceTeamId
            : undefined,
        createdAt: value.createdAt,
        updatedAt:
          typeof value.updatedAt === "number"
            ? value.updatedAt
            : value.createdAt,
      } satisfies GameTeam;
    })
    .filter(Boolean) as GameTeam[];
}

function sanitizeBackupTeamMembers(input: unknown): TeamMember[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((member) => {
      if (!member || typeof member !== "object") return null;
      const value = member as Record<string, unknown>;
      if (
        typeof value.teamId !== "string" ||
        typeof value.profileId !== "string" ||
        typeof value.createdAt !== "number"
      ) {
        return null;
      }

      return {
        teamId: value.teamId,
        profileId: value.profileId,
        createdAt: value.createdAt,
      } satisfies TeamMember;
    })
    .filter(Boolean) as TeamMember[];
}

function dedupeTeamMembers(members: TeamMember[]) {
  const unique = new Map<string, TeamMember>();
  for (const member of members) {
    const key = `${member.teamId}:${member.profileId}`;
    const existing = unique.get(key);
    if (!existing || member.createdAt < existing.createdAt) {
      unique.set(key, member);
    }
  }
  return [...unique.values()];
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
    teams: sanitizeBackupTeams(payload.teams),
    teamMembers: dedupeTeamMembers(sanitizeBackupTeamMembers(payload.teamMembers)),
  };
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export function getGameImportSignature(game: Game) {
  const teamNamesById = new Map(
    game.teams.map((team) => [team.id, normalizeName(team.name)]),
  );
  return JSON.stringify({
    name: game.name,
    participantMode: game.participantMode ?? "players",
    scoreDirection: game.scoreDirection,
    startingScore: game.startingScore,
    targetScore: game.targetScore,
    winCondition: game.winCondition,
    winByTwo: game.winByTwo,
    manualEndOnly: game.manualEndOnly,
    collaboratorsCanManage: game.collaboratorsCanManage,
    timerEnabled: game.timerEnabled,
    diceEnabled: game.diceEnabled,
    timerMode: game.timerMode,
    timerSeconds: game.timerSeconds,
    completionMode: game.completionMode ?? null,
    teams: game.teams.map((team) => ({
      name: team.name,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt ?? team.createdAt,
    })),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    endedAt: game.endedAt ?? null,
    scoreHistory: game.scoreHistory.map((entry) => ({
      playerName: entry.playerName,
      updatedByPlayerName: entry.updatedByPlayerName ?? null,
      delta: entry.delta,
      scoreBefore: entry.scoreBefore,
      scoreAfter: entry.scoreAfter,
      createdAt: entry.createdAt,
    })),
    players: game.players.map((player) => ({
      name: player.name,
      score: player.score,
      createdAt: player.createdAt,
      reachedAt: player.reachedAt,
      teamName: player.teamId ? teamNamesById.get(player.teamId) ?? null : null,
    })),
  });
}

export function prepareBackupImport(
  backup: BackupPayload,
  options: {
    importGames: boolean;
    importProfiles: boolean;
    importTeams: boolean;
    allowTeamSessions: boolean;
    existingGames: Game[];
    existingProfiles: PlayerProfile[];
    existingTeams: GameTeam[];
    existingTeamMembers: TeamMember[];
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

  const existingTeamsById = new Map(
    options.existingTeams.map((team) => [team.id, team]),
  );
  const existingTeamsByName = new Map(
    options.existingTeams.map((team) => [normalizeName(team.name), team]),
  );
  const teamIdMap = new Map<string, string | undefined>();
  const importedTeams: GameTeam[] = [];

  for (const team of backup.teams) {
    if (existingTeamsById.has(team.id)) {
      teamIdMap.set(team.id, team.id);
      importedTeams.push(team);
      continue;
    }

    const existingByName = existingTeamsByName.get(normalizeName(team.name));
    if (existingByName) {
      teamIdMap.set(team.id, existingByName.id);
      continue;
    }

    if (!options.importTeams) continue;

    const clonedTeam = {
      ...team,
      id: uid(),
    };
    importedTeams.push(clonedTeam);
    existingTeamsById.set(clonedTeam.id, clonedTeam);
    existingTeamsByName.set(normalizeName(clonedTeam.name), clonedTeam);
    teamIdMap.set(team.id, clonedTeam.id);
  }

  const existingTeamMemberKeys = new Set(
    options.existingTeamMembers.map(
      (member) => `${member.teamId}:${member.profileId}`,
    ),
  );
  const importedTeamMembers: TeamMember[] = [];

  if (options.importTeams) {
    for (const member of backup.teamMembers) {
      const mappedTeamId = teamIdMap.get(member.teamId);
      if (!mappedTeamId || !existingTeamsById.has(mappedTeamId)) continue;

      const mappedProfileId = profileIdMap.get(member.profileId);
      if (!mappedProfileId) continue;

      const key = `${mappedTeamId}:${mappedProfileId}`;
      if (existingTeamMemberKeys.has(key)) continue;

      existingTeamMemberKeys.add(key);
      importedTeamMembers.push({
        teamId: mappedTeamId,
        profileId: mappedProfileId,
        createdAt: member.createdAt,
      });
    }
  }

  const existingGameIds = new Set(options.existingGames.map((game) => game.id));
  const seenGameSignatures = new Set(
    options.existingGames.map(getGameImportSignature),
  );
  const importedGames: Game[] = [];

  for (const game of backup.games) {
    if (!options.allowTeamSessions && game.participantMode === "teams") {
      continue;
    }

    const gameSignature = getGameImportSignature(game);
    if (seenGameSignatures.has(gameSignature)) continue;

    if (existingGameIds.has(game.id)) {
      importedGames.push(game);
      seenGameSignatures.add(gameSignature);
      continue;
    }

    if (!options.importGames) continue;

    const clonedTeams = game.teams.map((team) => ({
      ...team,
      id: uid(),
    }));
    const teamIdMap = new Map(
      game.teams.map((team, index) => [team.id, clonedTeams[index]?.id]),
    );

    const clonedGame: Game = {
      ...game,
      id: uid(),
      teams: clonedTeams,
      completionMode:
        game.completionMode === "winner" ||
        game.completionMode === "no_winner" ||
        game.completionMode === "draw"
          ? game.completionMode
          : undefined,
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
          teamId: player.teamId ? teamIdMap.get(player.teamId) : undefined,
        };
      }),
    };

    importedGames.push(clonedGame);
    seenGameSignatures.add(gameSignature);
  }

  return {
    games: options.importGames ? importedGames : [],
    profiles: options.importProfiles ? importedProfiles : [],
    teams: options.importTeams ? importedTeams : [],
    teamMembers: options.importTeams ? importedTeamMembers : [],
  };
}
