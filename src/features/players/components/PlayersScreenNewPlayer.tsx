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
          placeholder="Player Name"
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
          label="new player"
        />
      </div>
      <div className="createCard__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onAddingPlayerChange(false)}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary btn--sm"
          disabled={!newName.trim()}
          onClick={createProfile}
        >
          Create
        </button>
      </div>
    </div>
  );
}
