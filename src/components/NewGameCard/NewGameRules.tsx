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
        title="Lowest wins"
        description="Lowest score wins."
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
        title="Manual finish"
        description="End from the game menu."
        active={manualEndOnly}
        onClick={() => setManualEndOnly((value) => !value)}
      />
      <ModeButton
        icon={<Trophy size={22} strokeWidth={2.3} />}
        title="Win by 2"
        description="Leader needs a 2 point gap."
        active={winByTwo}
        onClick={() => {
          if (winCondition === "reach_zero") return;
          setScoreDirection("up");
          setWinByTwo((value) => !value);
        }}
      />
      <ModeButton
        icon={<Timer size={22} strokeWidth={2.3} />}
        title="Timer"
        description={
          timerEnabled
            ? timerMode === "stopwatch"
              ? "Stopwatch active"
              : `${timerMinutes || "0"}m ${timerSeconds || "0"}s`
            : "No timer for this game."
        }
        active={timerEnabled}
        onClick={() => setTimerEnabled((value) => !value)}
      />
      <ModeButton
        icon={<Dices size={22} strokeWidth={2.3} />}
        title="Dice"
        description={diceEnabled ? "Ready during the game." : "No dice roller."}
        active={diceEnabled}
        onClick={() => setDiceEnabled((value) => !value)}
      />
    </motion.div>
  );
}
