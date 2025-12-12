import { useEffect, useRef, useState } from "react";

export type PulseKind = "pos" | "neg";

export function useScorePulse() {
  const [pulseById, setPulseById] = useState<Record<string, PulseKind | undefined>>({});
  const pulseTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      for (const t of pulseTimersRef.current.values()) window.clearTimeout(t);
      pulseTimersRef.current.clear();
    };
  }, []);

  function triggerPulse(playerId: string, delta: number) {
    if (!delta) return;
    setPulseById((prev) => ({ ...prev, [playerId]: delta > 0 ? "pos" : "neg" }));

    const existing = pulseTimersRef.current.get(playerId);
    if (existing) window.clearTimeout(existing);

    const t = window.setTimeout(() => {
      setPulseById((prev) => {
        const { [playerId]: _removed, ...rest } = prev;
        return rest;
      });
      pulseTimersRef.current.delete(playerId);
    }, 380);

    pulseTimersRef.current.set(playerId, t);
  }

  return { pulseById, triggerPulse };
}

