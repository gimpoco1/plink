import { createContext, useContext, type ReactNode } from "react";
import type { useNewGameCardModel } from "./useNewGameCardModel";

type Model = ReturnType<typeof useNewGameCardModel>;
const Context = createContext<Model | null>(null);

export function NewGameCardProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNewGameCardContext() {
  const value = useContext(Context);
  if (!value)
    throw new Error("NewGameCard components require NewGameCardProvider");
  return value;
}
