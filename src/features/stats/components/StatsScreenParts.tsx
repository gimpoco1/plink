import type { ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import { avatarStyleFor } from "../../../utils/color";
import { getInitials } from "../../../utils/text";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { type SelectableEntity } from "../types/statsTypes";
export {
  ChartGamePicker,
  ChartLegend,
  CompareChartTooltip,
} from "./StatsChartParts";

export function StatsScreenEmpty({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="statsEmptyPanel">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

export function EntitySwatch({
  option,
  size = "lg",
}: {
  option: SelectableEntity;
  size?: "lg" | "sm";
}) {
  const className = `statsEntityAvatar statsEntityAvatar--${size}`;
  if (option.icon) {
    return (
      <span
        className={`${className} statsEntityAvatar--team`}
        aria-hidden="true"
      >
        <TeamIcon icon={option.icon} size={24} strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={avatarStyleFor(option.avatarColor ?? "#6b7890")}
      aria-hidden="true"
    >
      {getInitials(option.name.replace(" (You)", ""))}
    </span>
  );
}

export function PickerButton({
  option,
  placeholder,
  onClick,
  isOpen,
}: {
  option: SelectableEntity | null;
  placeholder: string;
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      type="button"
      className={`statsPickerButton${isOpen ? " statsPickerButton--open" : ""}`}
      onClick={onClick}
      aria-expanded={isOpen}
    >
      <span className="statsPickerButton__value">
        {option ? <EntitySwatch option={option} size="sm" /> : null}
        <span className="statsPickerButton__copy">
          <strong>{option?.name ?? placeholder}</strong>
          <span>{option?.subtitle ?? "Choose a saved profile"}</span>
        </span>
      </span>
      <span className="statsPickerButton__chevron" aria-hidden="true">
        <ChevronDown size={18} strokeWidth={2.4} />
      </span>
    </button>
  );
}

export function PickerPopover({
  options,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  kind,
}: {
  options: SelectableEntity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  kind: "players" | "teams";
}) {
  return (
    <div className="statsPickerPopover">
      <label className="statsPickerPopover__search">
        <Search size={15} strokeWidth={2.4} aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={kind === "players" ? "Search players" : "Search teams"}
        />
      </label>
      <div className="statsPickerPopover__list">
        {options.length ? (
          options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`statsPickerPopover__option${
                option.id === selectedId
                  ? " statsPickerPopover__option--active"
                  : ""
              }`}
              onClick={() => onSelect(option.id)}
            >
              <EntitySwatch option={option} size="sm" />
              <span className="statsPickerPopover__copy">
                <strong>{option.name}</strong>
                <span>{option.subtitle}</span>
              </span>
            </button>
          ))
        ) : (
          <div className="statsPickerPopover__empty">No matches found.</div>
        )}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  copy,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  copy: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <article
      className={`statsMetricCard${accent ? " statsMetricCard--accent" : ""}`}
    >
      <div className="statsMetricCard__head">
        <span className="statsMetricCard__eyebrow">
          {icon}
          {label}
        </span>
        <strong>{value}</strong>
      </div>
      <p>{copy}</p>
    </article>
  );
}

export function ComparisonMetricCard({
  label,
  leftName,
  rightName,
  leftValue,
  rightValue,
  winner,
  icon,
}: {
  label: string;
  leftName: string;
  rightName: string;
  leftValue: ReactNode;
  rightValue: ReactNode;
  winner: "left" | "right" | "tie";
  icon: ReactNode;
}) {
  return (
    <article className="statsComparisonCard">
      <div className="statsComparisonCard__head">
        <span className="statsMetricCard__eyebrow">
          {icon}
          {label}
        </span>
      </div>
      <div className="statsComparisonCard__rows">
        <div
          className={`statsComparisonCard__row${
            winner === "left" ? " statsComparisonCard__row--winner" : ""
          }`}
        >
          <span>{leftName}</span>
          <strong>{leftValue}</strong>
        </div>
        <div
          className={`statsComparisonCard__row${
            winner === "right" ? " statsComparisonCard__row--winner" : ""
          }`}
        >
          <span>{rightName}</span>
          <strong>{rightValue ?? "—"}</strong>
        </div>
      </div>
    </article>
  );
}

export function PanelHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="statsPanel__head">
      <h3>{title}</h3>
      <span>{count}</span>
    </div>
  );
}
