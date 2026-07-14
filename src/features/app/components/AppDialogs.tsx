import { AuthDialog } from "../../../components/AuthDialog/AuthDialog";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import { GameSettingsDialog } from "../../../components/GameSettingsDialog/GameSettingsDialog";
import { ProFeatureGateDialog } from "../../../components/ProFeatureGateDialog/ProFeatureGateDialog";
import { useAppContext } from "../context/AppContext";

export function AppDialogs() {
  const {
    authDialogLocalGames,
    authDialogLocalProfiles,
    authDialogRef,
    canViewSavedData,
    confirmRef,
    currentGame,
    games,
    handleDownloadBackupFile,
    handleImportBackupFile,
    handleImportLocalData,
    managePlayersDialogRef,
    proFeatureGateDialogRef,
    profiles,
    session,
    setAuthDialogOpen,
    setShouldSaveGamePlayersOnSignIn,
    settingsDialogRef,
    updateGameSettings,
    updateProfileEverywhere,
    view,
  } = useAppContext();
  return (
    <>
      {view === "game" && currentGame ? (
        <GameSettingsDialog
          ref={settingsDialogRef}
          game={currentGame}
          isAuthenticated={canViewSavedData}
          onOpenAuth={() => {
            setShouldSaveGamePlayersOnSignIn(true);
            authDialogRef.current?.open();
          }}
          onAddPlayer={() => managePlayersDialogRef.current?.openWithCreate()}
          onSave={(input) => {
            updateGameSettings(currentGame.id, input);
          }}
        />
      ) : null}

      <AuthDialog
        ref={authDialogRef}
        session={session}
        onOpenChange={setAuthDialogOpen}
        localGames={authDialogLocalGames}
        localProfiles={authDialogLocalProfiles}
        accountGamesCount={games.length}
        accountProfilesCount={profiles.length}
        accountGames={games}
        accountProfiles={profiles}
        onUpdateProfile={(id, updates) => {
          updateProfileEverywhere(id, updates);
        }}
        onImportLocalData={handleImportLocalData}
        onImportBackupFile={handleImportBackupFile}
        onDownloadBackupFile={handleDownloadBackupFile}
      />
      <ProFeatureGateDialog
        ref={proFeatureGateDialogRef}
        onContinue={() => {
          setShouldSaveGamePlayersOnSignIn(false);
          authDialogRef.current?.open();
        }}
      />
      <ConfirmDialog ref={confirmRef} />
    </>
  );
}
