import { createContext, useContext, type ReactNode } from "react";
import type { useAuthDialogModel } from "./useAuthDialogModel";

type Model = ReturnType<typeof useAuthDialogModel>;
const Context = createContext<Model | null>(null);

export function AuthDialogProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuthDialogContext() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("AuthDialog components require AuthDialogProvider");
  }
  return value;
}
