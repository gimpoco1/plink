import { motion } from "framer-motion";
import { Boxes, Target } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SectionLabel } from "./NewGameAtoms";
import { useI18n } from "../../i18n/I18nContext";

export function NewGameScoreSettings() {
  const { t } = useI18n();
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
          {t("new.gameName")}
        </SectionLabel>{" "}
        <input
          className="input input--featured"
          value={name}
          placeholder={t("new.exampleName")}
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
                : t("new.target")}
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
