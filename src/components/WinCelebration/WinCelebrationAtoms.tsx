import { useLayoutEffect, useRef } from "react";

const PODIUM_NAME_MAX_FONT_SIZE = 13;
const PODIUM_NAME_MIN_FONT_SIZE = 8;
const PODIUM_NAME_FIT_BUFFER = 4;

export function FittedPodiumName({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  const nameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    function fitName() {
      const element = nameRef.current;
      const text = textRef.current;
      if (!element || !text) return;

      element.style.width = "";
      element.style.fontSize = `${PODIUM_NAME_MAX_FONT_SIZE}px`;
      const labelWidth = element.clientWidth;
      element.style.width = `${labelWidth}px`;

      const styles = window.getComputedStyle(element);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const availableWidth =
        element.clientWidth - horizontalPadding - PODIUM_NAME_FIT_BUFFER;
      const requiredWidth = text.getBoundingClientRect().width;
      const fittedSize =
        requiredWidth > availableWidth
          ? (PODIUM_NAME_MAX_FONT_SIZE * availableWidth) / requiredWidth
          : PODIUM_NAME_MAX_FONT_SIZE;

      element.style.fontSize = `${Math.max(
        PODIUM_NAME_MIN_FONT_SIZE,
        Math.min(PODIUM_NAME_MAX_FONT_SIZE, fittedSize),
      )}px`;
    }

    fitName();
    window.addEventListener("resize", fitName);
    void document.fonts?.ready.then(fitName);

    return () => window.removeEventListener("resize", fitName);
  }, [name]);

  return (
    <div ref={nameRef} className={className} title={name}>
      <span ref={textRef}>{name}</span>
    </div>
  );
}
