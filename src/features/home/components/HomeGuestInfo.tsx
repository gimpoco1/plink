import { AppStoreBanner } from "../../../components/AppStoreBanner/AppStoreBanner";
import { translate } from "../../../i18n/translate";
import {
  BarChart3,
  BookOpen,
  Cloud,
  History,
  Sparkles,
  Users,
} from "lucide-react";

export function HomeGuestInfo() {
  return (
    <section className="homeInfo" aria-label={translate("copy.aboutPlink")}>
      <div className="homeInfo__panel">
        <div className="homeInfo__panelGlow" aria-hidden="true" />
        <div className="homeInfo__hero">
          <div className="homeInfo__intro">
            <div className="homeInfo__eyebrow">
              {translate("copy.howPlinkHelps")}
            </div>
            <h2 className="homeInfo__title">
              {translate("copy.builtForRealGameNightsNotDisposableCounters")}
            </h2>
            <p className="homeInfo__copy">
              {translate(
                "copy.reuseSessionsTrackTeamsSaveProgressAndCheckHistoryWithoutStartingFrom",
              )}
            </p>
          </div>
          <aside
            className="homeInfo__spotlight"
            aria-label={translate("copy.whyPlink")}
          >
            <div className="homeInfo__spotlightBadge">
              <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
              <span>{translate("copy.madeForRepeatPlay")}</span>
            </div>
            <div className="homeInfo__spotlightValue">
              {translate("copy.setUpOnce")}
              <br />
              {translate("copy.keepTheGoodParts")}
            </div>
            <p className="homeInfo__spotlightCopy">
              {translate("copy.reuseLineupsAndPickUpWhereYouLeftOff")}
            </p>
          </aside>
        </div>
        <div className="homeInfo__features">
          <InfoFeature
            icon={<History size={18} strokeWidth={2.35} />}
            title={translate("copy.recurringSessions")}
          >
            {translate("copy.reuseCommonSetupsAndContinueUnfinishedGames")}
          </InfoFeature>
          <InfoFeature
            icon={<Cloud size={18} strokeWidth={2.35} />}
            title={translate("copy.guestModeOrSync")}
          >
            {translate("copy.startLocallyOrSignInLaterToSyncAcrossDevices")}
          </InfoFeature>
          <InfoFeature
            icon={<BarChart3 size={18} strokeWidth={2.35} />}
            title={translate("copy.historyThatMatters")}
          >
            {translate("copy.reviewWinsStreaksAndPastResultsAfterEachMatch")}
          </InfoFeature>
        </div>
        <AppStoreBanner />

        <div className="homeInfoGuides">
          <div className="homeInfoGuides__heading">
            <div>
              <div className="homeInfo__eyebrow">
                {translate("copy.practicalGuides")}
              </div>
              <h3>{translate("copy.makeEveryGameEasierToRun")}</h3>
            </div>
            <a href="/guides/index.html">{translate("copy.viewAllGuides")}</a>
          </div>

          <div className="homeInfoGuides__grid">
            <GuideLink
              href="/guides/scorekeeping-basics.html"
              icon={<BookOpen size={17} strokeWidth={2.3} />}
              title={translate("copy.scorekeepingBasics")}
            >
              {translate(
                "copy.pickClearRulesHandleCorrectionsAndFinishWithAResultEveryoneUnderstands",
              )}
            </GuideLink>
            <GuideLink
              href="/guides/game-night.html"
              icon={<Sparkles size={17} strokeWidth={2.3} />}
              title={translate("copy.runASmootherGameNight")}
            >
              {translate(
                "copy.preparePlayersTeamsTimersAndRepeatSessionsWithoutSlowingDownPlay",
              )}
            </GuideLink>
            <GuideLink
              href="/guides/shared-scorekeeping.html"
              icon={<Users size={17} strokeWidth={2.3} />}
              title={translate("copy.shareScorekeepingSafely")}
            >
              {translate(
                "copy.letSeveralPeopleUpdateOneGameWhileKeepingOwnershipAndChangesClear",
              )}
            </GuideLink>
          </div>
        </div>
        <div
          className="homeInfoLinks"
          aria-label={translate("copy.helpfulSiteLinks")}
        >
          <a href="/guides/index.html">{translate("copy.guides")}</a>
          <a href="/about.html">{translate("copy.about")}</a>
          <a href="/faq.html">{translate("copy.faq")}</a>
          <a href="/privacy.html">{translate("copy.privacyPolicy")}</a>
          <a href="/support.html">{translate("copy.support")}</a>
          <a href="/terms.html">{translate("copy.termsOfUse")}</a>
        </div>
      </div>
    </section>
  );
}

function GuideLink({
  children,
  href,
  icon,
  title,
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <a className="homeInfoGuide" href={href}>
      <span className="homeInfoGuide__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{children}</small>
      </span>
      <span className="homeInfoGuide__arrow" aria-hidden="true">
        →
      </span>
    </a>
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
