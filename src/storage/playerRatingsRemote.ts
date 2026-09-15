import { supabase } from "../lib/supabase";
import type { PlayerRating, PlayerRatingHistoryEntry } from "../types";

type RatingRow = {
  profile_id: string;
  rating: number | string;
  rated_games: number;
  wins: number;
  updated_at: number;
};

type RatingHistoryRow = {
  profile_id: string;
  game_id: string;
  game_name: string;
  rating_before: number | string;
  rating_after: number | string;
  rating_change: number | string;
  outcome: PlayerRatingHistoryEntry["outcome"];
  opponent_level: number | string;
  rated_at: number;
};

export async function loadRemotePlayerRatings(profileIds: string[]) {
  if (!supabase || profileIds.length === 0) return [];
  const { data, error } = await supabase
    .from("player_ratings")
    .select("profile_id,rating,rated_games,wins,updated_at")
    .in("profile_id", profileIds);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const rating = row as RatingRow;
    return {
      profileId: rating.profile_id,
      level: Number(rating.rating),
      ratedGames: rating.rated_games,
      wins: rating.wins,
      winRate:
        rating.rated_games > 0
          ? Math.round((rating.wins / rating.rated_games) * 100)
          : 0,
      updatedAt: rating.updated_at,
    } satisfies PlayerRating;
  });
}

export async function loadRemotePlayerRatingHistory(profileIds: string[]) {
  if (!supabase || profileIds.length === 0) return [];
  const { data, error } = await supabase
    .from("player_rating_history")
    .select(
      "profile_id,game_id,game_name,rating_before,rating_after,rating_change,outcome,opponent_level,rated_at",
    )
    .in("profile_id", profileIds)
    .order("rated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const entry = row as RatingHistoryRow;
    return {
      profileId: entry.profile_id,
      gameId: entry.game_id,
      gameName: entry.game_name,
      previousLevel: Number(entry.rating_before),
      newLevel: Number(entry.rating_after),
      change: Number(entry.rating_change),
      outcome: entry.outcome,
      opponentLevel: Number(entry.opponent_level),
      ratedAt: entry.rated_at,
    } satisfies PlayerRatingHistoryEntry;
  });
}
