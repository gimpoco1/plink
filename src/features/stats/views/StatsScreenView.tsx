import { translate } from "../../../i18n/translate";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../../../components/HomeLockedState/StatsSkeleton";
import { useStatsScreenContext } from "../context/StatsScreenContext";
import { StatsSelector } from "../components/StatsSelector";
import { StatsReport } from "../components/StatsReport";

export function StatsScreenView() {
  const { handleStatsPointerDown, isAuthenticated, onOpenAuth } =
    useStatsScreenContext();
  return (
    <div
      className="tabContent tabContent--stats"
      onPointerDown={handleStatsPointerDown}
    >
      <div className="tabHeader">
        <div>
          <h2 className="tabTitle">{translate("tabs.stats")}</h2>
          <p className="tabSubtitle">
            {translate("copy.pickAPlayerOrTeamAndCompareTheirFormWinsAndTrends")}
          </p>
        </div>
      </div>
      {!isAuthenticated ? (
        <LockedFrame
          title={translate("copy.signInToUnlockStats")}
          onSignIn={onOpenAuth}
        >
          <StatsSkeleton />
        </LockedFrame>
      ) : (
        <div className="statsExperience">
          <StatsSelector />
          <StatsReport />
        </div>
      )}
    </div>
  );
}
