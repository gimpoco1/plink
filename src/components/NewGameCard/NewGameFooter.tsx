import { motion } from "framer-motion";
import { useNewGameCardContext } from "./NewGameCardContext";
import { TimerChoice, TimerInput } from "./NewGameAtoms";

export function NewGameFooter() {
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
            ? `Lowest wins mode requires at least 2 ${participantMode === "teams" ? "teams" : "players"}.`
            : `Win by 2 requires at least 2 ${participantMode === "teams" ? "teams" : "players"}.`}
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
            aria-label="Timer mode"
          >
            <TimerChoice
              active={timerMode === "countdown"}
              onClick={() => setTimerMode("countdown")}
            >
              Countdown
            </TimerChoice>
            <TimerChoice
              active={timerMode === "stopwatch"}
              onClick={() => setTimerMode("stopwatch")}
            >
              Stopwatch
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
                  label="Min"
                  value={timerMinutes}
                  onChange={setTimerMinutes}
                />
                <TimerInput
                  label="Sec"
                  value={timerSeconds}
                  onChange={setTimerSeconds}
                  max={59}
                />
              </div>
            </div>
          ) : (
            <div className="timerPanel__note">
              Stopwatch starts at 0 and counts up.
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
        Start Game
      </motion.button>
    </>
  );
}
