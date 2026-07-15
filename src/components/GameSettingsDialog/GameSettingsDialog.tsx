import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ScoreDirection, WinCondition } from "../../types";
import { ArrowDownUp, Dices, Flag, Timer, Trophy } from "lucide-react";
import {
  SettingsAuthCard,
  SettingsModeButton,
  SettingsRequirement,
  TimerSettings,
} from "./GameSettingsParts";
import "./GameSettingsDialog.css";

import type {
  GameSettingsDialogHandle,
  GameSettingsDialogProps,
} from "./gameSettingsTypes";
export type { GameSettingsDialogHandle } from "./gameSettingsTypes";

export const GameSettingsDialog = forwardRef<
  GameSettingsDialogHandle,
  GameSettingsDialogProps
>(function GameSettingsDialog(
  { game, isAuthenticated, onOpenAuth, onAddPlayer, onSave },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [name, setName] = useState(game.name);
  const [scoreRaw, setScoreRaw] = useState(
    String(
      game.winCondition === "reach_zero"
        ? game.startingScore
        : game.targetScore,
    ),
  );
  const [scoreDirection, setScoreDirection] = useState<ScoreDirection>(
    game.scoreDirection,
  );
  const [winCondition, setWinCondition] = useState<WinCondition>(
    game.winCondition,
  );
  const [winByTwo, setWinByTwo] = useState(game.winByTwo);
  const [manualEndOnly, setManualEndOnly] = useState(game.manualEndOnly);
  const [timerEnabled, setTimerEnabled] = useState(game.timerEnabled);
  const [diceEnabled, setDiceEnabled] = useState(game.diceEnabled);
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
    setScoreRaw(
      String(
        game.winCondition === "reach_zero"
          ? game.startingScore
          : game.targetScore,
      ),
    );
    setScoreDirection(game.scoreDirection);
    setWinCondition(game.winCondition);
    setWinByTwo(game.winByTwo);
    setManualEndOnly(game.manualEndOnly);
    setTimerEnabled(game.timerEnabled);
    setDiceEnabled(game.diceEnabled);
    setTimerMode(game.timerMode);
    setTimerMinutes(String(Math.max(1, Math.round(game.timerSeconds / 60))));
    setTimerSecondsRaw(String(Math.max(0, game.timerSeconds % 60)));
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  useImperativeHandle(ref, () => ({ open, close }), [game]);

  const parsedScore = Number.parseInt(scoreRaw, 10);
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
  const lowestNeedsMorePlayers =
    winCondition === "lowest" && game.players.length < 2;
  const winByTwoNeedsMorePlayers = winByTwo && game.players.length < 2;
  const ruleNeedsMorePlayers =
    lowestNeedsMorePlayers || winByTwoNeedsMorePlayers;
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(parsedScore) &&
    (manualEndOnly || parsedScore > 0) &&
    !ruleNeedsMorePlayers &&
    (!timerEnabled || timerMode === "stopwatch" || parsedTimerTotalSeconds > 0);

  return (
    <dialog className="dialog" ref={dialogRef}>
      <form
        className="dialog__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({
            name,
            scoreDirection,
            startingScore: scoreDirection === "down" ? parsedScore : 0,
            targetScore: winCondition === "reach_zero" ? 0 : parsedScore,
            winCondition,
            winByTwo,
            manualEndOnly,
            timerEnabled,
            diceEnabled,
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
            <SettingsAuthCard
              onSignIn={() => {
                close();
                onOpenAuth?.();
              }}
            />
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
            <span className="field__label">
              {winCondition === "reach_zero"
                ? "Starting score"
                : manualEndOnly
                  ? "Reference target"
                  : "Target score"}
            </span>
            <input
              className="input"
              value={scoreRaw}
              onChange={(e) =>
                setScoreRaw(e.target.value.replace(/[^\d]/g, ""))
              }
              inputMode="numeric"
            />
          </label>

          <div className="settingsModeGrid" aria-label="Game rules">
            <SettingsModeButton
              icon={<ArrowDownUp size={22} strokeWidth={2.3} />}
              title="Lowest wins"
              description="Lowest score wins."
              active={winCondition === "lowest"}
              onClick={() => {
                setScoreDirection("up");
                setWinCondition((value) =>
                  value === "lowest" ? "reach_target" : "lowest",
                );
              }}
            />
            <SettingsModeButton
              icon={<Flag size={22} strokeWidth={2.3} />}
              title="Manual finish"
              description="End from the game menu."
              active={manualEndOnly}
              onClick={() => setManualEndOnly((value) => !value)}
            />
            <SettingsModeButton
              icon={<Trophy size={22} strokeWidth={2.3} />}
              title="Win by 2"
              description="Leader needs a 2 point gap."
              active={winByTwo}
              disabled={winCondition === "reach_zero"}
              onClick={() => {
                if (winCondition === "reach_zero") return;
                setScoreDirection("up");
                setWinByTwo((value) => !value);
              }}
            />
            <SettingsModeButton
              icon={<Timer size={22} strokeWidth={2.3} />}
              title="Timer"
              description={
                timerEnabled
                  ? timerMode === "stopwatch"
                    ? "Stopwatch active."
                    : `${timerMinutes || "0"}m ${timerSecondsRaw || "0"}s`
                  : "No timer for this game."
              }
              active={timerEnabled}
              onClick={() => setTimerEnabled((value) => !value)}
            />
            <SettingsModeButton
              icon={<Dices size={22} strokeWidth={2.3} />}
              title="Dice"
              description="Dice roller available during the game."
              active={diceEnabled}
              onClick={() => setDiceEnabled((value) => !value)}
            />
          </div>

          {ruleNeedsMorePlayers ? (
            <SettingsRequirement
              lowestNeedsMorePlayers={lowestNeedsMorePlayers}
              onAddPlayer={
                onAddPlayer
                  ? () => {
                      close();
                      onAddPlayer();
                    }
                  : undefined
              }
            />
          ) : null}

          {timerEnabled ? (
            <TimerSettings
              mode={timerMode}
              minutes={timerMinutes}
              seconds={timerSecondsRaw}
              onModeChange={setTimerMode}
              onMinutesChange={setTimerMinutes}
              onSecondsChange={setTimerSecondsRaw}
            />
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
});
