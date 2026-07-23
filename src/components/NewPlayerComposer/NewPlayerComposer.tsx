import { Plus } from "lucide-react";
import { AVATAR_COLORS } from "../../constants";
import { useMobileKeyboardCenteredInput } from "../../hooks/useMobileKeyboardCenteredInput";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import "./NewPlayerComposer.css";

type Props = {
  className?: string;
  triggerClassName?: string;
  isOpen: boolean;
  showTrigger?: boolean;
  isAuthenticated: boolean;
  disabled?: boolean;
  inputId?: string;
  name: string;
  color: (typeof AVATAR_COLORS)[number]["value"];
  saveAsProfile: boolean;
  validationMessage?: string;
  showPersistenceControls?: boolean;
  showCancelButton?: boolean;
  onOpen: () => void;
  onOpenAuth: () => void;
  onCancel: () => void;
  onAdd: () => void;
  onNameChange: (value: string) => void;
  onColorChange: (value: (typeof AVATAR_COLORS)[number]["value"]) => void;
  onSaveAsProfileChange: (value: boolean) => void;
};

export function NewPlayerComposer({
  className,
  triggerClassName,
  isOpen,
  showTrigger = true,
  isAuthenticated,
  disabled = false,
  inputId,
  name,
  color,
  saveAsProfile,
  validationMessage,
  showPersistenceControls = true,
  showCancelButton = true,
  onOpen,
  onOpenAuth,
  onCancel,
  onAdd,
  onNameChange,
  onColorChange,
  onSaveAsProfileChange,
}: Props) {
  const canAdd = !disabled && name.trim().length > 0 && !validationMessage;
  const { inputRef: nameInputRef, visibilityTargetRef } =
    useMobileKeyboardCenteredInput(isOpen && !disabled);

  if (!isOpen && showTrigger) {
    return (
      <button
        type="button"
        className={`teamPicker__createBtn${
          triggerClassName ? ` ${triggerClassName}` : ""
        }`}
        onClick={onOpen}
      >
        <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
        Add new player
      </button>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      ref={visibilityTargetRef}
      className={`newPlayerComposer${className ? ` ${className}` : ""}`}
    >
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
              ref={nameInputRef}
              id={inputId}
              className="input input--sm newPlayerComposer__input"
              placeholder="e.g. John"
              value={name}
              disabled={disabled}
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
              disabled={disabled}
              onClick={() => onColorChange(entry.value)}
              aria-label={`Use ${entry.id} color`}
              aria-pressed={color === entry.value}
            />
          ))}
        </div>
      </div>

      {showPersistenceControls || showCancelButton ? (
        <div
          className={`newPlayerComposer__footer${
            !showPersistenceControls ? " newPlayerComposer__footer--actionsOnly" : ""
          }`}
        >
          {showPersistenceControls ? (
            !isAuthenticated ? (
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
                <span>Save player in your account</span>
              </label>
            )
          ) : null}

          {showCancelButton ? (
            <button
              className="newPlayerComposer__close"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
