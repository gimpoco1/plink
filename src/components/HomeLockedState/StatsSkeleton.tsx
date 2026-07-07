export function StatsSkeleton() {
  return (
    <>
      <section className="statsSelectorPanel statsSelectorPanel--skeleton">
        <div className="statsSelectorPanel__head">
          <div className="statsSelectorPanel__copy">
            <span className="skeletonText skeletonText--xs skeletonText--short" />
            <div className="skeletonText skeletonText--sm skeletonText--med" />
          </div>
          <div className="skeletonPill" />
        </div>
        <div className="statsSearch statsSearch--skeleton" />
        <div className="statsSelectorGrid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="statsSelectorCard statsSelectorCard--skeleton" key={index}>
              <div className="statsSelectorCard__avatar skeletonAvatar" />
              <div className="statsSelectorCard__copy">
                <div className="skeletonText skeletonText--sm skeletonText--med" />
                <div className="skeletonText skeletonText--xs skeletonText--short" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="statsFocusCard statsFocusCard--skeleton">
        <div className="statsFocusCard__identity">
          <div className="statsEntityAvatar statsEntityAvatar--lg skeletonAvatar" />
          <div className="statsFocusCard__copy">
            <span className="skeletonText skeletonText--xs skeletonText--short" />
            <div className="skeletonText skeletonText--lg skeletonText--med" />
            <div className="skeletonText skeletonText--sm" />
          </div>
        </div>
      </section>

      <div className="statsKpiGrid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="statsMetricCard statsMetricCard--skeleton" key={index}>
            <span className="skeletonText skeletonText--xs skeletonText--short" />
            <div className="skeletonNumber" />
            <div className="skeletonText skeletonText--sm" />
          </div>
        ))}
      </div>

      <div className="statsChartGrid">
        {Array.from({ length: 2 }).map((_, index) => (
          <section className="statsPanel statsPanel--skeleton" key={index}>
            <div className="statsPanel__head">
              <h3 className="skeletonText skeletonText--sm skeletonText--med" />
              <span className="skeletonBadge" />
            </div>
            <div className="statsChartShell statsChartShell--skeleton" />
          </section>
        ))}
      </div>
    </>
  );
}
