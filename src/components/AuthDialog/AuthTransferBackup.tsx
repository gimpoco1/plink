import { translate } from "../../i18n/translate";
import { Download } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthTransferBackup() {
  const {
    backupInputRef,
    busy,
    includeGames,
    includeProfiles,
    isPro,
    runDownloadBackupFile,
    runImportFromFile,
    setIncludeGames,
    setIncludeProfiles,
  } = useAuthDialogContext();
  return (
    <>
      <div className="authDialog__transferBlock">
        <div className="authDialog__transferTitle">
          {translate("copy.backupCopy")}
        </div>
        <p className="authDialog__text">
          {translate("copy.downloadAFileYouCanKeepSafeOrRestoreLater")}
        </p>
        <div className="authDialog__checks">
          <label className="authDialog__check">
            <input
              type="checkbox"
              checked={includeGames}
              onChange={(e) => setIncludeGames(e.target.checked)}
            />
            <span>{translate("tabs.sessions")}</span>
          </label>
          <label className="authDialog__check">
            <input
              type="checkbox"
              checked={includeProfiles}
              onChange={(e) => setIncludeProfiles(e.target.checked)}
            />
            <span>
              {isPro ? "Players and saved teams" : translate("tabs.players")}
            </span>
          </label>
        </div>
        <div className="authDialog__transferActions">
          <button
            className="btn btn--ghost authDialog__actionBtn authDialog__actionBtn--download"
            type="button"
            onClick={() => void runDownloadBackupFile()}
            disabled={busy}
          >
            <span className="authDialog__actionIcon" aria-hidden="true">
              <Download size={15} strokeWidth={2.1} />
            </span>
            <span>{busy ? translate("copy.working") : translate("copy.downloadBackupCopy")}</span>
          </button>
        </div>
      </div>
      <input
        ref={backupInputRef}
        className="authDialog__fileInput"
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void runImportFromFile(file);
        }}
      />
    </>
  );
}
