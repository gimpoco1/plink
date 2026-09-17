import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Delete,
  Equal,
  FunctionSquare,
  X,
} from "lucide-react";
import { translate } from "../../i18n/translate";
import "./GameCalculatorTray.css";

type Props = {
  accentTone?: "default" | "team";
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  showTab?: boolean;
  anchor?: {
    x: number;
    y: number;
    placement: "above-left" | "above-right" | "below-left" | "below-right";
  };
  onBack?: () => void;
  onClose?: () => void;
};

const MAX_EXPRESSION_LENGTH = 72;

function formatResult(value: number) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
}

function calculate(expression: string) {
  const tokens = expression.match(/\d*\.?\d+|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== expression.replace(/\s+/g, "")) {
    return null;
  }

  let index = 0;
  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  function parsePrimary(): number | null {
    const token = consume();
    if (token === "(") {
      const value = parseExpression();
      if (consume() !== ")") return null;
      return value;
    }
    if (token === "+" || token === "-") {
      const value = parsePrimary();
      return value === null ? null : token === "-" ? -value : value;
    }
    if (!token || !/^\d*\.?\d+$/.test(token)) return null;
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
  }

  function parseProduct(): number | null {
    let value = parsePrimary();
    while (value !== null && (peek() === "*" || peek() === "/")) {
      const operator = consume();
      const right = parsePrimary();
      if (right === null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseExpression(): number | null {
    let value = parseProduct();
    while (value !== null && (peek() === "+" || peek() === "-")) {
      const operator = consume();
      const right = parseProduct();
      if (right === null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseExpression();
  return result === null || index !== tokens.length
    ? null
    : formatResult(result);
}

export function GameCalculatorTray({
  accentTone = "default",
  isOpen: controlledIsOpen,
  onOpenChange,
  showTab = true,
  anchor,
  onBack,
  onClose,
}: Props) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  function setIsOpen(next: boolean | ((value: boolean) => boolean)) {
    const resolved = typeof next === "function" ? next(isOpen) : next;
    if (controlledIsOpen === undefined) setUncontrolledIsOpen(resolved);
    onOpenChange?.(resolved);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && !trayRef.current?.contains(target)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (
        !/^[0-9()+\-*/.]$/.test(event.key) &&
        event.key !== "Enter" &&
        event.key !== "Backspace"
      )
        return;
      event.preventDefault();
      if (event.key === "Enter") {
        resolveExpression();
      } else if (event.key === "Backspace") {
        removeLast();
      } else {
        append(event.key);
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
  }, [isOpen, expression]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  function append(value: string) {
    setExpression((current) =>
      (current + value).slice(0, MAX_EXPRESSION_LENGTH),
    );
    setResult(null);
    setHasError(false);
    setCopied(false);
  }

  function removeLast() {
    setExpression((current) => current.slice(0, -1));
    setResult(null);
    setHasError(false);
    setCopied(false);
  }

  function clear() {
    setExpression("");
    setResult(null);
    setHasError(false);
    setCopied(false);
  }

  function resolveExpression() {
    const nextResult = calculate(expression);
    if (nextResult === null) {
      setResult(null);
      setHasError(true);
      setCopied(false);
      return;
    }
    setResult(nextResult);
    setHasError(false);
    setCopied(false);
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        copyTimeoutRef.current = null;
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 30 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    setIsOpen(deltaX > 0);
  }

  const buttons = [
    ["C", clear, "gameCalculatorTray__key--utility"],
    ["(", () => append("("), "gameCalculatorTray__key--operator"],
    [")", () => append(")"), "gameCalculatorTray__key--operator"],
    ["÷", () => append("/"), "gameCalculatorTray__key--operator"],
    ["7", () => append("7"), ""],
    ["8", () => append("8"), ""],
    ["9", () => append("9"), ""],
    ["×", () => append("*"), "gameCalculatorTray__key--operator"],
    ["4", () => append("4"), ""],
    ["5", () => append("5"), ""],
    ["6", () => append("6"), ""],
    ["−", () => append("-"), "gameCalculatorTray__key--operator"],
    ["1", () => append("1"), ""],
    ["2", () => append("2"), ""],
    ["3", () => append("3"), ""],
    ["+", () => append("+"), "gameCalculatorTray__key--operator"],
    [".", () => append("."), ""],
    ["0", () => append("0"), ""],
  ] as const;

  return (
    <div
      ref={trayRef}
      className={`gameCalculatorTray${isOpen ? " gameCalculatorTray--open" : ""}${accentTone === "team" ? " gameCalculatorTray--team" : ""}${showTab ? "" : " gameCalculatorTray--noTab"}`}
      style={
        !showTab && anchor
          ? {
              left: anchor.x,
              top: anchor.y,
              bottom: "auto",
            }
          : undefined
      }
      data-placement={!showTab ? anchor?.placement : undefined}
      aria-hidden={!showTab && !isOpen}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {showTab ? (
        <button
          className="gameCalculatorTray__tab"
          type="button"
          aria-label={
            isOpen
              ? translate("copy.collapseCalculator")
              : translate("copy.openCalculator")
          }
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          <FunctionSquare size={18} strokeWidth={2.3} aria-hidden="true" />
          <span className="gameCalculatorTray__tabLabel">
            {translate("copy.calculator")}
          </span>
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            aria-hidden="true"
            className={`gameCalculatorTray__tabChevron${isOpen ? " gameCalculatorTray__tabChevron--open" : ""}`}
          />
        </button>
      ) : null}

      <div className="gameCalculatorTray__panel">
        <div className="gameCalculatorTray__header">
          <div>
            <div className="gameCalculatorTray__eyebrow">
              {translate("copy.quickMaths")}
            </div>
            <div className="gameCalculatorTray__title">
              {translate("copy.calculator")}
            </div>
          </div>
          <button
            className="gameCalculatorTray__copy"
            type="button"
            aria-label={
              copied ? translate("copy.copied") : translate("copy.copyResult")
            }
            title={copied ? translate("copy.copied") : translate("copy.copyResult")}
            disabled={!result}
            onClick={() => void copyResult()}
          >
            {copied ? (
              <Check size={17} strokeWidth={2.7} aria-hidden="true" />
            ) : (
              <Copy size={17} strokeWidth={2.3} aria-hidden="true" />
            )}
          </button>
        </div>
        <div
          className={`gameCalculatorTray__display${hasError ? " gameCalculatorTray__display--error" : ""}`}
          aria-live="polite"
        >
          <span className="gameCalculatorTray__expression">
            {expression || "0"}
          </span>
          <span className="gameCalculatorTray__result">
            {hasError
              ? translate("copy.checkCalculation")
              : result
                ? `= ${result}`
                : ""}
          </span>
        </div>
        <div className="gameCalculatorTray__keypad">
          {buttons.map(([label, onClick, className]) => (
            <button
              key={label}
              className={`gameCalculatorTray__key ${className}`}
              type="button"
              aria-label={label === "C" ? translate("copy.clear") : label}
              onClick={onClick}
            >
              {label}
            </button>
          ))}
          <button
            className="gameCalculatorTray__key gameCalculatorTray__key--delete"
            type="button"
            aria-label={translate("copy.delete")}
            onClick={removeLast}
          >
            <Delete size={17} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            className="gameCalculatorTray__key gameCalculatorTray__key--equals"
            type="button"
            aria-label={translate("copy.calculate")}
            onClick={resolveExpression}
          >
            <Equal size={18} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
        {!showTab ? (
          <div className="gameCalculatorTray__footer">
            <button
              className="gameCalculatorTray__back"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft size={16} strokeWidth={2.7} aria-hidden="true" />
              {translate("copy.backToTools")}
            </button>
            <button
              className="gameCalculatorTray__close"
              type="button"
              aria-label={translate("copy.close")}
              onClick={onClose}
            >
              <X size={17} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
