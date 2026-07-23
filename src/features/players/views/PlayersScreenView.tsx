import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { PlayersSkeleton } from "../../../components/HomeLockedState/PlayersSkeleton";
import { LocalSessionsHint } from "../../../components/LocalSessionsHint/LocalSessionsHint";
import { PlayersScreenHeader } from "../components/PlayersScreenHeader";
import { PlayersScreenContextContent } from "../components/PlayersScreenContent";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function PlayersScreenView() {
  const {
    activeView,
    isAuthenticated,
    onDismissLocalSessionsHint,
    onOpenAuth,
    pendingLocalProfilesCount,
    pendingLocalSessionsCount,
    profiles,
    showLocalSessionsHint,
  } = usePlayersScreenContext();

  return (
    <div
      className={`tabContent tabContent--players${activeView === "teams" ? " tabContent--teamsTheme" : ""}`}
    >
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="profilesHint"
          sessionCount={pendingLocalSessionsCount}
          profileCount={pendingLocalProfilesCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenAuth}
        />
      ) : null}
      {isAuthenticated && profiles.length > 0 ? (
        <AdBannerSlot
          placement="Players"
          slotId={import.meta.env.VITE_ADSENSE_PLAYERS_SLOT_ID}
        />
      ) : null}
      <PlayersScreenHeader />
      {!isAuthenticated ? (
        <LockedFrame title="Sign in to save players." onSignIn={onOpenAuth}>
          <PlayersSkeleton />
        </LockedFrame>
      ) : (
        <PlayersScreenContextContent />
      )}
    </div>
  );
}
