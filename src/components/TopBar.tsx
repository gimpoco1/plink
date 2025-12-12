type Props = {
  hasPlayers: boolean;
  playerCount: number;
  onAddPlayer: () => void;
  onResetGame: () => void;
};

export function TopBar({ hasPlayers, playerCount, onAddPlayer, onResetGame }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <div className="brand__row">
            <div className="logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 14.5c2.3 2.6 7.7 2.6 10 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 9.2h2.4M14.1 9.2h2.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M12 3.8c4.5 0 8.2 3.7 8.2 8.2S16.5 20.2 12 20.2 3.8 16.5 3.8 12 7.5 3.8 12 3.8Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  opacity="0.85"
                />
                <path
                  d="M12 6.4v5.2l3.6 2.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div className="brand__title">Point Tracker</div>
          </div>
          <div className="brand__meta" aria-label="Game stats">
            {hasPlayers ? (
              <span className="meta">
                {playerCount} {playerCount === 1 ? "player" : "players"}
              </span>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>

      <div className="topbar__actions">
        {hasPlayers ? (
          <button className="iconbtn iconbtn--primary" type="button" onClick={onAddPlayer} aria-label="Add player">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
        <button
          className="iconbtn iconbtn--danger"
          type="button"
          onClick={onResetGame}
          disabled={!hasPlayers}
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
      </div>
    </header>
  );
}
