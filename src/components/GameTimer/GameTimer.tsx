import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, TimerReset, TriangleAlert } from "lucide-react";
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
    ? Math.min(totalMs, snapshot.elapsedMs)
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
      ? Math.min(totalMs, value)
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
  const actionLabel = isRunning
    ? "Pause"
    : hasProgress && !isDone
      ? "Resume"
      : "Start";

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

  function adjustBySeconds(deltaSeconds: number) {
    const deltaMs = deltaSeconds * 1000;
    const currentElapsed =
      startedAtRef.current === null
        ? elapsedMs
        : normalizeElapsedMs(elapsedMs + (Date.now() - startedAtRef.current));

    const nextElapsed = normalizeElapsedMs(
      mode === "countdown"
        ? currentElapsed - deltaMs
        : currentElapsed + deltaMs,
    );

    setElapsedMs(nextElapsed);
    if (isRunning) {
      startedAtRef.current = Date.now();
      setTick((value) => value + 1);
    } else {
      startedAtRef.current = null;
    }
  }

  return (
    <div
      className={`gameTimer${isDone ? " gameTimer--done" : ""}`}
      ref={timerRef}
    >
      {isOpen ? (
        <div className="gameTimer__panel">
          <div className="gameTimer__mode">
            {mode === "countdown" ? "Countdown" : "Stopwatch"}
          </div>
          <div className="gameTimer__quickAdjust">
            <button
              className="btn btn--sm btn--ghost gameTimer__adjustBtn"
              type="button"
              onClick={() => adjustBySeconds(-10)}
            >
              -10s
            </button>
            <div className="gameTimer__clock">{formatClock(displayMs)}</div>
            <button
              className="btn btn--sm btn--ghost gameTimer__adjustBtn"
              type="button"
              onClick={() => adjustBySeconds(10)}
            >
              +10s
            </button>
          </div>
          <div className="gameTimer__actions">
            <button
              className="btn btn--sm gameTimer__start"
              type="button"
              onClick={() => (isRunning ? pause() : start())}
            >
              {actionLabel}
            </button>
            <button
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
      {isDone ? (
        <button
          className="gameTimer__alert"
          type="button"
          onClick={reset}
          aria-label="Time's up. Reset timer"
        >
          <TriangleAlert size={14} strokeWidth={2.4} aria-hidden="true" />
          <span>Time&apos;s up</span>
        </button>
      ) : null}
      <div className="gameTimer__dock">
        <div
          className="gameTimer__fab"
          role="group"
          aria-label="Timer controls"
        >
          <div className="gameTimer__fabRow">
            <button
              className="gameTimer__fabMain"
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              aria-label="Open timer"
            >
              <TimerReset size={18} strokeWidth={2.2} aria-hidden="true" />
              <span>{formatClock(displayMs)}</span>
            </button>
            <button
              className={`gameTimer__fabToggle${isRunning ? " gameTimer__fabToggle--running" : ""}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isRunning) pause();
                else start();
              }}
              aria-label={actionLabel}
            >
              {isRunning ? (
                <Pause size={18} strokeWidth={2.4} aria-hidden="true" />
              ) : (
                <Play size={18} strokeWidth={2.4} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
