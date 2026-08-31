import { Fragment } from "react";
import { NewGameCard } from "../components/NewGameCard/NewGameCard";
import { HomeGuestPreview } from "../components/HomeGuestPreview/HomeGuestPreview";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { QuickSetupTeamIcon } from "../features/home/components/QuickSetupTeamIcon";
import { avatarStyleFor } from "../utils/color";
import { getInitials } from "../utils/text";
import "../features/home/styles/HomeScreen.css";
import { Users } from "lucide-react";

import type { HomeScreenProps } from "../features/home/types/homeScreenTypes";
import { getSuggestionFacts } from "../features/home/utils/quickSetupFacts";
import { useHomeScreenModel } from "../features/home/hooks/useHomeScreenModel";
import { HomeGuestInfo } from "../features/home/components/HomeGuestInfo";
import { JoinGameDialog } from "../components/GameSharing/JoinGameDialog";
import { useI18n } from "../i18n/I18nContext";

export function HomeScreen(props: HomeScreenProps) {
  const { t } = useI18n();
  const {
    persistedNewGameOpen,
    setPersistedNewGameOpen,
    newGameCardWrapRef,
    defaultOpen,
    showForm,
    profilesById,
    handleOpenChange,
    resumableGame,
    resumableGameLabel,
    quickSetups,
    nextSuggestionName,
    startSuggestion,
    ...screenProps
  } = useHomeScreenModel(props);
  const {
    profiles,
    teams,
    teamMembers,
    canUseTeams,
    isAuthenticated,
    showLocalSessionsHint,
    pendingLocalSessionsCount,
    pendingLocalProfilesCount,
    presetDraft,
    presetDraftToken,
    onOpenAuth,
    onOpenProFeatureAuth,
    onOpenLocalImport,
    onOpenProPlan,
    onDismissLocalSessionsHint,
    onOpenTeamsTab,
    onCreate,
    onUpsertProfile,
    onJoinGame,
    onEnter,
  } = screenProps;
  return (
    <div className="tabContent tabContent--home">
      {!isAuthenticated ? <HomeGuestPreview onOpenAuth={onOpenAuth} /> : null}
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="homeLocalSessionsHint"
          sessionCount={pendingLocalSessionsCount}
          profileCount={pendingLocalProfilesCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenLocalImport}
        />
      ) : null}

      <section
        className={`homeHero${showForm ? " homeHero--creating" : ""}${
          resumableGame ? " homeHero--hasResume" : ""
        }`}
      >
        <div className="homeHero__intro">
          <div>
            <div className="homeHero__eyebrow">{t("home.eyebrow")}</div>
            <h1 className="homeHero__title">
              {t("home.titleLineOne")}
              <br />
              {t("home.titleLineTwo")}
            </h1>
            <p className="homeHero__copy">
              {t("home.copy")}
            </p>
          </div>
        </div>
        {resumableGame ? (
          <div className="homeHero__actions">
            <div className="homeHero__resumeWrap">
              <span
                className={`homeHero__resumePill${
                  resumableGame.participantMode === "teams"
                    ? " homeHero__resumePill--teams"
                    : ""
                }`}
              >
                {resumableGameLabel}
              </span>
              <button
                className="btn btn--ghost btn--xl homeHero__secondary"
                type="button"
                onClick={() => onEnter(resumableGame.id)}
              >
                <span aria-hidden="true">↺</span> {t("home.resume")}
              </button>
            </div>
          </div>
        ) : null}
        <div ref={newGameCardWrapRef} className="homeHero__newGameWrap">
          <NewGameCard
            open={showForm}
            profiles={profiles}
            pastInvitedPlayers={props.pastInvitedPlayers}
            teams={teams}
            teamMembers={teamMembers}
            canUseTeams={canUseTeams}
            isAuthenticated={isAuthenticated}
            draft={presetDraft}
            draftToken={presetDraftToken}
            onOpenChange={handleOpenChange}
            onOpenAuth={onOpenAuth}
            onOpenProFeatureAuth={onOpenProFeatureAuth}
            onOpenProPlan={onOpenProPlan}
            onOpenTeamsTab={onOpenTeamsTab}
            onCreate={onCreate}
            onUpsertProfile={onUpsertProfile}
          />
        </div>
        {isAuthenticated ? <JoinGameDialog onJoin={onJoinGame} /> : null}
      </section>

      {quickSetups.length > 0 ? (
          <section className="quickSetups" aria-label={t("home.frequentGames")}>
          <div className="quickSetups__head">
            <div>
              <div className="quickSetups__title">{t("home.frequentGames")}</div>
              <p className="quickSetups__copy">
                {t("home.frequentGamesCopy")}
              </p>
            </div>
          </div>
          <div className="quickSetups__grid">
            {quickSetups.map((setup, index) => (
              <button
                key={`${setup.key}-${index}`}
                type="button"
                className="quickSetupCard"
                onClick={() => startSuggestion(setup)}
              >
                <div className="quickSetupCard__main">
                  <div className="quickSetupCard__titleRow">
                    <div className="quickSetupCard__title">{setup.label}</div>
                    {setup.participantMode === "teams" ? (
                      <span className="quickSetupCard__teamsChip">
                        <Users size={10} strokeWidth={2.5} aria-hidden="true" />
                        {t("home.teams")}
                      </span>
                    ) : null}
                  </div>
                  <div className="quickSetupCard__metaRow">
                    <div className="quickSetupCard__facts" aria-hidden="true">
                      {getSuggestionFacts(setup).map((fact) => (
                        <span
                          key={`${setup.key}-${fact.key}`}
                          className={`quickSetupCard__fact${
                            fact.tone === "accent"
                              ? " quickSetupCard__fact--accent"
                              : ""
                          }`}
                        >
                          <span
                            className="quickSetupCard__factIcon"
                            aria-hidden="true"
                          >
                            {fact.icon}
                          </span>
                          <span>{fact.label}</span>
                        </span>
                      ))}
                    </div>
                    {setup.participantMode === "teams" &&
                    setup.suggestedTeams &&
                    setup.suggestedTeams.length > 0 ? (
                      <div
                        className="quickSetupCard__teams"
                        aria-label="Preset teams"
                      >
                        {setup.suggestedTeams.slice(0, 4).map((team, index) => (
                          <Fragment
                            key={`${setup.key}-${team.id}-${team.name}-${index}`}
                          >
                            {index > 0 ? (
                              <span className="quickSetupCard__versus">vs</span>
                            ) : null}
                            <span
                              className="quickSetupCard__teamIcon"
                              title={team.name}
                              aria-hidden="true"
                            >
                              <QuickSetupTeamIcon icon={team.icon} />
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    ) : setup.suggestedPlayers.length > 0 ? (
                      <div
                        className="quickSetupCard__players"
                        aria-label="Preset players"
                      >
                        {setup.suggestedPlayers
                          .slice(0, 4)
                          .map((player, index) => (
                            <span
                              key={`${setup.key}-${player.profileId ?? player.name}-${index}`}
                              className="quickSetupCard__playerAvatar"
                              style={avatarStyleFor(player.avatarColor)}
                              title={player.name}
                            >
                              {getInitials(player.name)}
                            </span>
                          ))}
                        {setup.suggestedPlayers.length > 4 ? (
                          <span className="quickSetupCard__playerMore">
                            +{setup.suggestedPlayers.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="quickSetupCard__action">
                  <span className="quickSetupCard__actionLabel">{t("home.start")}</span>
                  <span
                    className="quickSetupCard__actionIcon"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!isAuthenticated && quickSetups.length === 0 ? <HomeGuestInfo /> : null}
    </div>
  );
}
