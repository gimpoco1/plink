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
    entitlementsLoading,
    handleAccountColorRadioKeyDown,
    isPro,
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
          aria-label="Signed in account"
        >
          <div className="authDialog__accountIdentityTop">
            <span className="authDialog__accountPlayerTitle">Email</span>
            {!entitlementsLoading ? (
              <span
                className={`authDialog__accountPlanBadge authDialog__accountPlanBadge--${
                  isPro ? "pro" : "free"
                }`}
              >
                {isPro ? "PRO" : "FREE"}
              </span>
            ) : null}
          </div>
          <span className="authDialog__accountEmail">{session.user.email}</span>
        </div>
      ) : null}
      <section className="authDialog__accountPlayerSection">
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
                    placeholder="Player name"
                  />
                  <div className="authDialog__accountPlayerActions authDialog__accountPlayerActions--edit">
                    <button
                      className="iconbtn iconbtn--sm iconbtn--primary authDialog__accountPlayerAction"
                      type="button"
                      onClick={() => void saveAccountPlayerName()}
                      disabled={busy || !formatPlayerName(accountDraftName)}
                      aria-label="Save account player"
                      title="Save"
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
                      aria-label="Cancel editing account player"
                      title="Cancel"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="authDialog__accountPlayerSwatches"
                  role="radiogroup"
                  aria-label="Choose account player color"
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
                      aria-label={color.label}
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
                    : "Not created yet"}
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
                      aria-label="Edit account player"
                      title="Edit"
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
