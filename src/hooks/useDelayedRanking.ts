import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "../types";
import { computeRanks, sortPlayers } from "../utils/ranking";

function idsKey(players: Player[]): string {
  return players.map((p) => p.id).join("|");
}

function rankingKey(players: Player[]): string {
  return players
    .map((p) => `${p.id}:${p.score}:${p.reachedAt}:${p.createdAt}:${p.name}`)
    .join("|");
}

function sortedIds(players: Player[], lowToHigh: boolean): string[] {
  return [...players]
    .sort((a, b) => sortPlayers(a, b, lowToHigh))
    .map((p) => p.id);
}

export function useDelayedRanking(
  players: Player[],
  delayMs = 1200,
  lowToHigh = false,
) {
  const playersRef = useRef<Player[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  const lowToHighRef = useRef(lowToHigh);
  useEffect(() => {
    lowToHighRef.current = lowToHigh;
  }, [lowToHigh]);

  const [orderIds, setOrderIds] = useState<string[]>(() =>
    sortedIds(players, lowToHigh),
  );
  const timerRef = useRef<number | null>(null);

  const key = useMemo(() => idsKey(players), [players]);
  const rankKey = useMemo(() => rankingKey(players), [players]);

  const forceResort = useCallback(() => {
    setOrderIds(sortedIds(playersRef.current, lowToHighRef.current));
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
    setOrderIds(sortedIds(players, lowToHigh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lowToHigh]);

  useEffect(() => {
    // Remote score updates do not call scheduleResort(), so apply them
    // immediately. Local score taps keep their delayed resort while pending.
    if (timerRef.current) return;
    setOrderIds(sortedIds(players, lowToHigh));
  }, [rankKey, lowToHigh, players]);

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
        .sort((a, b) => sortPlayers(a, b, lowToHigh));
      out.push(...missing);
    }
    return out;
  }, [orderIds, players, lowToHigh]);

  const ranks = useMemo(() => computeRanks(orderedPlayers), [orderedPlayers]);

  return { orderedPlayers, ranks, scheduleResort, forceResort };
}
