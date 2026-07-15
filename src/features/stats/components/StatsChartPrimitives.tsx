import type { CSSProperties, ReactNode } from "react";
import { Lock } from "lucide-react";

export const chartInteractionProps = {
  accessibilityLayer: false,
  tabIndex: -1,
} as const;

export function releaseChartFocus() {
  requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
}

export function LockedChartCard({
  children,
  isLocked,
  onUnlock,
}: {
  children: ReactNode;
  isLocked: boolean;
  onUnlock?: () => void;
}) {
  return (
    <section
      className={`statsPanel statsPanel--chart${isLocked ? " statsLockedChartCard" : ""}`}
    >
      <div className={isLocked ? "statsLockedChartCard__content" : undefined}>
        {children}
      </div>
      {isLocked ? (
        <div className="statsAdvancedLock">
          <span>
            <Lock size={13} strokeWidth={2.4} aria-hidden="true" />
            Pro charts
          </span>
          <button type="button" onClick={onUnlock}>
            Unlock charts
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function CompareBarTooltip({
  active,
  payload,
  suffix,
  primaryLabel,
  secondaryLabel,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value: unknown;
    payload?: {
      label?: string;
      primarySessions?: number;
      secondarySessions?: number;
    };
  }>;
  suffix: string;
  primaryLabel: string;
  secondaryLabel: string | null;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const label = first.payload?.label ?? "Value";
  const primaryEntry = payload.find(
    (entry) => entry.dataKey === "primaryValue",
  );
  const secondaryEntry = payload.find(
    (entry) => entry.dataKey === "secondaryValue",
  );
  const formatValue = (value: unknown) =>
    typeof value === "number" ? `${value}${suffix}` : "—";

  return (
    <div className="statsTooltip">
      <strong>{label}</strong>
      <span
        className="statsTooltip__metric"
        style={
          {
            "--metric-color": suffix === "%" ? "#7ad0ff" : "#d9ff4f",
          } as CSSProperties
        }
      >
        <span>
          {primaryLabel}
          {first.payload?.primarySessions
            ? ` · ${first.payload.primarySessions} sessions`
            : ""}
        </span>
        <b>{formatValue(primaryEntry?.value)}</b>
      </span>
      {secondaryLabel ? (
        <span
          className="statsTooltip__metric"
          style={{ "--metric-color": "#8f7cf6" } as CSSProperties}
        >
          <span>
            {secondaryLabel}
            {first.payload?.secondarySessions
              ? ` · ${first.payload.secondarySessions} sessions`
              : ""}
          </span>
          <b>{formatValue(secondaryEntry?.value)}</b>
        </span>
      ) : null}
    </div>
  );
}
