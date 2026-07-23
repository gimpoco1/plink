import { ArrowRight, Check } from "lucide-react";
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
  selectedPlayerId: string;
  onPlayerSelect: (playerId: string) => void;
  selectedPlayerIds: string[];
  onPlayerMultiSelect: (playerId: string) => void;
};

export function ConfirmDialogBody({
  options,
  promptOptions,
  promptValue,
  isPrompt,
  onPromptValueChange,
  selectedPlayerId,
  onPlayerSelect,
  selectedPlayerIds,
  onPlayerMultiSelect,
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
              <span className="dialog__settingChipCopy">
                <span className="dialog__settingChipLabel">{chip.label}</span>
                {chip.description ? (
                  <span className="dialog__settingChipDescription">
                    {chip.description}
                  </span>
                ) : null}
              </span>
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
        <p
          className={`dialog__message${
            options.messageCase === "normal"
              ? " dialog__message--normal"
              : ""
          }`}
        >
          {options.message}
        </p>
      ) : null}
      <ConfirmTeams options={options} />
      <ConfirmPlayers
        options={options}
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={onPlayerSelect}
        selectedPlayerIds={selectedPlayerIds}
        onPlayerMultiSelect={onPlayerMultiSelect}
      />
      {options.message && !hasRoster ? (
        <p
          className={`dialog__message${
            options.messageCase === "normal"
              ? " dialog__message--normal"
              : ""
          }`}
        >
          {options.message}
        </p>
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
  if (options.detailFlow) {
    return (
      <div className="dialog__detailFlow" aria-label="Merge workflow">
        {options.details.map((detail, index) => (
          <div
            className="dialog__detailFlowPart"
            key={`${detail.label}-${detail.value}`}
          >
            <DetailCard detail={detail} />
            {index < options.details!.length - 1 ? (
              <span className="dialog__detailFlowArrow" aria-hidden="true">
                <ArrowRight size={22} strokeWidth={2.6} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="dialog__detailCards" aria-label="Game details">
      {options.details.map((detail) => (
        <DetailCard
          detail={detail}
          key={`${detail.label}-${detail.value}`}
        />
      ))}
    </div>
  );
}

function DetailCard({
  detail,
}: {
  detail: NonNullable<ConfirmOptions["details"]>[number];
}) {
  return (
    <div
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

function ConfirmPlayers({
  options,
  selectedPlayerId,
  onPlayerSelect,
  selectedPlayerIds,
  onPlayerMultiSelect,
}: {
  options: ConfirmOptions;
  selectedPlayerId: string;
  onPlayerSelect: (playerId: string) => void;
  selectedPlayerIds: string[];
  onPlayerMultiSelect: (playerId: string) => void;
}) {
  if (!options.players?.length) return null;
  const singleSelectable = options.selectablePlayers === true;
  const multiSelectable = options.multiSelectablePlayers === true;
  const selectable = singleSelectable || multiSelectable;
  return (
    <div className="dialog__playerSection">
      {options.playersTitle ? (
        <div className="dialog__playerSectionTitle">
          {options.playersTitle}
        </div>
      ) : null}
      <div
        className={`dialog__playerList${
          selectable ? " dialog__playerList--selectable" : ""
        }`}
        aria-label="Players"
      >
        {options.players.map((player) => {
          const selected =
            selectable &&
            Boolean(
              player.id &&
                (multiSelectable
                  ? selectedPlayerIds.includes(player.id)
                  : player.id === selectedPlayerId),
            );
          const className = `dialog__playerItem${
            player.label ? " dialog__playerItem--identity" : ""
          }${selected ? " dialog__playerItem--selected" : ""}${
            player.disabled ? " dialog__playerItem--disabled" : ""
          }`;
          const content = (
            <>
              <span
                className="dialog__playerAvatar"
                style={avatarStyleFor(player.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(player.name)}
              </span>
              <span className="dialog__playerCopy">
                {player.label ? (
                  <span className="dialog__playerLabel">{player.label}</span>
                ) : null}
                <span className="dialog__playerName">{player.name}</span>
                {(
                  selected
                    ? player.selectedDescription ?? player.description
                    : player.unselectedDescription ?? player.description
                ) ? (
                  <span className="dialog__playerDescription">
                    {selected
                      ? player.selectedDescription ?? player.description
                      : player.unselectedDescription ?? player.description}
                  </span>
                ) : null}
              </span>
              {selectable && !player.disabled ? (
                <span
                  className="dialog__playerCheck"
                  aria-hidden="true"
                >
                  {selected ? <Check size={15} strokeWidth={3} /> : null}
                </span>
              ) : null}
            </>
          );

          return selectable && player.id ? (
            <button
              key={player.id}
              className={className}
              type="button"
              aria-pressed={selected}
              disabled={player.disabled}
              onClick={() =>
                multiSelectable
                  ? onPlayerMultiSelect(player.id!)
                  : onPlayerSelect(player.id!)
              }
            >
              {content}
            </button>
          ) : (
            <div
              key={`${player.id ?? player.name}-${player.avatarColor}`}
              className={className}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
