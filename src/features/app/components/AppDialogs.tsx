import { translate } from "../../../i18n/translate";
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
          onAddPlayer={
            currentGame.accessRole !== "collaborator"
              ? () => managePlayersDialogRef.current?.openWithCreate()
              : undefined
          }
          onSave={(input) => {
            void updateGameSettings(currentGame.id, input);
          }}
        />
      ) : null}

      <AuthDialog
        ref={authDialogRef}
        session={session}
        onOpenChange={setAuthDialogOpen}
        onConfirmSignOut={() =>
          confirmRef.current.confirm({
            eyebrow: translate("topbar.account"),
            title: translate("copy.signOut2"),
            message: translate("copy.areYouSureYouWantToSignOut"),
            confirmText: translate("copy.signOut"),
            cancelText: translate("copy.cancel"),
            tone: "danger",
          })
        }
        onConfirmAccountDeletion={() =>
          confirmRef.current.confirm({
            eyebrow: translate("copy.finalWarning"),
            title: translate("copy.thisCannotBeUndone"),
            message: translate("copy.deleteAccountPermanentNotice"),
            confirmText: translate("copy.deleteMyAccount"),
            cancelText: translate("copy.goBack"),
            tone: "danger",
          })
        }
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
