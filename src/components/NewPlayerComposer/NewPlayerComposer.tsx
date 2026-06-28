import { AVATAR_COLORS } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import "./NewPlayerComposer.css";

type Props = {
  isOpen: boolean;
  isAuthenticated: boolean;
  name: string;
  color: (typeof AVATAR_COLORS)[number]["value"];
  saveAsProfile: boolean;
  validationMessage?: string;
  onOpen: () => void;
  onOpenAuth: () => void;
  onCancel: () => void;
  onAdd: () => void;
  onNameChange: (value: string) => void;
  onColorChange: (value: (typeof AVATAR_COLORS)[number]["value"]) => void;
  onSaveAsProfileChange: (value: boolean) => void;
};

export function NewPlayerComposer({
  isOpen,
  isAuthenticated,
  name,
  color,
  saveAsProfile,
  validationMessage,
  onOpen,
  onOpenAuth,
  onCancel,
  onAdd,
  onNameChange,
  onColorChange,
  onSaveAsProfileChange,
}: Props) {
  const canAdd = name.trim().length > 0 && !validationMessage;

  if (!isOpen) {
    return (
      <button type="button" className="newPlayerTrigger" onClick={onOpen}>
        <div className="newPlayerTrigger__icon">+</div>
        <span className="newPlayerTrigger__copy">
          <strong>Add player</strong>
        </span>
      </button>
    );
  }

  return (
    <div className="newPlayerComposer">
      <div className="newPlayerComposer__header">
        <span>Player name</span>
      </div>
      <div className="newPlayerComposer__top">
        <label className="field newPlayerComposer__field">
          <div className="newPlayerComposer__inputShell">
            <div
              className="newPlayerComposer__preview"
              style={avatarStyleFor(color)}
              aria-hidden="true"
            >
              {name.trim() ? getInitials(name) : "+"}
            </div>
            <input
              className="input input--sm newPlayerComposer__input"
              autoFocus
              placeholder="e.g. Gia"
              value={name}
              aria-invalid={!!validationMessage}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canAdd) onAdd();
                if (e.key === "Escape") onCancel();
              }}
            />
          </div>
        </label>
        <button
          className="btn btn--primary btn--sm newPlayerComposer__submit"
          type="button"
          disabled={!canAdd}
          onClick={onAdd}
        >
          Add
        </button>
      </div>
      {validationMessage ? (
        <div className="newPlayerComposer__error" role="alert">
          {validationMessage}
        </div>
      ) : null}

      <div className="newPlayerComposer__colors">
        <div className="newPlayerComposer__label">Player color</div>
        <div className="newPlayerComposer__swatches">
          {AVATAR_COLORS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="colorDisc colorDisc--large"
              style={{ background: entry.value }}
              data-active={color === entry.value}
              onClick={() => onColorChange(entry.value)}
              aria-label={`Use ${entry.id} color`}
              aria-pressed={color === entry.value}
            />
          ))}
        </div>
      </div>

      <div className="newPlayerComposer__footer">
        {!isAuthenticated ? (
          <button
            className="newPlayerComposer__guestNote"
            type="button"
            onClick={onOpenAuth}
          >
            <strong>Sign in to save player</strong>
          </button>
        ) : (
          <label className="saveProfileOption newPlayerComposer__save">
            <input
              type="checkbox"
              checked={saveAsProfile}
              onChange={(e) => onSaveAsProfileChange(e.target.checked)}
            />
            <span>Remember player</span>
          </label>
        )}

        <button
          className="newPlayerComposer__close"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
