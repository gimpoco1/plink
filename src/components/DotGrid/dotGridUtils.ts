export type Dot = {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
};

export function throttle<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  limit: number,
) {
  let lastCall = 0;
  return (...args: TArgs) => {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      callback(...args);
    }
  };
}

export function hexToRgb(hex: string) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}
