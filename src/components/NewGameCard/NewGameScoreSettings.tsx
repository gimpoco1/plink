import { motion } from "framer-motion";
import { Boxes, Target } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SectionLabel } from "./NewGameAtoms";

export function NewGameScoreSettings() {
  const {
    sectionVariants,
    sectionTransition,
    name,
    setName,
    target,
    winCondition,
    manualEndOnly,
    updateTarget,
    adjustTarget,
  } = useNewGameCardContext();
  return (
    <motion.div
      className="newSessionPrimary"
      variants={sectionVariants}
      transition={sectionTransition}
    >
      <label className="field newSessionNameField">
        <SectionLabel icon={<Boxes size={16} strokeWidth={2} />}>
          Game name
        </SectionLabel>{" "}
        <input
          className="input input--featured"
          value={name}
          placeholder="e.g. Tressette"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="targetControl">
        <label className="targetControl__head">
          <SectionLabel icon={<Target size={16} strokeWidth={2.4} />}>
            {winCondition === "reach_zero"
              ? "Start"
              : manualEndOnly
                ? "Ref"
                : "Target"}
          </SectionLabel>{" "}
          <input
            className="targetControl__value"
            value={target}
            min={1}
            max={5000}
            inputMode="numeric"
            aria-label={
              winCondition === "reach_zero"
                ? "Starting score"
                : manualEndOnly
                  ? "Reference target"
                  : "Target score"
            }
            onChange={(event) => updateTarget(event.target.value)}
          />
        </label>
        <div className="targetControl__stepper">
          <button
            type="button"
            className="targetControl__stepBtn"
            aria-label={
              winCondition === "reach_zero"
                ? "Decrease starting score"
                : "Decrease target score"
            }
            onClick={() => adjustTarget(-1)}
          >
            −
          </button>
          <button
            type="button"
            className="targetControl__stepBtn"
            aria-label={
              winCondition === "reach_zero"
                ? "Increase starting score"
                : "Increase target score"
            }
            onClick={() => adjustTarget(1)}
          >
            +
          </button>
        </div>
      </div>
    </motion.div>
  );
}
