import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { GameComment } from "../../types";
import { uid } from "../../utils/id";
import {
  loadLocalGameComments,
  saveLocalGameComments,
} from "../../storage/gameCommentsStorage";

type CommentRow = {
  id: string;
  game_id: string;
  author_user_id: string;
  author_name: string;
  author_avatar_color: string;
  body: string;
  created_at: number;
  updated_at: number;
};

function rowToComment(row: CommentRow): GameComment {
  return {
    id: row.id,
    gameId: row.game_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    authorAvatarColor: row.author_avatar_color,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value) return value;
  }
  return "Comments could not be updated.";
}

export function useGameComments(options: {
  gameId: string | null;
  userId: string | null;
  localAuthorName?: string;
  localAuthorAvatarColor?: string;
}) {
  const {
    gameId,
    userId,
    localAuthorName = "You",
    localAuthorAvatarColor = "#78869f",
  } = options;
  const [comments, setComments] = useState<GameComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isRemote = Boolean(userId && supabase);

  const sortComments = useCallback((items: GameComment[]) => {
    return [...items].sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id),
    );
  }, []);
  const mergeComment = useCallback(
    (current: GameComment[], next: GameComment) =>
      sortComments([
        ...current.filter((comment) => comment.id !== next.id),
        next,
      ]),
    [sortComments],
  );

  useEffect(() => {
    if (!gameId) {
      setComments([]);
      setError("");
      return;
    }
    if (!isRemote) {
      setComments(sortComments(loadLocalGameComments(gameId)));
      setError("");
      return;
    }

    if (!supabase) return;
    const client = supabase;
    let active = true;
    setLoading(true);
    setError("");

    async function loadComments() {
      const result = await client
        .from("game_comments")
        .select(
          "id,game_id,author_user_id,author_name,author_avatar_color,body,created_at,updated_at",
        )
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (result.error) {
        setError(errorMessage(result.error));
      } else {
        setComments(
          sortComments(
            ((result.data ?? []) as CommentRow[]).map(rowToComment),
          ),
        );
      }
      setLoading(false);
    }

    void loadComments();
    const channel = client.channel(`game-comments:${gameId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_comments",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        const next = rowToComment(payload.new as CommentRow);
        setComments((current) => mergeComment(current, next));
      },
    );
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_comments",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        const next = rowToComment(payload.new as CommentRow);
        setComments((current) => mergeComment(current, next));
      },
    );
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "game_comments",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        const removedId = (payload.old as { id?: unknown }).id;
        if (typeof removedId !== "string") return;
        setComments((current) =>
          current.filter((comment) => comment.id !== removedId),
        );
      },
    );
    void channel.subscribe();

    return () => {
      active = false;
      void channel.unsubscribe();
      client.removeChannel(channel);
    };
  }, [gameId, isRemote, mergeComment, sortComments]);

  const addComment = useCallback(
    async (body: string) => {
      const trimmedBody = body.trim();
      if (!gameId || !trimmedBody) return false;
      setError("");

      if (isRemote && supabase) {
        const result = await supabase.rpc("add_game_comment", {
          p_game_id: gameId,
          p_body: trimmedBody,
        });
        if (result.error) {
          setError(errorMessage(result.error));
          return false;
        }
        if (result.data) {
          const next = rowToComment(result.data as CommentRow);
          setComments((current) => mergeComment(current, next));
        }
        return true;
      }

      const now = Date.now();
      const next = sortComments([
        ...comments,
        {
          id: uid(),
          gameId,
          authorUserId: "local",
          authorName: localAuthorName,
          authorAvatarColor: localAuthorAvatarColor,
          body: trimmedBody,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      setComments(next);
      saveLocalGameComments(gameId, next);
      return true;
    },
    [
      comments,
      gameId,
      isRemote,
      localAuthorAvatarColor,
      localAuthorName,
      mergeComment,
      sortComments,
    ],
  );

  const updateComment = useCallback(
    async (commentId: string, body: string) => {
      const trimmedBody = body.trim();
      if (!gameId || !trimmedBody) return false;
      setError("");
      if (isRemote && supabase) {
        const result = await supabase.rpc("update_game_comment", {
          p_comment_id: commentId,
          p_body: trimmedBody,
        });
        if (result.error) {
          setError(errorMessage(result.error));
          return false;
        }
        if (result.data) {
          const next = rowToComment(result.data as CommentRow);
          setComments((current) => mergeComment(current, next));
        }
        return true;
      }
      const next = comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, body: trimmedBody, updatedAt: Date.now() }
          : comment,
      );
      setComments(next);
      saveLocalGameComments(gameId, next);
      return true;
    },
    [comments, gameId, isRemote, mergeComment],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!gameId) return false;
      setError("");
      if (isRemote && supabase) {
        const result = await supabase.rpc("delete_game_comment", {
          p_comment_id: commentId,
        });
        if (result.error) {
          setError(errorMessage(result.error));
          return false;
        }
        setComments((current) =>
          current.filter((comment) => comment.id !== commentId),
        );
        return true;
      }
      const next = comments.filter((comment) => comment.id !== commentId);
      setComments(next);
      saveLocalGameComments(gameId, next);
      return true;
    },
    [comments, gameId, isRemote],
  );

  return useMemo(
    () => ({
      comments,
      loading,
      error,
      currentAuthorId: userId ?? "local",
      addComment,
      updateComment,
      deleteComment,
    }),
    [
      addComment,
      comments,
      deleteComment,
      error,
      loading,
      updateComment,
      userId,
    ],
  );
}
