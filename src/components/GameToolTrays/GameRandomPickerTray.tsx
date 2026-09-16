import { ChevronLeft, Shuffle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import { translate } from "../../i18n/translate";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import "./GameToolTrays.css";

type Participant = {
  id: string;
  name: string;
  avatarColor?: string;
  icon?: string;
};
type Props = {
  participants: Participant[];
  accentTone?: "default" | "team";
  isOpen: boolean;
  anchor: {
    x: number;
    y: number;
    placement: "above-left" | "above-right" | "below-left" | "below-right";
  };
  onBack: () => void;
  onClose: () => void;
};

export function GameRandomPickerTray({
  participants,
  accentTone = "default",
  isOpen,
  anchor,
  onBack,
  onClose,
}: Props) {
  const [selection, setSelection] = useState<Participant | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );
  function pickPlayer() {
    if (!participants.length || isPicking) return;
    setIsPicking(true);
    timeoutRef.current = window.setTimeout(() => {
      setSelection(
        participants[Math.floor(Math.random() * participants.length)],
      );
      setIsPicking(false);
      timeoutRef.current = null;
    }, 620);
  }
  return (
    <div
      className={`gameHelperTray${isOpen ? " gameHelperTray--open" : ""}${accentTone === "team" ? " gameHelperTray--team" : ""}`}
      style={{ left: anchor.x, top: anchor.y }}
      data-placement={anchor.placement}
      aria-hidden={!isOpen}
    >
      <div className="gameHelperTray__panel">
        <header className="gameHelperTray__header">
          <div>
            <div className="gameHelperTray__eyebrow">
              {translate("copy.tools")}
            </div>
            <div className="gameHelperTray__title">
              {translate("copy.randomPicker")}
            </div>
          </div>
        </header>
        <div className="gameHelperTray__content">
          {selection ? (
            <div className="gameHelperTray__active">
            <div className="gameHelperTray__identity">
              {selection.icon ? (
                  <span
                    className="gameHelperTray__avatar gameHelperTray__avatar--team"
                    aria-hidden="true"
                  >
                    <TeamIcon
                      icon={selection.icon}
                      size={20}
                      strokeWidth={2.4}
                    />
                  </span>
              ) : (
                  <span
                    className="gameHelperTray__avatar"
                    style={avatarStyleFor(selection.avatarColor ?? "#64748b")}
                    aria-hidden="true"
                  >
                    {getInitials(selection.name)}
                  </span>
              )}
              <strong className="gameHelperTray__value">
                {selection.name}
              </strong>
            </div>
            </div>
          ) : (
            <div className="gameRandomPickerTray__intro">
              <Shuffle size={22} strokeWidth={2.4} aria-hidden="true" />
              <span>
                {isPicking
                  ? translate("copy.pickingPlayer")
                  : translate("copy.randomPickerIntro")}
              </span>
            </div>
          )}
          <button
            className="gameHelperTray__action"
            type="button"
            onClick={pickPlayer}
            disabled={!participants.length || isPicking}
          >
            {isPicking
              ? translate("copy.pickingPlayer")
              : translate("copy.pickAPlayer")}
          </button>
        </div>
        <div className="gameHelperTray__footer">
          <button className="gameHelperTray__back" type="button" onClick={onBack}>
            <ChevronLeft size={17} strokeWidth={2.8} aria-hidden="true" />
            {translate("copy.backToTools")}
          </button>
          <button
            className="gameHelperTray__close"
            type="button"
            aria-label={translate("copy.close")}
            onClick={onClose}
          >
            <X size={17} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
