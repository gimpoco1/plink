import { useEffect, useRef, useState } from "react";
import { Home, BarChart3, Users, GalleryVerticalEnd, type LucideIcon } from "lucide-react";
import type { HomeTab } from "../../types";
import "./HomeTabBar.css";
import { useI18n } from "../../i18n/I18nContext";

type HomeTabBarProps = {
  activeTab: HomeTab;
  playersView: "players" | "teams";
  canUseTeams: boolean;
  isAuthenticated: boolean;
  onChange: (tab: HomeTab) => void;
  onPlayersViewChange: (view: "players" | "teams") => void;
  onOpenProFeatureAuth: () => void;
  onOpenProPlan: () => void;
};

const tabs: Array<{
  id: HomeTab;
  labelKey: "tabs.home" | "tabs.sessions" | "tabs.stats" | "tabs.players";
  Icon: LucideIcon;
}> = [
  {
    id: "home",
    labelKey: "tabs.home",
    Icon: Home,
  },
  {
    id: "sessions",
    labelKey: "tabs.sessions",
    Icon: GalleryVerticalEnd,
  },
  {
    id: "stats",
    labelKey: "tabs.stats",
    Icon: BarChart3,
  },
  {
    id: "players",
    labelKey: "tabs.players",
    Icon: Users,
  },
];

export function HomeTabBar({
  activeTab,
  playersView,
  canUseTeams,
  isAuthenticated,
  onChange,
  onPlayersViewChange,
  onOpenProFeatureAuth,
  onOpenProPlan,
}: HomeTabBarProps) {
  const { t } = useI18n();
  const [showPlayersMenu, setShowPlayersMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canAccessTeamsView = isAuthenticated && canUseTeams;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowPlayersMenu(false);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function choosePlayersView(view: "players" | "teams") {
    if (view === "teams" && !canAccessTeamsView) {
      setShowPlayersMenu(false);
      if (!isAuthenticated) {
        onOpenProFeatureAuth();
        return;
      }
      onOpenProPlan();
      return;
    }

    onPlayersViewChange(view);
    onChange("players");
    setShowPlayersMenu(false);
  }

  return (
    <nav
      className={`tabBar${
        activeTab === "players" && playersView === "teams"
          ? " tabBar--teamsTheme"
          : ""
      }`}
    >
      {tabs.map(({ id, labelKey, Icon }) => {
        const isPlayersTab = id === "players";
        const visibleLabel = isPlayersTab
          ? playersView === "teams"
            ? t("tabs.teams")
            : t("tabs.players")
          : t(labelKey);
        return (
          <div
            key={id}
            className="tabItemWrap"
            ref={isPlayersTab ? menuRef : undefined}
          >
            {isPlayersTab && showPlayersMenu ? (
              <div className="tabSwitcher" role="menu" aria-label={t("tabs.playersView")}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={playersView === "players"}
                  className="tabSwitcher__item"
                  onClick={() => choosePlayersView("players")}
                >
                  {t("tabs.players")}
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={playersView === "teams"}
                  aria-disabled={!canAccessTeamsView}
                  className={`tabSwitcher__item${
                    !canAccessTeamsView ? " tabSwitcher__item--locked" : ""
                  }`}
                  onClick={() => choosePlayersView("teams")}
                >
                  {t("tabs.teams")}
                  {!canAccessTeamsView ? (
                    <span className="tabSwitcher__badge">{t("common.pro")}</span>
                  ) : null}
                </button>
              </div>
            ) : null}
            <button
              className="tabItem"
              data-active={activeTab === id}
              onClick={() => {
                if (isPlayersTab && activeTab === "players") {
                  setShowPlayersMenu((current) => !current);
                  return;
                }
                setShowPlayersMenu(false);
                onChange(id);
              }}
              aria-label={visibleLabel}
              aria-haspopup={isPlayersTab ? "menu" : undefined}
              aria-expanded={isPlayersTab ? showPlayersMenu : undefined}
            >
              <Icon size={22} strokeWidth={2.5} aria-hidden />
              <span>{visibleLabel}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
