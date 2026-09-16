import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  Dices,
  ListOrdered,
  PocketKnife,
  Shuffle,
} from "lucide-react";
import { translate } from "../../i18n/translate";
import { GameCalculatorTray } from "../GameCalculatorTray/GameCalculatorTray";
import { GameDiceTray } from "../GameDiceTray/GameDiceTray";
import { GameRandomPickerTray } from "../GameToolTrays/GameRandomPickerTray";
import { GameTurnTrackerTray } from "../GameToolTrays/GameTurnTrackerTray";
import "./GameToolsDock.css";

type Tool = "dice" | "calculator" | "turn-tracker" | "random-picker" | null;

type Position = { x: number; y: number };
type PanelPlacement =
  | "above-left"
  | "above-right"
  | "below-left"
  | "below-right";

type Props = {
  participants: Array<{
    id: string;
    name: string;
    avatarColor?: string;
    icon?: string;
  }>;
  accentTone?: "default" | "team";
  isTurnTrackingEnabled: boolean;
  onTurnTrackingChange: (isEnabled: boolean) => void;
  canReorderTurnOrder: boolean;
  onReorderTurnOrder: (
    movingParticipantId: string,
    targetParticipantId: string,
  ) => void;
  onResetTurnTracker: () => void;
};

const STORAGE_KEY = "plink:game-tools-position:v1";
const DOCK_SIZE = 52;
const VIEWPORT_GUTTER = 12;
const PANEL_HEIGHT: Record<Exclude<Tool, null>, number> = {
  dice: 400,
  calculator: 470,
  "turn-tracker": 420,
  "random-picker": 320,
};
const PANEL_WIDTH: Record<Exclude<Tool, null>, number> = {
  dice: 320,
  calculator: 292,
  "turn-tracker": 292,
  "random-picker": 292,
};
const MENU_WIDTH = 174;
const MENU_ITEM_HEIGHT = 40;
const MENU_VERTICAL_PADDING = 12;
const MENU_ITEM_GAP = 2;
const TOOL_TRANSITION_MS = 220;

function clampPosition(position: Position): Position {
  return {
    x: Math.min(
      Math.max(VIEWPORT_GUTTER, position.x),
      window.innerWidth - DOCK_SIZE - VIEWPORT_GUTTER,
    ),
    y: Math.min(
      Math.max(VIEWPORT_GUTTER, position.y),
      window.innerHeight - DOCK_SIZE - VIEWPORT_GUTTER,
    ),
  };
}

function loadPosition(): Position {
  const fallback = {
    x: window.innerWidth - DOCK_SIZE - VIEWPORT_GUTTER,
    y: window.innerHeight - DOCK_SIZE - VIEWPORT_GUTTER,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return clampPosition(fallback);
    const position = JSON.parse(raw) as Position;
    if (typeof position.x !== "number" || typeof position.y !== "number") {
      return clampPosition(fallback);
    }
    return clampPosition(position);
  } catch {
    return clampPosition(fallback);
  }
}

export function GameToolsDock({
  participants,
  accentTone = "default",
  isTurnTrackingEnabled,
  onTurnTrackingChange,
  canReorderTurnOrder,
  onReorderTurnOrder,
  onResetTurnTracker,
}: Props) {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [position, setPosition] = useState<Position>(loadPosition);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef(position);
  const dragRef = useRef<{
    pointerId: number | "mouse";
    offsetX: number;
    offsetY: number;
    hasMoved: boolean;
  } | null>(null);
  const closeToolTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeToolTimeoutRef.current !== null) {
        window.clearTimeout(closeToolTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  function moveDock(clientX: number, clientY: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = clampPosition({
      x: clientX - drag.offsetX,
      y: clientY - drag.offsetY,
    });
    if (
      Math.hypot(
        next.x - positionRef.current.x,
        next.y - positionRef.current.y,
      ) > 5
    ) {
      drag.hasMoved = true;
    }
    positionRef.current = next;
    dockRef.current?.style.setProperty("left", `${next.x}px`);
    dockRef.current?.style.setProperty("top", `${next.y}px`);
    setPosition(next);
  }

  function startDrag(
    pointerId: number | "mouse",
    clientX: number,
    clientY: number,
    eventType: "mouse" | "pointer",
  ) {
    dragRef.current = {
      pointerId,
      offsetX: clientX - positionRef.current.x,
      offsetY: clientY - positionRef.current.y,
      hasMoved: false,
    };

    const handleMove = (event: MouseEvent | PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== pointerId) return;
      moveDock(event.clientX, event.clientY);
    };
    const preventTouchNavigation = (event: TouchEvent) => {
      if (dragRef.current?.pointerId !== pointerId) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const handleEnd = () => {
      if (!dragRef.current) return;
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(positionRef.current),
        );
      } catch {
        // The dock remains movable when persistent storage is unavailable.
      }
      window.removeEventListener(
        eventType === "mouse" ? "mousemove" : "pointermove",
        handleMove,
      );
      window.removeEventListener(
        eventType === "mouse" ? "mouseup" : "pointerup",
        handleEnd,
      );
      if (eventType === "pointer") {
        window.removeEventListener("pointercancel", handleEnd);
        window.removeEventListener("touchmove", preventTouchNavigation, true);
      }
    };

    window.addEventListener(
      eventType === "mouse" ? "mousemove" : "pointermove",
      handleMove,
    );
    window.addEventListener(
      eventType === "mouse" ? "mouseup" : "pointerup",
      handleEnd,
    );
    if (eventType === "pointer") {
      window.addEventListener("pointercancel", handleEnd);
      window.addEventListener("touchmove", preventTouchNavigation, {
        capture: true,
        passive: false,
      });
    }
  }

  useEffect(() => {
    function handleResize() {
      setPosition((current) => clampPosition(current));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && !dockRef.current?.contains(target)) setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("touchstart", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("touchstart", closeOnOutsidePointer);
    };
  }, [isMenuOpen]);

  function selectTool(tool: Exclude<Tool, null>) {
    if (closeToolTimeoutRef.current !== null) {
      window.clearTimeout(closeToolTimeoutRef.current);
      closeToolTimeoutRef.current = null;
    }
    setActiveTool(tool);
    setIsToolOpen(true);
    setIsMenuOpen(false);
  }

  function closeTool() {
    setIsToolOpen(false);
    closeToolTimeoutRef.current = window.setTimeout(() => {
      closeToolTimeoutRef.current = null;
      setActiveTool(null);
    }, TOOL_TRANSITION_MS);
  }

  function backToToolsMenu() {
    setIsToolOpen(false);
    closeToolTimeoutRef.current = window.setTimeout(() => {
      closeToolTimeoutRef.current = null;
      setActiveTool(null);
      setIsMenuOpen(true);
    }, TOOL_TRANSITION_MS);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      startDrag(event.pointerId, event.clientX, event.clientY, "pointer");
    }
  }

  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    startDrag("mouse", event.clientX, event.clientY, "mouse");
  }

  function stopAppSwipeGesture(event: React.TouchEvent<HTMLButtonElement>) {
    // The app shell uses a right-swipe gesture to leave the game. A press on
    // this draggable control must never become a shell-navigation gesture.
    event.stopPropagation();
  }

  function handleButtonClick() {
    const dragged = dragRef.current?.hasMoved === true;
    dragRef.current = null;
    if (dragged) return;
    setIsMenuOpen((current) => !current);
  }

  function getPlacement(width: number, height: number): PanelPlacement {
    const availableAbove = position.y + DOCK_SIZE - VIEWPORT_GUTTER;
    const availableBelow = window.innerHeight - position.y - VIEWPORT_GUTTER;
    const availableLeft = position.x + DOCK_SIZE - VIEWPORT_GUTTER;
    const availableRight = window.innerWidth - position.x - VIEWPORT_GUTTER;
    const vertical =
      availableBelow >= height
        ? "below"
        : availableAbove >= height
          ? "above"
          : availableBelow >= availableAbove
            ? "below"
            : "above";
    const horizontal =
      availableRight >= width
        ? "left"
        : availableLeft >= width
          ? "right"
          : availableRight >= availableLeft
            ? "left"
            : "right";
    const placement: PanelPlacement = `${vertical}-${horizontal}`;
    return placement;
  }

  function getPanelAnchor(tool: Exclude<Tool, null>) {
    const placement = getPlacement(PANEL_WIDTH[tool], PANEL_HEIGHT[tool]);
    return { ...position, placement };
  }

  const diceAnchor = getPanelAnchor("dice");
  const calculatorAnchor = getPanelAnchor("calculator");
  const turnTrackerAnchor = getPanelAnchor("turn-tracker");
  const randomPickerAnchor = getPanelAnchor("random-picker");
  const enabledToolCount = 4;
  const menuHeight =
    MENU_VERTICAL_PADDING +
    enabledToolCount * MENU_ITEM_HEIGHT +
    Math.max(0, enabledToolCount - 1) * MENU_ITEM_GAP;
  const menuPlacement = getPlacement(MENU_WIDTH, menuHeight);

  return (
    <>
      <div
        ref={dockRef}
        className={`gameToolsDock${isMenuOpen ? " gameToolsDock--open" : ""}${activeTool ? " gameToolsDock--toolOpen" : ""}${accentTone === "team" ? " gameToolsDock--team" : ""}`}
        style={{ left: position.x, top: position.y }}
      >
        {activeTool === null && isMenuOpen ? (
          <div
            className={`gameToolsDock__menu gameToolsDock__menu--${menuPlacement}`}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => selectTool("dice")}
            >
              <Dices size={19} strokeWidth={2.3} aria-hidden="true" />
              {translate("copy.dice")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => selectTool("calculator")}
            >
              <Calculator size={19} strokeWidth={2.3} aria-hidden="true" />
              {translate("copy.calculator")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => selectTool("turn-tracker")}
            >
              <ListOrdered size={19} strokeWidth={2.3} aria-hidden="true" />
              {translate("copy.turnTracker")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => selectTool("random-picker")}
            >
              <Shuffle size={19} strokeWidth={2.3} aria-hidden="true" />
              {translate("copy.randomPicker")}
            </button>
          </div>
        ) : null}
        {activeTool === null ? (
          <button
            className="gameToolsDock__button"
            type="button"
            aria-label={translate("copy.openGameTools")}
            aria-expanded={isMenuOpen}
            onPointerDown={handlePointerDown}
            onMouseDown={handleMouseDown}
            onTouchStart={stopAppSwipeGesture}
            onTouchMove={stopAppSwipeGesture}
            onTouchEnd={stopAppSwipeGesture}
            onTouchCancel={stopAppSwipeGesture}
            onClick={handleButtonClick}
          >
            <PocketKnife size={23} strokeWidth={2.45} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <GameDiceTray
        accentTone={accentTone}
        isOpen={activeTool === "dice" && isToolOpen}
        onOpenChange={(isOpen) => {
          if (isOpen) selectTool("dice");
          else closeTool();
        }}
        showTab={false}
        anchor={diceAnchor}
        onBack={backToToolsMenu}
        onClose={closeTool}
      />
      <GameCalculatorTray
        accentTone={accentTone}
        isOpen={activeTool === "calculator" && isToolOpen}
        onOpenChange={(isOpen) => {
          if (isOpen) selectTool("calculator");
          else closeTool();
        }}
        showTab={false}
        anchor={calculatorAnchor}
        onBack={backToToolsMenu}
        onClose={closeTool}
      />
      <GameTurnTrackerTray
        participants={participants}
        accentTone={accentTone}
        isOpen={activeTool === "turn-tracker" && isToolOpen}
        anchor={turnTrackerAnchor}
        isEnabled={isTurnTrackingEnabled}
        onEnabledChange={onTurnTrackingChange}
        canReorder={canReorderTurnOrder}
        onReorderTurn={onReorderTurnOrder}
        onReset={onResetTurnTracker}
        onBack={backToToolsMenu}
        onClose={closeTool}
      />
      <GameRandomPickerTray
        participants={participants}
        accentTone={accentTone}
        isOpen={activeTool === "random-picker" && isToolOpen}
        anchor={randomPickerAnchor}
        onBack={backToToolsMenu}
        onClose={closeTool}
      />
    </>
  );
}
