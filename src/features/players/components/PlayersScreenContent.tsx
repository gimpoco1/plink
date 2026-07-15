import { NewPlayerForm } from "./PlayersScreenNewPlayer";
import { TeamBuilder } from "./PlayersScreenTeamBuilder";
import { PlayersGrid } from "./PlayersScreenPlayersGrid";
import { TeamsList } from "./PlayersScreenTeamsList";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function PlayersScreenContextContent() {
  const { activeView, addingPlayer, addingTeam, teamBuilderSlotRef } =
    usePlayersScreenContext();
  return (
    <>
      {activeView === "players" && addingPlayer ? (
        <div className="playersCreateSlot">
          <NewPlayerForm />
        </div>
      ) : null}
      {activeView === "teams" && addingTeam ? (
        <div ref={teamBuilderSlotRef} className="playersCreateSlot">
          <TeamBuilder />
        </div>
      ) : null}
      {activeView === "players" ? <PlayersGrid /> : <TeamsList />}
    </>
  );
}
