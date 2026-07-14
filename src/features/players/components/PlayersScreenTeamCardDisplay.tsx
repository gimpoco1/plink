import { Pencil } from "lucide-react";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import { GamesDropdown } from "./PlayersScreenParts";
import type { TeamCardData } from "./PlayersScreenTeamsList";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamCardDisplay({ data }: { data: TeamCardData }) {
  const model = usePlayersScreenContext();
  const stats = model.teamStats.get(data.team.id);
  function startEditing() {
    model.setEditingTeamId(data.team.id);
    model.setEditingTeamOriginalIcon(data.icon);
    model.setEditingTeamName(data.team.name);
    model.setEditingTeamOriginalName(data.team.name);
    model.setEditingTeamMemberIds(new Set(data.persistedMemberIds));
    model.setEditingTeamOriginalMemberIds(new Set(data.persistedMemberIds));
    model.setEditingTeamSearch("");
    model.setEditingTeamIconPickerOpen(false);
    model.setCreatingTeamPlayer(false);
    model.setCreatingTeamPlayerForTeamId(null);
    model.setNewTeamPlayerName("");
    model.setExpandedTeamAddPlayers((current) => {
      const next = new Set(current);
      next.delete(data.team.id);
      return next;
    });
  }
  return (
    <>
      <div className="teamCard__head">
        <div className="teamCard__identity">
          <div className="teamCard__icon" aria-hidden="true">
            <TeamIcon icon={data.team.icon} size={24} />
          </div>
          <div>
            <div className="teamCard__title">{data.team.name}</div>
            <div className="teamCard__meta">
              {data.members.length} player{data.members.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="teamCard__actions">
          <button
            className="profileEditBtn"
            type="button"
            aria-label={`Edit ${data.team.name}`}
            onClick={startEditing}
          >
            <Pencil size={18} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="teamCard__members">
        {data.members.length > 0 ? (
          data.members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="teamMemberChip"
              disabled
            >
              <span
                className="teamMemberChip__avatar"
                style={avatarStyleFor(member.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(member.name)}
              </span>
              <span>
                {member.isAccountPlayer
                  ? formatAccountPlayerName(member.name)
                  : member.name}
              </span>
            </button>
          ))
        ) : (
          <div className="teamCard__empty">No players in this team yet.</div>
        )}
      </div>
      {stats?.sessionResults.length ? (
        <GamesDropdown title="Sessions" sessionResults={stats.sessionResults} />
      ) : null}
    </>
  );
}
