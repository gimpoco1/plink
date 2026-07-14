import type { ReactNode } from "react";
import { Check, Plus } from "lucide-react";

export function SectionLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="sectionLabel">
      <span className="sectionLabel__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}

export function ModeButton({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`modeCard${active ? " modeCard--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="modeCard__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="modeCard__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </button>
  );
}

export function SelectionStateIcon({ selected }: { selected: boolean }) {
  return (
    <span
      className={`participantOption__state${
        selected ? " participantOption__state--selected" : ""
      }`}
      aria-hidden="true"
    >
      {selected ? (
        <Check size={15} strokeWidth={2.8} />
      ) : (
        <Plus size={15} strokeWidth={2.8} />
      )}
    </span>
  );
}

export function TimerChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`timerPanel__modeBtn${active ? " timerPanel__modeBtn--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TimerInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  return (
    <label className="field timerNumberField">
      <span className="timerNumberField__label">{label}</span>
      <input
        className="input timerNumberField__input"
        value={value}
        inputMode="numeric"
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, "");
          if (!digits) {
            onChange("");
            return;
          }

          const numeric = Number.parseInt(digits, 10);
          onChange(
            String(max !== undefined ? Math.min(max, numeric) : numeric),
          );
        }}
      />
    </label>
  );
}
