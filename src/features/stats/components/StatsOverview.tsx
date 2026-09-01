import { translate } from "../../../i18n/translate";
import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { StatsAdvancedCards } from "./StatsAdvancedCards";
import { StatsCharts } from "./StatsCharts";
import { StatsProPreview } from "./StatsProPreview";
import { ComparisonMetricCard, MetricCard } from "./StatsScreenParts";
import { compareValues, formatAveragePlacement } from "../utils/statsUtils";
import { useStatsScreenContext } from "../context/StatsScreenContext";

import { StatsTeamFocusCard } from "./StatsTeamFocusCard";
export function StatsOverview() {
  const {
    activeKind,
    selectedTeamReport,
    compareTeamReport,
    selectedTeamOption,
    selectedMemberProfiles,
    compareTeamOption,
    compareMemberProfiles,
    primaryReport,
    compareEnabled,
    compareReport,
    primaryName,
    compareName,
    canSeeAdvancedStats,
    chartPickerRef,
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
    setOpenChartGamePicker,
    setWinsChartGame,
    setRateChartGame,
    streakHistorySummary,
    headToHeadSummary,
    onOpenProPlan,
  } = useStatsScreenContext();
  if (!primaryReport) return null;
  return (
    <>
      {activeKind === "teams" && selectedTeamReport ? (
        <div
          className={`statsFocusCardGrid${
            compareTeamReport ? " statsFocusCardGrid--compare" : ""
          }`}
        >
          <StatsTeamFocusCard
            report={selectedTeamReport}
            option={selectedTeamOption}
            memberProfiles={selectedMemberProfiles}
            eyebrow={translate("copy.primaryTeam")}
          />
          {compareTeamReport ? (
            <StatsTeamFocusCard
              report={compareTeamReport}
              option={compareTeamOption}
              memberProfiles={compareMemberProfiles}
              eyebrow={translate("copy.comparedTeam")}
            />
          ) : null}
        </div>
      ) : null}

      {primaryReport && compareEnabled && compareReport ? (
        <div className="statsCompareMetricGrid">
          <ComparisonMetricCard
            label={translate("copy.wins")}
            leftName={primaryName}
            rightName={compareName}
            leftValue={primaryReport.wins}
            rightValue={compareReport?.wins ?? null}
            winner={compareValues(
              primaryReport.wins,
              compareReport?.wins ?? null,
            )}
            icon={<Trophy size={16} strokeWidth={2.2} aria-hidden="true" />}
          />
          <ComparisonMetricCard
            label={translate("copy.winRate")}
            leftName={primaryName}
            rightName={compareName}
            leftValue={`${primaryReport.winRate}%`}
            rightValue={compareReport ? `${compareReport.winRate}%` : null}
            winner={compareValues(
              primaryReport.winRate,
              compareReport?.winRate ?? null,
            )}
            icon={
              <SquareActivity size={16} strokeWidth={2.2} aria-hidden="true" />
            }
          />
          <ComparisonMetricCard
            label={translate("copy.currentStreak")}
            leftName={primaryName}
            rightName={compareName}
            leftValue={
              primaryReport.currentWinStreak
                ? `${primaryReport.currentWinStreak}x`
                : "—"
            }
            rightValue={
              compareReport
                ? compareReport.currentWinStreak
                  ? `${compareReport.currentWinStreak}x`
                  : "—"
                : null
            }
            winner={compareValues(
              primaryReport.currentWinStreak,
              compareReport?.currentWinStreak ?? null,
            )}
            icon={<Flame size={16} strokeWidth={2.2} aria-hidden="true" />}
          />
          <ComparisonMetricCard
            label={translate("copy.avgPlacement")}
            leftName={primaryName}
            rightName={compareName}
            leftValue={formatAveragePlacement(primaryReport.averagePlacement)}
            rightValue={
              compareReport
                ? formatAveragePlacement(compareReport.averagePlacement)
                : null
            }
            winner={compareValues(
              primaryReport.averagePlacement,
              compareReport?.averagePlacement ?? null,
              "lower",
            )}
            icon={<Medal size={16} strokeWidth={2.2} aria-hidden="true" />}
          />
        </div>
      ) : (
        <div className="statsKpiGrid">
          <MetricCard
            label={translate("copy.wins")}
            value={primaryReport.wins}
            copy={`${primaryReport.losses} losses, ${primaryReport.draws} draws`}
            icon={<Trophy size={16} strokeWidth={2.2} aria-hidden="true" />}
            accent
          />
          <MetricCard
            label={translate("copy.winRate")}
            value={`${primaryReport.winRate}%`}
            copy={`${primaryReport.completedGames} completed sessions`}
            icon={
              <SquareActivity size={16} strokeWidth={2.2} aria-hidden="true" />
            }
          />
          <MetricCard
            label={translate("copy.currentStreak")}
            value={
              primaryReport.currentWinStreak
                ? `${primaryReport.currentWinStreak}x`
                : "—"
            }
            copy={
              primaryReport.currentWinStreak
                ? "Consecutive wins right now"
                : translate("copy.noActiveWinStreak")
            }
            icon={<Flame size={16} strokeWidth={2.2} aria-hidden="true" />}
          />
          <MetricCard
            label={translate("copy.avgPlacement")}
            value={formatAveragePlacement(primaryReport.averagePlacement)}
            copy={
              typeof primaryReport.bestPlacement === "number"
                ? translate("dynamic.bestFinish", [primaryReport.bestPlacement])
                : translate("copy.noCompletedPlacementsYet")
            }
            icon={<Medal size={16} strokeWidth={2.2} aria-hidden="true" />}
          />
        </div>
      )}

      {canSeeAdvancedStats ? (
        <>
          <div ref={chartPickerRef}>
            <StatsCharts
              activeKind={activeKind}
              primaryName={primaryName}
              secondaryName={compareReport ? compareName : null}
              chartGameOptions={chartGameOptions}
              openChartGamePicker={openChartGamePicker}
              winsChartGame={winsChartGame}
              rateChartGame={rateChartGame}
              winsComparisonTrend={winsComparisonTrend}
              rateComparisonTrend={rateComparisonTrend}
              winsChartAxis={winsChartAxis}
              rateChartAxis={rateChartAxis}
              outcomeBreakdown={outcomeBreakdown}
              gameWinRateBreakdown={gameWinRateBreakdown}
              onToggleChartGamePicker={(picker) =>
                setOpenChartGamePicker((current) =>
                  current === picker ? null : picker,
                )
              }
              onSelectWinsChartGame={(value) => {
                setWinsChartGame(value);
                setOpenChartGamePicker(null);
              }}
              onSelectRateChartGame={(value) => {
                setRateChartGame(value);
                setOpenChartGamePicker(null);
              }}
            />
          </div>

          <StatsAdvancedCards
            activeKind={activeKind}
            streakSummary={streakHistorySummary}
            headToHeadSummary={headToHeadSummary}
            isLocked={false}
            onUpgrade={onOpenProPlan}
          />
        </>
      ) : (
        <StatsProPreview onUpgrade={onOpenProPlan} />
      )}
    </>
  );
}
