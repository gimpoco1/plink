import { Trash2 } from "lucide-react";
import type { GameTeam, PlayerProfile } from "../../../types";
import { SwipeableCard } from "../../../components/SwipeableCard/SwipeableCard";
import { DEFAULT_TEAM_ICON } from "../../../constants";
import { formatTeamName } from "../../../utils/text";
import { areSetsEqual } from "../../../utils/sets";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";
import { TeamCardDisplay } from "./PlayersScreenTeamCardDisplay";
import { TeamCardEditor } from "./PlayersScreenTeamCardEditor";

export type TeamCardData = {
  persistedMemberIds: Set<string>;
  members: PlayerProfile[];
  hasEdits: boolean;
  icon: string;
  isEditing: boolean;
  team: GameTeam;
};

export function TeamsList() {
  const { canUseTeams, teams } = usePlayersScreenContext();
  return (
    <section className="teamsSection" aria-label="Saved teams">
      {!teams.length ? (
        <div className="emptyMsg">
          {canUseTeams
            ? "No teams yet."
            : "Upgrade to Pro to create saved teams."}
        </div>
      ) : (
        <div className="teamsList" role="list" aria-label="Teams">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </section>
  );
}

function TeamCard({ team }: { team: GameTeam }) {
  const model = usePlayersScreenContext();
  const persistedProfiles = (model.teamMembersByTeamId.get(team.id) ?? [])
    .map((member) =>
      model.profiles.find((profile) => profile.id === member.profileId),
    )
    .filter((profile): profile is PlayerProfile => !!profile);
  const persistedMemberIds = new Set(
    persistedProfiles.map((profile) => profile.id),
  );
  const isEditing = model.editingTeamId === team.id;
  const icon = team.icon ?? DEFAULT_TEAM_ICON;
  const activeMemberIds = isEditing
    ? model.editingTeamMemberIds
    : persistedMemberIds;
  const members = model.profiles.filter((profile) =>
    activeMemberIds.has(profile.id),
  );
  const hasEdits =
    isEditing &&
    ((model.editingTeamOriginalIcon !== null &&
      icon !== model.editingTeamOriginalIcon) ||
      (!!model.editingTeamOriginalName &&
        formatTeamName(model.editingTeamName) !==
          model.editingTeamOriginalName) ||
      !areSetsEqual(
        model.editingTeamMemberIds,
        model.editingTeamOriginalMemberIds,
      ));
  const data = { persistedMemberIds, members, hasEdits, icon, isEditing, team };

  return (
    <SwipeableCard
      actionWidth={120}
      disabled={isEditing}
      cardClassName={`teamCard${isEditing ? " teamCard--editing" : ""}`}
      renderActions={({ closeSwipe }) => (
        <button
          className="swipeDelete"
          type="button"
          onClick={() => {
            closeSwipe();
            model.onDeleteTeam(team.id);
            if (isEditing) model.closeTeamEditor();
          }}
          aria-label={`Delete team ${team.name}`}
        >
          <Trash2 size={20} strokeWidth={2.2} aria-hidden="true" />
          Delete
        </button>
      )}
    >
      {() =>
        isEditing ? (
          <TeamCardEditor data={data} />
        ) : (
          <TeamCardDisplay data={data} />
        )
      }
    </SwipeableCard>
  );
}
