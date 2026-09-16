import { translate } from "../../i18n/translate";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Settings2,
  ArrowDownUp,
  Flag,
  Timer,
  Trophy,
  PocketKnife,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { ModeButton, TimerChoice, TimerInput } from "./NewGameAtoms";

export function NewGameRules() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    sectionVariants,
    sectionTransition,
    open,
    winCondition,
    setScoreDirection,
    setWinCondition,
    manualEndOnly,
    setManualEndOnly,
    winByTwo,
    setWinByTwo,
    timerEnabled,
    timerMode,
    timerMinutes,
    timerSeconds,
    setTimerEnabled,
    diceEnabled,
    setDiceEnabled,
    calculatorEnabled,
    setCalculatorEnabled,
    timerTotalSeconds,
    applyCountdownPreset,
    setTimerMode,
    setTimerMinutes,
    setTimerSeconds,
  } = useNewGameCardContext();

  useEffect(() => {
    if (!open) setIsExpanded(false);
  }, [open]);

  const toolsEnabled = diceEnabled || calculatorEnabled;

  function toggleTools() {
    const next = !toolsEnabled;
    setDiceEnabled(next);
    setCalculatorEnabled(next);
  }

  return (
    <motion.div
      className="newSessionAdvancedSettings"
      variants={sectionVariants}
      transition={sectionTransition}
    >
      <button
        className={`advancedSettingsTrigger${isExpanded ? " advancedSettingsTrigger--open" : ""}`}
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
      >
        <span className="advancedSettingsTrigger__icon" aria-hidden="true">
          <Settings2 size={19} strokeWidth={2.4} />
        </span>
        <span className="advancedSettingsTrigger__copy">
          <strong>{translate("copy.advancedSettings")}</strong>
        </span>
        <ChevronDown
          className="advancedSettingsTrigger__chevron"
          size={19}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </button>
      <div
        className={`advancedSettingsList${isExpanded ? " advancedSettingsList--open" : ""}`}
        aria-hidden={!isExpanded}
      >
        <div className="newSessionOptions">
          <ModeButton
            icon={<ArrowDownUp size={22} strokeWidth={2.3} />}
            title={translate("copy.lowestWins")}
            description={translate("copy.lowestScoreWins")}
            active={winCondition === "lowest"}
            onClick={() => {
              setScoreDirection("up");
              setWinCondition((value) =>
                value === "lowest" ? "reach_target" : "lowest",
              );
            }}
          />
          <ModeButton
            icon={<Flag size={22} strokeWidth={2.3} />}
            title={translate("copy.manualFinish")}
            description={translate("copy.endFromTheGameMenu")}
            active={manualEndOnly}
            onClick={() => setManualEndOnly((value) => !value)}
          />
          <ModeButton
            icon={<Trophy size={22} strokeWidth={2.3} />}
            title={translate("copy.winBy2")}
            description={translate("copy.leaderNeedsA2PointGap")}
            active={winByTwo}
            onClick={() => {
              if (winCondition === "reach_zero") return;
              setScoreDirection("up");
              setWinByTwo((value) => !value);
            }}
          />
          <ModeButton
            icon={<Timer size={22} strokeWidth={2.3} />}
            title={translate("copy.timer")}
            description={
              timerEnabled
                ? timerMode === "stopwatch"
                  ? translate("copy.stopwatchActive")
                  : `${timerMinutes || "0"}m ${timerSeconds || "0"}s`
                : translate("copy.noTimerForThisGame")
            }
            active={timerEnabled}
            onClick={() => setTimerEnabled((value) => !value)}
          />
          <ModeButton
            icon={<PocketKnife size={22} strokeWidth={2.3} />}
            title={translate("copy.tools")}
            description={translate("copy.diceAndCalculatorDuringTheGame")}
            active={toolsEnabled}
            onClick={toggleTools}
          />
        </div>
        {timerEnabled ? (
          <div className="timerPanel">
            <div
              className="timerPanel__modes"
              role="tablist"
              aria-label={translate("copy.timerMode")}
            >
              <TimerChoice
                active={timerMode === "countdown"}
                onClick={() => setTimerMode("countdown")}
              >
                {translate("copy.countdown")}
              </TimerChoice>
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
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
