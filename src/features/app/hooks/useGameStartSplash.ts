import { useCallback, useEffect, useRef, useState } from "react";

export type GameStartSplashCue = {
  token: number;
};

const GAME_START_SPLASH_DURATION_MS = 2000;

export function useGameStartSplash() {
  const [gameStartSplashCue, setGameStartSplashCue] =
    useState<GameStartSplashCue | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const tokenRef = useRef(0);

  const cancelGameStartSplash = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setGameStartSplashCue(null);
  }, []);

  const triggerGameStartSplash = useCallback(() => {
    tokenRef.current += 1;
    setGameStartSplashCue({ token: tokenRef.current });

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setGameStartSplashCue(null);
      timeoutRef.current = null;
    }, GAME_START_SPLASH_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return {
    cancelGameStartSplash,
    gameStartSplashCue,
    triggerGameStartSplash,
  };
}
