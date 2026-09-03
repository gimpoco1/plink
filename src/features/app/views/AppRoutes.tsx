import { lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { AppHomeRoute } from "./AppHomeRoute";

const AppGameRoute = lazy(async () => {
  const { AppGameRoute: AppGameRouteComponent } = await import("./AppGameRoute");
  return { default: AppGameRouteComponent };
});

const AppHistoryRoute = lazy(async () => {
  const { AppHistoryRoute: AppHistoryRouteComponent } = await import(
    "./AppHistoryRoute"
  );
  return { default: AppHistoryRouteComponent };
});

export function AppRoutes() {
  const { currentGame, isResolvingInitialGameView, view } = useAppContext();
  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait" initial={false}>
        {isResolvingInitialGameView ? null : view === "history" && currentGame ? (
          <AppHistoryRoute />
        ) : view === "game" && currentGame ? (
          <AppGameRoute />
        ) : (
          <AppHomeRoute />
        )}
      </AnimatePresence>
    </Suspense>
  );
}
