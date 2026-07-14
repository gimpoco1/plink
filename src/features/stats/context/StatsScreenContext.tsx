import { createContext, useContext, type ReactNode } from "react";
import type { useStatsScreenModel } from "../hooks/useStatsScreenModel";
type Model = ReturnType<typeof useStatsScreenModel>;
const Context = createContext<Model | null>(null);
export function StatsScreenProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStatsScreenContext() {
  const value = useContext(Context);
  if (!value)
    throw new Error("StatsScreen components require StatsScreenProvider");
  return value;
}
