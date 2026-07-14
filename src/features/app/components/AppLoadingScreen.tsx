export function AppLoadingScreen() {
  return (
    <div
      className="appLoading"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="appLoading__inner">
        <div className="appLoading__mark" aria-hidden="true">
          <img src="/favicon.png" alt="" className="appLoading__img" />
        </div>
      </div>
    </div>
  );
}
