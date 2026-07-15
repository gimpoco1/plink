import { BarChart3, Cloud, History, Sparkles } from "lucide-react";

export function HomeGuestInfo() {
  return (
    <section className="homeInfo" aria-label="About Plink">
      <div className="homeInfo__panel">
        <div className="homeInfo__panelGlow" aria-hidden="true" />
        <div className="homeInfo__hero">
          <div className="homeInfo__intro">
            <div className="homeInfo__eyebrow">How Plink helps</div>
            <h2 className="homeInfo__title">
              Built for real game nights, not disposable counters.
            </h2>
            <p className="homeInfo__copy">
              Reuse sessions, track teams, save progress, and check history
              without starting from scratch every round.
            </p>
          </div>
          <aside className="homeInfo__spotlight" aria-label="Why Plink">
            <div className="homeInfo__spotlightBadge">
              <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
              <span>Made for repeat play</span>
            </div>
            <div className="homeInfo__spotlightValue">
              Set up once.
              <br />
              Keep the good parts.
            </div>
            <p className="homeInfo__spotlightCopy">
              Reuse lineups and pick up where you left off.
            </p>
          </aside>
        </div>
        <div className="homeInfo__features">
          <InfoFeature
            icon={<History size={18} strokeWidth={2.35} />}
            title="Recurring sessions"
          >
            Reuse common setups and continue unfinished games.
          </InfoFeature>
          <InfoFeature
            icon={<Cloud size={18} strokeWidth={2.35} />}
            title="Guest mode or sync"
          >
            Start locally, or sign in later to sync across devices.
          </InfoFeature>
          <InfoFeature
            icon={<BarChart3 size={18} strokeWidth={2.35} />}
            title="History that matters"
          >
            Review wins, streaks, and past results after each match.
          </InfoFeature>
        </div>
        <div className="homeInfoLinks" aria-label="Helpful site links">
          <a href="/about.html">About</a>
          <a href="/faq.html">FAQ</a>
          <a href="/privacy.html">Privacy Policy</a>
          <a href="/support.html">Support</a>
          <a href="/terms.html">Terms of Use</a>
        </div>
      </div>
    </section>
  );
}

function InfoFeature({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <article className="homeInfoFeature">
      <div className="homeInfoFeature__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="homeInfoFeature__body">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}
