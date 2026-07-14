import { TeamIcon } from "../TeamIcon/TeamIcon";
import { avatarStyleFor } from "../../utils/color";
import {
  capitalizeFirst,
  formatAccountPlayerName,
  getInitials,
} from "../../utils/text";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";

export function ManagePlayersQueue() {
  const {
    setStagedCustomPlayers,
    stagedCount,
    stagedCustomPlayers,
    stagedProfiles,
    toggleProfile,
  } = useManagePlayersDialogContext();
  if (stagedCount === 0) return null;

  return (
    <QueueShell count={stagedCount} label="players">
      {stagedProfiles.map((profile) => {
        const displayName = profile.isAccountPlayer
          ? formatAccountPlayerName(profile.name)
          : capitalizeFirst(profile.name);
        return (
          <button
            key={profile.id}
            className="managePlayersDialog__queueChip"
            type="button"
            onClick={() => toggleProfile(profile.id)}
            aria-label={`Remove ${displayName}`}
          >
            <span
              className="managePlayersDialog__queueAvatar"
              style={avatarStyleFor(profile.avatarColor)}
              aria-hidden="true"
            >
              {getInitials(profile.name)}
            </span>
            <span>{displayName}</span>
            <span className="managePlayersDialog__queueRemove">×</span>
          </button>
        );
      })}
      {stagedCustomPlayers.map((player, index) => (
        <button
          key={`${player.name}-${index}`}
          className="managePlayersDialog__queueChip"
          type="button"
          onClick={() =>
            setStagedCustomPlayers((players) =>
              players.filter((_, playerIndex) => playerIndex !== index),
            )
          }
          aria-label={`Remove ${capitalizeFirst(player.name)}`}
        >
          <span
            className="managePlayersDialog__queueAvatar"
            style={avatarStyleFor(player.avatarColor)}
            aria-hidden="true"
          >
            {getInitials(player.name)}
          </span>
          <span>{capitalizeFirst(player.name)}</span>
          <span className="managePlayersDialog__queueRemove">×</span>
        </button>
      ))}
    </QueueShell>
  );
}

export function ManageTeamsQueue() {
  const { stagedTeamCount, stagedTeams, toggleTeam } =
    useManagePlayersDialogContext();
  if (stagedTeamCount === 0) return null;

  return (
    <QueueShell count={stagedTeamCount} label="teams" teams>
      {stagedTeams.map((team) => (
        <button
          key={team.id}
          className="managePlayersDialog__queueChip"
          type="button"
          onClick={() => toggleTeam(team.id)}
          aria-label={`Remove ${team.name}`}
        >
          <span
            className="managePlayersDialog__queueTeamIcon"
            aria-hidden="true"
          >
            <TeamIcon icon={team.icon} size={13} strokeWidth={2.4} />
          </span>
          <span>{team.name}</span>
          <span className="managePlayersDialog__queueRemove">×</span>
        </button>
      ))}
    </QueueShell>
  );
}

function QueueShell({
  children,
  count,
  label,
  teams = false,
}: {
  children: React.ReactNode;
  count: number;
  label: string;
  teams?: boolean;
}) {
  return (
    <section className="managePlayersDialog__queue">
      <div className="managePlayersDialog__titleRow">
        <div className="managePlayersDialog__simpleTitle">Ready to add</div>
        <span
          className={`managePlayersDialog__countChip${teams ? " managePlayersDialog__countChip--teams" : ""}`}
          aria-label={`${count} ${label} ready to add`}
        >
          {count}
        </span>
      </div>
      <div className="managePlayersDialog__queueList">{children}</div>
    </section>
  );
}
