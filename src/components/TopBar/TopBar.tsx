import { useEffect, useRef, useState } from "react";
import "./TopBar.css";

type Props = {
  showReset?: boolean;
  title?: string;
  titleSuffix?: string;
  backLabel?: string;
  showBackButton?: boolean;
  showActionMenu?: boolean;
  primaryActionLabel?: string;
  authLabel?: string;
  metaItems?: Array<{ label: string; tone?: "accent" | "muted" }>;
  onBack?: () => void;
  onLogoClick?: () => void;
  onPrimaryAction?: () => void;
  onOpenAuth?: () => void;
  onAddPlayer: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onResetGame: () => void;
  onRename?: () => void;
};

export function TopBar({
  showReset = true,
  title = "Plink",
  titleSuffix,
  backLabel = "Back to games",
  showBackButton = false,
  showActionMenu = false,
  primaryActionLabel,
  authLabel,
  metaItems,
  onBack,
  onLogoClick,
  onPrimaryAction,
  onOpenAuth,
  onAddPlayer,
  onOpenSettings,
  onOpenHistory,
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
            aria-label={backLabel}
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
            <span className="logo__mark" aria-hidden="true">
              <img src="/icon-transparent.png" alt="" className="logo__img" />
            </span>
            <span className="logo__text">Plink</span>
          </button>
        )}
      </div>

      <div className="topbar__center">
        <div
          className="brand"
          onClick={onRename}
          style={{ cursor: onRename ? "pointer" : "default" }}
        >
          {displayTitle && (
            <div className="brand__title">
              <span>{displayTitle}</span>
              {titleSuffix ? (
                <span className="brand__titleSuffix">{titleSuffix}</span>
              ) : null}
            </div>
          )}
          {metaItems && metaItems.length > 0 ? (
            <div className="brand__meta">
              {metaItems.map((item) => (
                <span
                  key={item.label}
                  className={`metaChip metaChip--${item.tone ?? "muted"}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar__actions">
        {authLabel && onOpenAuth ? (
          <button className="topbarAuth" type="button" onClick={onOpenAuth}>
            {authLabel}
          </button>
        ) : null}
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
                {onOpenHistory ? (
                  <button
                    className="topbarMenu__item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHistory();
                    }}
                  >
                    Game history
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
                  Manage players
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
        ) : primaryActionLabel && onPrimaryAction ? (
          <button
            className="topbarPrimaryAction"
            type="button"
            onClick={onPrimaryAction}
            aria-label={primaryActionLabel}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{primaryActionLabel}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
