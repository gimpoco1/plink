import { useLayoutEffect, useRef } from "react";
import { Keyboard, type KeyboardInfo } from "@capacitor/keyboard";
import { isNativeApp } from "../lib/nativePlatform";

const MOBILE_VIEWPORT_QUERY = "(max-width: 900px)";
const REVEAL_MARGIN = 14;

function findVerticalScrollParent(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

export function useMobileKeyboardCenteredInput(isActive: boolean) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const visibilityTargetRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isActive) return;

    const currentInput = inputRef.current;
    if (!currentInput) return;
    const input: HTMLInputElement = currentInput;
    if (
      !isNativeApp() &&
      !window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
    ) {
      return;
    }

    let disposed = false;
    let anticipatedKeyboardTop: number | null = null;
    const timers = new Set<number>();

    function revealFocusedSection(behavior: ScrollBehavior = "smooth") {
      if (disposed || document.activeElement !== input) return;
      window.requestAnimationFrame(() => {
        if (disposed || document.activeElement !== input) return;
        const visibilityTarget = visibilityTargetRef.current ?? input;
        const scrollParent = findVerticalScrollParent(visibilityTarget);

        if (!scrollParent) {
          visibilityTarget.scrollIntoView({
            behavior,
            block: visibilityTarget === input ? "center" : "end",
            inline: "nearest",
          });
          return;
        }

        const targetRect = visibilityTarget.getBoundingClientRect();
        const scrollParentRect = scrollParent.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom =
          viewportTop + (viewport?.height ?? window.innerHeight);
        const visibleTop = Math.max(scrollParentRect.top, viewportTop);
        const visibleBottom = Math.min(
          scrollParentRect.bottom,
          viewportBottom,
          anticipatedKeyboardTop ?? Number.POSITIVE_INFINITY,
        );
        const availableHeight = visibleBottom - visibleTop - REVEAL_MARGIN * 2;

        let scrollDelta = targetRect.bottom + REVEAL_MARGIN - visibleBottom;
        if (
          targetRect.height <= availableHeight &&
          targetRect.top - scrollDelta < visibleTop + REVEAL_MARGIN
        ) {
          scrollDelta = targetRect.top - visibleTop - REVEAL_MARGIN;
        }

        if (Math.abs(scrollDelta) < 1) return;
        scrollParent.scrollBy({ top: scrollDelta, behavior });
      });
    }

    function scheduleReveal() {
      revealFocusedSection();
      // Re-apply after both the native keyboard animation and the New Game
      // card's height transition. WebKit may perform its own focus scroll in
      // between these calls.
      [100, 300, 440].forEach((delay) => {
        const timer = window.setTimeout(
          () => revealFocusedSection("auto"),
          delay,
        );
        timers.add(timer);
      });
    }

    function handleKeyboardWillShow(info: KeyboardInfo) {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom =
        viewportTop + (viewport?.height ?? window.innerHeight);
      anticipatedKeyboardTop = Math.max(
        viewportTop,
        viewportBottom - info.keyboardHeight,
      );
      revealFocusedSection("smooth");
    }

    function handleKeyboardDidHide() {
      anticipatedKeyboardTop = null;
    }

    const handleViewportResize = () => revealFocusedSection("auto");
    const visualViewport = window.visualViewport;
    const keyboardListeners = isNativeApp()
      ? [
          Keyboard.addListener("keyboardWillShow", handleKeyboardWillShow),
          Keyboard.addListener("keyboardDidShow", scheduleReveal),
          Keyboard.addListener("keyboardDidHide", handleKeyboardDidHide),
        ]
      : [];

    input.addEventListener("focus", scheduleReveal);
    window.addEventListener("resize", handleViewportResize);
    visualViewport?.addEventListener("resize", handleViewportResize);

    function focusInput() {
      if (disposed) return;
      if (document.activeElement === input) {
        scheduleReveal();
      } else {
        input.focus({ preventScroll: true });
      }
    }

    if (keyboardListeners.length > 0) {
      void Promise.all(keyboardListeners).then(focusInput);
    } else {
      focusInput();
    }

    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      input.removeEventListener("focus", scheduleReveal);
      window.removeEventListener("resize", handleViewportResize);
      visualViewport?.removeEventListener("resize", handleViewportResize);
      keyboardListeners.forEach((listener) => {
        void listener.then((handle) => handle.remove());
      });
    };
  }, [isActive]);

  return { inputRef, visibilityTargetRef };
}
