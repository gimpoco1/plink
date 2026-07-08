import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lock } from "lucide-react";
import {
  ChartGamePicker,
  ChartLegend,
  CompareChartTooltip,
  PanelHeader,
} from "./StatsScreenParts";
import type {
  CompareChartPoint,
  OpenChartGamePicker,
} from "./statsTypes";
import type { ChartAxis } from "./statsUtils";

type OutcomeBreakdownPoint = {
  label: string;
  primaryValue: number;
  secondaryValue?: number;
  outcomeFill: string;
};

type GameWinRateBreakdownPoint = {
  label: string;
  primaryValue: number;
  secondaryValue?: number;
  primarySessions: number;
  secondarySessions?: number;
};

type StatsChartsProps = {
  activeKind: "players" | "teams";
  primaryName: string;
  secondaryName: string | null;
  chartGameOptions: string[];
  openChartGamePicker: OpenChartGamePicker;
  winsChartGame: string;
  rateChartGame: string;
  winsComparisonTrend: CompareChartPoint[];
  rateComparisonTrend: CompareChartPoint[];
  winsChartAxis: ChartAxis;
  rateChartAxis: ChartAxis;
  outcomeBreakdown: OutcomeBreakdownPoint[];
  gameWinRateBreakdown: GameWinRateBreakdownPoint[];
  onToggleChartGamePicker: (picker: Exclude<OpenChartGamePicker, null>) => void;
  onSelectWinsChartGame: (value: string) => void;
  onSelectRateChartGame: (value: string) => void;
  isLocked?: boolean;
  onUnlock?: () => void;
};

const chartInteractionProps = {
  accessibilityLayer: false,
  tabIndex: -1,
} as const;

function releaseChartFocus() {
  requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

export function StatsCharts({
  activeKind,
  primaryName,
  secondaryName,
  chartGameOptions,
  openChartGamePicker,
  winsChartGame,
  rateChartGame,
  winsComparisonTrend,
  rateComparisonTrend,
  winsChartAxis,
  rateChartAxis,
  outcomeBreakdown,
  gameWinRateBreakdown,
  onToggleChartGamePicker,
  onSelectWinsChartGame,
  onSelectRateChartGame,
  isLocked = false,
  onUnlock,
}: StatsChartsProps) {
  return (
    <div className="statsChartGrid">
      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader
          title={activeKind === "players" ? "Wins over time" : "Team wins over time"}
          count={winsComparisonTrend.length}
        />
        <ChartGamePicker
          value={winsChartGame}
          options={chartGameOptions}
          isOpen={openChartGamePicker === "wins"}
          onToggle={() => onToggleChartGamePicker("wins")}
          onSelect={onSelectWinsChartGame}
        />
        {winsComparisonTrend.length ? (
          <div className="statsChartShell">
            <ChartLegend
              primaryLabel={primaryName}
              secondaryLabel={secondaryName}
              primaryColor="#d9ff4f"
              secondaryColor="#8f7cf6"
            />
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart
                {...chartInteractionProps}
                data={winsComparisonTrend}
                margin={{ top: 6, right: 4, bottom: 0, left: -10 }}
                onTouchEnd={releaseChartFocus}
              >
                <defs>
                  <linearGradient id="statsPrimaryFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d9ff4f" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#d9ff4f" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={winsChartAxis.ticks}
                  tickFormatter={(value) =>
                    winsChartAxis.labelByX.get(Number(value)) ?? ""
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.54)", fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis
                  allowDecimals={false}
                  width={30}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.54)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={false}
                  content={
                    <CompareChartTooltip
                      primaryLabel={primaryName}
                      secondaryLabel={secondaryName}
                      valueType="wins"
                      primaryColor="#d9ff4f"
                      secondaryColor="#8f7cf6"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="primaryWins"
                  stroke="#d9ff4f"
                  fill="url(#statsPrimaryFill)"
                  strokeWidth={2.6}
                />
                {secondaryName ? (
                  <Line
                    type="monotone"
                    dataKey="secondaryWins"
                    stroke="#8f7cf6"
                    strokeWidth={2.4}
                    dot={false}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="emptyMsg">No sessions tracked yet.</div>
        )}
      </LockedChartCard>

      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader title="Running win rate" count={rateComparisonTrend.length} />
        <ChartGamePicker
          value={rateChartGame}
          options={chartGameOptions}
          isOpen={openChartGamePicker === "rate"}
          onToggle={() => onToggleChartGamePicker("rate")}
          onSelect={onSelectRateChartGame}
        />
        {rateComparisonTrend.length ? (
          <div className="statsChartShell">
            <ChartLegend
              primaryLabel={primaryName}
              secondaryLabel={secondaryName}
              primaryColor="#7ad0ff"
              secondaryColor="#8f7cf6"
            />
            <ResponsiveContainer width="100%" height={190}>
              <RechartsLineChart
                {...chartInteractionProps}
                data={rateComparisonTrend}
                margin={{ top: 6, right: 4, bottom: 0, left: -2 }}
                onTouchEnd={releaseChartFocus}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={rateChartAxis.ticks}
                  tickFormatter={(value) =>
                    rateChartAxis.labelByX.get(Number(value)) ?? ""
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.54)", fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis
                  domain={[0, 100]}
                  width={42}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.54)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={false}
                  content={
                    <CompareChartTooltip
                      primaryLabel={primaryName}
                      secondaryLabel={secondaryName}
                      valueType="rate"
                      primaryColor="#7ad0ff"
                      secondaryColor="#8f7cf6"
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="primaryRate"
                  stroke="#7ad0ff"
                  strokeWidth={2.6}
                  dot={false}
                />
                {secondaryName ? (
                  <Line
                    type="monotone"
                    dataKey="secondaryRate"
                    stroke="#8f7cf6"
                    strokeWidth={2.4}
                    dot={false}
                  />
                ) : null}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="emptyMsg">No trend yet.</div>
        )}
      </LockedChartCard>

      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader title="Outcomes by result" count={outcomeBreakdown.length} />
        {outcomeBreakdown.length ? (
          <div className="statsChartShell statsChartShell--bar">
            {secondaryName ? (
              <ChartLegend
                primaryLabel={primaryName}
                secondaryLabel={secondaryName}
                primaryColor="#d9ff4f"
                secondaryColor="#8f7cf6"
              />
            ) : null}
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                {...chartInteractionProps}
                data={outcomeBreakdown}
                margin={{ top: 12, right: 4, bottom: 0, left: 0 }}
                onTouchEnd={releaseChartFocus}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.62)", fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  width={34}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.54)", fontSize: 10 }}
                />
                <Tooltip
                  content={
                    <CompareBarTooltip
                      primaryLabel={primaryName}
                      secondaryLabel={secondaryName}
                      suffix=""
                    />
                  }
                  cursor={false}
                />
                <Bar
                  dataKey="primaryValue"
                  name={primaryName}
                  radius={[10, 10, 4, 4]}
                  barSize={secondaryName ? 16 : 34}
                >
                  {outcomeBreakdown.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={secondaryName ? "#d9ff4f" : entry.outcomeFill}
                    />
                  ))}
                </Bar>
                {secondaryName ? (
                  <Bar
                    dataKey="secondaryValue"
                    name={secondaryName}
                    fill="#8f7cf6"
                    radius={[10, 10, 4, 4]}
                    barSize={16}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="emptyMsg">No completed results yet.</div>
        )}
      </LockedChartCard>

      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader title="Win rate by game" count={gameWinRateBreakdown.length} />
        {gameWinRateBreakdown.length ? (
          <div className="statsChartShell statsChartShell--bar">
            {secondaryName ? (
              <ChartLegend
                primaryLabel={primaryName}
                secondaryLabel={secondaryName}
                primaryColor="#7ad0ff"
                secondaryColor="#8f7cf6"
              />
            ) : null}
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                {...chartInteractionProps}
                data={gameWinRateBreakdown}
                layout="vertical"
                margin={{ top: 4, right: 10, bottom: 0, left: 0 }}
                onTouchEnd={releaseChartFocus}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  hide
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={86}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(217, 228, 235, 0.62)", fontSize: 10 }}
                />
                <Tooltip
                  content={
                    <CompareBarTooltip
                      primaryLabel={primaryName}
                      secondaryLabel={secondaryName}
                      suffix="%"
                    />
                  }
                  cursor={false}
                />
                <Bar
                  dataKey="primaryValue"
                  name={primaryName}
                  fill="#7ad0ff"
                  radius={[0, 10, 10, 0]}
                  barSize={secondaryName ? 10 : 18}
                  background={{ fill: "rgba(255,255,255,0.035)", radius: 10 }}
                />
                {secondaryName ? (
                  <Bar
                    dataKey="secondaryValue"
                    name={secondaryName}
                    fill="#8f7cf6"
                    radius={[0, 10, 10, 0]}
                    barSize={10}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="emptyMsg">No game rates yet.</div>
        )}
      </LockedChartCard>
    </div>
  );
}

function LockedChartCard({
  children,
  isLocked,
  onUnlock,
}: {
  children: React.ReactNode;
  isLocked: boolean;
  onUnlock?: () => void;
}) {
  return (
    <section className={`statsPanel statsPanel--chart${isLocked ? " statsLockedChartCard" : ""}`}>
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

function CompareBarTooltip({
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
  const primaryEntry = payload.find((entry) => entry.dataKey === "primaryValue");
  const secondaryEntry = payload.find((entry) => entry.dataKey === "secondaryValue");
  const formatValue = (value: unknown) =>
    typeof value === "number" ? `${value}${suffix}` : "—";

  return (
    <div className="statsTooltip">
      <strong>{label}</strong>
      <span
        className="statsTooltip__metric"
        style={{ "--metric-color": suffix === "%" ? "#7ad0ff" : "#d9ff4f" } as React.CSSProperties}
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
          style={{ "--metric-color": "#8f7cf6" } as React.CSSProperties}
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
