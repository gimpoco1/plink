import { Play } from "lucide-react";
import "./GameStartSplash.css";

export function GameStartSplash() {
  return (
    <div className="gameStartSplash" role="status" aria-live="polite">
      <div className="gameStartSplash__content">
        <span className="gameStartSplash__icon" aria-hidden="true">
          <Play size={30} strokeWidth={2.8} fill="currentColor" />
        </span>
        <span className="gameStartSplash__eyebrow">Ready</span>
        <strong>Game on!</strong>
      </div>
    </div>
  );
}
