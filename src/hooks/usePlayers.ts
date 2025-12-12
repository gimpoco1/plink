import { useEffect, useMemo, useState } from "react";
import type { Player } from "../types";
import { loadPlayers, savePlayers } from "../storage/playersStorage";
import { uid } from "../utils/id";
import { clampName } from "../utils/text";
import { computeRanks, sortPlayers } from "../utils/ranking";

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  const sortedPlayers = useMemo(() => [...players].sort(sortPlayers), [players]);
  const ranks = useMemo(() => computeRanks(sortedPlayers), [sortedPlayers]);
  const allZero = useMemo(() => players.length > 0 && players.every((p) => p.score === 0), [players]);

  function addPlayer(rawName: string, avatarColor: string, profileId?: string) {
    const name = clampName(rawName);
    if (!name) return false;
    const now = Date.now();
    setPlayers((prev) => [
      { id: uid(), name, score: 0, createdAt: now, reachedAt: now, avatarColor, profileId },
      ...prev,
    ]);
    return true;
  }

  function updateScore(playerId: string, delta: number) {
    if (!delta) return;
    const now = Date.now();
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, score: p.score + delta, reachedAt: now } : p)),
    );
  }

  function removePlayer(playerId: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }

  function resetScores() {
    const now = Date.now();
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, reachedAt: now })));
  }

  return { players, sortedPlayers, ranks, allZero, addPlayer, updateScore, removePlayer, resetScores };
}
