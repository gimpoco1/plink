import { Plus } from "lucide-react";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function PlayersScreenHeader() {
  const {
    activeCountLabel,
    activeView,
    addingPlayer,
    addingTeam,
    canAccessTeamsView,
    canUseTeams,
    closeTeamBuilder,
    handleTeamsViewPress,
    isAuthenticated,
    onActiveViewChange,
    onAddingPlayerChange,
    openTeamBuilder,
    titleActionLabel,
  } = usePlayersScreenContext();

  return (
    <div className="tabHeader playersScreenHeader">
      <div className="playersScreenHeader__content">
        <div className="playersScreenHeader__titleRow">
          <div className="playersScreenHeader__titleGroup">
            <h2 className="tabTitle">
              {isAuthenticated && activeView === "teams" ? "Teams" : "Players"}
            </h2>
            {isAuthenticated ? (
              <span className="playersScreenCount">{activeCountLabel}</span>
            ) : null}
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              className="playersScreenHeader__action"
              disabled={activeView === "teams" && !canUseTeams}
              aria-expanded={
                activeView === "players" ? addingPlayer : addingTeam
              }
              onClick={() => {
                if (activeView === "players") onAddingPlayerChange(true);
                else if (!addingTeam) openTeamBuilder();
              }}
            >
              <Plus size={18} strokeWidth={2.8} aria-hidden="true" />
              {titleActionLabel}
            </button>
          ) : null}
        </div>
        <p className="tabSubtitle">
          {!isAuthenticated || activeView === "players"
            ? "Reuse profiles and track cumulative results across sessions."
            : "Build reusable groups for team-based games."}
        </p>
        {isAuthenticated ? (
          <div
            className="playersHeaderSwitch"
            role="tablist"
            aria-label="Players view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "players"}
              className={`playersHeaderSwitch__option${activeView === "players" ? " playersHeaderSwitch__option--active" : ""}`}
              onClick={() => {
                onActiveViewChange("players");
                closeTeamBuilder();
              }}
            >
              Individuals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "teams"}
              aria-disabled={!canAccessTeamsView}
              className={`playersHeaderSwitch__option${activeView === "teams" ? " playersHeaderSwitch__option--active" : ""}${!canAccessTeamsView ? " playersHeaderSwitch__option--locked" : ""}`}
              onClick={handleTeamsViewPress}
            >
              Teams
              {!canAccessTeamsView ? (
                <span className="playersHeaderSwitch__badge">Pro</span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
