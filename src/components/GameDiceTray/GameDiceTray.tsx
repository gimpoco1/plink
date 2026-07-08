import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ChevronLeft, Dices } from "lucide-react";
import "./GameDiceTray.css";

type Props = {
  accentTone?: "default" | "team";
};

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
type PipPosition = "tl" | "tr" | "ml" | "mr" | "bl" | "br" | "c";
type DiceCount = 1 | 2;
type DiceStateByCount<T> = Record<DiceCount, T>;
type DieMotion = {
  spinX: number;
  spinY: number;
  spinZ: number;
  preX: number;
  preY: number;
  preZ: number;
  lift: number;
  shadowScale: number;
};

const ROLL_DURATION_MS = 1380;
const RESULT_REVEAL_DELAY_MS = 240;

const FACE_PIPS: Record<DieValue, PipPosition[]> = {
  1: ["c"],
  2: ["tl", "br"],
  3: ["tl", "c", "br"],
  4: ["tl", "tr", "bl", "br"],
  5: ["tl", "tr", "c", "bl", "br"],
  6: ["tl", "tr", "ml", "mr", "bl", "br"],
};

const DIE_ROTATIONS: Record<DieValue, { x: string; y: string }> = {
  1: { x: "0deg", y: "0deg" },
  2: { x: "90deg", y: "0deg" },
  3: { x: "0deg", y: "-90deg" },
  4: { x: "0deg", y: "90deg" },
  5: { x: "-90deg", y: "0deg" },
  6: { x: "0deg", y: "180deg" },
};

function randomDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

function createDieMotion(): DieMotion {
  const spinX = 720 + Math.floor(Math.random() * 540);
  const spinY = 880 + Math.floor(Math.random() * 720);
  const spinZ = 460 + Math.floor(Math.random() * 420);
  return {
    spinX,
    spinY,
    spinZ,
    preX: 28 + Math.floor(Math.random() * 18),
    preY: -36 + Math.floor(Math.random() * 72),
    preZ: -18 + Math.floor(Math.random() * 36),
    lift: 10 + Math.floor(Math.random() * 8),
    shadowScale: 1.08 + Math.random() * 0.18,
  };
}

function formatRollSummary(values: DieValue[]) {
  if (values.length === 1) return `${values[0]}`;
  return `${values.join(" + ")} = ${values.reduce((sum, value) => sum + value, 0)}`;
}

function DieCube({
  value,
  rolling,
  delayMs,
  rollCycle,
  motion,
}: {
  value: DieValue;
  rolling: boolean;
  delayMs: number;
  rollCycle: number;
  motion: DieMotion;
}) {
  const rotation = DIE_ROTATIONS[value];
  const cubeStyle = {
    "--die-rotate-x": rotation.x,
    "--die-rotate-y": rotation.y,
    "--die-roll-delay": `${delayMs}ms`,
    "--die-roll-duration": `${Math.max(980, ROLL_DURATION_MS - delayMs)}ms`,
    "--die-spin-x": `${motion.spinX}deg`,
    "--die-spin-y": `${motion.spinY}deg`,
    "--die-spin-z": `${motion.spinZ}deg`,
    "--die-pre-x": `${motion.preX}deg`,
    "--die-pre-y": `${motion.preY}deg`,
    "--die-pre-z": `${motion.preZ}deg`,
    "--die-lift": `${motion.lift}px`,
    "--die-shadow-scale": `${motion.shadowScale}`,
  } as CSSProperties;

  return (
    <div className="gameDiceTray__dieScene" aria-hidden="true">
      <div
        className={`gameDiceTray__dieShadow${rolling ? " gameDiceTray__dieShadow--rolling" : ""}`}
        style={cubeStyle}
      />
      <div
        key={`${rollCycle}:${value}:${rolling ? "rolling" : "idle"}`}
        className={`gameDiceTray__cube${rolling ? " gameDiceTray__cube--rolling" : ""}`}
        style={cubeStyle}
      >
        <DieFace face="front" value={1} />
        <DieFace face="back" value={6} />
        <DieFace face="right" value={3} />
        <DieFace face="left" value={4} />
        <DieFace face="top" value={5} />
        <DieFace face="bottom" value={2} />
      </div>
    </div>
  );
}

function DieFace({
  face,
  value,
}: {
  face: "front" | "back" | "right" | "left" | "top" | "bottom";
  value: DieValue;
}) {
  return (
    <div className={`gameDiceTray__face gameDiceTray__face--${face}`}>
      {FACE_PIPS[value].map((position) => (
        <span
          key={`${face}:${value}:${position}`}
          className={`gameDiceTray__pip gameDiceTray__pip--${position}`}
        />
      ))}
    </div>
  );
}

export function GameDiceTray({ accentTone = "default" }: Props) {
  const initialDicePreview: [DieValue, DieValue] = [1, 4];
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState<DiceCount>(2);
  const [displayValuesByCount, setDisplayValuesByCount] =
    useState<DiceStateByCount<[DieValue, DieValue]>>({
      1: initialDicePreview,
      2: initialDicePreview,
    });
  const [displayValues, setDisplayValues] = useState<[DieValue, DieValue]>(
    initialDicePreview,
  );
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
  const [dieMotions, setDieMotions] = useState<[DieMotion, DieMotion]>([
    createDieMotion(),
    createDieMotion(),
  ]);
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
    setDieMotions([createDieMotion(), createDieMotion()]);
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
        aria-label={isOpen ? "Collapse dice tray" : "Open dice tray"}
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
          <div className="gameDiceTray__diceRow">
            {visibleValues.map((value, index) => (
              <DieCube
                key={`${index}:${rollCycle}:${visibleDiceCount}`}
                value={value}
                rolling={isRolling}
                delayMs={index * 120}
                rollCycle={rollCycle}
                motion={dieMotions[index] ?? createDieMotion()}
              />
            ))}
          </div>
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
