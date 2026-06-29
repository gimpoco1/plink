import { Home, History, BarChart3, Users, GalleryVerticalEnd, type LucideIcon } from "lucide-react";
import type { HomeTab } from "../../types";
import "./HomeTabBar.css";

type HomeTabBarProps = {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
};

const tabs: Array<{
  id: HomeTab;
  label: string;
  Icon: LucideIcon;
}> = [
  {
    id: "home",
    label: "Home",
    Icon: Home,
  },
  {
    id: "sessions",
    label: "Sessions",
    Icon: GalleryVerticalEnd,
  },
  {
    id: "stats",
    label: "Stats",
    Icon: BarChart3,
  },
  {
    id: "players",
    label: "Players",
    Icon: Users,
  },
];

export function HomeTabBar({ activeTab, onChange }: HomeTabBarProps) {
  return (
    <nav className="tabBar">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          className="tabItem"
          data-active={activeTab === id}
          onClick={() => onChange(id)}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={2.5} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
