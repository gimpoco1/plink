import { translate } from "../../../i18n/translate";
import { avatarStyleFor } from "../../../utils/color";
import { getInitials } from "../../../utils/text";
import { ColorPicker } from "./PlayersScreenParts";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function NewPlayerForm() {
  const {
    createProfile,
    newColor,
    newName,
    onAddingPlayerChange,
    setNewColor,
    setNewName,
  } = usePlayersScreenContext();
  return (
    <div className="createCard profileCard profileCard--new">
      <div className="createCard__top">
        <span
          className="profileAvatar createCard__avatar"
          style={avatarStyleFor(newColor)}
        >
          {newName.trim() ? getInitials(newName) : "+"}
        </span>
        <input
          autoFocus
          className="editInput createCard__input"
          placeholder={translate("copy.playerName2")}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") createProfile();
            if (event.key === "Escape") onAddingPlayerChange(false);
          }}
        />
      </div>
      <div className="createCard__picker">
        <ColorPicker
          value={newColor}
          onChange={setNewColor}
          label={translate("copy.newPlayer")}
        />
      </div>
      <div className="createCard__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onAddingPlayerChange(false)}
        >
          {translate("copy.cancel")}
        </button>
        <button
          className="btn btn--primary btn--sm"
          disabled={!newName.trim()}
          onClick={createProfile}
        >
          {translate("copy.create")}
        </button>
      </div>
    </div>
  );
}
