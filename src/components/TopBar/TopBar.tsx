import { useEffect, useRef, useState } from "react";
import "./TopBar.css";

type Props = {
  hasPlayers: boolean;
  playerCount: number;
  showReset?: boolean;
  title?: string;
  showAppTitle?: boolean;
  showBackButton?: boolean;
  showActionMenu?: boolean;
  meta?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  onAddPlayer: () => void;
  onOpenSettings?: () => void;
  onResetGame: () => void;
  onRename?: () => void;
};

export function TopBar({
  hasPlayers,
  playerCount,
  showReset = true,
  title = "Plink",
  showAppTitle = true,
  showBackButton = false,
  showActionMenu = false,
  meta,
  onBack,
  onLogoClick,
  onAddPlayer,
  onOpenSettings,
  onResetGame,
  onRename,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const displayTitle = title.trim() ? title.trim().toUpperCase() : "";
  return (
    <header className="topbar">
      <div className="topbar__left">
        {showBackButton ? (
          <button
            className="backBtn"
            type="button"
            onClick={onBack}
            aria-label="Back to games"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M19 19v-6.2c0-2.65-2.15-4.8-4.8-4.8H6.6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 4 5 8.6 11 13.2"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <button
            className="logo"
            type="button"
            onClick={onLogoClick}
            aria-label="Go to games"
          >
            <img src="/icon1.png" alt="" className="logo__img" />
            {showAppTitle && <span className="logo__text">PLINK</span>}
          </button>
        )}
      </div>

      <div className="topbar__center">
        <div
          className="brand"
          onClick={onRename}
          style={{ cursor: onRename ? "pointer" : "default" }}
        >
          {displayTitle && <div className="brand__title">{displayTitle}</div>}
          <div className="brand__meta">
            <span className="meta">
              {meta ??
                (hasPlayers
                  ? `${playerCount} ${playerCount === 1 ? "player" : "players"}`
                  : "")}
            </span>
          </div>
        </div>
      </div>

      <div className="topbar__actions">
        {showActionMenu ? (
          <div className="topbarMenu" ref={menuRef}>
            <button
              className="iconbtn"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Game actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="6" cy="12" r="1.8" fill="currentColor" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                <circle cx="18" cy="12" r="1.8" fill="currentColor" />
              </svg>
            </button>
            {menuOpen ? (
              <div className="topbarMenu__panel" role="menu">
                {onOpenSettings ? (
                  <button
                    className="topbarMenu__item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings();
                    }}
                  >
                    Game settings
                  </button>
                ) : null}
                <button
                  className="topbarMenu__item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onAddPlayer();
                  }}
                >
                  Add player
                </button>
                <button
                  className="topbarMenu__item topbarMenu__item--danger"
                  type="button"
                  role="menuitem"
                  disabled={!showReset}
                  onClick={() => {
                    setMenuOpen(false);
                    onResetGame();
                  }}
                >
                  Reset scores
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
