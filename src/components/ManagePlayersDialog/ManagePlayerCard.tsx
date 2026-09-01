import { translate } from "../../i18n/translate";
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
  const savedProfileIsTaken =
    props.kind === "saved" && model.takenProfileIds.has(profile!.id);
  const savedProfileIsStaged =
    props.kind === "saved" && model.stagedProfileIds.has(profile!.id);

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
      className={`managePlayersDialog__card${
        props.kind === "saved" && !savedProfileIsTaken
          ? " managePlayersDialog__card--selectable"
          : ""
      }${editing ? " managePlayersDialog__card--editing" : ""}`}
      onClick={(event) => {
        if (
          props.kind !== "saved" ||
          savedProfileIsTaken ||
          editing ||
          (event.target as HTMLElement).closest("button, input")
        ) {
          return;
        }
        model.toggleProfile(profile!.id);
      }}
      aria-label={
        props.kind === "saved" && !savedProfileIsTaken
          ? `${savedProfileIsStaged ? translate("copy.remove") : translate("copy.add")} ${displayName}`
          : undefined
      }
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
            <span>
              {translate("copy.anotherPlayerFoundWithSameName")}
            </span>
          </span>
          <button
            className="managePlayersDialog__mergeBtn"
            type="button"
            onClick={() =>
              void model.onMergePlayers?.(player.id, mergeCandidate.id)
            }
                              aria-label={translate("dynamic.mergeInto", [
                                mergeCandidate.name,
                                displayName,
                              ])}
                              title={translate("dynamic.mergeWith", [
                                mergeCandidate.name,
                              ])}
          >
            {translate("copy.merge")}</button>
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
          placeholder={translate("copy.playerName")}
          aria-invalid={!!validationMessage}
        />
        <div className="managePlayersDialog__actionsRow managePlayersDialog__actionsRow--edit">
          <button
            className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--save"
            type="button"
            onClick={onSave}
            disabled={!clampName(editingName) || !!validationMessage}
                aria-label={translate("dynamic.save", [name])}
            title={translate("copy.save")}
          >
            <Check size={15} strokeWidth={3} aria-hidden="true" />
          </button>
          <button
            className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--cancel"
            type="button"
            onClick={onCancel}
                aria-label={translate("dynamic.cancelEditing", [name])}
            title={translate("copy.cancel")}
          >
            <X size={15} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="managePlayersDialog__swatches"
        role="radiogroup"
        aria-label={translate("copy.chooseColorForPlayer")}
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
                aria-label={translate("copy.joinedWithAnInvitationCode")}
                title={translate("copy.joinedWithAnInvitationCode")}
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
                ? translate("copy.invitedPlayer")
                : profile?.isAccountPlayer
                  ? translate("copy.accountPlayer2")
                  : profile
                    ? translate("copy.savedPlayer")
                    : translate("copy.gameOnlyPlayer")}
            </span>
          ) : isTaken ? (
            <span className="managePlayersDialog__meta">
              {translate("copy.inGame")}
            </span>
          ) : null}
        </div>
        <div className="managePlayersDialog__actionsRow">
          {profile && !player ? (
            isTaken ? (
              <span className="pill pill--winner">{translate("copy.in")}</span>
            ) : (
              <button
                className={`iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--add${isStaged ? " managePlayersDialog__actionBtn--queued" : ""}`}
                type="button"
                onClick={() => model.toggleProfile(profile.id)}
            aria-label={translate(isStaged ? "dynamic.remove" : "dynamic.add", [
              displayName,
            ])}
                title={isStaged ? translate("copy.queued") : translate("copy.add")}
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
            aria-label={translate("dynamic.edit", [displayName])}
              title={translate("copy.edit")}
            >
              <Pencil size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : null}
          {player ? (
            <button
              className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
              type="button"
              onClick={() => void model.onDeletePlayer(player.id)}
              aria-label={translate("dynamic.remove", [displayName])}
              title={translate("copy.remove")}
            >
              <X size={15} strokeWidth={2.7} aria-hidden="true" />
            </button>
          ) : profile && model.isAuthenticated && !profile.isAccountPlayer ? (
            <button
              className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
              type="button"
              onClick={() => model.onDeleteProfile(profile.id)}
              aria-label={translate("dynamic.deleteSavedPlayer", [displayName])}
              title={translate("copy.deleteSavedPlayer")}
            >
              <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
