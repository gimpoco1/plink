import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadTimerSnapshot,
  saveTimerSnapshot,
} from "../../storage/timerStorage";
import "./GameTimer.css";

type Props = {
  gameId: string;
  mode: "countdown" | "stopwatch";
  durationSeconds: number;
};

function restoreElapsedMs(
  gameId: string,
  mode: "countdown" | "stopwatch",
  durationSeconds: number,
) {
  const snapshot = loadTimerSnapshot(gameId);
  if (
    !snapshot ||
    snapshot.mode !== mode ||
    snapshot.durationSeconds !== durationSeconds
  ) {
    return 0;
  }

  const totalMs = Math.max(1, durationSeconds) * 1000;
  return mode === "countdown"
    ? Math.max(0, Math.min(totalMs, snapshot.elapsedMs))
    : Math.max(0, snapshot.elapsedMs);
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function GameTimer({ gameId, mode, durationSeconds }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(() =>
    restoreElapsedMs(gameId, mode, durationSeconds),
  );
  const [tick, setTick] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const t = window.setInterval(() => setTick((v) => v + 1), 250);
    return () => window.clearInterval(t);
  }, [isRunning]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (!timerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  const totalMs = Math.max(1, durationSeconds) * 1000;
  const normalizeElapsedMs = (value: number) =>
    mode === "countdown"
      ? Math.max(0, Math.min(totalMs, value))
      : Math.max(0, value);

  const activeElapsed = useMemo(() => {
    if (!isRunning || startedAtRef.current === null) {
      return normalizeElapsedMs(elapsedMs);
    }
    return normalizeElapsedMs(elapsedMs + (Date.now() - startedAtRef.current));
  }, [elapsedMs, isRunning, tick, totalMs]);

  const displayMs =
    mode === "countdown"
      ? Math.max(0, totalMs - activeElapsed)
      : Math.max(0, activeElapsed);
  const isDone = mode === "countdown" && displayMs <= 0;
  const hasProgress = elapsedMs > 0 || (isRunning && activeElapsed > 0);
  const actionLabel = isRunning ? "Pause" : hasProgress && !isDone ? "Resume" : "Start";

  useEffect(() => {
    if (!isDone || !isRunning) return;
    setIsRunning(false);
    setElapsedMs(totalMs);
    startedAtRef.current = null;
  }, [isDone, isRunning, totalMs]);

  useEffect(() => {
    saveTimerSnapshot(gameId, {
      mode,
      durationSeconds,
      elapsedMs: activeElapsed,
    });
  }, [activeElapsed, durationSeconds, gameId, mode]);

  useEffect(() => {
    return () => {
      const startedAt = startedAtRef.current;
      const nextElapsed =
        startedAt === null
          ? elapsedMs
          : normalizeElapsedMs(elapsedMs + (Date.now() - startedAt));

      saveTimerSnapshot(gameId, {
        mode,
        durationSeconds,
        elapsedMs: nextElapsed,
      });
    };
  }, [durationSeconds, elapsedMs, gameId, mode, totalMs]);

  function start() {
    if (isRunning) return;
    if (mode === "countdown" && isDone) {
      setElapsedMs(0);
    }
    startedAtRef.current = Date.now();
    setIsRunning(true);
  }

  function pause() {
    if (!isRunning) return;
    const startedAt = startedAtRef.current;
    if (startedAt === null) {
      setIsRunning(false);
      return;
    }
    const now = Date.now();
    setElapsedMs((prev) => normalizeElapsedMs(prev + (now - startedAt)));
    startedAtRef.current = null;
    setIsRunning(false);
  }

  function reset() {
    setElapsedMs(0);
    startedAtRef.current = null;
    setIsRunning(false);
  }

  return (
    <div className="gameTimer" ref={timerRef}>
      {isOpen ? (
        <div className="gameTimer__panel">
          <div className="gameTimer__mode">
            {mode === "countdown" ? "Countdown" : "Stopwatch"}
          </div>
          <div className="gameTimer__clock">{formatClock(displayMs)}</div>
          <div className="gameTimer__actions">
            <button
              className="btn btn--sm gameTimer__start"
              type="button"
              onClick={() => (isRunning ? pause() : start())}
            >
              {actionLabel}
            </button>
            <button className="btn btn--sm btn--ghost" type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      ) : null}
      <button
        className="gameTimer__fab"
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Timer"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 13V9M9 3h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>{formatClock(displayMs)}</span>
      </button>
    </div>
  );
}
