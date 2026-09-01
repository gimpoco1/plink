import { translate } from "../../i18n/translate";
import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Library, Search, X } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { useI18n } from "../../i18n/I18nContext";

export function NewGameHeader() {
  const { t } = useI18n();
  const {
    sectionVariants,
    sectionTransition,
    isPresetBrowserOpen,
    setIsPresetBrowserOpen,
    presetBrowserRef,
    reduceMotion,
    presetSearch,
    setPresetSearch,
    filteredGamePresets,
    applyGamePreset,
    setSelectedPresetInfoId,
    selectedPresetInfoId,
    onOpenChange,
  } = useNewGameCardContext();
  return (
    <motion.header
      className="newSessionHeader"
      variants={sectionVariants}
      transition={sectionTransition}
    >
      <div className="newSessionHeader__copy">
        <div className="newSessionHeader__eyebrow">{t("new.session")}</div>
        <div className="newSessionHeader__choice">
          <div className="newSessionHeader__manual">
            <span>{t("new.buildMatch")}</span>
          </div>
          <span className="newSessionHeader__or">{t("new.or")}</span>
          <button
            type="button"
            className="gamePresetBrowser__trigger"
            aria-expanded={isPresetBrowserOpen}
            onClick={() => setIsPresetBrowserOpen((current) => !current)}
          >
            <Library size={15} strokeWidth={2.4} aria-hidden="true" />
            {t("new.browseGames")}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {isPresetBrowserOpen ? (
            <div ref={presetBrowserRef} className="gamePresetBrowserWrap">
              <motion.section
                className="gamePresetBrowser"
                initial={
                  reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -6, scale: 0.98 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.16, ease: "easeOut" }
                }
                role="dialog"
                aria-label={translate("copy.browseGamePresets")}
              >
                <label className="gamePresetBrowser__search">
                  <Search size={16} strokeWidth={2.4} aria-hidden="true" />
                  <input
                    value={presetSearch}
                    placeholder={translate("copy.searchCardsSportsPubGames")}
                    onChange={(event) => setPresetSearch(event.target.value)}
                  />
                </label>
                <p className="gamePresetBrowser__hint">
                  {translate("copy.pickAGameEditAnythingAfter")}
                </p>
                <div className="gamePresetBrowser__list">
                  {filteredGamePresets.length > 0 ? (
                    filteredGamePresets.map((preset) => (
                      <Fragment key={preset.id}>
                        <button
                          type="button"
                          className="gamePresetCard"
                          onClick={() => applyGamePreset(preset)}
                        >
                          <span className="gamePresetCard__main">
                            <strong>{preset.name}</strong>
                            <span className="gamePresetCard__category">
                              <span>{preset.category}</span>
                              <button
                                className="gamePresetCard__info"
                                type="button"
                                aria-label={translate(
                                  "dynamic.showScoringReminder",
                                  [preset.name],
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPresetInfoId((current) =>
                                    current === preset.id ? null : preset.id,
                                  );
                                }}
                              >
                                <Info
                                  size={14}
                                  strokeWidth={2.6}
                                  aria-hidden="true"
                                />
                              </button>
                            </span>
                          </span>
                          <span className="gamePresetCard__facts">
                            <span>
                              {preset.winCondition === "reach_zero"
                                ? translate("dynamic.start", [preset.startingScore])
                                : `${preset.targetScore} pts`}
                            </span>
                            <span>
                              {preset.winCondition === "lowest"
                                ? "lowest wins"
                                : preset.winCondition === "reach_zero"
                                  ? "reach zero"
                                  : preset.winByTwo
                                    ? "win by 2"
                                    : "highest wins"}
                            </span>
                            <span>
                              {preset.timerEnabled ? "timer" : "no timer"}
                            </span>
                          </span>
                          <span
                            className="gamePresetCard__apply"
                            aria-hidden="true"
                          >
                            <Check size={17} strokeWidth={2.4} />
                          </span>
                        </button>
                        {selectedPresetInfoId === preset.id ? (
                          <motion.aside
                            className="gamePresetInfo"
                            initial={
                              reduceMotion
                                ? false
                                : { opacity: 0, y: -4, scale: 0.98 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: -4, scale: 0.98 }
                            }
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { duration: 0.14, ease: "easeOut" }
                            }
                          >
                            <div className="gamePresetInfo__head">
                              <div>
                                <span>{translate("copy.rulesReminder")}</span>
                                <strong>{preset.name}</strong>
                              </div>
                              <button
                                type="button"
                                aria-label={translate("copy.closeScoringReminder")}
                                onClick={() => setSelectedPresetInfoId(null)}
                              >
                                <X
                                  size={16}
                                  strokeWidth={2.5}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                            <p>{preset.rulesNote}</p>
                            <ul>
                              {preset.rulesSummary.map((rule) => (
                                <li key={rule}>{rule}</li>
                              ))}
                            </ul>
                          </motion.aside>
                        ) : null}
                      </Fragment>
                    ))
                  ) : (
                    <div className="gamePresetBrowser__empty">
                      {translate("copy.noPresetMatchesThatSearch")}
                    </div>
                  )}
                </div>
              </motion.section>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
      <button
        className="newSessionHeader__dismiss"
        type="button"
        aria-label={translate("copy.closeNewGame")}
        onClick={() => onOpenChange(false)}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5 5 15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </motion.header>
  );
}
