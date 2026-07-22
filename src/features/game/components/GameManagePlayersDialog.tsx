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
    pastLinkedPlayers,
    onAddPastLinkedPlayer,
    onMergePlayers,
    onUpsertProfile,
    onUpsertLocalPlayer,
    onUpdateProfile,
    onUpdatePlayer,
    onCreateTeam,
    onDeleteTeam,
    onDeleteSavedTeam,
    onStartGame,
    onOpenTeamsTab,
    onInviteOthers,
    takenProfileIds,
  } = model;
  const linkedPlayerIds = new Set(
    game.isShared
      ? game.players
          .filter(
            (player) =>
              player.joinedViaInvite === true ||
              player.id === game.linkedPlayerIdForCurrentUser,
          )
          .map((player) => player.id)
      : [],
  );

  return (
    <ManagePlayersDialog
      ref={managePlayersDialogRef}
      participantMode={game.participantMode === "teams" ? "teams" : "players"}
      profiles={profiles}
      savedTeams={teams}
      savedTeamMembers={teamMembers}
      currentPlayers={game.players}
      linkedPlayerIds={linkedPlayerIds}
      currentTeams={game.teams}
      canUseTeams={canUseTeams}
      takenProfileIds={takenProfileIds}
      isAuthenticated={isAuthenticated}
      onDeleteProfile={onDeleteProfile}
      onDeletePlayer={onDeletePlayer}
      pastLinkedPlayers={
        game.accessRole === "collaborator" ? [] : pastLinkedPlayers
      }
      onAddPastLinkedPlayer={
        game.accessRole === "collaborator"
          ? undefined
          : onAddPastLinkedPlayer
      }
      onMergePlayers={
        game.accessRole === "collaborator" ? undefined : onMergePlayers
      }
      onUpsertProfile={onUpsertProfile}
      onUpsertLocalPlayer={onUpsertLocalPlayer}
      onUpdateProfile={onUpdateProfile}
      onUpdatePlayer={onUpdatePlayer}
      onCreateTeam={onCreateTeam}
      onDeleteTeam={onDeleteTeam}
      onDeleteSavedTeam={onDeleteSavedTeam}
      onStartGame={onStartGame}
      onOpenTeamsTab={onOpenTeamsTab}
      onInviteOthers={onInviteOthers}
    />
  );
}
