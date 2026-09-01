import { translate } from "../../i18n/translate";
import { motion } from "framer-motion";
import { ArrowDownUp, Dices, Flag, Timer, Trophy } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { ModeButton } from "./NewGameAtoms";

export function NewGameRules() {
  const {
    sectionVariants,
    sectionTransition,
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
  } = useNewGameCardContext();
  return (
    <motion.div
      className="newSessionOptions"
      variants={sectionVariants}
      transition={sectionTransition}
    >
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
        icon={<Dices size={22} strokeWidth={2.3} />}
        title={translate("copy.dice")}
        description={diceEnabled ? translate("copy.readyDuringTheGame") : translate("copy.noDiceRoller")}
        active={diceEnabled}
        onClick={() => setDiceEnabled((value) => !value)}
      />
    </motion.div>
  );
}
