import { motion } from "framer-motion";
import { GameHistoryScreen } from "../../../screens/GameHistoryScreen";
import { useAppContext } from "../context/AppContext";

export function AppHistoryRoute() {
  const { currentGame, reduceMotion } = useAppContext();
  if (!currentGame) return null;
  return (
    <motion.div
      className="appView"
      key={`view-history-${currentGame.id}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? {} : { opacity: 0, y: -16, scale: 0.995 }}
      transition={{
        duration: reduceMotion ? 0 : 0.26,
        ease: "easeOut",
      }}
    >
      <GameHistoryScreen game={currentGame} />
    </motion.div>
  );
}
