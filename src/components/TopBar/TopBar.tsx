import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Ellipsis,
  Flag,
  History,
  Link,
  MessageCircle,
  Plus,
  RotateCcw,
  Settings,
  Undo2,
  Users,
} from "lucide-react";
import "./TopBar.css";

type MetaItem = {
  label: string;
  tone?: "accent" | "muted";
  icon?: ReactNode;
};

type CommentPreview = {
  authorName: string;
  body: string;
};

type Props = {
  accentTone?: "default" | "team";
  balancedLayout?: boolean;
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
  metaItems?: MetaItem[];
  onBack?: () => void;
  onLogoClick?: () => void;
  onPrimaryAction?: () => void;
  onOpenAuth?: () => void;
  onAddPlayer?: () => void;
  onAddPlayerLabel?: string;
  onShareGame?: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onOpenComments?: () => void;
  commentCount?: number;
  commentPreview?: CommentPreview | null;
  onEndGame?: () => void;
  onResetGame?: () => void;
  onRename?: () => void;
};

export function TopBar({
  accentTone = "default",
  balancedLayout = false,
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
  onShareGame,
  onOpenSettings,
  onOpenHistory,
  onOpenComments,
  commentCount = 0,
  commentPreview,
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
    <header
      className={`topbar${
        accentTone === "team" ? " topbar--teamAccent" : ""
      }${balancedLayout ? " topbar--balanced" : ""}`}
    >
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
                  key={`${item.label}-${item.tone ?? "muted"}`}
                  className={`metaChip metaChip--${item.tone ?? "muted"}${
                    item.icon ? " metaChip--withIcon" : ""
                  }`}
                >
                  {item.icon ? (
                    <span className="metaChip__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar__actions">
        {onOpenComments ? (
          <div className="topbarComments">
            <button
              className="iconbtn topbarCommentsButton"
              type="button"
              onClick={onOpenComments}
              aria-label={`Comments${commentCount ? ` (${commentCount})` : ""}`}
            >
              <MessageCircle size={20} strokeWidth={2.3} aria-hidden="true" />
              {commentCount > 0 ? (
                <span className="topbarCommentsButton__count" aria-hidden="true">
                  {commentCount > 99 ? "99+" : commentCount}
                </span>
              ) : null}
            </button>
            {commentPreview ? (
              <button
                className="topbarCommentsPreview"
                type="button"
                onClick={onOpenComments}
                aria-label={`Latest comment from ${commentPreview.authorName}`}
              >
                <strong>{commentPreview.authorName}</strong>
                <span>{commentPreview.body}</span>
              </button>
            ) : null}
          </div>
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
              <Ellipsis size={22} strokeWidth={2.4} aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="topbarMenu__panel" role="menu">
                {onOpenSettings ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings();
                    }}
                  >
                    <Settings size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>Game settings</span>
                  </button>
                ) : null}
                {onOpenHistory ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHistory();
                    }}
                  >
                    <History size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>Game history</span>
                  </button>
                ) : null}
                {onShareGame ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onShareGame();
                    }}
                  >
                    <Link size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>Invite players</span>
                  </button>
                ) : null}
                {onAddPlayer ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddPlayer();
                    }}
                  >
                    <Users size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>{onAddPlayerLabel}</span>
                  </button>
                ) : null}
                {onResetGame ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon topbarMenu__item--danger"
                    type="button"
                    role="menuitem"
                    disabled={!showReset}
                    onClick={() => {
                      setMenuOpen(false);
                      onResetGame();
                    }}
                  >
                    <RotateCcw
                      size={16}
                      strokeWidth={2.3}
                      aria-hidden="true"
                    />
                    <span>Reset scores</span>
                  </button>
                ) : null}
                {onEndGame ? (
                  <button
                    className="topbarMenu__item topbarMenu__item--withIcon topbarMenu__item--finish"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEndGame();
                    }}
                  >
                    <Flag size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>End game</span>
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
