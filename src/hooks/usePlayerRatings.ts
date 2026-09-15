import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  Game,
  PastLinkedPlayer,
  PlayerProfile,
  PlayerRating,
  PlayerRatingHistoryEntry,
} from "../types";
import { supabase } from "../lib/supabase";
import {
  loadRemotePlayerRatingHistory,
  loadRemotePlayerRatings,
} from "../storage/playerRatingsRemote";
import { subscribeToForegroundRefresh } from "../utils/foregroundRefresh";

function collectProfileIds(
  profiles: PlayerProfile[],
  games: Game[],
  pastLinkedPlayers: PastLinkedPlayer[],
) {
  const ids = new Set(profiles.map((profile) => profile.id));
  games.forEach((game) =>
    game.players.forEach((player) => {
      if (player.profileId) ids.add(player.profileId);
    }),
  );
  pastLinkedPlayers.forEach((player) => ids.add(player.profileId));
  return [...ids].sort();
}

export function usePlayerRatings(
  session: Session | null,
  profiles: PlayerProfile[],
  games: Game[],
  pastLinkedPlayers: PastLinkedPlayer[],
) {
  const profileIds = useMemo(
    () => collectProfileIds(profiles, games, pastLinkedPlayers),
    [games, pastLinkedPlayers, profiles],
  );
  const profileIdSignature = profileIds.join(",");
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [history, setHistory] = useState<PlayerRatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    if (!session || profileIds.length === 0) {
      setRatings([]);
      setHistory([]);
      setLoading(false);
      return;
    }
    try {
      const [nextRatings, nextHistory] = await Promise.all([
        loadRemotePlayerRatings(profileIds),
        loadRemotePlayerRatingHistory(profileIds),
      ]);
      if (requestId !== refreshRequestRef.current) return;
      setRatings(nextRatings);
      setHistory(nextHistory);
    } catch (error) {
      console.error("Failed to load player levels from Supabase", error);
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
    }
  }, [profileIdSignature, session?.user.id]);

  useEffect(() => {
    setLoading(Boolean(session));
    void refresh();
  }, [refresh, session]);

  useEffect(() => {
    const ratingsClient = supabase;
    if (!session || !ratingsClient || profileIds.length === 0) return;
    const filter = `profile_id=in.(${profileIds.join(",")})`;
    const channel = ratingsClient.channel(`player-ratings:${session.user.id}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "player_ratings", filter },
      () => void refresh(),
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "player_rating_history",
        filter,
      },
      () => void refresh(),
    );
    void channel.subscribe();
    const unsubscribeForeground = subscribeToForegroundRefresh(
      () => void refresh(),
    );
    return () => {
      unsubscribeForeground();
      void channel.unsubscribe();
      ratingsClient.removeChannel(channel);
    };
  }, [profileIdSignature, refresh, session?.user.id]);

  const ratingsByProfileId = useMemo(
    () => new Map(ratings.map((rating) => [rating.profileId, rating])),
    [ratings],
  );
  const historyByProfileId = useMemo(() => {
    const byProfile = new Map<string, PlayerRatingHistoryEntry[]>();
    history.forEach((entry) => {
      const entries = byProfile.get(entry.profileId) ?? [];
      entries.push(entry);
      byProfile.set(entry.profileId, entries);
    });
    return byProfile;
  }, [history]);
  const historyByGameAndProfile = useMemo(
    () =>
      new Map(
        history.map((entry) => [`${entry.gameId}:${entry.profileId}`, entry]),
      ),
    [history],
  );

  return {
    isAuthenticated: Boolean(session),
    loading,
    ratingsByProfileId,
    historyByProfileId,
    historyByGameAndProfile,
    refresh,
  };
}
