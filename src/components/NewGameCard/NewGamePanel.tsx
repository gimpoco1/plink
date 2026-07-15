import { motion } from "framer-motion";
import { useNewGameCardContext } from "./NewGameCardContext";
import { NewGameHeader } from "./NewGameHeader";
import { NewGameScoreSettings } from "./NewGameScoreSettings";
import { NewGameParticipants } from "./NewGameParticipants";
import { NewGameRules } from "./NewGameRules";
import { NewGameFooter } from "./NewGameFooter";

export function NewGamePanel() {
  const {
    open,
    onOpenChange,
    hasMounted,
    bodyContentHeight,
    bodyInnerRef,
    isAddingPlayer,
    reduceMotion,
    staggerVariants,
  } = useNewGameCardContext();
  return (
    <motion.div
      className={`newGamePanel${open ? " newGamePanel--open" : ""}${
        isAddingPlayer ? " newGamePanel--addingPlayer" : ""
      }`}
    >
      <motion.button
        className={`btn btn--primary btn--xl homeHero__action newGamePanel__trigger${open ? " newGamePanel__trigger--open" : ""}`}
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        whileHover={
          reduceMotion || open
            ? undefined
            : { y: -1, boxShadow: "0 14px 32px rgba(216, 255, 79, 0.18)" }
        }
      >
        <motion.span
          className="newGamePanel__triggerIcon"
          aria-hidden="true"
          animate={
            open && !reduceMotion ? { rotate: 90, y: -4 } : { rotate: 0, y: -2 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 360, damping: 22 }
          }
        >
          +
        </motion.span>
        <span className="newGamePanel__triggerCopy">
          <strong>New game</strong>
        </span>
      </motion.button>

      <div
        className={`newGamePanel__body${open ? " newGamePanel__body--open" : ""}`}
        aria-hidden={!open}
        style={
          hasMounted
            ? {
                height: open ? bodyContentHeight : 0,
                opacity: open ? 1 : 0,
                paddingBottom: open ? 20 : 0,
                transform: reduceMotion
                  ? "none"
                  : open
                    ? "translateY(0) scale(1)"
                    : "translateY(-8px) scale(0.985)",
              }
            : undefined
        }
      >
        <motion.div
          ref={bodyInnerRef}
          className="homeForm homeForm--newSession"
          variants={staggerVariants}
          initial={false}
          animate={reduceMotion ? undefined : open ? "open" : "closed"}
        >
          <NewGameHeader />
          <NewGameScoreSettings />
          <NewGameParticipants />
          <NewGameRules />
          <NewGameFooter />
        </motion.div>
      </div>
    </motion.div>
  );
}
