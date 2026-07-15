import { ManagePlayersDialog } from "../../../components/ManagePlayersDialog/ManagePlayersDialog";
import { useGameScreenModel } from "../hooks/useGameScreenModel";

type Model = ReturnType<typeof useGameScreenModel>;

export function GameManagePlayersDialog({ model }: { model: Model }) {
  const {
    game,
    profiles,
    teams,
    teamMembers,
    canUseTeams,
    isAuthenticated,
    managePlayersDialogRef,
    onDeleteProfile,
    onDeletePlayer,
    onUpsertProfile,
    onUpsertLocalPlayer,
    onUpdateProfile,
    onUpdatePlayer,
    onCreateTeam,
    onDeleteTeam,
    onDeleteSavedTeam,
    onStartGame,
    onOpenTeamsTab,
    takenProfileIds,
  } = model;

  return (
    <ManagePlayersDialog
      ref={managePlayersDialogRef}
      participantMode={game.participantMode === "teams" ? "teams" : "players"}
      profiles={profiles}
      savedTeams={teams}
      savedTeamMembers={teamMembers}
      currentPlayers={game.players}
      currentTeams={game.teams}
      canUseTeams={canUseTeams}
      takenProfileIds={takenProfileIds}
      isAuthenticated={isAuthenticated}
      onDeleteProfile={onDeleteProfile}
      onDeletePlayer={onDeletePlayer}
      onUpsertProfile={onUpsertProfile}
      onUpsertLocalPlayer={onUpsertLocalPlayer}
      onUpdateProfile={onUpdateProfile}
      onUpdatePlayer={onUpdatePlayer}
      onCreateTeam={onCreateTeam}
      onDeleteTeam={onDeleteTeam}
      onDeleteSavedTeam={onDeleteSavedTeam}
      onStartGame={onStartGame}
      onOpenTeamsTab={onOpenTeamsTab}
    />
  );
}
