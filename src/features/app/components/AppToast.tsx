import { AnimatePresence, motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

export function AppToast() {
  const { reduceMotion, visibleToasts } = useAppContext();
  return (
    <div
      className="appToastWrap"
      aria-hidden={visibleToasts.length === 0 ? "true" : "false"}
    >
      <AnimatePresence initial={false}>
        {visibleToasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            className={`appToast appToast--${toast.tone}`}
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{
              opacity: index === 0 ? 1 : index === 1 ? 0.68 : 0.42,
              y: 0,
              scale: index === 0 ? 1 : index === 1 ? 0.985 : 0.97,
            }}
            exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              ease: "easeOut",
            }}
            style={{ zIndex: visibleToasts.length - index }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
