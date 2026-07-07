import type { CSSProperties, ReactNode } from "react";
import {
  ChevronDown,
  Dumbbell,
  Search,
  Trophy,
  Shield,
  Flag,
  Target,
  Zap,
  Flame,
  Star,
} from "lucide-react";
import { DEFAULT_TEAM_ICON } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import {
  ALL_CHART_GAMES,
  type CompareChartPoint,
  type SelectableEntity,
} from "./statsTypes";

const TEAM_ICON_COMPONENTS = {
  dumbbell: Dumbbell,
  trophy: Trophy,
  shield: Shield,
  flag: Flag,
  target: Target,
  zap: Zap,
  flame: Flame,
  star: Star,
} as const;

function TeamGlyph({ icon }: { icon?: string }) {
  const Icon =
    TEAM_ICON_COMPONENTS[
      (icon ?? DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
    ] ?? Dumbbell;
  return <Icon size={24} strokeWidth={2.4} aria-hidden="true" />;
}

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
      <span className={`${className} statsEntityAvatar--team`} aria-hidden="true">
        <TeamGlyph icon={option.icon} />
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
    <article className={`statsMetricCard${accent ? " statsMetricCard--accent" : ""}`}>
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

export function PanelHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="statsPanel__head">
      <h3>{title}</h3>
      <span>{count}</span>
    </div>
  );
}

export function ChartGamePicker({
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const label = value === ALL_CHART_GAMES ? "All games" : value;

  return (
    <div className="statsChartGamePicker">
      <button
        type="button"
        className={`statsChartGamePicker__button${
          isOpen ? " statsChartGamePicker__button--open" : ""
        }`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>Game</span>
        <strong>{label}</strong>
        <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="statsChartGamePicker__menu">
          <button
            type="button"
            className={`statsChartGamePicker__option${
              value === ALL_CHART_GAMES ? " statsChartGamePicker__option--active" : ""
            }`}
            onClick={() => onSelect(ALL_CHART_GAMES)}
          >
            All games
          </button>
          {options.map((gameName) => (
            <button
              key={gameName}
              type="button"
              className={`statsChartGamePicker__option${
                value === gameName ? " statsChartGamePicker__option--active" : ""
              }`}
              onClick={() => onSelect(gameName)}
            >
              {gameName}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChartLegend({
  primaryLabel,
  secondaryLabel,
  primaryColor,
  secondaryColor,
}: {
  primaryLabel: string;
  secondaryLabel: string | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div className="statsChartLegend" aria-label="Chart legend">
      <span style={{ "--legend-color": primaryColor } as CSSProperties}>
        {primaryLabel}
      </span>
      {secondaryLabel ? (
        <span style={{ "--legend-color": secondaryColor } as CSSProperties}>
          {secondaryLabel}
        </span>
      ) : null}
    </div>
  );
}

export function CompareChartTooltip({
  active,
  payload,
  primaryLabel,
  secondaryLabel,
  valueType,
  primaryColor,
  secondaryColor,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: unknown; payload?: CompareChartPoint }>;
  primaryLabel: string;
  secondaryLabel: string | null;
  valueType: "wins" | "rate";
  primaryColor: string;
  secondaryColor: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const suffix = valueType === "rate" ? "%" : "";
  const valueFor = (dataKey: string) => {
    const entry = payload.find((item) => item.dataKey === dataKey);
    const value = entry?.value;
    return typeof value === "number" ? `${value}${suffix}` : "—";
  };
  const primaryValue =
    valueType === "wins" ? valueFor("primaryWins") : valueFor("primaryRate");
  const secondaryValue =
    valueType === "wins"
      ? valueFor("secondaryWins")
      : valueFor("secondaryRate");

  return (
    <div className="statsTooltip">
      <strong>{point.sessionName}</strong>
      <span>{point.fullDateTimeLabel}</span>
      <span
        className="statsTooltip__metric"
        style={{ "--metric-color": primaryColor } as CSSProperties}
      >
        <span>{primaryLabel}</span>
        <b>{primaryValue}</b>
      </span>
      {secondaryLabel ? (
        <span
          className="statsTooltip__metric"
          style={{ "--metric-color": secondaryColor } as CSSProperties}
        >
          <span>{secondaryLabel}</span>
          <b>{secondaryValue}</b>
        </span>
      ) : null}
    </div>
  );
}
