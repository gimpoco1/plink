import { translate } from "../../i18n/translate";
import { Pencil } from "lucide-react";
import { AVATAR_COLORS } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthAccountIdentity() {
  const {
    accountColorOptionRefs,
    accountDraftColor,
    accountDraftName,
    accountPlayer,
    accountPlayerColor,
    accountPlayerName,
    busy,
    editingAccountPlayer,
    handleAccountColorRadioKeyDown,
    onUpdateProfile,
    saveAccountPlayerName,
    session,
    setAccountDraftColor,
    setAccountDraftName,
    setEditingAccountPlayer,
  } = useAuthDialogContext();
  if (!session) return null;
  return (
    <>
      {session.user.email ? (
        <div
          className="authDialog__accountIdentity"
          aria-label={translate("copy.signedInAccount")}
        >
          <div className="authDialog__accountIdentityTop">
            <span className="authDialog__accountPlayerTitle">
              {translate("copy.email")}
            </span>
          </div>
          <span className="authDialog__accountEmail">{session.user.email}</span>
        </div>
      ) : null}
      <section className="authDialog__accountPlayerSection">
        <span className="authDialog__accountPlayerTitle">
          {translate("copy.accountPlayer")}
        </span>
        <article
          className={`authDialog__accountPlayerCard${
            editingAccountPlayer && accountPlayer
              ? " authDialog__accountPlayerCard--editing"
              : ""
          }`}
        >
          <div className="authDialog__accountPlayerMain">
            <span
              className="authDialog__accountPlayerAvatar"
              style={avatarStyleFor(
                editingAccountPlayer && accountPlayer
                  ? accountDraftColor || accountPlayer.avatarColor
                  : accountPlayerColor,
              )}
              aria-hidden="true"
            >
              {getInitials(accountDraftName || accountPlayerName || "Player")}
            </span>
            {editingAccountPlayer && accountPlayer ? (
              <div className="authDialog__accountPlayerEditStack">
                <div className="authDialog__accountPlayerEditTop">
                  <input
                    className="input input-search-compact authDialog__accountPlayerInput"
                    type="text"
                    value={accountDraftName}
                    onChange={(event) =>
                      setAccountDraftName(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void saveAccountPlayerName();
                      }
                      if (event.key === "Escape") {
                        setAccountDraftName(accountPlayer.name);
                        setAccountDraftColor(accountPlayer.avatarColor);
                        setEditingAccountPlayer(false);
                      }
                    }}
                    autoFocus
                    maxLength={28}
                    placeholder={translate("copy.playerName")}
                  />
                  <div className="authDialog__accountPlayerActions authDialog__accountPlayerActions--edit">
                    <button
                      className="iconbtn iconbtn--sm iconbtn--primary authDialog__accountPlayerAction"
                      type="button"
                      onClick={() => void saveAccountPlayerName()}
                      disabled={busy || !formatPlayerName(accountDraftName)}
                      aria-label={translate("copy.saveAccountPlayer")}
                      title={translate("copy.save")}
                    >
                      ✓
                    </button>
                    <button
                      className="iconbtn iconbtn--sm authDialog__accountPlayerAction"
                      type="button"
                      onClick={() => {
                        setAccountDraftName(accountPlayer.name);
                        setAccountDraftColor(accountPlayer.avatarColor);
                        setEditingAccountPlayer(false);
                      }}
                      aria-label={translate("copy.cancelEditingAccountPlayer")}
                      title={translate("copy.cancel")}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="authDialog__accountPlayerSwatches"
                  role="radiogroup"
                  aria-label={translate("copy.chooseAccountPlayerColor")}
                >
                  {AVATAR_COLORS.map((color, index) => (
                    <button
                      key={color.id}
                      ref={(node) => {
                        accountColorOptionRefs.current[index] = node;
                      }}
                      type="button"
                      className={
                        color.value === accountDraftColor
                          ? "authDialog__accountPlayerSwatch authDialog__accountPlayerSwatch--selected"
                          : "authDialog__accountPlayerSwatch"
                      }
                      style={{ backgroundColor: color.value }}
                      onClick={() => setAccountDraftColor(color.value)}
                      onKeyDown={(event) =>
                        handleAccountColorRadioKeyDown(event, index)
                      }
                      aria-label={translate(color.label)}
                      aria-checked={color.value === accountDraftColor}
                      role="radio"
                      tabIndex={color.value === accountDraftColor ? 0 : -1}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="authDialog__accountPlayerIdentity">
                <span className="authDialog__accountPlayerName">
                  {accountPlayerName
                    ? formatAccountPlayerName(accountPlayerName)
                    : translate("copy.notCreatedYet")}
                </span>
                {accountPlayer && onUpdateProfile ? (
                  <div className="authDialog__accountPlayerActions">
                    <button
                      className="iconbtn iconbtn--sm authDialog__accountPlayerAction"
                      type="button"
                      onClick={() => {
                        setAccountDraftName(accountPlayer.name);
                        setAccountDraftColor(accountPlayer.avatarColor);
                        setEditingAccountPlayer(true);
                      }}
                      aria-label={translate("copy.editAccountPlayer")}
                      title={translate("copy.edit")}
                    >
                      <Pencil size={15} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
