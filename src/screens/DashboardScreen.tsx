import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { HomeTab } from "../types";
import { HomeTabBar } from "../components/HomeTabBar/HomeTabBar";
import { HomeScreen } from "./HomeScreen";
import { SessionsScreen } from "./SessionsScreen";
import { StatsScreen } from "./StatsScreen";
import { PlayersScreen } from "./PlayersScreen";
import { PLAYERS_VIEW_STORAGE_KEY } from "../constants";
import type { DashboardScreenProps } from "../features/dashboard/types/dashboardScreenTypes";
import "../features/dashboard/styles/DashboardScreen.css";

const tabs: HomeTab[] = ["home", "sessions", "stats", "players"];

export function DashboardScreen(props: DashboardScreenProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [openTeamBuilderToken, setOpenTeamBuilderToken] = useState(0);
  const [playersView, setPlayersView] = useState<"players" | "teams">(() => {
    try {
      return localStorage.getItem(PLAYERS_VIEW_STORAGE_KEY) === "teams"
        ? "teams"
        : "players";
    } catch {
      return "players";
    }
  });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYERS_VIEW_STORAGE_KEY, playersView);
    } catch {
      // Ignore storage failures; the in-memory selection still works.
    }
  }, [playersView]);

  useEffect(() => {
    if (
      playersView === "teams" &&
      (!props.isAuthenticated || !props.canUseTeams)
    ) {
      setPlayersView("players");
    }
  }, [playersView, props.canUseTeams, props.isAuthenticated]);

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
    if (
      !props.presetDraft ||
      props.presetDraftToken === undefined ||
      props.presetDraftIntent !== "edit"
    )
      return;
    props.onActiveTabChange("home");
    setIsCreating(true);
  }, [
    props.onActiveTabChange,
    props.presetDraft,
    props.presetDraftIntent,
    props.presetDraftToken,
  ]);

  useEffect(() => {
    if (!props.openTeamBuilderRequestToken) return;
    props.onActiveTabChange("players");
    setPlayersView("teams");
    setIsAddingPlayer(false);
    setIsCreating(false);
    setOpenTeamBuilderToken((value) => value + 1);
    props.onOpenTeamBuilderRequestHandled?.();
  }, [
    props.openTeamBuilderRequestToken,
    props.onActiveTabChange,
    props.onOpenTeamBuilderRequestHandled,
  ]);

  function changeTab(tab: HomeTab) {
    props.onActiveTabChange(tab);
    if (tab !== "home") setIsCreating(false);
  }

  function startTouch(event: TouchEvent<HTMLElement>) {
    if ((event.target as HTMLElement | null)?.closest(".swipeRow")) return;
    const x = event.touches[0]?.clientX ?? 0;
    const y = event.touches[0]?.clientY ?? 0;
    const threshold = Math.min(92, Math.max(56, window.innerWidth * 0.2));
    touchStartRef.current =
      x > threshold && x < window.innerWidth - threshold ? null : { x, y };
  }

  function moveTouch(event: TouchEvent<HTMLElement>) {
    const touchStart = touchStartRef.current;
    if (!touchStart) return;
    const x = event.touches[0]?.clientX ?? touchStart.x;
    const y = event.touches[0]?.clientY ?? touchStart.y;
    const deltaX = Math.abs(x - touchStart.x);
    const deltaY = Math.abs(y - touchStart.y);
    if (deltaX > 14 && deltaX > deltaY) {
      event.preventDefault();
    }
  }

  function endTouch(event: TouchEvent<HTMLElement>) {
    const touchStart = touchStartRef.current;
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
    touchStartRef.current = null;
  }

  function renderActiveTab() {
    switch (props.activeTab) {
      case "sessions":
        return (
          <SessionsScreen
            games={props.games}
            showLocalSessionsHint={props.showLocalSessionsHint}
            pendingLocalSessionsCount={props.pendingLocalSessionsCount}
            pendingLocalProfilesCount={props.pendingLocalProfilesCount}
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
            teams={props.teams}
            teamMembers={props.teamMembers}
            isAuthenticated={props.isAuthenticated}
            onOpenAuth={props.onOpenAuth}
            onOpenProPlan={props.onOpenProPlan}
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
            pendingLocalProfilesCount={props.pendingLocalProfilesCount}
            onDismissLocalSessionsHint={props.onDismissLocalSessionsHint}
            addingPlayer={isAddingPlayer}
            openTeamBuilderToken={openTeamBuilderToken}
            onActiveViewChange={setPlayersView}
            onAddingPlayerChange={setIsAddingPlayer}
            onOpenAuth={props.onOpenAuth}
            onOpenProFeatureAuth={props.onOpenProFeatureAuth}
            onOpenProPlan={props.onOpenProPlan}
            onUpsertProfile={props.onUpsertProfile}
            onUpdateProfile={props.onUpdateProfile}
            onDeleteProfile={props.onDeleteProfile}
            onCreateTeam={props.onCreateTeam}
            onTeamCreated={props.onTeamCreated}
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
            pendingLocalProfilesCount={props.pendingLocalProfilesCount}
            isCreating={isCreating}
            presetDraft={props.presetDraft}
            presetDraftToken={props.presetDraftToken}
            onCreatingChange={setIsCreating}
            onOpenAuth={props.onOpenAuth}
            onOpenProFeatureAuth={props.onOpenProFeatureAuth}
            onOpenLocalImport={props.onOpenLocalImport}
            onOpenProPlan={props.onOpenProPlan}
            onDismissLocalSessionsHint={props.onDismissLocalSessionsHint}
            onOpenTeamsTab={(draft) => {
              props.onStoreNewGameDraft(draft);
              props.onActiveTabChange("players");
              setPlayersView("teams");
              setIsAddingPlayer(false);
              setIsCreating(false);
              setOpenTeamBuilderToken((value) => value + 1);
            }}
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
        canUseTeams={props.canUseTeams}
        isAuthenticated={props.isAuthenticated}
        onChange={changeTab}
        onPlayersViewChange={setPlayersView}
        onOpenProFeatureAuth={props.onOpenProFeatureAuth}
        onOpenProPlan={props.onOpenProPlan}
      />
    </div>
  );
}
