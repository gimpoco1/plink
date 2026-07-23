import { Check, Pencil, Undo2 } from "lucide-react";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { TeamIconPicker } from "./PlayersScreenParts";
import type { TeamCardData } from "./PlayersScreenTeamsList";
import { TeamMemberEditor } from "./PlayersScreenTeamMemberEditor";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamCardEditor({ data }: { data: TeamCardData }) {
  const model = usePlayersScreenContext();
  return (
    <>
      <div className="teamCard__builderHeader">
        <div className="teamBuilderIdentity teamBuilderIdentity--compact">
          <div className="teamBuilderIdentity__preview" aria-hidden="true">
            <div className="teamBuilderIdentity__badge teamBuilderIdentity__badge--compact">
              <TeamIcon icon={data.team.icon} size={22} strokeWidth={2.3} />
            </div>
            <button
              type="button"
              className={`teamBuilderIdentity__iconEdit${model.editingTeamIconPickerOpen ? " teamBuilderIdentity__iconEdit--active" : ""}`}
              aria-label={`${model.editingTeamIconPickerOpen ? "Hide" : "Edit"} insignia options for ${data.team.name}`}
              onClick={() =>
                model.setEditingTeamIconPickerOpen((open) => !open)
              }
            >
              <Pencil size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <div className="teamBuilderIdentity__field">
            <label
              className="teamBuilder__sectionEyebrow"
              htmlFor={`team-edit-name-${data.team.id}`}
            >
              Team name
            </label>
            <div className="teamBuilderIdentity__nameRow">
              <input
                id={`team-edit-name-${data.team.id}`}
                autoFocus
                className="teamBuilder__input teamBuilder__input--hero teamBuilder__input--compactHero"
                value={model.editingTeamName}
                onChange={(event) =>
                  model.setEditingTeamName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") model.finishTeamEdit(data.team.id);
                  if (event.key === "Escape") model.closeTeamEditor();
                }}
                aria-label={`Team name for ${data.team.name}`}
              />
            </div>
          </div>
        </div>
      </div>
      {model.editingTeamIconPickerOpen ? (
        <section className="teamCard__builderSection">
          <div className="teamBuilderCard__group">
            <div className="teamBuilderCard__label">Choose your insignia</div>
            <TeamIconPicker
              value={data.team.icon ?? data.icon}
              onChange={(icon) => model.onUpdateTeam(data.team.id, { icon })}
              label={data.team.name}
              layout="grid"
              density="compact"
            />
          </div>
        </section>
      ) : null}
      <TeamMemberEditor team={data.team} />
      <div className="teamCard__footerActions">
        {data.hasEdits ? (
          <>
            <button
              className="btn btn--ghost teamCard__footerBtn"
              type="button"
              aria-label={`Undo changes for ${data.team.name}`}
              onClick={() => {
                if (model.editingTeamOriginalIcon) {
                  model.onUpdateTeam(data.team.id, {
                    icon: model.editingTeamOriginalIcon,
                  });
                }
                model.setEditingTeamName(model.editingTeamOriginalName);
                model.setEditingTeamMemberIds(
                  new Set(model.editingTeamOriginalMemberIds),
                );
              }}
            >
              <Undo2 size={18} strokeWidth={2.2} aria-hidden="true" />
              Undo
            </button>
            <button
              className="btn btn--primary teamCard__footerBtn teamCard__footerBtn--primary"
              type="button"
              aria-label={`Save changes for ${data.team.name}`}
              disabled={model.editingTeamMemberIds.size === 0}
              onClick={() => model.finishTeamEdit(data.team.id)}
            >
              <Check size={18} strokeWidth={2.3} aria-hidden="true" />
              Save changes
            </button>
          </>
        ) : (
          <button
            className="btn btn--ghost teamCard__footerBtn"
            type="button"
            aria-label={`Cancel editing ${data.team.name}`}
            onClick={model.closeTeamEditor}
          >
            Cancel
          </button>
        )}
      </div>
    </>
  );
}
