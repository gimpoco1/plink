import { useEffect, useRef, useState } from "react";

type ScrollFadeState = {
  top: boolean;
  bottom: boolean;
};

const EMPTY_FADE_STATE: ScrollFadeState = { top: false, bottom: false };

export function useScrollableListFade(dependencies: ReadonlyArray<unknown>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fadeState, setFadeState] = useState<ScrollFadeState>(EMPTY_FADE_STATE);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      setFadeState(EMPTY_FADE_STATE);
      return;
    }

    const updateFade = () => {
      const remainingScroll =
        node.scrollHeight - node.clientHeight - node.scrollTop;
      setFadeState({
        top: node.scrollTop > 6,
        bottom: remainingScroll > 6,
      });
    };

    updateFade();
    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateFade);
    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
      resizeObserver?.disconnect();
    };
  }, dependencies);

  return { ref, fadeState };
}
