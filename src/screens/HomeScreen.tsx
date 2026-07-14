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

export function HomeScreen(props: HomeScreenProps) {
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
            <div className="homeHero__eyebrow">Your scoreboard</div>
            <h1 className="homeHero__title">
              Keep the score.
              <br />
              Enjoy the game.
            </h1>
            <p className="homeHero__copy">
              Jump into a new match or keep your next round moving fast.
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
                <span aria-hidden="true">↺</span> Resume last game
              </button>
            </div>
          </div>
        ) : null}
        <div ref={newGameCardWrapRef} className="homeHero__newGameWrap">
          <NewGameCard
            open={showForm}
            profiles={profiles}
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
      </section>

      {quickSetups.length > 0 ? (
        <section className="quickSetups" aria-label="Games you play often">
          <div className="quickSetups__head">
            <div>
              <div className="quickSetups__title">Games you play often</div>
              <p className="quickSetups__copy">
                Start a new game from your usual setups.
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
                        Teams
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
                  <span className="quickSetupCard__actionLabel">Start</span>
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
