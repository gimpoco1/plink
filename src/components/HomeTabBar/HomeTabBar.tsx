import type { HomeTab } from "../../types";
import "./HomeTabBar.css";

type HomeTabBarProps = {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
};

const tabs: Array<{ id: HomeTab; label: string; icon: React.ReactNode }> = [
  {
    id: "home",
    label: "Home",
    icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  },
  { id: "sessions", label: "Sessions", icon: <path d="M7 3h10m-9 4h8m-9 5h10m-9 5h8" /> },
  { id: "stats", label: "Stats", icon: <path d="M4 19h16M7 15V9m5 6V5m5 10v-4" /> },
  {
    id: "players",
    label: "Players",
    icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
];

export function HomeTabBar({ activeTab, onChange }: HomeTabBarProps) {
  return (
    <nav className="tabBar">
      {tabs.map((tab) => (
        <button key={tab.id} className="tabItem" data-active={activeTab === tab.id} onClick={() => onChange(tab.id)} aria-label={tab.label}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{tab.icon}</svg>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
