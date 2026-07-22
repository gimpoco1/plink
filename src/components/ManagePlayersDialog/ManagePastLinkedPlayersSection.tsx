import { Link, Plus } from "lucide-react";
import { avatarStyleFor } from "../../utils/color";
import { capitalizeFirst, getInitials } from "../../utils/text";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";

export function ManagePastLinkedPlayersSection() {
  const {
    addingPastLinkedUserId,
    addPastLinkedPlayer,
    pastLinkedPlayers,
  } = useManagePlayersDialogContext();

  if (pastLinkedPlayers.length === 0) return null;

  return (
    <section className="managePlayersDialog__pastLinked">
      <div className="managePlayersDialog__pastLinkedHeading">
        <span className="managePlayersDialog__pastLinkedTitle">
          Previously invited players
        </span>
        <span className="managePlayersDialog__pastLinkedDescription">
          Previously joined using an invite code.
        </span>
      </div>
      <div className="managePlayersDialog__pastLinkedList">
        {pastLinkedPlayers.map((player) => {
          const isAdding = addingPastLinkedUserId === player.userId;
          return (
            <div
              className="managePlayersDialog__pastLinkedPlayer"
              key={player.userId}
            >
              <span
                className="managePlayersDialog__pastLinkedAvatar"
                style={avatarStyleFor(player.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(player.name)}
              </span>
              <span className="managePlayersDialog__pastLinkedIdentity">
                <span className="managePlayersDialog__pastLinkedName">
                  {capitalizeFirst(player.name)}
                </span>
                <span className="managePlayersDialog__pastLinkedMeta">
                  <Link size={12} strokeWidth={2.5} aria-hidden="true" />
                  Invited player
                </span>
              </span>
              <button
                className="managePlayersDialog__pastLinkedAdd"
                type="button"
                disabled={addingPastLinkedUserId !== null}
                onClick={() => void addPastLinkedPlayer(player.userId)}
                aria-label={`Add invited player ${player.name}`}
              >
                <Plus size={14} strokeWidth={2.7} aria-hidden="true" />
                {isAdding ? "Adding…" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
