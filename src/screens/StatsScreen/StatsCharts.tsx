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
import type {
  CompareChartPoint,
  OpenChartGamePicker,
} from "./statsTypes";
import type { ChartAxis } from "./statsUtils";

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
  onToggleChartGamePicker: (picker: Exclude<OpenChartGamePicker, null>) => void;
  onSelectWinsChartGame: (value: string) => void;
  onSelectRateChartGame: (value: string) => void;
};

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
  onToggleChartGamePicker,
  onSelectWinsChartGame,
  onSelectRateChartGame,
}: StatsChartsProps) {
  return (
    <div className="statsChartGrid">
      <section className="statsPanel statsPanel--chart">
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
                data={winsComparisonTrend}
                margin={{ top: 6, right: 4, bottom: 0, left: -10 }}
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
      </section>

      <section className="statsPanel statsPanel--chart">
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
                data={rateComparisonTrend}
                margin={{ top: 6, right: 4, bottom: 0, left: -2 }}
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
      </section>
    </div>
  );
}
