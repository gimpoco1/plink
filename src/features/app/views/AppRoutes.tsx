import { AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { AppGameRoute } from "./AppGameRoute";
import { AppHistoryRoute } from "./AppHistoryRoute";
import { AppHomeRoute } from "./AppHomeRoute";

export function AppRoutes() {
  const { currentGame, isResolvingInitialGameView, view } = useAppContext();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {isResolvingInitialGameView ? null : view === "history" && currentGame ? (
        <AppHistoryRoute />
      ) : view === "game" && currentGame ? (
        <AppGameRoute />
      ) : (
        <AppHomeRoute />
      )}
    </AnimatePresence>
  );
}
