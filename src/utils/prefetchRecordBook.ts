import { cachedFetch } from '../hooks/useSessionCache';
import type { SeasonData } from '../hooks/useLeagueData';

let isPrefetching = false;

/**
 * Asynchronously preloads playoff brackets and weekly matchup histories
 * into the session memory cache during browser idle time so Record Book
 * pages render instantaneously when visited.
 */
export function prefetchRecordBookData(seasons: SeasonData[]) {
  if (isPrefetching || !seasons || seasons.length === 0) return;
  isPrefetching = true;

  const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 800);

  schedule(async () => {
    try {
      for (const season of seasons) {
        const leagueId = season.league.league_id;

        // 1. Prefetch playoff bracket
        cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`).catch(() => {});

        // 2. Prefetch 17 weeks of matchups
        for (let week = 1; week <= 17; week++) {
          cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`).catch(() => {});
        }
      }
    } catch {
      // Best-effort background prefetch
    }
  });
}
