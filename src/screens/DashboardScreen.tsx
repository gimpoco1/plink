import { useEffect, useState, type TouchEvent } from "react";
import type { Game, GameTeam, HomeTab, PlayerProfile, TeamMember } from "../types";
import type { NewGameInput } from "../components/NewGameCard/NewGameCard";
import { HomeTabBar } from "../components/HomeTabBar/HomeTabBar";
import { HomeScreen } from "./HomeScreen";
import { SessionsScreen } from "./SessionsScreen";
import { StatsScreen } from "./StatsScreen";
import { PlayersScreen } from "./PlayersScreen";
import { PLAYERS_VIEW_STORAGE_KEY } from "../constants";
import "./DashboardScreen.css";

const tabs: HomeTab[] = ["home", "sessions", "stats", "players"];

type DashboardScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  onDismissLocalSessionsHint: () => void;
  activeTab: HomeTab;
  onActiveTabChange: (tab: HomeTab) => void;
  onOpenAuth: () => void;
  onOpenLocalImport: () => void;
  onOpenProPlan: () => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  presetDraft?: NewGameInput | null;
  presetDraftToken?: number;
  onStartQuickSetup: (
    input: NewGameInput,
    details: {
      label: string;
      players: { name: string; avatarColor: string }[];
    },
  ) => void | Promise<void>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
  onCreateTeam: (name: string, icon?: string) => GameTeam | null;
  onUpdateTeam: (
    id: string,
    updates: Partial<Pick<GameTeam, "name" | "icon">>,
  ) => void;
  onDeleteTeam: (id: string) => void;
  onToggleTeamMember: (teamId: string, profileId: string) => void;
  onDuplicate: (gameId: string) => void;
  onRename: (gameId: string) => void;
  onEnter: (gameId: string) => void;
  onDelete: (gameId: string) => void;
};

export function DashboardScreen(props: DashboardScreenProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playersView, setPlayersView] = useState<"players" | "teams">(() => {
    try {
      return localStorage.getItem(PLAYERS_VIEW_STORAGE_KEY) === "teams"
        ? "teams"
        : "players";
    } catch {
      return "players";
    }
  });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    try {
      localStorage.setItem(PLAYERS_VIEW_STORAGE_KEY, playersView);
    } catch {
      // Ignore storage failures; the in-memory selection still works.
    }
  }, [playersView]);

  useEffect(() => {
    function handleNewGame() {
      props.onActiveTabChange("home");
      setIsCreating(true);
    }
    function handleAddPlayer() {
      props.onActiveTabChange("players");
      setIsAddingPlayer(true);
    }
    window.addEventListener("plink:new-game", handleNewGame);
    window.addEventListener("plink:add-player", handleAddPlayer);
    return () => {
      window.removeEventListener("plink:new-game", handleNewGame);
      window.removeEventListener("plink:add-player", handleAddPlayer);
    };
  }, [props.onActiveTabChange]);

  useEffect(() => {
    if (!props.presetDraft || props.presetDraftToken === undefined) return;
    props.onActiveTabChange("home");
    setIsCreating(true);
  }, [props.onActiveTabChange, props.presetDraft, props.presetDraftToken]);

  function changeTab(tab: HomeTab) {
    props.onActiveTabChange(tab);
    if (tab !== "home") setIsCreating(false);
  }

  function startTouch(event: TouchEvent<HTMLElement>) {
    if ((event.target as HTMLElement | null)?.closest(".swipeRow")) return;
    const x = event.touches[0]?.clientX ?? 0;
    const y = event.touches[0]?.clientY ?? 0;
    const threshold = Math.min(92, Math.max(56, window.innerWidth * 0.2));
    setTouchStart({ x, y });
    if (x > threshold && x < window.innerWidth - threshold) {
      setTouchStart(null);
    }
  }

  function moveTouch(event: TouchEvent<HTMLElement>) {
    if (!touchStart) return;
    const x = event.touches[0]?.clientX ?? touchStart.x;
    const y = event.touches[0]?.clientY ?? touchStart.y;
    if (Math.abs(x - touchStart.x) > Math.abs(y - touchStart.y))
      event.preventDefault();
  }

  function endTouch(event: TouchEvent<HTMLElement>) {
    if (!touchStart) return resetTouch();
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStart.x;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - touchStart.y;
    if (Math.abs(deltaX) >= 90 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const index = tabs.indexOf(props.activeTab);
      changeTab(
        tabs[
          deltaX < 0
            ? Math.min(tabs.length - 1, index + 1)
            : Math.max(0, index - 1)
        ],
      );
    }
    resetTouch();
  }

  function resetTouch() {
    setTouchStart(null);
  }

  function renderActiveTab() {
    switch (props.activeTab) {
      case "sessions":
        return (
          <SessionsScreen
            games={props.games}
            showLocalSessionsHint={props.showLocalSessionsHint}
            pendingLocalSessionsCount={props.pendingLocalSessionsCount}
            onDismissLocalSessionsHint={props.onDismissLocalSessionsHint}
            onOpenAuth={props.onOpenLocalImport}
            onOpenProPlan={props.onOpenProPlan}
            onEnter={props.onEnter}
            onDuplicate={props.onDuplicate}
            onRename={props.onRename}
            onDelete={props.onDelete}
          />
        );
      case "stats":
        return (
          <StatsScreen
            games={props.games}
            profiles={props.profiles}
            isAuthenticated={props.isAuthenticated}
            onOpenAuth={props.onOpenAuth}
          />
        );
      case "players":
        return (
          <PlayersScreen
            games={props.games}
            profiles={props.profiles}
            teams={props.teams}
            teamMembers={props.teamMembers}
            canUseTeams={props.canUseTeams}
            activeView={playersView}
            isAuthenticated={props.isAuthenticated}
            showLocalSessionsHint={props.showLocalSessionsHint}
            pendingLocalSessionsCount={props.pendingLocalSessionsCount}
            onDismissLocalSessionsHint={props.onDismissLocalSessionsHint}
            addingPlayer={isAddingPlayer}
            onActiveViewChange={setPlayersView}
            onAddingPlayerChange={setIsAddingPlayer}
            onOpenAuth={props.onOpenLocalImport}
            onUpsertProfile={props.onUpsertProfile}
            onUpdateProfile={props.onUpdateProfile}
            onDeleteProfile={props.onDeleteProfile}
            onCreateTeam={props.onCreateTeam}
            onUpdateTeam={props.onUpdateTeam}
            onDeleteTeam={props.onDeleteTeam}
            onToggleTeamMember={props.onToggleTeamMember}
          />
        );
      case "home":
      default:
        return (
          <HomeScreen
            games={props.games}
            profiles={props.profiles}
            teams={props.teams}
            teamMembers={props.teamMembers}
            canUseTeams={props.canUseTeams}
            isAuthenticated={props.isAuthenticated}
            showLocalSessionsHint={props.showLocalSessionsHint}
            pendingLocalSessionsCount={props.pendingLocalSessionsCount}
            isCreating={isCreating}
            presetDraft={props.presetDraft}
            presetDraftToken={props.presetDraftToken}
            onCreatingChange={setIsCreating}
            onOpenAuth={props.onOpenAuth}
            onOpenLocalImport={props.onOpenLocalImport}
            onDismissLocalSessionsHint={props.onDismissLocalSessionsHint}
            onCreate={props.onCreate}
            onStartQuickSetup={props.onStartQuickSetup}
            onUpsertProfile={props.onUpsertProfile}
            onEnter={props.onEnter}
          />
        );
    }
  }

  return (
    <div className="homeContainer">
      <main className="homeScreen">
        <div className="tabSlider" data-active={props.activeTab}>
          <div
            className="tabWindow"
            onTouchStart={startTouch}
            onTouchMove={moveTouch}
            onTouchEnd={endTouch}
            onTouchCancel={resetTouch}
          >
            <div className="tabPanel">{renderActiveTab()}</div>
          </div>
        </div>
      </main>
      <HomeTabBar
        activeTab={props.activeTab}
        playersView={playersView}
        onChange={changeTab}
        onPlayersViewChange={setPlayersView}
      />
    </div>
  );
}
