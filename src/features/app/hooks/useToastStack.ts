import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastState, ToastTone } from "../../../types";

export type VisibleToast = ToastState & { id: number };

const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 5200;

export function useToastStack() {
  const [visibleToasts, setVisibleToasts] = useState<VisibleToast[]>([]);
  const nextToastIdRef = useRef(0);
  const timeoutIdsRef = useRef(new Set<number>());

  const showToast = useCallback(
    (message: string, tone: ToastTone = "default") => {
      const id = ++nextToastIdRef.current;
      setVisibleToasts((current) =>
        [{ id, message, tone }, ...current].slice(0, MAX_VISIBLE_TOASTS),
      );

      const timeoutId = window.setTimeout(() => {
        timeoutIdsRef.current.delete(timeoutId);
        setVisibleToasts((current) =>
          current.filter((toast) => toast.id !== id),
        );
      }, TOAST_DURATION_MS);
      timeoutIdsRef.current.add(timeoutId);
    },
    [],
  );

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      timeoutIdsRef.current.clear();
    },
    [],
  );

  return { visibleToasts, showToast };
}
