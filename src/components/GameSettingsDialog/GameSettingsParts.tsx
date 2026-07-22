import type { ReactNode } from "react";

export function QuickScoreSettings({
  smallValue,
  largeValue,
  isValid,
  onSmallValueChange,
  onLargeValueChange,
}: {
  smallValue: string;
  largeValue: string;
  isValid: boolean;
  onSmallValueChange: (value: string) => void;
  onLargeValueChange: (value: string) => void;
}) {
  return (
    <fieldset
      className="quickScoreSettings"
      aria-labelledby="quick-score-settings-title"
    >
      <h3
        className="quickScoreSettings__title"
        id="quick-score-settings-title"
      >
        Quick score buttons
      </h3>
      <p>Choose the two point amounts shown on every player card.</p>
      <div className="quickScoreSettings__fields">
        <label className="field">
          <span className="field__label">Small step</span>
          <input
            className="input"
            value={smallValue}
            inputMode="numeric"
            aria-invalid={!isValid}
            onChange={(event) => onSmallValueChange(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Large step</span>
          <input
            className="input"
            value={largeValue}
            inputMode="numeric"
            aria-invalid={!isValid}
            onChange={(event) => onLargeValueChange(event.target.value)}
          />
        </label>
      </div>
      {!isValid ? (
        <span className="quickScoreSettings__error" role="status">
          Use two different positive values, smallest first.
        </span>
      ) : null}
    </fieldset>
  );
}

export function SettingsAuthCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="settingsAuthCard">
      <div className="settingsAuthCard__copy">
        <strong>Sign in to save this game</strong>
        <span>
          Keep this session on your account and sync it across devices.
        </span>
      </div>
      <button className="btn btn--primary" type="button" onClick={onSignIn}>
        Sign in
      </button>
    </div>
  );
}

export function SettingsRequirement({
  lowestNeedsMorePlayers,
  onAddPlayer,
}: {
  lowestNeedsMorePlayers: boolean;
  onAddPlayer?: () => void;
}) {
  return (
    <div className="settingsRequirement" role="status">
      <div className="settingsRequirement__copy">
        <strong>Add one more player</strong>
        <span>
          {lowestNeedsMorePlayers
            ? "Lowest score mode needs at least 2 players to compare scores."
            : "Win by 2 needs at least 2 players to compare the lead."}{" "}
          Add another player, then return here to turn it on.
        </span>
      </div>
      {onAddPlayer ? (
        <button className="btn btn--ghost" type="button" onClick={onAddPlayer}>
          Add player
        </button>
      ) : null}
    </div>
  );
}

export function SettingsModeButton({
  icon,
  title,
  description,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`settingsModeCard${active ? " settingsModeCard--active" : ""}${
        disabled ? " settingsModeCard--disabled" : ""
      }`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="settingsModeCard__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settingsModeCard__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </button>
  );
}

export function TimerSettings({
  mode,
  minutes,
  seconds,
  onModeChange,
  onMinutesChange,
  onSecondsChange,
}: {
  mode: "countdown" | "stopwatch";
  minutes: string;
  seconds: string;
  onModeChange: (mode: "countdown" | "stopwatch") => void;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
}) {
  const numeric = (value: string) => value.replace(/[^\d]/g, "");
  return (
    <div
      className={`settingsTimerRow${
        mode === "countdown" ? " settingsTimerRow--countdown" : ""
      }`}
    >
      <label className="field">
        <span className="field__label">Timer mode</span>
        <div className="settingsTimerToggle">
          {(["countdown", "stopwatch"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`settingsTimerToggle__btn${
                mode === option ? " settingsTimerToggle__btn--active" : ""
              }`}
              onClick={() => onModeChange(option)}
            >
              {option === "countdown" ? "Countdown" : "Stopwatch"}
            </button>
          ))}
        </div>
      </label>
      {mode === "countdown" ? (
        <>
          <TimerNumberField
            label="Minutes"
            value={minutes}
            onChange={(value) => onMinutesChange(numeric(value))}
          />
          <TimerNumberField
            label="Seconds"
            value={seconds}
            onChange={(value) => onSecondsChange(numeric(value))}
          />
        </>
      ) : null}
    </div>
  );
}

function TimerNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field timerNumberField">
      <span className="field__label">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
      />
    </label>
  );
}
