import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
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
      <AdBannerSlot
        placement="Stats"
        slotId={import.meta.env.VITE_ADSENSE_STATS_SLOT_ID}
      />
      <div className="tabHeader">
        <div>
          <h2 className="tabTitle">Stats</h2>
          <p className="tabSubtitle">
            Pick a player or team and compare their form, wins, and trends over
            time.
          </p>
        </div>
      </div>
      {!isAuthenticated ? (
        <LockedFrame title="Sign in to unlock stats." onSignIn={onOpenAuth}>
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
