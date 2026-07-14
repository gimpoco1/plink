import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Dices } from "lucide-react";
import "./GameDiceTray.css";
import { DiceCanvas } from "./DiceCanvas";
import {
  RESULT_REVEAL_DELAY_MS,
  ROLL_DURATION_MS,
  formatRollSummary,
  randomDieValue,
  type DiceCount,
  type DiceStateByCount,
  type DieValue,
} from "./diceGeometry";

type Props = {
  accentTone?: "default" | "team";
};

export function GameDiceTray({ accentTone = "default" }: Props) {
  const initialDicePreview: [DieValue, DieValue] = [1, 4];
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState<DiceCount>(2);
  const [displayValuesByCount, setDisplayValuesByCount] = useState<
    DiceStateByCount<[DieValue, DieValue]>
  >({
    1: initialDicePreview,
    2: initialDicePreview,
  });
  const [displayValues, setDisplayValues] =
    useState<[DieValue, DieValue]>(initialDicePreview);
  const [rollingPreviewValues, setRollingPreviewValues] =
    useState<[DieValue, DieValue]>(initialDicePreview);
  const [lastRollByCount, setLastRollByCount] = useState<
    DiceStateByCount<DieValue[] | null>
  >({
    1: null,
    2: null,
  });
  const [lastRoll, setLastRoll] = useState<DieValue[] | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isResolvingResult, setIsResolvingResult] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [rollCycle, setRollCycle] = useState(0);
  const [rollingDiceCount, setRollingDiceCount] = useState<DiceCount>(2);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const rollTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const pendingValuesRef = useRef<[DieValue, DieValue] | null>(null);
  const visibleDiceCount = isRolling ? rollingDiceCount : diceCount;

  const visibleValues = useMemo(() => {
    const sourceValues = isRolling ? rollingPreviewValues : displayValues;
    return sourceValues.slice(0, visibleDiceCount);
  }, [displayValues, isRolling, rollingPreviewValues, visibleDiceCount]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (!trayRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      timeoutIdsRef.current = [];
    };
  }, []);

  function queueTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(callback, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }

  function clearRollTimers() {
    timeoutIdsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    timeoutIdsRef.current = [];
  }

  function rollDice() {
    if (isRolling) return;

    const nextValues: [DieValue, DieValue] = [
      randomDieValue(),
      randomDieValue(),
    ];
    const previewValues: [DieValue, DieValue] = [
      randomDieValue(),
      randomDieValue(),
    ];
    const nextDiceCount = diceCount;
    const currentToken = rollTokenRef.current + 1;
    rollTokenRef.current = currentToken;
    clearRollTimers();
    setIsOpen(true);
    setResultVisible(false);
    setLastRoll(null);
    setLastRollByCount((previous) => ({
      ...previous,
      [nextDiceCount]: null,
    }));
    setIsResolvingResult(true);
    setRollingPreviewValues(previewValues);
    pendingValuesRef.current = nextValues;
    setRollingDiceCount(nextDiceCount);
    setIsRolling(true);
    setRollCycle((value) => value + 1);

    queueTimeout(() => {
      if (rollTokenRef.current !== currentToken) return;
      const pendingValues = pendingValuesRef.current;
      if (!pendingValues) return;
      setDisplayValuesByCount((previous) => ({
        ...previous,
        [nextDiceCount]: pendingValues,
      }));
      setDisplayValues(pendingValues);
      setIsRolling(false);
    }, ROLL_DURATION_MS);

    queueTimeout(() => {
      if (rollTokenRef.current !== currentToken) return;
      const pendingValues = pendingValuesRef.current;
      if (!pendingValues) return;
      const resolvedRoll = pendingValues.slice(0, nextDiceCount);
      setLastRollByCount((previous) => ({
        ...previous,
        [nextDiceCount]: resolvedRoll,
      }));
      setLastRoll(resolvedRoll);
      setResultVisible(true);
      setIsResolvingResult(false);
    }, ROLL_DURATION_MS + RESULT_REVEAL_DELAY_MS);
  }

  function selectDiceCount(nextCount: DiceCount) {
    if (isRolling || isResolvingResult) return;
    setDiceCount(nextCount);
    setDisplayValues(displayValuesByCount[nextCount]);
    setLastRoll(lastRollByCount[nextCount]);
    setResultVisible(Boolean(lastRollByCount[nextCount]));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 30 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
  }

  return (
    <div
      ref={trayRef}
      className={`gameDiceTray${
        isOpen ? " gameDiceTray--open" : ""
      }${isRolling ? " gameDiceTray--rolling" : ""}${
        accentTone === "team" ? " gameDiceTray--team" : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="gameDiceTray__tab"
        type="button"
        aria-label={isOpen ? "Collapse dice roller" : "Open dice roller"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Dices size={18} strokeWidth={2.3} aria-hidden="true" />
        <span className="gameDiceTray__tabLabel">Dice</span>
        <ChevronLeft
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`gameDiceTray__tabChevron${
            isOpen ? " gameDiceTray__tabChevron--open" : ""
          }`}
        />
      </button>

      <div className="gameDiceTray__panel">
        <div className="gameDiceTray__header">
          <div>
            <div className="gameDiceTray__eyebrow">Luck helper</div>
            <div className="gameDiceTray__title">Throw the dice</div>
          </div>
          <div
            className="gameDiceTray__countSwitch"
            role="group"
            aria-label="Dice count"
          >
            <button
              className={`gameDiceTray__countBtn${
                diceCount === 1 ? " gameDiceTray__countBtn--active" : ""
              }`}
              type="button"
              onClick={() => selectDiceCount(1)}
              disabled={isRolling || isResolvingResult}
            >
              1 die
            </button>
            <button
              className={`gameDiceTray__countBtn${
                diceCount === 2 ? " gameDiceTray__countBtn--active" : ""
              }`}
              type="button"
              onClick={() => selectDiceCount(2)}
              disabled={isRolling || isResolvingResult}
            >
              2 dice
            </button>
          </div>
        </div>

        <div className="gameDiceTray__stage">
          <DiceCanvas
            values={visibleValues}
            diceCount={visibleDiceCount}
            rolling={isRolling}
            rollCycle={rollCycle}
          />
          {isRolling || resultVisible ? (
            <div
              className={`gameDiceTray__status${
                resultVisible ? " gameDiceTray__status--visible" : ""
              }`}
              aria-live="polite"
            >
              {isRolling
                ? "Rolling..."
                : resultVisible && lastRoll
                  ? formatRollSummary(lastRoll)
                  : null}
            </div>
          ) : null}
        </div>

        <div className="gameDiceTray__actions">
          <button
            className="gameDiceTray__rollBtn"
            type="button"
            onClick={rollDice}
            disabled={isRolling || isResolvingResult}
          >
            {isRolling || isResolvingResult
              ? "Shaking..."
              : lastRoll
                ? "Roll again"
                : "Roll now"}
          </button>
        </div>
      </div>
    </div>
  );
}
