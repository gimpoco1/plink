import { useEffect, useRef, useState } from "react";
import { Ellipsis, Plus, Undo2 } from "lucide-react";
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
  authIcon?: React.ReactNode;
  authAriaLabel?: string;
  metaItems?: Array<{ label: string; tone?: "accent" | "muted" }>;
  onBack?: () => void;
  onLogoClick?: () => void;
  onPrimaryAction?: () => void;
  onOpenAuth?: () => void;
  onAddPlayer: () => void;
  onAddPlayerLabel?: string;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onEndGame?: () => void;
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
  authIcon,
  authAriaLabel,
  metaItems,
  onBack,
  onLogoClick,
  onPrimaryAction,
  onOpenAuth,
  onAddPlayer,
  onAddPlayerLabel = "Manage players",
  onOpenSettings,
  onOpenHistory,
  onEndGame,
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
            <Undo2 size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        ) : (
          <button
            className="logo"
            type="button"
            onClick={onLogoClick}
            aria-label="Go to games"
          >
            <span className="logo__mark" aria-hidden="true">
              <img src="/favicon.png" alt="" className="logo__img" />
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
              <Ellipsis size={22} strokeWidth={2.4} aria-hidden="true" />
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
                  {onAddPlayerLabel}
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
                {onEndGame ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--finish"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEndGame();
                    }}
                  >
                    End game
                  </button>
                ) : null}
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
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>{primaryActionLabel}</span>
          </button>
        ) : null}
        {(authLabel || authIcon) && onOpenAuth ? (
          <button
            className={`topbarAuth${authIcon ? " topbarAuth--icon" : " topbarAuth--text"}`}
            type="button"
            aria-label={authAriaLabel ?? authLabel ?? "Account"}
            onClick={onOpenAuth}
          >
            {authIcon ?? authLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}
