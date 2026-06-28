export function SessionSkeleton() {
  return (
    <section className="homeList">
      <div className="homeList__title skeletonText skeletonText--sm skeletonText--short" />
      <div className="sessionsToolbar sessionsToolbar--skeleton"><div className="sessionsToolbar__group"><div className="skeletonPill" /><div className="skeletonPill" /><div className="skeletonPill" /></div><div className="skeletonPill skeletonPill--wide" /></div>
      <div className="gameRows">{Array.from({ length: 4 }).map((_, index) => <div className="gameRowCard gameRowCard--skeleton" key={index}><div className="gameRow__head"><div className="gameRow__titleGroup"><div className="skeletonText skeletonText--lg skeletonText--med" /><div className="skeletonBadge" /></div><div className="skeletonChip" /></div><div className="gameRow__meta"><div className="skeletonText skeletonText--sm skeletonText--short" /><div className="skeletonText skeletonText--sm skeletonText--short" /></div></div>)}</div>
    </section>
  );
}
