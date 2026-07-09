import type { Game, Player } from "../types";

export type GameParticipant = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
  reachedAt: number;
  avatarColor: string;
  teamId?: string;
  icon?: string;
  members: Player[];
};

export function getGameParticipants(
  game: Pick<Game, "participantMode" | "players" | "teams">,
): GameParticipant[] {
  if (game.participantMode !== "teams") {
    return game.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      createdAt: player.createdAt,
      reachedAt: player.reachedAt,
      avatarColor: player.avatarColor,
      teamId: player.teamId,
      members: [player],
    }));
  }

  const membersByTeamId = new Map<string, Player[]>();
  game.teams.forEach((team) => {
    membersByTeamId.set(team.id, []);
  });

  const unassignedParticipants: GameParticipant[] = [];
  game.players.forEach((player) => {
    if (player.teamId && membersByTeamId.has(player.teamId)) {
      membersByTeamId.get(player.teamId)?.push(player);
      return;
    }

    unassignedParticipants.push({
      id: player.id,
      name: player.name,
      score: player.score,
      createdAt: player.createdAt,
      reachedAt: player.reachedAt,
      avatarColor: player.avatarColor,
      teamId: player.teamId,
      icon: undefined,
      members: [player],
    });
  });

  const teamParticipants = game.teams.flatMap((team) => {
    const members = membersByTeamId.get(team.id) ?? [];
    if (members.length === 0) return [];
    const leader = [...members].sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.name.localeCompare(b.name);
    })[0];
    if (!leader) return [];
    return [
      {
        id: `team:${team.id}`,
        name: team.name,
        score: leader.score,
        createdAt: team.createdAt,
        reachedAt: Math.min(...members.map((member) => member.reachedAt)),
        avatarColor: leader.avatarColor,
        teamId: team.id,
        icon: team.icon,
        members,
      } satisfies GameParticipant,
    ];
  });

  return [...teamParticipants, ...unassignedParticipants];
}
