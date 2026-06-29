import { useMemo } from "react";
import type { Game, PlayerProfile } from "../types";
import { LockedFrame } from "../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../components/HomeLockedState/StatsSkeleton";
import { avatarStyleFor } from "../utils/color";
import { computeProfileStats, createEmptyProfileStats } from "../utils/profileStats";
import { findWinner } from "../utils/ranking";
import {
  formatAccountPlayerName,
  getGameDisplayName,
  getInitials,
} from "../utils/text";
import "./StatsScreen.css";

type StatsScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
};

export function StatsScreen({ games, profiles, isAuthenticated, onOpenAuth }: StatsScreenProps) {
  function getProfileDisplayName(profile: PlayerProfile) {
    return profile.isAccountPlayer
      ? formatAccountPlayerName(profile.name)
      : profile.name;
  }

  const overview = useMemo(() => {
    const profileStats = computeProfileStats(games);
    const ranked = profiles.map((profile) => ({ profile, stats: profileStats.get(profile.id) ?? createEmptyProfileStats() }));
    const completedGames = games.filter((game) => !!findWinner(game.players, game.targetPoints, game.isLowScoreWins)).length;
    const topPlayers = ranked
      .filter(({ stats }) => stats.gamesPlayed > 0)
      .sort((a, b) => b.stats.wins - a.stats.wins || b.stats.currentWinStreak - a.stats.currentWinStreak || b.stats.winRate - a.stats.winRate)
      .slice(0, 5);
    const popularGames = [...games.reduce((map, game) => {
      const name = getGameDisplayName(game.name).title;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>())]
      .map(([name, sessions]) => ({ name, sessions }))
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
      .slice(0, 4);

    return {
      completedGames,
      activeGames: games.length - completedGames,
      topPlayer: [...ranked].sort((a, b) => b.stats.wins - a.stats.wins || b.stats.winRate - a.stats.winRate)[0] ?? null,
      hottestStreak: [...ranked].sort((a, b) => b.stats.currentWinStreak - a.stats.currentWinStreak)[0] ?? null,
      topPlayers,
      popularGames,
    };
  }, [games, profiles]);

  return (
    <div className="tabContent tabContent--stats">
      <div className="tabHeader"><div><h2 className="tabTitle">Stats</h2><p className="tabSubtitle">A quick snapshot of your sessions, players, and momentum.</p></div></div>
      {!isAuthenticated ? (
        <LockedFrame title="Sign in to unlock stats." onSignIn={onOpenAuth}><StatsSkeleton /></LockedFrame>
      ) : (
        <>
          <div className="statsHeroGrid">
            <SummaryCard accent label="Completed" value={overview.completedGames} copy="Finished sessions tracked locally." />
            <SummaryCard label="In progress" value={overview.activeGames} copy="Games still live right now." />
            <SummaryCard label="Top player" value={overview.topPlayer ? getProfileDisplayName(overview.topPlayer.profile) : "—"} copy={overview.topPlayer ? `${overview.topPlayer.stats.wins} wins` : "No winners yet"} />
            <SummaryCard label="Hottest streak" value={overview.hottestStreak?.stats.currentWinStreak ? `${overview.hottestStreak.stats.currentWinStreak}x` : "—"} copy={overview.hottestStreak?.stats.currentWinStreak ? getProfileDisplayName(overview.hottestStreak.profile) : "No active streaks"} />
          </div>
          <div className="statsPanels">
            <section className="statsPanel">
              <PanelHeader title="Top players" count={overview.topPlayers.length} />
              {overview.topPlayers.length ? <div className="statsList">{overview.topPlayers.map(({ profile, stats }, index) => (
                <div key={profile.id} className="statsRow">
                  <div className="statsRow__left"><span className="statsRow__rank">#{index + 1}</span><span className="statsRow__avatar" style={avatarStyleFor(profile.avatarColor)}>{getInitials(profile.name)}</span><span className="statsRow__meta"><strong>{getProfileDisplayName(profile)}</strong><span>{stats.currentWinStreak > 0 ? `${stats.currentWinStreak}x streak` : `${stats.winRate}% rate`}</span></span></div>
                  <span className="statsRow__value">{stats.wins}</span>
                </div>
              ))}</div> : <div className="emptyMsg">No player stats yet.</div>}
            </section>
            <section className="statsPanel">
              <PanelHeader title="Popular games" count={overview.popularGames.length} />
              {overview.popularGames.length ? <div className="statsList">{overview.popularGames.map((game, index) => (
                <div key={game.name} className="statsRow"><div className="statsRow__left"><span className="statsRow__rank">#{index + 1}</span><span className="statsRow__meta"><strong>{game.name}</strong><span>Most played setup</span></span></div><span className="statsRow__value">{game.sessions}</span></div>
              ))}</div> : <div className="emptyMsg">No games logged yet.</div>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, copy, accent = false }: { label: string; value: React.ReactNode; copy: string; accent?: boolean }) {
  return <div className={`statsHeroCard${accent ? " statsHeroCard--accent" : ""}`}><span className="statsHeroCard__label">{label}</span><strong>{value}</strong><p>{copy}</p></div>;
}

function PanelHeader({ title, count }: { title: string; count: number }) {
  return <div className="statsPanel__head"><h3>{title}</h3><span>{count}</span></div>;
}
