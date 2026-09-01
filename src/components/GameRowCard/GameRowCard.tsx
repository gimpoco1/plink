import { translate } from "../../i18n/translate";
import { useMemo } from "react";
import {
  Check,
  Copy,
  Crosshair,
  Link,
  Pencil,
  Trash2,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { Game } from "../../types";
import { findWinner, isGameComplete, isGameDraw } from "../../utils/ranking";
import { getGameParticipants } from "../../utils/gameParticipants";
import { capitalizeFirst, getGameDisplayName } from "../../utils/text";
import { SwipeableCard } from "../SwipeableCard/SwipeableCard";
import "./GameRowCard.css";

type Props = {
  game: Game;
  accountProfileIds: ReadonlySet<string>;
  createdLabel: string;
  onEnter: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function GameRowCard({
  game,
  accountProfileIds,
  createdLabel,
  onEnter,
  onDuplicate,
  onRename,
  onDelete,
}: Props) {
  const canManageGame = game.accessRole !== "collaborator";
  const actionWidth = canManageGame ? 240 : 80;

  const winner = useMemo(() => {
    return findWinner(game.players, game);
  }, [game]);
  const participants = useMemo(() => getGameParticipants(game), [game]);
  const complete = useMemo(() => isGameComplete(game), [game]);
  const draw = useMemo(() => isGameDraw(game), [game]);
  const isTeamsGame = game.participantMode === "teams";
  const hasInvitedPlayers = game.players.some(
    (player) => player.joinedViaInvite === true,
  );

  const parsedName = getGameDisplayName(game.name);
  const displayName = parsedName.title
    ? parsedName.title.toUpperCase()
    : "GAME";
  const winningParticipant = useMemo(() => {
    if (!winner) return null;
    return (
      participants.find((participant) =>
        participant.members.some((member) => member.id === winner.id),
      ) ?? null
    );
  }, [participants, winner]);
  const winnerIsCurrentAccount = Boolean(
    winner &&
    !isTeamsGame &&
    (game.accessRole === "collaborator"
      ? winner.id === game.linkedPlayerIdForCurrentUser ||
        (!!winner.profileId && accountProfileIds.has(winner.profileId))
      : !!winner.profileId && accountProfileIds.has(winner.profileId)),
  );
  const winnerName = winner
    ? winnerIsCurrentAccount
      ? translate("copy.you")
      : isTeamsGame
        ? (winningParticipant?.name ?? capitalizeFirst(winner.name))
        : capitalizeFirst(winner.name)
    : null;
  const participantCount = isTeamsGame
    ? game.teams.length
    : game.players.length;
  const isSoloCompletion =
    complete && Boolean(winner) && participantCount === 1;

  return (
    <SwipeableCard
      actionWidth={actionWidth}
      cardClassName={`gameRowCard${isTeamsGame ? " gameRowCard--teams" : ""}`}
      renderActions={({ closeSwipe }) => (
        <>
          {canManageGame ? (
            <button
              className="swipeRename"
              type="button"
              onClick={() => {
                closeSwipe();
                onRename();
              }}
              aria-label={translate("dynamic.renameGame", [game.name])}
            >
              <Pencil size={18} strokeWidth={2} aria-hidden="true" />
              {translate("copy.rename")}
            </button>
          ) : null}
          <button
            className="swipeDuplicate"
            type="button"
            onClick={() => {
              closeSwipe();
              onDuplicate();
            }}
              aria-label={translate("dynamic.playAgain", [game.name])}
          >
            <Copy size={18} strokeWidth={2} aria-hidden="true" />
            {translate("copy.playAgain")}</button>
          {canManageGame ? (
            <button
              className="swipeDelete"
              type="button"
              onClick={() => {
                closeSwipe();
                onDelete();
              }}
              aria-label={translate("dynamic.deleteGame", [game.name])}
            >
              <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
              {translate("copy.delete")}</button>
          ) : null}
        </>
      )}
    >
      {({ isSwiping, isOpen, closeSwipe }) => (
        <button
          className="gameRow__main"
          type="button"
          onClick={(e) => {
            if (isSwiping) return;
            if (isOpen) {
              closeSwipe();
              e.stopPropagation();
            } else {
              onEnter();
            }
          }}
          aria-label={translate("dynamic.open", [game.name])}
        >
          <div className="gameRow__head">
            <div className="gameRow__titleGroup">
              <div className="gameRow__name">{displayName}</div>
              {parsedName.replayNumber ? (
                <span className="gameRow__replay">
                  #{parsedName.replayNumber}
                </span>
              ) : null}
            </div>
            <div className="gameRow__headMeta">
              {hasInvitedPlayers ? (
                <span
                  className="gameRow__modeBadge gameRow__modeBadge--shared"
                  aria-label={translate("copy.sharedGame")}
                >
                  <Link size={14} strokeWidth={2.3} aria-hidden="true" />
                  <span>{translate("copy.shared")}</span>
                </span>
              ) : null}
              {isTeamsGame ? (
                <span
                  className="gameRow__modeBadge gameRow__modeBadge--teams"
                  aria-label={translate("copy.teamGame")}
                >
                  <Users size={14} strokeWidth={2.3} aria-hidden="true" />
                  <span>{translate("home.teams")}</span>
                </span>
              ) : null}
              <div
                className="gameRow__date"
              aria-label={translate("dynamic.created", [createdLabel])}
              >
                {createdLabel}
              </div>
            </div>
          </div>
          <div className="gameRow__meta">
            {winnerName && !isSoloCompletion ? (
              <span className="gameRow__detail gameRow__winnerDetail">
                <span className="gameRow__winnerIcon" aria-hidden="true">
                  <Trophy
                    size={14}
                    strokeWidth={2.3}
                    aria-hidden="true"
                    color="black"
                  />
                </span>
                <span className="gameRow__winnerLabel">
                  {translate("copy.wonBy")}
                </span>
                <strong>{winnerName}</strong>
              </span>
            ) : null}
            {complete && draw ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                {translate("copy.draw")}
              </span>
            ) : null}
            {complete && (isSoloCompletion || (!winner && !draw)) ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusCheck" aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
                {translate("copy.completed")}</span>
            ) : null}
            {!complete ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                {translate("copy.inProgress2")}
              </span>
            ) : null}
            <span className="gameRow__detail">
              <Crosshair size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>
                {game.winCondition === "reach_zero"
                  ? translate("home.start")
                  : translate("new.target")}
              </span>
              <strong>
                {game.winCondition === "reach_zero"
                  ? game.startingScore
                  : game.targetScore}
              </strong>
              <span>
                {(game.winCondition === "reach_zero"
                  ? game.startingScore
                  : game.targetScore) === 1
                  ? "pt"
                  : "pts"}
              </span>
            </span>
            <span
              className="gameRow__detail gameRow__players"
          aria-label={translate("dynamic.participantCount", [
            translate(isTeamsGame ? "common.team" : "common.player"),
            participantCount,
          ])}
            >
              {isTeamsGame ? (
                <Users size={15} strokeWidth={2.3} aria-hidden="true" />
              ) : (
                <User size={15} strokeWidth={2.3} aria-hidden="true" />
              )}
              {participantCount}{" "}
              {participantCount === 1
                ? isTeamsGame
                  ? "team"
                  : "player"
                : isTeamsGame
                  ? translate("copy.teams")
                  : translate("copy.players")}
            </span>
          </div>
        </button>
      )}
    </SwipeableCard>
  );
}
