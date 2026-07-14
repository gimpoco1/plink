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
            Teams in this game
          </div>
          <span
            className="managePlayersDialog__countChip managePlayersDialog__countChip--teams"
            aria-label={`${currentTeams.length} teams in this game`}
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
                  aria-label={`Remove ${team.name}`}
                  title="Remove"
                >
                  <X size={15} strokeWidth={2.7} aria-hidden="true" />
                </button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="managePlayersDialog__empty">
          No teams in this game yet.
        </div>
      )}

      <SearchableRosterPicker
        variant="dark"
        className="managePlayersDialog__savedPicker"
        listMaxHeight="170px"
        searchValue={search}
        onSearchChange={setSearch}
        listTriggerLabel="Add teams"
        listTitle="Your teams"
        collapseLabel="Hide teams"
        searchPlaceholder="Search teams"
        searchAriaLabel="Search saved teams"
        clearAriaLabel="Clear team search"
        emptyState={
          search
            ? "No saved teams match that search."
            : savedTeams.length > 0
              ? "All saved teams are already in this game."
              : "No saved teams yet. Create one from the Teams tab."
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
                      isStaged ? `Remove ${team.name}` : `Add ${team.name}`
                    }
                    title={isStaged ? "Queued" : "Add"}
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
                    aria-label={`Delete saved team ${team.name}`}
                    title="Delete saved team"
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
                aria-label={`${team.name} ${saved ? "saved " : ""}members`}
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
            <span className="managePlayersDialog__meta">Saved team</span>
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
          <span className="managePlayersDialog__modeNoticeTag">Teams only</span>
          <span>To add more teams, create them in the Teams tab first.</span>
        </div>
      </div>
      <button
        className="btn managePlayersDialog__modeCta"
        type="button"
        onClick={onOpenTeams}
      >
        <span>Add new teams</span>
        <ArrowUpRight size={15} strokeWidth={2.3} aria-hidden="true" />
      </button>
    </div>
  );
}
