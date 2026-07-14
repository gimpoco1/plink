import { Check, Pencil, Trash2, Undo2 } from "lucide-react";
import type { PlayerProfile } from "../../../types";
import { SwipeableCard } from "../../../components/SwipeableCard/SwipeableCard";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import { ColorPicker, GamesDropdown } from "./PlayersScreenParts";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function PlayersGrid() {
  const { addingPlayer, profiles } = usePlayersScreenContext();
  return (
    <div className="profilesGrid">
      {!profiles.length && !addingPlayer ? (
        <div className="emptyMsg">No saved players yet.</div>
      ) : (
        profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: PlayerProfile }) {
  const model = usePlayersScreenContext();
  const stats = model.profileStats.get(profile.id);
  const isEditing = model.editingId === profile.id;
  return (
    <SwipeableCard
      actionWidth={120}
      disabled={isEditing || profile.isAccountPlayer}
      cardClassName={`profileCard${isEditing ? " profileCard--editing" : ""}`}
      renderActions={({ closeSwipe }) => (
        <button
          className="swipeDelete"
          type="button"
          onClick={() => {
            closeSwipe();
            model.onDeleteProfile(profile.id);
          }}
          aria-label={`Delete player ${profile.name}`}
        >
          <Trash2 size={20} strokeWidth={2.2} aria-hidden="true" />
          Delete
        </button>
      )}
    >
      {() => (
        <>
          <div className="profileCard__topRow">
            <div className="profileCard__main">
              <span
                className="profileAvatar"
                style={avatarStyleFor(
                  isEditing ? model.editingColor : profile.avatarColor,
                )}
              >
                {getInitials(
                  isEditing ? model.editingName || profile.name : profile.name,
                )}
              </span>
              <div className="profileCard__info">
                <div className="profileCard__header">
                  <div className="profileCard__titleBlock">
                    {isEditing ? (
                      <input
                        autoFocus
                        className="editInput"
                        value={model.editingName}
                        onChange={(event) =>
                          model.setEditingName(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            model.finishRename(profile.id);
                          if (event.key === "Escape") model.setEditingId(null);
                        }}
                      />
                    ) : (
                      <div className="profileCard__nameText">
                        {profile.isAccountPlayer
                          ? formatAccountPlayerName(profile.name)
                          : profile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <ProfileActions profile={profile} isEditing={isEditing} />
          </div>
          {isEditing ? (
            <div className="profileCard__paletteRow">
              <ColorPicker
                value={model.editingColor}
                onChange={model.setEditingColor}
                label={profile.name}
              />
            </div>
          ) : null}
          {stats?.sessionResults.length ? (
            <GamesDropdown
              title="Sessions"
              sessionResults={stats.sessionResults}
            />
          ) : null}
        </>
      )}
    </SwipeableCard>
  );
}

function ProfileActions({
  profile,
  isEditing,
}: {
  profile: PlayerProfile;
  isEditing: boolean;
}) {
  const model = usePlayersScreenContext();
  if (!isEditing) {
    return (
      <button
        className="profileEditBtn"
        type="button"
        aria-label={`Edit ${profile.name}`}
        onClick={() => model.startEditing(profile)}
      >
        <Pencil size={18} strokeWidth={2.3} aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className="profileCard__actions">
      {model.hasEdits ? (
        <button
          className="profileUndoBtn"
          type="button"
          aria-label={`Undo changes for ${profile.name}`}
          onClick={model.undoEdit}
        >
          <Undo2 size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : null}
      <button
        className="profileEditBtn profileEditBtn--active"
        type="button"
        aria-label={`Finish editing ${profile.name}`}
        onClick={() => model.finishRename(profile.id)}
      >
        <Check size={18} strokeWidth={2.3} aria-hidden="true" />
      </button>
    </div>
  );
}
