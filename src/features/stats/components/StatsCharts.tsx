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
import { StatsTrendCharts } from "./StatsTrendCharts";
import {
  CompareBarTooltip,
  LockedChartCard,
  chartInteractionProps,
  releaseChartFocus,
} from "./StatsChartPrimitives";
import {
  ChartGamePicker,
  ChartLegend,
  CompareChartTooltip,
  PanelHeader,
} from "./StatsScreenParts";
import type { CompareChartPoint, OpenChartGamePicker } from "../types/statsTypes";
import type { ChartAxis } from "../utils/statsUtils";

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

export type StatsChartsProps = {
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
      <StatsTrendCharts
        activeKind={activeKind}
        primaryName={primaryName}
        secondaryName={secondaryName}
        chartGameOptions={chartGameOptions}
        openChartGamePicker={openChartGamePicker}
        winsChartGame={winsChartGame}
        rateChartGame={rateChartGame}
        winsComparisonTrend={winsComparisonTrend}
        rateComparisonTrend={rateComparisonTrend}
        winsChartAxis={winsChartAxis}
        rateChartAxis={rateChartAxis}
        onToggleChartGamePicker={onToggleChartGamePicker}
        onSelectWinsChartGame={onSelectWinsChartGame}
        onSelectRateChartGame={onSelectRateChartGame}
        isLocked={isLocked}
        onUnlock={onUnlock}
      />

      <LockedChartCard isLocked={isLocked} onUnlock={onUnlock}>
        <PanelHeader
          title="Outcomes by result"
          count={outcomeBreakdown.length}
        />
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
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
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
        <PanelHeader
          title="Win rate by game"
          count={gameWinRateBreakdown.length}
        />
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
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis type="number" domain={[0, 100]} hide />
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
