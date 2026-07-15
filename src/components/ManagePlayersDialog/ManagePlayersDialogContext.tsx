import { createContext, useContext, type ReactNode } from "react";
import type { useManagePlayersDialogModel } from "./useManagePlayersDialogModel";

type Model = ReturnType<typeof useManagePlayersDialogModel>;
const Context = createContext<Model | null>(null);

export function ManagePlayersDialogProvider({
  value,
  children,
}: {
  value: Model;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useManagePlayersDialogContext() {
  const value = useContext(Context);
  if (!value) {
    throw new Error(
      "ManagePlayersDialog components require ManagePlayersDialogProvider",
    );
  }
  return value;
}
