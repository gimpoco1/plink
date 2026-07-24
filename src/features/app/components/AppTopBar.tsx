import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CircleUser } from "lucide-react";
import { TopBar } from "../../../components/TopBar/TopBar";
import { GameSharingDialog } from "../../../components/GameSharing/GameSharingDialog";
import { GameCommentsDialog } from "../../comments/GameCommentsDialog";
import { useGameComments } from "../../comments/useGameComments";
import { findWinner } from "../../../utils/ranking";
import { useAppContext } from "../context/AppContext";

export function AppTopBar() {
  const {
    authDialogRef,
    authEnabled,
    authLoading,
    createGameInvite,
    confirmRef,
    currentGame,
    gameDisplayName,
    gameMetaItems,
    handleEndCurrentGame,
    hasNonZeroScore,
    homeTab,
    managePlayersDialogRef,
    reduceMotion,
    resetScores,
    returnToGameSource,
    rotateGameInvite,
    session,
    sharingOpen,
    setCollaboratorsCanManage,
    setShouldSaveGamePlayersOnSignIn,
    setSharingOpen,
    setView,
    settingsDialogRef,
    view,
  } = useAppContext();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentPreview, setCommentPreview] = useState<{
    authorName: string;
    body: string;
  } | null>(null);
  const previewedCommentRef = useRef<string | null>(null);

  function getPreviewStorageKey(gameId: string) {
    return `plink.commentPreview.${gameId}`;
  }
  const comments = useGameComments({
    gameId: currentGame?.id ?? null,
    userId: session?.user.id ?? null,
  });

  useEffect(() => {
    setCommentsOpen(false);
    setCommentPreview(null);
    previewedCommentRef.current = null;
  }, [currentGame?.id]);
  const latestComment = comments.comments.at(-1);

  useEffect(() => {
    if (view !== "game" || !currentGame || !latestComment) {
      setCommentPreview(null);
      return;
    }

    const previewKey = `${latestComment.id}:${latestComment.updatedAt}`;
    const storageKey = getPreviewStorageKey(currentGame.id);

    const lastPreviewedKey =
      previewedCommentRef.current ?? window.sessionStorage.getItem(storageKey);

    if (lastPreviewedKey === previewKey) {
      return;
    }

    // Mark it as seen before checking whether the dialog is open.
    // This prevents it appearing later after the user closes the dialog.
    previewedCommentRef.current = previewKey;
    window.sessionStorage.setItem(storageKey, previewKey);

    if (commentsOpen) {
      setCommentPreview(null);
      return;
    }

    setCommentPreview({
      authorName:
        latestComment.authorUserId === comments.currentAuthorId
          ? "You"
          : latestComment.authorName,
      body: latestComment.body,
    });

    const timeout = window.setTimeout(() => {
      setCommentPreview(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [
    comments.currentAuthorId,
    commentsOpen,
    currentGame?.id,
    latestComment?.id,
    latestComment?.updatedAt,
    latestComment?.authorUserId,
    latestComment?.authorName,
    latestComment?.body,
    view,
  ]);
  const canManageGame = currentGame?.accessRole !== "collaborator";
  const canManageLifecycle =
    canManageGame || currentGame?.collaboratorsCanManage === true;
  return (
    <>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0.85, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        <TopBar
          accentTone={
            view === "game" &&
            !!currentGame &&
            currentGame.participantMode === "teams"
              ? "team"
              : "default"
          }
          balancedLayout={view === "history"}
          title={
            view === "history" && currentGame
              ? "History"
              : view === "game" && currentGame
                ? gameDisplayName.title
                : ""
          }
          titleSuffix={
            view === "game" && currentGame && gameDisplayName.replayNumber
              ? `#${gameDisplayName.replayNumber}`
              : undefined
          }
          backLabel={view === "history" ? "Back to game" : "Back to games"}
          showBackButton={view !== "home" && !!currentGame}
          showActionMenu={view === "game" && !!currentGame}
          primaryActionLabel={
            view === "home" && homeTab !== "home" && homeTab !== "players"
              ? "New game"
              : undefined
          }
          authLabel={
            view === "home"
              ? authLoading
                ? "Loading..."
                : authEnabled
                  ? session
                    ? undefined
                    : "Sign in"
                  : "Local only"
              : undefined
          }
          authIcon={
            view === "home" && authEnabled && !authLoading && session ? (
              <CircleUser size={26} strokeWidth={2.3} aria-hidden="true" />
            ) : undefined
          }
          authAriaLabel={session ? "Account" : "Sign in"}
          metaItems={
            view === "history" && currentGame
              ? [{ label: gameDisplayName.title, tone: "muted" }]
              : view === "game" && currentGame
                ? gameMetaItems
                : undefined
          }
          showReset={view === "game" && canManageLifecycle && hasNonZeroScore}
          onBack={() =>
            view === "history" ? setView("game") : returnToGameSource()
          }
          onLogoClick={() => setView("home")}
          onPrimaryAction={() => {
            setView("home");
            if (homeTab === "players" && session) {
              window.dispatchEvent(new CustomEvent("plink:add-player"));
            } else {
              window.dispatchEvent(new CustomEvent("plink:new-game"));
            }
          }}
          onOpenAuth={() => {
            setShouldSaveGamePlayersOnSignIn(false);
            authDialogRef.current?.open();
          }}
          onAddPlayerLabel={
            view === "game" && currentGame?.participantMode === "teams"
              ? "Manage teams"
              : "Manage players"
          }
          onAddPlayer={
            canManageGame
              ? () => managePlayersDialogRef.current?.open()
              : undefined
          }
          onShareGame={
            view === "game" &&
            !!currentGame &&
            !!session &&
            currentGame?.participantMode !== "teams"
              ? () => setSharingOpen(true)
              : undefined
          }
          onOpenSettings={
            view === "game" && currentGame && canManageLifecycle
              ? () => settingsDialogRef.current?.open()
              : undefined
          }
          onOpenHistory={
            view === "game" && currentGame
              ? () => setView("history")
              : undefined
          }
          onOpenComments={
            view === "game" && currentGame
              ? () => {
                  setCommentPreview(null);
                  setCommentsOpen(true);
                }
              : undefined
          }
          commentCount={comments.comments.length}
          commentPreview={commentPreview}
          onEndGame={
            view === "game" &&
            canManageLifecycle &&
            currentGame &&
            currentGame.players.length > 0 &&
            !currentGame.endedAt &&
            !findWinner(currentGame.players, currentGame)
              ? handleEndCurrentGame
              : undefined
          }
          onResetGame={
            canManageLifecycle
              ? async () => {
                  if (!currentGame) return;
                  const ok = await confirmRef.current?.confirm({
                    title: "Reset game",
                    message: "Reset all scores to 0?",
                    confirmText: "Reset",
                    tone: "danger",
                  });
                  if (!ok) return;
                  await resetScores(currentGame.id);
                }
              : undefined
          }
        />
      </motion.div>
      {currentGame && session && currentGame.participantMode !== "teams" ? (
        <GameSharingDialog
          open={sharingOpen}
          game={currentGame}
          onClose={() => setSharingOpen(false)}
          onCreateInvite={createGameInvite}
          onRotateInvite={
            currentGame.accessRole !== "collaborator"
              ? rotateGameInvite
              : undefined
          }
          onCollaboratorManagementChange={(enabled) =>
            setCollaboratorsCanManage(currentGame.id, enabled)
          }
        />
      ) : null}
      {currentGame ? (
        <GameCommentsDialog
          open={commentsOpen}
          comments={comments.comments}
          currentAuthorId={comments.currentAuthorId}
          loading={comments.loading}
          error={comments.error}
          onClose={() => setCommentsOpen(false)}
          onAdd={comments.addComment}
          onUpdate={comments.updateComment}
          onDelete={comments.deleteComment}
        />
      ) : null}
    </>
  );
}
