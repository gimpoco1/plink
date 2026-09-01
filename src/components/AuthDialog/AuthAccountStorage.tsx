import { translate } from "../../i18n/translate";
import { ChevronDown } from "lucide-react";
import { formatAccountPlayerName } from "../../utils/text";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthAccountStorage() {
  const {
    accountGames,
    accountGamesCount,
    accountProfiles,
    accountProfilesCount,
    setShowAccountDetails,
    showAccountDetails,
  } = useAuthDialogContext();

  return (
    <div className="authDialog__storage">
      <div
        className={`authDialog__storageCard${showAccountDetails ? "" : " authDialog__storageCard--collapsed"}`}
      >
        <button
          type="button"
          className="authDialog__storageToggle"
          onClick={() => setShowAccountDetails((value) => !value)}
          aria-expanded={showAccountDetails}
          aria-controls="auth-account-details"
        >
          <span className="authDialog__accountPlayerTitle">
            {translate("copy.details")}
          </span>
          <div className="authDialog__storageStats">
            <span>
              <strong>{accountGamesCount}</strong>
              <span>{translate("copy.sessions")}</span>
            </span>
            <span>
              <strong>{accountProfilesCount}</strong>
              <span>{translate("copy.players")}</span>
            </span>
          </div>
          <span
            className={`authDialog__storageChevron${showAccountDetails ? " authDialog__storageChevron--open" : ""}`}
            aria-hidden="true"
          >
            <ChevronDown size={18} strokeWidth={2.2} />
          </span>
        </button>
        {showAccountDetails ? (
          <div className="authDialog__accountDetails" id="auth-account-details">
            <section className="authDialog__accountGroup">
              <div className="authDialog__accountGroupTitle">
                {translate("tabs.sessions")}
              </div>
              {accountGames.length > 0 ? (
                <ul className="authDialog__accountList">
                  {accountGames.map((game) => (
                    <li key={game.id} className="authDialog__accountItem">
                      <strong>{game.name}</strong>
                      <span>
                        {translate("dynamic.player", [game.players.length])}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : accountGamesCount > 0 ? (
                <div className="authDialog__accountMore">
                  {accountGamesCount} {translate("copy.savedSession")}
                  {accountGamesCount === 1 ? "" : "s"} {translate("copy.inYourAccountListWillAppearAfterSyncRefresh")}
                </div>
              ) : (
                <div className="authDialog__accountEmpty">
                  {translate("copy.noSavedSessionsYet")}
                </div>
              )}
            </section>

            <section className="authDialog__accountGroup">
              <div className="authDialog__accountGroupTitle">
                {translate("tabs.players")}
              </div>
              {accountProfiles.length > 0 ? (
                <ul className="authDialog__accountList">
                  {accountProfiles.map((profile) => (
                    <li key={profile.id} className="authDialog__accountItem">
                      <strong>
                        {profile.isAccountPlayer
                          ? formatAccountPlayerName(profile.name)
                          : profile.name}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : accountProfilesCount > 0 ? (
                <div className="authDialog__accountMore">
                  {accountProfilesCount} {translate("copy.savedPlayer2")}
                  {accountProfilesCount === 1 ? "" : "s"} {translate("copy.inYourAccountListWillAppearAfterSyncRefresh")}
                </div>
              ) : (
                <div className="authDialog__accountEmpty">
                  {translate("copy.noSavedPlayersYet")}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
