import { ChevronLeft, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import { translate } from "../../i18n/translate";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import "./GameToolTrays.css";

type Participant = {
  id: string;
  name: string;
  avatarColor?: string;
  icon?: string;
};
type Props = {
  participants: Participant[];
  accentTone?: "default" | "team";
  isEnabled: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
  canReorder: boolean;
  isOpen: boolean;
  anchor: {
    x: number;
    y: number;
    placement: "above-left" | "above-right" | "below-left" | "below-right";
  };
  onReorderTurn: (
    movingParticipantId: string,
    targetParticipantId: string,
  ) => void;
  onReset: () => void;
  onBack: () => void;
  onClose: () => void;
};

const DRAG_HOLD_DELAY_MS = 450;
const DRAG_CANCEL_DISTANCE_PX = 10;

export function GameTurnTrackerTray({
  participants,
  accentTone = "default",
  isEnabled,
  onEnabledChange,
  canReorder,
  isOpen,
  anchor,
  onReorderTurn,
  onReset,
  onBack,
  onClose,
}: Props) {
  const [draggedParticipantId, setDraggedParticipantId] = useState<
    string | null
  >(null);
  const [dropTargetParticipantId, setDropTargetParticipantId] = useState<
    string | null
  >(null);
  const [dragPreview, setDragPreview] = useState<{
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    rowHeight: number;
    listLeft: number;
    listTop: number;
    listWidth: number;
    listHeight: number;
    scrollTop: number;
  } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const activePointerRef = useRef<{
    pointerId: number;
    participantId: string;
  } | null>(null);
  const pendingLongPressRef = useRef<{
    pointerId: number;
    participantId: string;
    pointerType: string;
    clientX: number;
    clientY: number;
    lastClientY: number;
    row: HTMLButtonElement;
    timeoutId: number | null;
  } | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const starterListRef = useRef<HTMLDivElement | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const canReorderTurns = isEnabled && canReorder;

  useEffect(() => {
    return () => {
      cancelPendingLongPress();
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (canReorderTurns) return;
    cancelPendingLongPress();
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
    }
    setDraggedParticipantId(null);
    setDropTargetParticipantId(null);
    setDragPreview(null);
  }, [canReorderTurns]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && !trayRef.current?.contains(target)) onClose();
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("touchstart", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("touchstart", closeOnOutsidePointer);
    };
  }, [isOpen, onClose]);

  function participantIdAtPoint(clientX: number, clientY: number) {
    const rows = starterListRef.current?.querySelectorAll<HTMLElement>(
      "[data-turn-participant-id]",
    );
    if (!rows) return null;
    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const bounds = row.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right) continue;
      if (clientY >= bounds.top && clientY <= bounds.bottom) {
        return row.dataset.turnParticipantId ?? null;
      }
      const distance = Math.abs(clientY - (bounds.top + bounds.bottom) / 2);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = row.dataset.turnParticipantId ?? null;
      }
    }
    return nearestId;
  }

  function dropTargetAtPointer(clientX: number, clientY: number) {
    const list = starterListRef.current;
    const rows = list?.querySelectorAll<HTMLElement>(
      "[data-turn-participant-id]",
    );
    if (!list || !rows?.length) return null;
    const bounds = list.getBoundingClientRect();
    const edgeSize = 44;
    const atTop = list.scrollTop <= 1 && clientY <= bounds.top + edgeSize;
    const maxScrollTop = list.scrollHeight - list.clientHeight;
    // Holding a row at the lower edge is an explicit request to append it.
    // It also keeps the intended drop stable while the list is still finishing
    // its final auto-scroll frame.
    const atBottom =
      clientY >= bounds.bottom - edgeSize &&
      (maxScrollTop <= 0 || list.scrollTop > 1);
    if (atTop) return rows[0]?.dataset.turnParticipantId ?? null;
    if (atBottom)
      return rows[rows.length - 1]?.dataset.turnParticipantId ?? null;
    return participantIdAtPoint(clientX, clientY);
  }

  function stopAutoScroll() {
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  function cancelPendingLongPress() {
    const pendingLongPress = pendingLongPressRef.current;
    if (!pendingLongPress) return;
    if (pendingLongPress.timeoutId !== null) {
      window.clearTimeout(pendingLongPress.timeoutId);
    }
    pendingLongPressRef.current = null;
  }

  function updateAutoScroll() {
    if (autoScrollFrameRef.current !== null) return;
    const list = starterListRef.current;
    const pointerPosition = pointerPositionRef.current;
    if (!list || !pointerPosition) return;
    const bounds = list.getBoundingClientRect();
    const edgeSize = 44;
    const initialDirection =
      pointerPosition.y < bounds.top + edgeSize
        ? -1
        : pointerPosition.y > bounds.bottom - edgeSize
          ? 1
          : 0;
    if (!initialDirection) return;

    const scroll = () => {
      const currentList = starterListRef.current;
      const currentPointer = pointerPositionRef.current;
      if (!currentList || !currentPointer || !activePointerRef.current) {
        stopAutoScroll();
        return;
      }
      const currentBounds = currentList.getBoundingClientRect();
      const direction =
        currentPointer.y < currentBounds.top + edgeSize
          ? -1
          : currentPointer.y > currentBounds.bottom - edgeSize
            ? 1
            : 0;
      if (!direction) {
        stopAutoScroll();
        return;
      }
      const distanceToEdge =
        direction < 0
          ? Math.max(0, currentPointer.y - currentBounds.top)
          : Math.max(0, currentBounds.bottom - currentPointer.y);
      if (distanceToEdge > edgeSize) {
        stopAutoScroll();
        return;
      }
      const speed = 3 + ((edgeSize - distanceToEdge) / edgeSize) * 9;
      const previousScrollTop = currentList.scrollTop;
      currentList.scrollTop += direction * speed;
      setDragPreview((current) =>
        current ? { ...current, scrollTop: currentList.scrollTop } : current,
      );
      setDropTargetParticipantId(
        dropTargetAtPointer(currentPointer.x, currentPointer.y),
      );
      if (currentList.scrollTop === previousScrollTop) {
        stopAutoScroll();
        return;
      }
      autoScrollFrameRef.current = window.requestAnimationFrame(scroll);
    };
    autoScrollFrameRef.current = window.requestAnimationFrame(scroll);
  }

  function startPointerDrag(
    pointerId: number,
    participantId: string,
    clientX: number,
    clientY: number,
    row: HTMLButtonElement,
  ) {
    if (dragCleanupRef.current) dragCleanupRef.current();
    try {
      row.setPointerCapture(pointerId);
    } catch {
      // The hold can finish after the browser has released the pointer.
      return;
    }

    activePointerRef.current = { pointerId, participantId };
    pointerPositionRef.current = { x: clientX, y: clientY };
    const listRect = starterListRef.current?.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    setDraggedParticipantId(participantId);
    setDropTargetParticipantId(participantId);
    setDragPreview({
      clientX,
      clientY,
      offsetX: clientX - rowRect.left,
      offsetY: clientY - rowRect.top,
      width: rowRect.width,
      rowHeight: rowRect.height,
      listLeft: listRect?.left ?? rowRect.left,
      listTop: listRect?.top ?? rowRect.top,
      listWidth: listRect?.width ?? rowRect.width,
      listHeight: listRect?.height ?? rowRect.height,
      scrollTop: starterListRef.current?.scrollTop ?? 0,
    });

    const cleanup = () => {
      stopAutoScroll();
      activePointerRef.current = null;
      pointerPositionRef.current = null;
      dragCleanupRef.current = null;
      setDraggedParticipantId(null);
      setDropTargetParticipantId(null);
      setDragPreview(null);
    };
    dragCleanupRef.current = cleanup;
  }

  function beginPointerDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    participantId: string,
  ) {
    if (!canReorderTurns) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    cancelPendingLongPress();
    if (dragCleanupRef.current) dragCleanupRef.current();

    const { pointerId, clientX, clientY, currentTarget: row } = event;
    if (event.pointerType !== "touch") {
      startPointerDrag(pointerId, participantId, clientX, clientY, row);
      return;
    }
    try {
      row.setPointerCapture(pointerId);
    } catch {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const pendingLongPress = pendingLongPressRef.current;
      if (!pendingLongPress || pendingLongPress.pointerId !== pointerId) return;
      if (pendingLongPress.timeoutId === null) return;
      pendingLongPressRef.current = null;
      startPointerDrag(pointerId, participantId, clientX, clientY, row);
    }, DRAG_HOLD_DELAY_MS);
    pendingLongPressRef.current = {
      pointerId,
      participantId,
      pointerType: event.pointerType,
      clientX,
      clientY,
      lastClientY: clientY,
      row,
      timeoutId,
    };
  }

  function movePointerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const pendingLongPress = pendingLongPressRef.current;
    if (pendingLongPress?.pointerId === event.pointerId) {
      if (pendingLongPress.pointerType !== "mouse") {
        const list = starterListRef.current;
        if (list) {
          list.scrollTop += pendingLongPress.lastClientY - event.clientY;
        }
        pendingLongPress.lastClientY = event.clientY;
      }
      if (
        Math.hypot(
          event.clientX - pendingLongPress.clientX,
          event.clientY - pendingLongPress.clientY,
        ) > DRAG_CANCEL_DISTANCE_PX
      ) {
        // This is a scroll gesture, not a deliberate long-press drag. Keep
        // tracking it so vertical swipes can scroll the list manually.
        if (pendingLongPress.timeoutId !== null) {
          window.clearTimeout(pendingLongPress.timeoutId);
          pendingLongPress.timeoutId = null;
        }
      }
      return;
    }
    const activePointer = activePointerRef.current;
    if (!activePointer || activePointer.pointerId !== event.pointerId) return;
    event.preventDefault();
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    setDragPreview((current) =>
      current
        ? { ...current, clientX: event.clientX, clientY: event.clientY }
        : current,
    );
    setDropTargetParticipantId(
      dropTargetAtPointer(event.clientX, event.clientY),
    );
    updateAutoScroll();
  }

  function endPointerDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (pendingLongPressRef.current?.pointerId === event.pointerId) {
      cancelPendingLongPress();
      return;
    }
    const activePointer = activePointerRef.current;
    if (!activePointer || activePointer.pointerId !== event.pointerId) return;
    event.preventDefault();
    const targetId = dropTargetAtPointer(event.clientX, event.clientY);
    if (targetId && targetId !== activePointer.participantId) {
      onReorderTurn(activePointer.participantId, targetId);
    }
    dragCleanupRef.current?.();
  }

  return (
    <div
      ref={trayRef}
      className={`gameHelperTray${isOpen ? " gameHelperTray--open" : ""}${accentTone === "team" ? " gameHelperTray--team" : ""}`}
      style={{ left: anchor.x, top: anchor.y }}
      data-placement={anchor.placement}
      aria-hidden={!isOpen}
    >
      <div className="gameHelperTray__panel gameHelperTray__panel--turnCompact">
        <header className="gameHelperTray__header">
          <div>
            <div className="gameHelperTray__eyebrow">
              {translate("copy.tools")}
            </div>
            <div className="gameHelperTray__title">
              {translate("copy.turnTracker")}
            </div>
          </div>
          <div className="gameHelperTray__switchControl">
            <button
              className={`gameHelperTray__switch${isEnabled ? " gameHelperTray__switch--on" : ""}`}
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-label={translate("copy.turnTrackerEnabled")}
              onClick={() => onEnabledChange(!isEnabled)}
            >
              <span aria-hidden="true" />
            </button>
            <span
              className={`gameHelperTray__switchLabel${isEnabled ? " gameHelperTray__switchLabel--on" : ""}`}
            >
              {isEnabled ? translate("copy.on") : translate("copy.off")}
            </span>
          </div>
        </header>
        <div className="gameHelperTray__content gameHelperTray__content--compact">
          <span className="gameHelperTray__hint">
            {translate("copy.turnTrackerPickStarter")}
          </span>
          <div
            className={`gameHelperTray__starterList${!isEnabled ? " gameHelperTray__starterList--disabled" : ""}`}
            role="list"
            ref={starterListRef}
            aria-disabled={!isEnabled}
          >
            {participants.map((participant, index) => {
              const isDragged = draggedParticipantId === participant.id;
              const isDropTarget = dropTargetParticipantId === participant.id;
              return (
                <button
                  key={participant.id}
                  data-turn-participant-id={participant.id}
                  className={`gameHelperTray__starterOption${!canReorderTurns ? " gameHelperTray__starterOption--locked" : ""}${isDragged ? " gameHelperTray__starterOption--dragSource" : ""}${isDropTarget ? " gameHelperTray__starterOption--dropTarget" : ""}`}
                  type="button"
                  disabled={!canReorderTurns}
                  aria-disabled={!canReorderTurns}
                  onPointerDown={(event) =>
                    beginPointerDrag(event, participant.id)
                  }
                  onPointerMove={movePointerDrag}
                  onPointerUp={endPointerDrag}
                  onPointerCancel={() => {
                    cancelPendingLongPress();
                    dragCleanupRef.current?.();
                  }}
                >
                  {participant.icon ? (
                    <span
                      className="gameHelperTray__avatar gameHelperTray__avatar--team"
                      aria-hidden="true"
                    >
                      <TeamIcon
                        icon={participant.icon}
                        size={16}
                        strokeWidth={2.4}
                      />
                    </span>
                  ) : (
                    <span
                      className="gameHelperTray__avatar"
                      style={avatarStyleFor(
                        participant.avatarColor ?? "#64748b",
                      )}
                      aria-hidden="true"
                    >
                      {getInitials(participant.name)}
                    </span>
                  )}
                  <span>{participant.name}</span>
                  <span
                    className="gameHelperTray__orderBadge"
                    aria-hidden="true"
                  >
                    #{index + 1}
                  </span>
                </button>
              );
            })}

            {draggedParticipantId && dragPreview
              ? (() => {
                  const draggedParticipant = participants.find(
                    (participant) => participant.id === draggedParticipantId,
                  );
                  if (!draggedParticipant) return null;
                  const draggedIndex = participants.findIndex(
                    (participant) => participant.id === draggedParticipantId,
                  );
                  return (() => {
                    const maxLeft = Math.max(
                      0,
                      dragPreview.listWidth - dragPreview.width,
                    );
                    const rows =
                      starterListRef.current?.querySelectorAll<HTMLElement>(
                        "[data-turn-participant-id]",
                      );
                    const finalRow = rows?.[rows.length - 1];
                    const maxTop = Math.max(
                      0,
                      (finalRow?.offsetTop ?? dragPreview.listHeight) +
                        (finalRow?.offsetHeight ?? 0) -
                        dragPreview.rowHeight,
                    );
                    const left = Math.min(
                      Math.max(
                        0,
                        dragPreview.clientX -
                          dragPreview.listLeft -
                          dragPreview.offsetX,
                      ),
                      maxLeft,
                    );
                    const top = Math.min(
                      Math.max(
                        0,
                        dragPreview.clientY -
                          dragPreview.listTop +
                          dragPreview.scrollTop -
                          dragPreview.offsetY,
                      ),
                      maxTop,
                    );
                    return (
                      <div
                        className="gameHelperTray__starterOption gameHelperTray__starterOption--draggedGhost"
                        style={{
                          left,
                          top,
                          width: dragPreview.width,
                        }}
                        aria-hidden="true"
                      >
                        {draggedParticipant.icon ? (
                          <span className="gameHelperTray__avatar gameHelperTray__avatar--team">
                            <TeamIcon
                              icon={draggedParticipant.icon}
                              size={16}
                              strokeWidth={2.4}
                            />
                          </span>
                        ) : (
                          <span
                            className="gameHelperTray__avatar"
                            style={avatarStyleFor(
                              draggedParticipant.avatarColor ?? "#64748b",
                            )}
                          >
                            {getInitials(draggedParticipant.name)}
                          </span>
                        )}
                        <span>{draggedParticipant.name}</span>
                        <span className="gameHelperTray__orderBadge">
                          #{draggedIndex + 1}
                        </span>
                      </div>
                    );
                  })();
                })()
              : null}
          </div>
        </div>
        <div className="gameHelperTray__footer">
          {isEnabled ? (
            <button
              className="gameHelperTray__reset"
              type="button"
              onClick={onReset}
            >
              <RotateCcw size={15} strokeWidth={2.5} aria-hidden="true" />
              {translate("copy.resetTurns")}
            </button>
          ) : null}
          <button
            className="gameHelperTray__back"
            type="button"
            onClick={onBack}
          >
            <ChevronLeft size={17} strokeWidth={2.8} aria-hidden="true" />
            {translate("copy.backToTools")}
          </button>
          <button
            className="gameHelperTray__close"
            type="button"
            aria-label={translate("copy.close")}
            onClick={onClose}
          >
            <X size={17} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
