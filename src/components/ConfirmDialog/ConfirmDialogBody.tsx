import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import type { ConfirmOptions, PromptOptions } from "./confirmDialogTypes";

type Props = {
  options: ConfirmOptions;
  promptOptions: PromptOptions | null;
  promptValue: string;
  isPrompt: boolean;
  onPromptValueChange: (value: string) => void;
};

export function ConfirmDialogBody({
  options,
  promptOptions,
  promptValue,
  isPrompt,
  onPromptValueChange,
}: Props) {
  const hasRoster = Boolean(options.players?.length || options.teams?.length);
  return (
    <div className="dialog__body">
      {options.bodyTitle ? (
        <div className="dialog__bodyTitle">{options.bodyTitle}</div>
      ) : null}
      <ConfirmDetails options={options} />
      {options.settingChips?.length ? (
        <div className="dialog__settingChips" aria-label="Game settings">
          {options.settingChips.map((chip) => (
            <span
              key={chip.label}
              className={`dialog__settingChip${
                chip.tone === "accent" ? " dialog__settingChip--accent" : ""
              }${chip.size === "wide" ? " dialog__settingChip--wide" : ""}`}
            >
              {chip.icon ? (
                <span className="dialog__settingChipIcon" aria-hidden="true">
                  {chip.icon}
                </span>
              ) : null}
              <span>{chip.label}</span>
            </span>
          ))}
        </div>
      ) : null}
      {options.highlights?.length ? (
        <div className="dialog__highlights" aria-label="Game details">
          {options.highlights.map((highlight) => (
            <span key={highlight} className="dialog__highlightChip">
              {highlight}
            </span>
          ))}
        </div>
      ) : null}
      {options.message && hasRoster ? (
        <p className="dialog__message">{options.message}</p>
      ) : null}
      <ConfirmTeams options={options} />
      <ConfirmPlayers options={options} />
      {options.message && !hasRoster ? (
        <p className="dialog__message">{options.message}</p>
      ) : null}
      {isPrompt ? (
        <input
          className="input"
          type="text"
          value={promptValue}
          onChange={(event) => onPromptValueChange(event.target.value)}
          placeholder={promptOptions?.placeholder}
          maxLength={promptOptions?.maxLength}
          autoFocus
        />
      ) : null}
    </div>
  );
}

function ConfirmDetails({ options }: { options: ConfirmOptions }) {
  if (!options.details?.length) return null;
  if (options.layout !== "feature") {
    return (
      <div className="dialog__detailList" aria-label="Game details">
        {options.details.map((detail) => (
          <div
            key={`${detail.label}-${detail.value}`}
            className="dialog__detailRow"
          >
            <span className="dialog__detailLabel">{detail.label}</span>
            <span className="dialog__detailValue">{detail.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="dialog__detailCards" aria-label="Game details">
      {options.details.map((detail) => (
        <div
          key={`${detail.label}-${detail.value}`}
          className={`dialog__detailCard${
            detail.size === "wide"
              ? " dialog__detailCard--wide"
              : detail.size === "compact"
                ? " dialog__detailCard--compact"
                : ""
          }`}
        >
          {detail.icon ? (
            <span className="dialog__detailCardIcon" aria-hidden="true">
              {detail.icon}
            </span>
          ) : null}
          <span className="dialog__detailCardCopy">
            <span className="dialog__detailLabel">{detail.label}</span>
            <span className="dialog__detailValue">{detail.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ConfirmTeams({ options }: { options: ConfirmOptions }) {
  if (!options.teams?.length) return null;
  return (
    <div className="dialog__teamList" aria-label="Teams">
      {options.teams.map((team) => (
        <div key={`${team.id}-${team.name}`} className="dialog__teamItem">
          <span className="dialog__teamIcon" aria-hidden="true">
            <TeamIcon icon={team.icon} size={18} strokeWidth={2.35} />
          </span>
          <span className="dialog__teamCopy">
            <span className="dialog__teamName">{team.name}</span>
            <span className="dialog__teamMeta">
              {team.members.length}{" "}
              {team.members.length === 1 ? "player" : "players"}
            </span>
          </span>
          {team.members.length ? (
            <span className="dialog__teamMembers" aria-hidden="true">
              {team.members.slice(0, 4).map((player) => (
                <span
                  key={`${team.id}-${player.name}-${player.avatarColor}`}
                  className="dialog__teamMemberAvatar"
                  style={avatarStyleFor(player.avatarColor)}
                >
                  {getInitials(player.name)}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ConfirmPlayers({ options }: { options: ConfirmOptions }) {
  if (!options.players?.length) return null;
  return (
    <div className="dialog__playerList" aria-label="Players">
      {options.players.map((player) => (
        <div
          key={`${player.name}-${player.avatarColor}`}
          className="dialog__playerItem"
        >
          <span
            className="dialog__playerAvatar"
            style={avatarStyleFor(player.avatarColor)}
            aria-hidden="true"
          >
            {getInitials(player.name)}
          </span>
          <span className="dialog__playerName">{player.name}</span>
        </div>
      ))}
    </div>
  );
}
