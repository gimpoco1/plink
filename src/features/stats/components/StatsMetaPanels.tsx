import { translate } from "../../../i18n/translate";
import { PanelHeader } from "./StatsScreenParts";
import { formatPlacement, getStatusTone } from "../utils/statsUtils";
import { STATUS_LABELS } from "../types/statsTypes";
import { useStatsScreenContext } from "../context/StatsScreenContext";

export function StatsMetaPanels() {
  const { primaryName, primaryReport } = useStatsScreenContext();
  if (!primaryReport) return null;
  return (
    <div className="statsMetaGrid">
      <section className="statsPanel">
        <PanelHeader
          title={translate("dynamic.recentSessionsFor", [primaryName])}
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
          <div className="emptyMsg">
            {translate("copy.noSessionsTrackedYet")}
          </div>
        )}
      </section>

      <section className="statsPanel">
        <PanelHeader
          title={translate("dynamic.bestGamesFor", [primaryName])}
          count={primaryReport.gameBreakdown.length}
        />
        {primaryReport.gameBreakdown.length ? (
          <div className="statsBreakdownList">
            {primaryReport.gameBreakdown.map((game) => (
              <div key={game.name} className="statsBreakdownRow">
                <div className="statsBreakdownRow__left">
                  <strong>{game.name}</strong>
                  <span>
                    {game.sessions} {translate("copy.sessions2")} {game.wins} {translate("copy.wins2")}
                  </span>
                </div>
                <div className="statsBreakdownRow__right">
                  <span>{game.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyMsg">
            {translate("copy.noGameBreakdownYet")}
          </div>
        )}
      </section>
    </div>
  );
}
