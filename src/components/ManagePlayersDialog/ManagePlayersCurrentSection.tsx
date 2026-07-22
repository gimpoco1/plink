import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManagePlayerCard } from "./ManagePlayerCard";

function getMergeName(name: string) {
  return name.trim().replace(/\s+#\d+$/i, "").toLowerCase();
}

export function ManagePlayersCurrentSection() {
  const { currentGamePlayers, linkedPlayerIds, profiles } =
    useManagePlayersDialogContext();
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
        {currentGamePlayers.map((player) => {
          const isLinkedAccountPlayer = linkedPlayerIds.has(player.id);
          const mergeCandidate = isLinkedAccountPlayer
            ? currentGamePlayers.find(
                (candidate) =>
                  candidate.id !== player.id &&
                  !linkedPlayerIds.has(candidate.id) &&
                  getMergeName(candidate.name) === getMergeName(player.name),
              )
            : undefined;
          return (
            <ManagePlayerCard
              key={player.id}
              kind="current"
              player={player}
              isLinkedAccountPlayer={isLinkedAccountPlayer}
              mergeCandidate={mergeCandidate}
              profile={profiles.find(
                (profile) => profile.id === player.profileId,
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
