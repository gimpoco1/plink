import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { Game } from "../../types";
import "./GameSettingsDialog.css";

export type GameSettingsDialogHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  game: Game;
  isAuthenticated: boolean;
  onOpenAuth?: () => void;
  onSave: (input: {
    name: string;
    targetPoints: number;
    isLowScoreWins: boolean;
    timerEnabled: boolean;
    timerMode: "countdown" | "stopwatch";
    timerSeconds: number;
  }) => void;
};

export const GameSettingsDialog = forwardRef<GameSettingsDialogHandle, Props>(
  function GameSettingsDialog(
    { game, isAuthenticated, onOpenAuth, onSave },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const [name, setName] = useState(game.name);
    const [targetRaw, setTargetRaw] = useState(String(game.targetPoints));
    const [isLowScoreWins, setIsLowScoreWins] = useState(game.isLowScoreWins);
    const [timerEnabled, setTimerEnabled] = useState(game.timerEnabled);
    const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">(
      game.timerMode,
    );
    const [timerMinutes, setTimerMinutes] = useState(
      String(Math.max(1, Math.round(game.timerSeconds / 60))),
    );
    const [timerSecondsRaw, setTimerSecondsRaw] = useState(
      String(Math.max(0, game.timerSeconds % 60)),
    );

    function open() {
      setName(game.name);
      setTargetRaw(String(game.targetPoints));
      setIsLowScoreWins(game.isLowScoreWins);
      setTimerEnabled(game.timerEnabled);
      setTimerMode(game.timerMode);
      setTimerMinutes(String(Math.max(1, Math.round(game.timerSeconds / 60))));
      setTimerSecondsRaw(String(Math.max(0, game.timerSeconds % 60)));
      dialogRef.current?.showModal();
    }

    function close() {
      dialogRef.current?.close();
    }

    useImperativeHandle(ref, () => ({ open, close }), [game]);

    const parsedTarget = Number.parseInt(targetRaw, 10);
    const parsedTimerMinutes = Number.parseInt(timerMinutes, 10);
    const parsedTimerSeconds = Number.parseInt(timerSecondsRaw, 10);
    const parsedTimerTotalSeconds = (() => {
      const mins = Number.isFinite(parsedTimerMinutes)
        ? Math.max(0, parsedTimerMinutes)
        : 0;
      const secs = Number.isFinite(parsedTimerSeconds)
        ? Math.max(0, Math.min(59, parsedTimerSeconds))
        : 0;
      return mins * 60 + secs;
    })();
    const canSave =
      name.trim().length > 0 &&
      Number.isFinite(parsedTarget) &&
      parsedTarget > 0 &&
      (!timerEnabled ||
        timerMode === "stopwatch" ||
        parsedTimerTotalSeconds > 0);

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
              timerEnabled,
              timerMode,
              timerSeconds:
                timerMode === "countdown"
                  ? Math.max(1, parsedTimerTotalSeconds)
                  : game.timerSeconds > 0
                    ? game.timerSeconds
                    : 300,
            });
            close();
          }}
        >
          <div className="dialog__head">
            <div className="dialog__titleWrap">
              <div className="dialog__eyebrow">Session rules</div>
              <div className="dialog__title">Game settings</div>
            </div>
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
            {!isAuthenticated ? (
              <div className="settingsAuthCard">
                <div className="settingsAuthCard__copy">
                  <strong>Sign in to save this game</strong>
                  <span>
                    Keep this session on your account and sync it across
                    devices.
                  </span>
                </div>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => {
                    close();
                    onOpenAuth?.();
                  }}
                >
                  Sign in
                </button>
              </div>
            ) : null}

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

            <label className="settingsToggle">
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
              />
              <span>Timer</span>
            </label>

            {timerEnabled ? (
              <div
                className={`settingsTimerRow${timerMode === "countdown" ? " settingsTimerRow--countdown" : ""}`}
              >
                <label className="field">
                  <span className="field__label">Timer mode</span>
                  <div className="settingsTimerToggle">
                    <button
                      type="button"
                      className={`settingsTimerToggle__btn${timerMode === "countdown" ? " settingsTimerToggle__btn--active" : ""}`}
                      onClick={() => setTimerMode("countdown")}
                    >
                      Countdown
                    </button>
                    <button
                      type="button"
                      className={`settingsTimerToggle__btn${timerMode === "stopwatch" ? " settingsTimerToggle__btn--active" : ""}`}
                      onClick={() => setTimerMode("stopwatch")}
                    >
                      Stopwatch
                    </button>
                  </div>
                </label>
                {timerMode === "countdown" ? (
                  <>
                    <label className="field timerNumberField">
                      <span className="field__label">Minutes</span>
                      <input
                        className="input"
                        value={timerMinutes}
                        onChange={(e) =>
                          setTimerMinutes(e.target.value.replace(/[^\d]/g, ""))
                        }
                        inputMode="numeric"
                      />
                    </label>
                    <label className="field timerNumberField">
                      <span className="field__label">Seconds</span>
                      <input
                        className="input"
                        value={timerSecondsRaw}
                        onChange={(e) =>
                          setTimerSecondsRaw(
                            e.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                        inputMode="numeric"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="dialog__actions">
            <button className="btn btn--ghost" type="button" onClick={close}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </form>
      </dialog>
    );
  },
);
