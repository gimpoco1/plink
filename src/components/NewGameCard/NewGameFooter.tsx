import { translate } from "../../i18n/translate";
import { motion } from "framer-motion";
import { useNewGameCardContext } from "./NewGameCardContext";
import { TimerChoice, TimerInput } from "./NewGameAtoms";
import { useI18n } from "../../i18n/I18nContext";

export function NewGameFooter() {
  const { t } = useI18n();
  const {
    ruleNeedsMorePlayers,
    sectionVariants,
    sectionTransition,
    lowScoreNeedsMorePlayers,
    participantMode,
    timerEnabled,
    timerMode,
    setTimerMode,
    timerTotalSeconds,
    applyCountdownPreset,
    timerMinutes,
    setTimerMinutes,
    timerSeconds,
    setTimerSeconds,
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

      {timerEnabled ? (
        <motion.div
          className="timerPanel"
          variants={sectionVariants}
          transition={sectionTransition}
        >
          <div
            className="timerPanel__modes"
            role="tablist"
            aria-label={translate("copy.timerMode")}
          >
            <TimerChoice
              active={timerMode === "countdown"}
              onClick={() => setTimerMode("countdown")}
            >
              {translate("copy.countdown")}</TimerChoice>
            <TimerChoice
              active={timerMode === "stopwatch"}
              onClick={() => setTimerMode("stopwatch")}
            >
              {translate("copy.stopwatch")}
            </TimerChoice>
          </div>
          {timerMode === "countdown" ? (
            <div className="timerPanel__countdownRow">
              <div className="timerPanel__presets">
                {[60, 180, 300, 600].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    className={`timerPanel__preset${timerTotalSeconds === seconds ? " timerPanel__preset--active" : ""}`}
                    onClick={() => applyCountdownPreset(seconds)}
                  >
                    {seconds / 60}m
                  </button>
                ))}
              </div>
              <div className="timerPanel__inputs">
                <TimerInput
                  label={translate("copy.min")}
                  value={timerMinutes}
                  onChange={setTimerMinutes}
                />
                <TimerInput
                  label={translate("copy.sec")}
                  value={timerSeconds}
                  onChange={setTimerSeconds}
                  max={59}
                />
              </div>
            </div>
          ) : (
            <div className="timerPanel__note">
              {translate("copy.stopwatchStartsAt0AndCountsUp")}
            </div>
          )}
        </motion.div>
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
