import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartGamePicker,
  ChartLegend,
  CompareChartTooltip,
  PanelHeader,
} from "./StatsScreenParts";
import {
  LockedChartCard,
  chartInteractionProps,
  releaseChartFocus,
} from "./StatsChartPrimitives";
import type { StatsChartsProps } from "./StatsCharts";

type Props = Pick<
  StatsChartsProps,
  | "activeKind"
  | "primaryName"
  | "secondaryName"
  | "chartGameOptions"
  | "openChartGamePicker"
  | "winsChartGame"
  | "rateChartGame"
  | "winsComparisonTrend"
  | "rateComparisonTrend"
  | "winsChartAxis"
  | "rateChartAxis"
  | "onToggleChartGamePicker"
  | "onSelectWinsChartGame"
  | "onSelectRateChartGame"
  | "isLocked"
  | "onUnlock"
>;

export function StatsTrendCharts(props: Props) {
  const {
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
    onToggleChartGamePicker,
    onSelectWinsChartGame,
    onSelectRateChartGame,
    isLocked = false,
    onUnlock,
  } = props;
  return (
    <>
      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader
          title={
            activeKind === "players" ? "Wins over time" : "Team wins over time"
          }
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
                  <linearGradient
                    id="statsPrimaryFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#d9ff4f" stopOpacity={0.34} />
                    <stop
                      offset="100%"
                      stopColor="#d9ff4f"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
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
        <PanelHeader
          title="Running win rate"
          count={rateComparisonTrend.length}
        />
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
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
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
    </>
  );
}
