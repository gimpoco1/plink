import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { ALL_CHART_GAMES, type CompareChartPoint } from "../types/statsTypes";

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
          {[ALL_CHART_GAMES, ...options].map((gameName) => (
            <button
              key={gameName}
              type="button"
              className={`statsChartGamePicker__option${
                value === gameName
                  ? " statsChartGamePicker__option--active"
                  : ""
              }`}
              onClick={() => onSelect(gameName)}
            >
              {gameName === ALL_CHART_GAMES ? "All games" : gameName}
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

type CompareChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: unknown;
    payload?: CompareChartPoint;
  }>;
  primaryLabel: string;
  secondaryLabel: string | null;
  valueType: "wins" | "rate";
  primaryColor: string;
  secondaryColor: string;
};

export function CompareChartTooltip({
  active,
  payload,
  primaryLabel,
  secondaryLabel,
  valueType,
  primaryColor,
  secondaryColor,
}: CompareChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const suffix = valueType === "rate" ? "%" : "";
  const valueFor = (dataKey: string) => {
    const value = payload.find((item) => item.dataKey === dataKey)?.value;
    return typeof value === "number" ? `${value}${suffix}` : "—";
  };
  const primaryValue = valueFor(
    valueType === "wins" ? "primaryWins" : "primaryRate",
  );
  const secondaryValue = valueFor(
    valueType === "wins" ? "secondaryWins" : "secondaryRate",
  );

  return (
    <div className="statsTooltip">
      <strong>{point.sessionName}</strong>
      <span>{point.fullDateTimeLabel}</span>
      <TooltipMetric
        label={primaryLabel}
        value={primaryValue}
        color={primaryColor}
      />
      {secondaryLabel ? (
        <TooltipMetric
          label={secondaryLabel}
          value={secondaryValue}
          color={secondaryColor}
        />
      ) : null}
    </div>
  );
}

function TooltipMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className="statsTooltip__metric"
      style={{ "--metric-color": color } as CSSProperties}
    >
      <span>{label}</span>
      <b>{value}</b>
    </span>
  );
}
