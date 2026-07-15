import { AnimatePresence, motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

export function AppToast() {
  const { reduceMotion, visibleToast } = useAppContext();
  return (
    <AnimatePresence>
      {visibleToast ? (
        <div className="appToastWrap" aria-hidden="false">
          <motion.div
            className={`appToast appToast--${visibleToast.tone}`}
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              ease: "easeOut",
            }}
          >
            {visibleToast.message}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
