import { Check, GitMerge, Link, Pencil, Plus, Trash2, X } from "lucide-react";
import { AVATAR_COLORS } from "../../constants";
import type { Player, PlayerProfile } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import {
  capitalizeFirst,
  clampName,
  formatAccountPlayerName,
  getInitials,
} from "../../utils/text";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";

type Props =
  | {
      kind: "current";
      player: Player;
      profile?: PlayerProfile;
      isLinkedAccountPlayer?: boolean;
      mergeCandidate?: Player;
    }
  | { kind: "saved"; profile: PlayerProfile };

export function ManagePlayerCard(props: Props) {
  const model = useManagePlayersDialogContext();
  const profile = props.kind === "saved" ? props.profile : props.profile;
  const player = props.kind === "current" ? props.player : undefined;
  const entity = player ?? profile!;
  const editing =
    props.kind === "current"
      ? model.editingPlayerId === player?.id
      : model.editingProfileId === profile?.id;
  const displayName = profile?.isAccountPlayer
    ? formatAccountPlayerName(entity.name)
    : capitalizeFirst(entity.name);
  const validationMessage =
    props.kind === "current"
      ? model.currentPlayerNameValidationMessage
      : model.savedProfileNameValidationMessage;
  const isLinkedAccountPlayer =
    props.kind === "current" && props.isLinkedAccountPlayer === true;
  const mergeCandidate =
    props.kind === "current" ? props.mergeCandidate : undefined;

  function beginEditing() {
    if (isLinkedAccountPlayer) return;
    model.setEditingPlayerId(props.kind === "current" ? entity.id : null);
    model.setEditingProfileId(props.kind === "saved" ? entity.id : null);
    model.setEditingName(entity.name);
    model.setEditingColor(
      entity.avatarColor as (typeof AVATAR_COLORS)[number]["value"],
    );
  }

  function cancelEditing() {
    model.setEditingPlayerId(null);
    model.setEditingProfileId(null);
    model.setEditingName("");
    model.setEditingColor(
      entity.avatarColor as (typeof AVATAR_COLORS)[number]["value"],
    );
  }

  function saveEditing() {
    const name = clampName(model.editingName);
    if (!name || validationMessage) return;
    const updates = { name, avatarColor: model.editingColor };
    if (props.kind === "current") model.onUpdatePlayer(entity.id, updates);
    else model.onUpdateProfile(entity.id, updates);
    model.setEditingPlayerId(null);
    model.setEditingProfileId(null);
    model.setEditingName("");
  }

  return (
    <article
      className={`managePlayersDialog__card${editing ? " managePlayersDialog__card--editing" : ""}`}
    >
      <div className="managePlayersDialog__cardMain">
        <span
          className="managePlayersDialog__avatar"
          style={avatarStyleFor(
            editing ? model.editingColor : entity.avatarColor,
          )}
          aria-hidden="true"
        >
          {getInitials(entity.name)}
        </span>
        {editing ? (
          <PlayerEditor
            name={displayName}
            validationMessage={validationMessage}
            onCancel={cancelEditing}
            onSave={saveEditing}
          />
        ) : (
          <PlayerIdentity
            displayName={displayName}
            onEdit={beginEditing}
            player={player}
            profile={profile}
            isLinkedAccountPlayer={isLinkedAccountPlayer}
          />
        )}
      </div>
      {player && isLinkedAccountPlayer && mergeCandidate ? (
        <div className="managePlayersDialog__mergeFooter">
          <span className="managePlayersDialog__mergeFooterCopy">
            <GitMerge size={15} strokeWidth={2.4} aria-hidden="true" />
            <span>Another player found with same name</span>
          </span>
          <button
            className="managePlayersDialog__mergeBtn"
            type="button"
            onClick={() =>
              void model.onMergePlayers?.(player.id, mergeCandidate.id)
            }
            aria-label={`Merge ${mergeCandidate.name} into ${displayName}`}
            title={`Merge with ${mergeCandidate.name}`}
          >
            Merge
          </button>
        </div>
      ) : null}
    </article>
  );
}

function PlayerEditor({
  name,
  onCancel,
  onSave,
  validationMessage,
}: {
  name: string;
  onCancel: () => void;
  onSave: () => void;
  validationMessage?: string;
}) {
  const { editingColor, editingName, setEditingColor, setEditingName } =
    useManagePlayersDialogContext();
  return (
    <div className="managePlayersDialog__editStack">
      <div className="managePlayersDialog__editTop">
        <input
          className="input input--compact managePlayersDialog__editInput"
          value={editingName}
          onChange={(event) => setEditingName(event.target.value)}
          autoFocus
          maxLength={28}
          placeholder="Player name"
          aria-invalid={!!validationMessage}
        />
        <div className="managePlayersDialog__actionsRow managePlayersDialog__actionsRow--edit">
          <button
            className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--save"
            type="button"
            onClick={onSave}
            disabled={!clampName(editingName) || !!validationMessage}
            aria-label={`Save ${name}`}
            title="Save"
          >
            <Check size={15} strokeWidth={3} aria-hidden="true" />
          </button>
          <button
            className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--cancel"
            type="button"
            onClick={onCancel}
            aria-label={`Cancel editing ${name}`}
            title="Cancel"
          >
            <X size={15} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="managePlayersDialog__swatches"
        role="radiogroup"
        aria-label="Choose color for player"
      >
        {AVATAR_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className={
              color.value === editingColor
                ? "managePlayersDialog__swatch managePlayersDialog__swatch--selected"
                : "managePlayersDialog__swatch"
            }
            style={{ backgroundColor: color.value }}
            onClick={() => setEditingColor(color.value)}
            aria-label={color.label}
            aria-checked={color.value === editingColor}
            role="radio"
          />
        ))}
      </div>
      {validationMessage ? (
        <div className="managePlayersDialog__error" role="alert">
          {validationMessage}
        </div>
      ) : null}
    </div>
  );
}

function PlayerIdentity({
  displayName,
  onEdit,
  player,
  profile,
  isLinkedAccountPlayer,
}: {
  displayName: string;
  onEdit: () => void;
  player?: Player;
  profile?: PlayerProfile;
  isLinkedAccountPlayer: boolean;
}) {
  const model = useManagePlayersDialogContext();
  const isTaken = !!profile && model.takenProfileIds.has(profile.id);
  const isStaged = !!profile && model.stagedProfileIds.has(profile.id);
  return (
    <div className="managePlayersDialog__identity">
      <div className="managePlayersDialog__identityTop">
        <div className="managePlayersDialog__identityCopy">
          <span className="managePlayersDialog__nameRow">
            <span className="managePlayersDialog__name">{displayName}</span>
            {isLinkedAccountPlayer ? (
              <span
                className="managePlayersDialog__linkedIcon"
                aria-label="Joined with an invitation code"
                title="Joined with an invitation code"
              >
                <Link size={14} strokeWidth={2.5} aria-hidden="true" />
              </span>
            ) : null}
          </span>
          {player ? (
            <span
              className={`managePlayersDialog__meta${
                isLinkedAccountPlayer
                  ? " managePlayersDialog__meta--linked"
                  : ""
              }`}
            >
              {isLinkedAccountPlayer
                ? "Linked player"
                : profile?.isAccountPlayer
                  ? "Account player"
                  : "Saved player"}
            </span>
          ) : isTaken ? (
            <span className="managePlayersDialog__meta">In game</span>
          ) : null}
        </div>
        <div className="managePlayersDialog__actionsRow">
          {profile && !player ? (
            isTaken ? (
              <span className="pill pill--winner">In</span>
            ) : (
              <button
                className={`iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--add${isStaged ? " managePlayersDialog__actionBtn--queued" : ""}`}
                type="button"
                onClick={() => model.toggleProfile(profile.id)}
                aria-label={`${isStaged ? "Remove" : "Add"} ${displayName}`}
                title={isStaged ? "Queued" : "Add"}
              >
                {isStaged ? (
                  <Check size={15} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
                )}
              </button>
            )
          ) : null}
          {!isLinkedAccountPlayer ? (
            <button
              className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--edit"
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${displayName}`}
              title="Edit"
            >
              <Pencil size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : null}
          {player ? (
            <button
              className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
              type="button"
              onClick={() => void model.onDeletePlayer(player.id)}
              aria-label={`Remove ${displayName}`}
              title="Remove"
            >
              <X size={15} strokeWidth={2.7} aria-hidden="true" />
            </button>
          ) : profile && model.isAuthenticated && !profile.isAccountPlayer ? (
            <button
              className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
              type="button"
              onClick={() => model.onDeleteProfile(profile.id)}
              aria-label={`Delete saved player ${displayName}`}
              title="Delete saved player"
            >
              <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
