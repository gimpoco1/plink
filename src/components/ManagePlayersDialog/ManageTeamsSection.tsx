import { translate } from "../../i18n/translate";
import { ArrowUpRight, Check, Plus, Trash2, Users, X } from "lucide-react";
import type { GameTeam, PlayerProfile } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManageTeamsQueue } from "./ManagePlayersQueue";

export function ManageTeamsSection() {
  const {
    availableSavedTeams,
    canUseTeams,
    close,
    currentTeams,
    onDeleteSavedTeam,
    onDeleteTeam,
    onOpenTeamsTab,
    savedTeamProfilesByTeamId,
    savedTeams,
    search,
    setSearch,
    stagedTeamIds,
    teamMembersByTeamId,
    toggleTeam,
  } = useManagePlayersDialogContext();

  return (
    <section className="managePlayersDialog__section">
      <div className="managePlayersDialog__sectionHeaderRow managePlayersDialog__sectionHeaderRow--teams">
        <div className="managePlayersDialog__titleRow">
          <div className="managePlayersDialog__simpleTitle">
            {translate("copy.teamsInThisGame")}
          </div>
          <span
            className="managePlayersDialog__countChip managePlayersDialog__countChip--teams"
            aria-label={translate("dynamic.teamsInThisGame", [currentTeams.length])}
          >
            {currentTeams.length}
          </span>
        </div>
      </div>

      {currentTeams.length > 0 ? (
        <div className="managePlayersDialog__teamList">
          {currentTeams.map((team) => (
            <ManageTeamCard
              key={team.id}
              team={team}
              members={teamMembersByTeamId.get(team.id) ?? []}
              action={
                <button
                  className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
                  type="button"
                  onClick={() => void onDeleteTeam(team.id, team.name)}
                  aria-label={translate("dynamic.remove", [team.name])}
                  title={translate("copy.remove")}
                >
                  <X size={15} strokeWidth={2.7} aria-hidden="true" />
                </button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="managePlayersDialog__empty">
          {translate("copy.noTeamsInThisGameYet")}
        </div>
      )}

      <SearchableRosterPicker
        variant="dark"
        className="managePlayersDialog__savedPicker"
        listMaxHeight="170px"
        searchValue={search}
        onSearchChange={setSearch}
        listTriggerLabel={translate("copy.addTeams")}
        listTitle="Your teams"
        collapseLabel={translate("copy.hideTeams")}
        searchPlaceholder={translate("copy.searchTeams")}
        searchAriaLabel={translate("copy.searchSavedTeams")}
        clearAriaLabel={translate("copy.clearTeamSearch")}
        emptyState={
          search
            ? translate("copy.noSavedTeamsMatchThatSearch")
            : savedTeams.length > 0
              ? translate("copy.allSavedTeamsAreAlreadyInThisGame")
              : translate("copy.noSavedTeamsYetCreateOneFromTheTeamsTab")
        }
        footerContent={
          <TeamsModeNotice
            onOpenTeams={() => {
              close();
              onOpenTeamsTab();
            }}
          />
        }
      >
        {availableSavedTeams.map((team) => {
          const members = savedTeamProfilesByTeamId.get(team.id) ?? [];
          const isStaged = stagedTeamIds.has(team.id);
          return (
            <ManageTeamCard
              key={team.id}
              team={team}
              members={members}
              saved
              action={
                <>
                  <button
                    className={`iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--add${isStaged ? " managePlayersDialog__actionBtn--queued" : ""}`}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    aria-label={
                      isStaged ? translate("dynamic.remove", [team.name]) : translate("dynamic.add", [team.name])
                    }
                    title={isStaged ? translate("copy.queued") : translate("copy.add")}
                    disabled={!canUseTeams}
                  >
                    {isStaged ? (
                      <Check size={15} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
                    type="button"
                    onClick={() => void onDeleteSavedTeam(team.id, team.name)}
                    aria-label={translate("dynamic.deleteSavedTeam", [team.name])}
                    title={translate("copy.deleteSavedTeam")}
                  >
                    <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </>
              }
            />
          );
        })}
      </SearchableRosterPicker>
      <ManageTeamsQueue />
    </section>
  );
}

function ManageTeamCard({
  action,
  members,
  saved = false,
  team,
}: {
  action: React.ReactNode;
  members: Array<
    PlayerProfile | { id: string; name: string; avatarColor: string }
  >;
  saved?: boolean;
  team: GameTeam;
}) {
  const overflowCount = Math.max(0, members.length - 5);
  return (
    <article className="managePlayersDialog__teamCard">
      <div className="managePlayersDialog__teamCardMain">
        <div className="managePlayersDialog__teamIdentity">
          <div className="managePlayersDialog__teamHeading">
            <span className="managePlayersDialog__teamIcon" aria-hidden="true">
              <TeamIcon icon={team.icon} size={15} strokeWidth={2.2} />
            </span>
            <span className="managePlayersDialog__teamName">{team.name}</span>
            {members.length > 0 ? (
              <div
                className="managePlayersDialog__teamMembers"
                aria-label={translate(
                  saved ? "dynamic.savedMembers" : "dynamic.members",
                  [team.name],
                )}
              >
                {members.slice(0, 5).map((member) => (
                  <span
                    key={member.id}
                    className="managePlayersDialog__teamMemberAvatar"
                    style={avatarStyleFor(member.avatarColor)}
                    title={member.name}
                    aria-label={member.name}
                  >
                    {getInitials(member.name)}
                  </span>
                ))}
                {overflowCount > 0 ? (
                  <span className="managePlayersDialog__teamMemberOverflow">
                    +{overflowCount}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {saved && members.length === 0 ? (
            <span className="managePlayersDialog__meta">
              {translate("copy.savedTeam")}
            </span>
          ) : null}
        </div>
        <div className="managePlayersDialog__actionsRow">{action}</div>
      </div>
    </article>
  );
}

function TeamsModeNotice({ onOpenTeams }: { onOpenTeams: () => void }) {
  return (
    <div className="managePlayersDialog__modeNotice">
      <div className="managePlayersDialog__modeNoticeLead">
        <div className="managePlayersDialog__modeNoticeIcon" aria-hidden="true">
          <Users size={18} strokeWidth={2.3} />
        </div>
        <div className="managePlayersDialog__modeNoticeCopy">
          <span className="managePlayersDialog__modeNoticeTag">
            {translate("copy.teamsOnly")}
          </span>
          <span>
            {translate("copy.toAddMoreTeamsCreateThemInTheTeamsTabFirst")}
          </span>
        </div>
      </div>
      <button
        className="btn managePlayersDialog__modeCta"
        type="button"
        onClick={onOpenTeams}
      >
        <span>{translate("copy.addNewTeams")}</span>
        <ArrowUpRight size={15} strokeWidth={2.3} aria-hidden="true" />
      </button>
    </div>
  );
}
