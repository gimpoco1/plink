import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { Game } from "../../types";
import "./GameSettingsDialog.css";

export type GameSettingsDialogHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  game: Game;
  onSave: (input: {
    name: string;
    targetPoints: number;
    isLowScoreWins: boolean;
  }) => void;
};

export const GameSettingsDialog = forwardRef<GameSettingsDialogHandle, Props>(
  function GameSettingsDialog({ game, onSave }, ref) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const [name, setName] = useState(game.name);
    const [targetRaw, setTargetRaw] = useState(String(game.targetPoints));
    const [isLowScoreWins, setIsLowScoreWins] = useState(game.isLowScoreWins);

    function open() {
      setName(game.name);
      setTargetRaw(String(game.targetPoints));
      setIsLowScoreWins(game.isLowScoreWins);
      dialogRef.current?.showModal();
    }

    function close() {
      dialogRef.current?.close();
    }

    useImperativeHandle(ref, () => ({ open, close }), [game]);

    const parsedTarget = Number.parseInt(targetRaw, 10);
    const canSave =
      name.trim().length > 0 &&
      Number.isFinite(parsedTarget) &&
      parsedTarget > 0;

    return (
      <dialog className="dialog" ref={dialogRef}>
        <form
          className="dialog__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave) return;
            onSave({
              name,
              targetPoints: parsedTarget,
              isLowScoreWins,
            });
            close();
          }}
        >
          <div className="dialog__head">
            <div className="dialog__title">Game settings</div>
            <button
              className="iconbtn"
              type="button"
              onClick={close}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="dialog__body settingsDialogBody">
            <label className="field">
              <span className="field__label">Game name</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={28}
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span className="field__label">Target score</span>
              <input
                className="input"
                value={targetRaw}
                onChange={(e) =>
                  setTargetRaw(e.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
              />
            </label>

            <label className="settingsToggle">
              <input
                type="checkbox"
                checked={isLowScoreWins}
                onChange={(e) => setIsLowScoreWins(e.target.checked)}
              />
              <span>Reverse scoring (higher score loses)</span>
            </label>
          </div>

          <div className="dialog__actions">
            <button className="btn btn--ghost" type="button" onClick={close}>
              Cancel
            </button>
            <button className="btn btn--primary" type="submit" disabled={!canSave}>
              Save
            </button>
          </div>
        </form>
      </dialog>
    );
  },
);
