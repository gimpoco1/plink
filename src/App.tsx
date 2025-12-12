import { useRef } from "react";
import {
  AddPlayerDialog,
  type AddPlayerDialogHandle,
} from "./components/AddPlayerDialog";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "./components/ConfirmDialog";
import { PlayerCard } from "./components/PlayerCard";
import { TopBar } from "./components/TopBar";
import { usePlayers } from "./hooks/usePlayers";
import { useProfiles } from "./hooks/useProfiles";
import { useScorePulse } from "./hooks/useScorePulse";

export default function App() {
  const {
    players,
    sortedPlayers,
    ranks,
    allZero,
    addPlayer,
    updateScore,
    removePlayer,
    resetScores,
  } = usePlayers();
  const { profiles, upsertProfile, deleteProfile } = useProfiles();
  const { pulseById, triggerPulse } = useScorePulse();
  const addDialogRef = useRef<AddPlayerDialogHandle | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle | null>(null);
  const hasPlayers = players.length > 0;
  const hasNonZeroScore = players.some((p) => p.score !== 0);
  const takenProfileIds = new Set(players.map((p) => p.profileId).filter(Boolean) as string[]);

  return (
    <div className="app">
      <TopBar
        hasPlayers={hasPlayers}
        playerCount={players.length}
        showReset={hasNonZeroScore}
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
            <h1 className="empty_title">Track points fast.</h1>
            <button
              className="btn btn--primary btn--xl"
              type="button"
              onClick={() => addDialogRef.current?.open()}
            >
              Add a player
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

      <AddPlayerDialog
        ref={addDialogRef}
        profiles={profiles}
        takenProfileIds={takenProfileIds}
        onAddFromProfile={(profileId) => {
          const profile = profiles.find((p) => p.id === profileId);
          if (!profile) return;
          if (takenProfileIds.has(profileId)) return;
          addPlayer(profile.name, profile.avatarColor, profileId);
        }}
        onDeleteProfile={async (profileId) => {
          const profile = profiles.find((p) => p.id === profileId);
          const label = profile ? profile.name : "this player";
          const ok = await confirmRef.current?.confirm({
            title: "Delete saved player",
            message: `Delete "${label}" from your saved players?`,
            confirmText: "Delete",
            tone: "danger",
          });
          if (!ok) return;
          deleteProfile(profileId);
        }}
        onCreateAndAdd={(name, avatarColor, saveForLater) => {
          if (!saveForLater) {
            addPlayer(name, avatarColor);
            return true;
          }

          const profile = upsertProfile(name, avatarColor);
          if (!profile) return false;
          if (!takenProfileIds.has(profile.id)) addPlayer(profile.name, profile.avatarColor, profile.id);
          return true;
        }}
      />
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
