import { useRef } from "react";
import { AddPlayerDialog, type AddPlayerDialogHandle } from "./components/AddPlayerDialog";
import { ConfirmDialog, type ConfirmDialogHandle } from "./components/ConfirmDialog";
import { PlayerCard } from "./components/PlayerCard";
import { TopBar } from "./components/TopBar";
import { usePlayers } from "./hooks/usePlayers";
import { useScorePulse } from "./hooks/useScorePulse";

export default function App() {
  const { players, sortedPlayers, ranks, allZero, addPlayer, updateScore, removePlayer, resetScores } = usePlayers();
  const { pulseById, triggerPulse } = useScorePulse();
  const addDialogRef = useRef<AddPlayerDialogHandle | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle | null>(null);
  const hasPlayers = players.length > 0;

  return (
    <div className="app">
      <TopBar
        hasPlayers={hasPlayers}
        playerCount={players.length}
        onAddPlayer={() => addDialogRef.current?.open()}
        onResetGame={async () => {
          if (!players.length) return;
          const ok = await confirmRef.current?.confirm({
            title: "Reset game",
            message: "Reset all scores to 0?",
            confirmText: "Reset",
            tone: "danger",
          });
          if (!ok) return;
          resetScores();
        }}
      />

      <main className="content">
        {!hasPlayers ? (
          <section className="empty">
            <h1 className="empty__title">Track points fast.</h1>
            <button className="btn btn--primary btn--xl" type="button" onClick={() => addDialogRef.current?.open()}>
              Add your first player
            </button>
          </section>
        ) : (
          <section className="grid" aria-label="Players">
            {sortedPlayers.map((player) => {
              const rank = ranks.get(player.id) ?? 1;
              const pulse = pulseById[player.id];
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  rank={rank}
                  showRank={!allZero}
                  pulse={pulse}
                  onDelta={(playerId, delta) => {
                    updateScore(playerId, delta);
                    triggerPulse(playerId, delta);
                  }}
                  onDelete={async (playerId) => {
                    const p = players.find((x) => x.id === playerId);
                    const label = p ? p.name : "this player";
                    const ok = await confirmRef.current?.confirm({
                      title: "Delete player",
                      message: `Remove "${label}" from the game?`,
                      confirmText: "Delete",
                      tone: "danger",
                    });
                    if (!ok) return;
                    removePlayer(playerId);
                  }}
                />
              );
            })}
          </section>
        )}
      </main>

      <AddPlayerDialog ref={addDialogRef} onAdd={(name) => addPlayer(name)} />
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
