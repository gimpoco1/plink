import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManagePlayerCard } from "./ManagePlayerCard";

export function ManagePlayersCurrentSection() {
  const { currentGamePlayers, profiles } = useManagePlayersDialogContext();
  if (currentGamePlayers.length === 0) {
    return (
      <div className="managePlayersDialog__empty">
        No players in this game yet.
      </div>
    );
  }

  return (
    <section className="managePlayersDialog__section">
      <div className="managePlayersDialog__titleRow">
        <div className="managePlayersDialog__simpleTitle">
          Players in this game
        </div>
        <span
          className="managePlayersDialog__countChip"
          aria-label={`${currentGamePlayers.length} players in this game`}
        >
          {currentGamePlayers.length}
        </span>
      </div>
      <div className="managePlayersDialog__list">
        {currentGamePlayers.map((player) => (
          <ManagePlayerCard
            key={player.id}
            kind="current"
            player={player}
            profile={profiles.find(
              (profile) => profile.id === player.profileId,
            )}
          />
        ))}
      </div>
    </section>
  );
}
