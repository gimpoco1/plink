import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import DotGrid from "../../../components/DotGrid/DotGrid";
import { isNativeApp } from "../../../lib/nativePlatform";
import { useAppContext } from "../context/AppContext";
import { AppDialogs } from "../components/AppDialogs";
import { AppLoadingScreen } from "../components/AppLoadingScreen";
import { AppRoutes } from "./AppRoutes";
import { AppToast } from "../components/AppToast";
import { AppTopBar } from "../components/AppTopBar";

export function AppView() {
  const {
    authDialogOpen,
    handleTouchEnd,
    handleTouchStart,
    isAppBootLoading,
    isResumingActiveGameView,
  } = useAppContext();
  const isLoading = isAppBootLoading || isResumingActiveGameView;

  useEffect(() => {
    if (!isNativeApp() || isLoading) return;
    void SplashScreen.hide({ fadeOutDuration: 0 });
  }, [isLoading]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div
      className="app"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`appBackdrop${authDialogOpen ? " appBackdrop--hidden" : ""}`}
        aria-hidden="true"
      >
        <DotGrid
          dotSize={3}
          gap={23}
          baseColor="#202b34"
          activeColor="#d8ff4f"
          proximity={140}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
          idleSpeed={1.75}
          idleStrength={4.5}
        />
      </div>
      <AppTopBar />
      <AppRoutes />
      <AppDialogs />
      <AppToast />
    </div>
  );
}
