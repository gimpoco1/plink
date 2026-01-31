import "./TopBar.css";

type Props = {
  hasPlayers: boolean;
  playerCount: number;
  showReset?: boolean;
  title?: string;
  showAppTitle?: boolean;
  meta?: string;
  onLogoClick?: () => void;
  onAddPlayer: () => void;
  onResetGame: () => void;
  onRename?: () => void;
};

export function TopBar({
  hasPlayers,
  playerCount,
  showReset = true,
  title = "Plink",
  showAppTitle = true,
  meta,
  onLogoClick,
  onAddPlayer,
  onResetGame,
  onRename,
}: Props) {
  const displayTitle = title.trim() ? title.trim().toUpperCase() : "";
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="logo"
          type="button"
          onClick={onLogoClick}
          aria-label="Go to games"
        >
          <img src="/icon1.png" alt="" className="logo__img" />
          {showAppTitle && <span className="logo__text">PLINK</span>}
        </button>
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
        {hasPlayers ? (
          <button
            className="iconbtn iconbtn--primary"
            type="button"
            onClick={onAddPlayer}
            aria-label="Add player"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {hasPlayers && showReset ? (
          <button
            className="iconbtn iconbtn--danger"
            type="button"
            onClick={onResetGame}
            aria-label="Reset game"
            title="Reset game"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M20 4v6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </header>
  );
}
