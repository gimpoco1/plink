import { createContext, useContext, type ReactNode } from "react";
import type { useAppModel } from "../hooks/useAppModel";

type Model = ReturnType<typeof useAppModel>;
const Context = createContext<Model | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppContext() {
  const value = useContext(Context);
  if (!value) throw new Error("App components require AppProvider");
  return value;
}
