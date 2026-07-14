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
          <span className="authDialog__accountPlayerTitle">Details</span>
          <div className="authDialog__storageStats">
            <span>
              <strong>{accountGamesCount}</strong>
              <span>sessions</span>
            </span>
            <span>
              <strong>{accountProfilesCount}</strong>
              <span>players</span>
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
              <div className="authDialog__accountGroupTitle">Sessions</div>
              {accountGames.length > 0 ? (
                <ul className="authDialog__accountList">
                  {accountGames.map((game) => (
                    <li key={game.id} className="authDialog__accountItem">
                      <strong>{game.name}</strong>
                      <span>
                        {game.players.length} player
                        {game.players.length === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : accountGamesCount > 0 ? (
                <div className="authDialog__accountMore">
                  {accountGamesCount} saved session
                  {accountGamesCount === 1 ? "" : "s"} in your account. List
                  will appear after sync refresh.
                </div>
              ) : (
                <div className="authDialog__accountEmpty">
                  No saved sessions yet.
                </div>
              )}
            </section>

            <section className="authDialog__accountGroup">
              <div className="authDialog__accountGroupTitle">Players</div>
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
                  {accountProfilesCount} saved player
                  {accountProfilesCount === 1 ? "" : "s"} in your account. List
                  will appear after sync refresh.
                </div>
              ) : (
                <div className="authDialog__accountEmpty">
                  No saved players yet.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
