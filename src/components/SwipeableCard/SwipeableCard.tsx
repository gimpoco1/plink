import { useRef, useState } from "react";
import "../../styles/swipe.css";

type SwipeableCardProps = {
  actionWidth: number;
  disabled?: boolean;
  rowClassName?: string;
  cardClassName: string;
  renderActions: (api: {
    closeSwipe: () => void;
    isOpen: boolean;
  }) => React.ReactNode;
  children: (api: {
    isSwiping: boolean;
    isOpen: boolean;
    closeSwipe: () => void;
  }) => React.ReactNode;
};

export function SwipeableCard({
  actionWidth,
  disabled = false,
  rowClassName,
  cardClassName,
  renderActions,
  children,
}: SwipeableCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startSwipeX: number;
    isHorizontal?: boolean;
  } | null>(null);

  const isOpen = swipeX !== 0;

  function closeSwipe() {
    setSwipeX(0);
  }

  function openSwipe() {
    setSwipeX(-actionWidth);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || disabled) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startSwipeX: swipeX,
    };
    setIsSwiping(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (drag.isHorizontal === undefined) {
      if (absDx < 12 && absDy < 12) return;

      drag.isHorizontal = absDx > absDy * 1.5 + 5;
      if (drag.isHorizontal) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsSwiping(true);
      }
    }

    if (!drag.isHorizontal) return;
    e.preventDefault();

    const next = Math.max(-actionWidth, Math.min(0, drag.startSwipeX + dx));
    setSwipeX(next);
  }

  function onPointerUpOrCancel(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;

    if (swipeX <= -actionWidth * 0.5) {
      openSwipe();
    } else {
      closeSwipe();
    }

    if (isSwiping) {
      setTimeout(() => setIsSwiping(false), 100);
    } else {
      setIsSwiping(false);
    }
  }

  return (
    <div
      className={`swipeRow${rowClassName ? ` ${rowClassName}` : ""}`}
      data-open={isOpen ? "true" : "false"}
      style={{ ["--swipeW" as never]: `${actionWidth}px` }}
    >
      <div className="swipeAction" aria-hidden={!isOpen}>
        {renderActions({ closeSwipe, isOpen })}
      </div>

      <article
        className={`card swipeCard${isSwiping ? " swipeCard--dragging" : ""} ${cardClassName}`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        onClickCapture={(e) => {
          if (isSwiping) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          if (isOpen) {
            closeSwipe();
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children({ isSwiping, isOpen, closeSwipe })}
      </article>
    </div>
  );
}
