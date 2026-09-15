import { createContext, useContext, type ReactNode } from "react";
import type { usePlayerRatings } from "../../hooks/usePlayerRatings";

type PlayerRatingsModel = ReturnType<typeof usePlayerRatings>;
const Context = createContext<PlayerRatingsModel | null>(null);

export function PlayerRatingsProvider({
  value,
  children,
}: {
  value: PlayerRatingsModel;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlayerRatingsContext() {
  const value = useContext(Context);
  if (!value) throw new Error("Player levels require PlayerRatingsProvider");
  return value;
}
