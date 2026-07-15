import { createContext, useContext, type ReactNode } from "react";
import type { usePlayersScreenModel } from "../hooks/usePlayersScreenModel";

type Model = ReturnType<typeof usePlayersScreenModel>;
const Context = createContext<Model | null>(null);

export function PlayersScreenProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlayersScreenContext() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("PlayersScreen components require PlayersScreenProvider");
  }
  return value;
}
