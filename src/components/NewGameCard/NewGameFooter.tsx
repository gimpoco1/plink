import { translate } from "../../i18n/translate";
import { motion } from "framer-motion";
import { useNewGameCardContext } from "./NewGameCardContext";
import { useI18n } from "../../i18n/I18nContext";

export function NewGameFooter() {
  const { t } = useI18n();
  const {
    ruleNeedsMorePlayers,
    sectionVariants,
    sectionTransition,
    lowScoreNeedsMorePlayers,
    participantMode,
    canCreate,
    startGame,
    reduceMotion,
  } = useNewGameCardContext();
  return (
    <>
      {ruleNeedsMorePlayers ? (
        <motion.p
          className="newSessionRuleHint"
          role="status"
          aria-live="polite"
          variants={sectionVariants}
          transition={sectionTransition}
        >
          {lowScoreNeedsMorePlayers
            ? translate("dynamic.lowestWinsModeRequiresAtLeast2", [
                translate(
                  participantMode === "teams"
                    ? "common.teams"
                    : "common.players",
                ),
              ])
            : translate("dynamic.winBy2RequiresAtLeast2", [
                translate(
                  participantMode === "teams"
                    ? "common.teams"
                    : "common.players",
                ),
              ])}
        </motion.p>
      ) : null}

      <motion.button
        className="btn btn--primary btn--wide btn--xl newSessionStart"
        type="button"
        disabled={!canCreate}
        onClick={() => void startGame()}
        variants={sectionVariants}
        transition={sectionTransition}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        whileHover={
          reduceMotion ? undefined : canCreate ? { y: -1 } : undefined
        }
      >
        {t("new.startGame")}
      </motion.button>
    </>
  );
}
