import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../../../components/HomeLockedState/StatsSkeleton";
import { StatsAdvancedCards } from "./StatsAdvancedCards";
import { StatsCharts } from "./StatsCharts";
import { StatsProPreview } from "./StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "./StatsScreenParts";
import {
  compareValues,
  formatAveragePlacement,
  formatPlacement,
  getDisplayName,
  getStatusTone,
} from "../utils/statsUtils";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import type { PlayerProfile } from "../../../types";
import { STATUS_LABELS, type SelectableEntity } from "../types/statsTypes";
import type { SubjectReport } from "../../../utils/advancedStats";
import { useStatsScreenContext } from "../context/StatsScreenContext";

export function StatsMetaPanels() {
  const { primaryName, primaryReport } = useStatsScreenContext();
  if (!primaryReport) return null;
  return (
    <div className="statsMetaGrid">
      <section className="statsPanel">
        <PanelHeader
          title={`Recent sessions for ${primaryName}`}
          count={primaryReport.sessions.length}
        />
        {primaryReport.sessions.length ? (
          <div className="statsSessionList">
            {primaryReport.sessions.map((session) => (
              <div key={session.id} className="statsSessionRow">
                <div className="statsSessionRow__left">
                  <strong>{session.sessionName}</strong>
                  <span>
                    {session.dateLabel}
                    {session.isTeamGame && session.teamName
                      ? ` · ${session.teamName}`
                      : ""}
                  </span>
                </div>
                <div className="statsSessionRow__right">
                  <span className="statsSessionPlacement">
                    {formatPlacement(session.placement, session.placementMax)}
                  </span>
                  <span
                    className={`statsStatus ${getStatusTone(
                      session.resultKind,
                    )}`}
                  >
                    {STATUS_LABELS[session.resultKind]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyMsg">No sessions tracked yet.</div>
        )}
      </section>

      <section className="statsPanel">
        <PanelHeader
          title={`Best games for ${primaryName}`}
          count={primaryReport.gameBreakdown.length}
        />
        {primaryReport.gameBreakdown.length ? (
          <div className="statsBreakdownList">
            {primaryReport.gameBreakdown.map((game) => (
              <div key={game.name} className="statsBreakdownRow">
                <div className="statsBreakdownRow__left">
                  <strong>{game.name}</strong>
                  <span>
                    {game.sessions} sessions · {game.wins} wins
                  </span>
                </div>
                <div className="statsBreakdownRow__right">
                  <span>{game.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyMsg">No game breakdown yet.</div>
        )}
      </section>
    </div>
  );
}
