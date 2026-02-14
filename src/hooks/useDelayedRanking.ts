import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "../types";
import { computeRanks, sortPlayers } from "../utils/ranking";

function idsKey(players: Player[]): string {
  return players.map((p) => p.id).join("|");
}

function sortedIds(players: Player[], isLowScoreWins: boolean): string[] {
  return [...players]
    .sort((a, b) => sortPlayers(a, b, isLowScoreWins))
    .map((p) => p.id);
}

export function useDelayedRanking(
  players: Player[],
  delayMs = 1200,
  isLowScoreWins = false,
) {
  const playersRef = useRef<Player[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  const isLowScoreWinsRef = useRef(isLowScoreWins);
  useEffect(() => {
    isLowScoreWinsRef.current = isLowScoreWins;
  }, [isLowScoreWins]);

  const [orderIds, setOrderIds] = useState<string[]>(() =>
    sortedIds(players, isLowScoreWins),
  );
  const timerRef = useRef<number | null>(null);

  const key = useMemo(() => idsKey(players), [players]);

  const forceResort = useCallback(() => {
    setOrderIds(sortedIds(playersRef.current, isLowScoreWinsRef.current));
  }, []);

  const scheduleResort = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      forceResort();
    }, delayMs);
  }, [delayMs, forceResort]);

  useEffect(() => {
    // Add/remove players should update ordering immediately.
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOrderIds(sortedIds(players, isLowScoreWins));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isLowScoreWins]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const orderedPlayers = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p] as const));
    const out: Player[] = [];
    for (const id of orderIds) {
      const p = byId.get(id);
      if (p) out.push(p);
    }
    // In case orderIds is stale, append missing players deterministically.
    if (out.length !== players.length) {
      const missing = players
        .filter((p) => !orderIds.includes(p.id))
        .sort((a, b) => sortPlayers(a, b, isLowScoreWins));
      out.push(...missing);
    }
    return out;
  }, [orderIds, players, isLowScoreWins]);

  const ranks = useMemo(() => computeRanks(orderedPlayers), [orderedPlayers]);

  return { orderedPlayers, ranks, scheduleResort, forceResort };
}
