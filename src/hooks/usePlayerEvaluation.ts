import { useState, useEffect, useMemo } from 'react';
import { BASE_URL, getPlayers, getRosters, getUsers, getMatchups } from '../api/sleeper';
import type { User, Roster } from '../api/sleeper';
import { getNflOpponent } from '../data/nflSchedules';

export type TimeframeScope = 'full' | 'last1' | 'last3' | 'last5';
export type OwnershipFilter = 'all' | 'available' | 'rostered';
export type PositionFilter = 'ALL' | 'FLEX' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

export interface PlayerWeeklyStat {
  week: number;
  opp?: string;
  gp: boolean;
  snaps: number;
  teamSnaps: number;
  snapPct: number;
  customPts: number;
  stdPts: number;
  pprPts: number;
  rushAtt: number;
  rushYd: number;
  rushTd: number;
  rushFd: number;
  rushRzAtt: number;
  rushYac: number;
  rushBtkl: number;
  recTgt: number;
  rec: number;
  recYd: number;
  recTd: number;
  recFd: number;
  recRzTgt: number;
  recAirYd: number;
  krYd: number;
  prYd: number;
  krTd: number;
  prTd: number;
  stSnaps: number;
  passYd: number;
  passTd: number;
  passInt: number;
  passSack: number;
  passCmp: number;
  fumLost: number;
}

export interface PlayerEvaluationItem {
  id: string;
  name: string;
  pos: string;
  team: string;
  age?: number;
  yearsExp?: number;
  avatarUrl?: string;
  
  // Ownership
  isRostered: boolean;
  owner?: User;
  rosterId?: number;

  // Games & Timeframe
  gamesPlayed: number;
  weeksActive: number[];
  snapPct: number;
  totalSnaps: number;
  avgSnapsPerGame: number;
  snapTrend3Wk: number;

  // Custom League Scoring & Baselines
  totalCustomPts: number;
  customPpg: number;
  totalStdPts: number;
  stdPpg: number;
  totalPprPts: number;
  pprPpg: number;
  deltaVsPpr: number;
  deltaVsStd: number;

  // Touch & Opportunity Metrics
  totalTouches: number;
  touchesPerGame: number;
  carries: number;
  carriesPerGame: number;
  rushYards: number;
  rushTds: number;
  ypc: number;
  rushFd: number;
  rushFdRate: number;
  rzCarries: number;
  rushYacPerAtt: number;
  brokenTackleRate: number;

  // Receiving Metrics
  targets: number;
  targetsPerGame: number;
  targetSharePct: number;
  airYardsSharePct: number;
  wopr: number;
  receptions: number;
  recYards: number;
  recTds: number;
  recFd: number;
  recFdRate: number;
  airYards: number;
  aDoT: number;
  rzTargets: number;

  // High-Value Touches (HVT) & First Downs (1D)
  hvt: number;
  hvtPerGame: number;
  totalFd: number;
  fdPerGame: number;
  fdPerTouch: number;

  // Special Teams & Returns
  krYd: number;
  prYd: number;
  totalReturnYd: number;
  returnTds: number;
  returnPts: number;
  returnFloorPpg: number;
  stSnaps: number;

  // Passing (QBs)
  passYd: number;
  passTd: number;
  passInt: number;
  passSack: number;
  passCmp: number;

  // Composite Rating
  mortyEdgeIndex: number; // 0 - 100

  // Detailed Game Log
  gameLogs: PlayerWeeklyStat[];
}

// Memory cache for weekly stats across seasons
const seasonStatsCache: Record<string, Record<number, Record<string, any>>> = {};

const normalizeTeamAbbr = (team: string): string => {
  const t = (team || '').toUpperCase();
  if (t === 'WSH') return 'WAS';
  if (t === 'LA') return 'LAR';
  if (t === 'JAC') return 'JAX';
  return t;
};

export function usePlayerEvaluation(
  leagueId: string | null,
  season: string | null,
  scoringSettings: Record<string, any> | undefined
) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allPlayersData, setAllPlayersData] = useState<PlayerEvaluationItem[]>([]);
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [teamTotalsState, setTeamTotalsState] = useState<Record<string, Record<number, { passAtt: number; airYd: number; offSnaps: number }>>>({});

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!leagueId || !season) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Players Database, Users, and Rosters
        const [playersDict, users, rosters] = await Promise.all([
          getPlayers(),
          getUsers(leagueId),
          getRosters(leagueId)
        ]);

        const userMap = users.reduce((acc, u) => {
          acc[u.user_id] = u;
          return acc;
        }, {} as Record<string, User>);

        const rosteredPlayerMap: Record<string, { roster: Roster; user?: User }> = {};
        for (const r of rosters) {
          const owner = r.owner_id ? userMap[r.owner_id] : undefined;
          if (r.players && Array.isArray(r.players)) {
            for (const pid of r.players) {
              rosteredPlayerMap[pid] = { roster: r, user: owner };
            }
          }
        }

        // 2. Fetch or load cached weekly stats for all 18 weeks
        if (!seasonStatsCache[season]) {
          seasonStatsCache[season] = {};
        }

        const weeksToFetch: number[] = [];
        for (let w = 1; w <= 18; w++) {
          if (!seasonStatsCache[season][w]) {
            weeksToFetch.push(w);
          }
        }

        if (weeksToFetch.length > 0) {
          const weekResults = await Promise.all(
            weeksToFetch.map(async (w) => {
              try {
                const res = await fetch(`${BASE_URL}/stats/nfl/regular/${season}/${w}`);
                if (!res.ok) return { week: w, data: null };
                const data = await res.json();
                return { week: w, data };
              } catch {
                return { week: w, data: null };
              }
            })
          );

          for (const res of weekResults) {
            if (res.data && Object.keys(res.data).length > 0) {
              seasonStatsCache[season][res.week] = res.data;
            }
          }
        }

        // Determine active completed weeks
        const activeWeeks = Object.keys(seasonStatsCache[season])
          .map(Number)
          .sort((a, b) => a - b);

        if (isCancelled) return;
        setCompletedWeeks(activeWeeks);

        // 3. Aggregate Team-Level Totals per week (Pass Attempts, Air Yards, Offensive Snaps)
        const teamWeeklyTotals: Record<string, Record<number, { passAtt: number; airYd: number; offSnaps: number }>> = {};

        for (const w of activeWeeks) {
          const weekStats = seasonStatsCache[season][w];
          
          // First parse official TEAM_ summary objects (e.g. TEAM_MIA, TEAM_KC, TEAM_BAL)
          for (const [key, s] of Object.entries(weekStats)) {
            if (key.startsWith('TEAM_')) {
              const team = key.replace('TEAM_', '');
              if (!teamWeeklyTotals[team]) teamWeeklyTotals[team] = {};
              teamWeeklyTotals[team][w] = {
                passAtt: s.pass_att || s.rec_tgt || 0,
                airYd: s.rec_air_yd || s.pass_air_yd || 0,
                offSnaps: s.off_snp || 0
              };
            }
          }

          // Fallback if any team wasn't in TEAM_ prefix
          for (const [pid, s] of Object.entries(weekStats)) {
            if (pid.startsWith('TEAM_') || isNaN(Number(pid))) continue;
            const team = s.team || playersDict[pid]?.team;
            if (!team) continue;
            if (!teamWeeklyTotals[team]) teamWeeklyTotals[team] = {};
            if (!teamWeeklyTotals[team][w]) {
              teamWeeklyTotals[team][w] = { passAtt: 0, airYd: 0, offSnaps: 0 };
            }
            if (teamWeeklyTotals[team][w].passAtt === 0 && s.pass_att) {
              teamWeeklyTotals[team][w].passAtt += s.pass_att;
            }
            if (teamWeeklyTotals[team][w].airYd === 0 && (s.rec_air_yd || s.pass_air_yd)) {
              teamWeeklyTotals[team][w].airYd += (s.rec_air_yd || s.pass_air_yd || 0);
            }
            if ((s.tm_off_snp || 0) > teamWeeklyTotals[team][w].offSnaps) {
              teamWeeklyTotals[team][w].offSnaps = s.tm_off_snp;
            }
          }
        }

        // 4. Scoring Engine Matrix
        const scoring = {
          rush_yd: scoringSettings?.rush_yd ?? 0.1,
          rush_td: scoringSettings?.rush_td ?? 6.0,
          rush_fd: scoringSettings?.rush_fd ?? 1.0,
          rush_td_40p: scoringSettings?.rush_td_40p ?? 2.0,
          bonus_rush_yd_200: scoringSettings?.bonus_rush_yd_200 ?? 1.0,

          rec: scoringSettings?.rec ?? 0.0,
          rec_yd: scoringSettings?.rec_yd ?? 0.1,
          rec_td: scoringSettings?.rec_td ?? 6.0,
          rec_fd: scoringSettings?.rec_fd ?? 1.0,
          rec_td_40p: scoringSettings?.rec_td_40p ?? 2.0,
          bonus_rec_yd_200: scoringSettings?.bonus_rec_yd_200 ?? 1.0,

          kr_yd: scoringSettings?.kr_yd ?? (1 / 15),
          pr_yd: scoringSettings?.pr_yd ?? (1 / 20),
          kr_td: scoringSettings?.kr_td ?? 6.0,
          pr_td: scoringSettings?.pr_td ?? 6.0,

          pass_yd: scoringSettings?.pass_yd ?? 0.04,
          pass_td: scoringSettings?.pass_td ?? 6.0,
          pass_int: scoringSettings?.pass_int ?? -2.0,
          pass_sack: scoringSettings?.pass_sack ?? -1.0,
          pass_cmp: scoringSettings?.pass_cmp ?? 0.1,
          pass_td_40p: scoringSettings?.pass_td_40p ?? 2.0,

          fum_lost: scoringSettings?.fum_lost ?? -1.0
        };

        // 5. Aggregate Player Stats
        const playerMap: Record<string, {
          meta: any;
          logs: PlayerWeeklyStat[];
        }> = {};

        for (const w of activeWeeks) {
          const weekStats = seasonStatsCache[season][w];
          for (const [pid, s] of Object.entries(weekStats)) {
            const pMeta = playersDict[pid];
            if (!pMeta) continue;
            const pos = pMeta.position || s.pos || 'UNKNOWN';
            if (!['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pos)) continue;

            if (!playerMap[pid]) {
              playerMap[pid] = {
                meta: pMeta,
                logs: []
              };
            }

            const team = s.team || pMeta.team || 'FA';
            const teamWeek = teamWeeklyTotals[team]?.[w] || { passAtt: 1, airYd: 1, offSnaps: 65 };
            const teamOffSnaps = s.tm_off_snp || teamWeek.offSnaps || 65;
            const playerSnaps = s.off_snp || 0;
            const snapPct = teamOffSnaps > 0 ? (playerSnaps / teamOffSnaps) * 100 : 0;

            // Compute custom fantasy points
            const customPts = 
              (s.rush_yd || 0) * scoring.rush_yd +
              (s.rush_td || 0) * scoring.rush_td +
              (s.rush_fd || 0) * scoring.rush_fd +
              ((s.rush_td_40p || 0) * scoring.rush_td_40p) +
              (s.rec || 0) * scoring.rec +
              (s.rec_yd || 0) * scoring.rec_yd +
              (s.rec_td || 0) * scoring.rec_td +
              (s.rec_fd || 0) * scoring.rec_fd +
              ((s.rec_td_40p || 0) * scoring.rec_td_40p) +
              (s.kr_yd || 0) * scoring.kr_yd +
              (s.pr_yd || 0) * scoring.pr_yd +
              (s.kr_td || 0) * scoring.kr_td +
              (s.pr_td || 0) * scoring.pr_td +
              (s.pass_yd || 0) * scoring.pass_yd +
              (s.pass_td || 0) * scoring.pass_td +
              (s.pass_int || 0) * scoring.pass_int +
              (s.pass_sack || 0) * scoring.pass_sack +
              (s.pass_cmp || 0) * scoring.pass_cmp +
              ((s.pass_td_40p || 0) * scoring.pass_td_40p) +
              (s.fum_lost || 0) * scoring.fum_lost;

            const stdPts = 
              (s.rush_yd || 0) * 0.1 +
              (s.rush_td || 0) * 6.0 +
              (s.rec_yd || 0) * 0.1 +
              (s.rec_td || 0) * 6.0 +
              (s.pass_yd || 0) * 0.04 +
              (s.pass_td || 0) * 4.0 +
              (s.pass_int || 0) * -2.0 +
              (s.fum_lost || 0) * -2.0;

            const pprPts = stdPts + (s.rec || 0) * 1.0;

            const playerTeam = pMeta.team || s.team || 'FA';
            const opp = s.opponent || getNflOpponent(season, w, playerTeam);

            playerMap[pid].logs.push({
              week: w,
              opp,
              gp: !!(s.gp || s.gms_active || playerSnaps > 0 || (s.rush_att || 0) > 0 || (s.rec_tgt || 0) > 0 || (s.kr_yd || 0) > 0),
              snaps: playerSnaps,
              teamSnaps: teamOffSnaps,
              snapPct,
              customPts,
              stdPts,
              pprPts,
              rushAtt: s.rush_att || 0,
              rushYd: s.rush_yd || 0,
              rushTd: s.rush_td || 0,
              rushFd: s.rush_fd || 0,
              rushRzAtt: s.rush_rz_att || 0,
              rushYac: s.rush_yac || 0,
              rushBtkl: s.rush_btkl || 0,
              recTgt: s.rec_tgt || 0,
              rec: s.rec || 0,
              recYd: s.rec_yd || 0,
              recTd: s.rec_td || 0,
              recFd: s.rec_fd || 0,
              recRzTgt: s.rec_rz_tgt || 0,
              recAirYd: s.rec_air_yd || 0,
              krYd: s.kr_yd || 0,
              prYd: s.pr_yd || 0,
              krTd: s.kr_td || 0,
              prTd: s.pr_td || 0,
              stSnaps: s.st_snp || 0,
              passYd: s.pass_yd || 0,
              passTd: s.pass_td || 0,
              passInt: s.pass_int || 0,
              passSack: s.pass_sack || 0,
              passCmp: s.pass_cmp || 0,
              fumLost: s.fum_lost || 0
            });
          }
        }

        // 6. Build final aggregated items
        const results: PlayerEvaluationItem[] = [];

        for (const [pid, entry] of Object.entries(playerMap)) {
          const meta = entry.meta;
          const logs = entry.logs.sort((a, b) => a.week - b.week);
          const activeLogs = logs.filter(l => l.gp);
          const gamesPlayed = activeLogs.length;
          if (gamesPlayed === 0) continue;

          const team = meta.team || 'FA';
          const pos = meta.position || 'UNKNOWN';

          let totalCustomPts = 0;
          let totalStdPts = 0;
          let totalPprPts = 0;
          let totalSnaps = 0;
          let totalTeamSnaps = 0;
          let carries = 0;
          let rushYards = 0;
          let rushTds = 0;
          let rushFd = 0;
          let rzCarries = 0;
          let rushYac = 0;
          let rushBtkl = 0;
          let targets = 0;
          let receptions = 0;
          let recYards = 0;
          let recTds = 0;
          let recFd = 0;
          let rzTargets = 0;
          let airYards = 0;
          let krYd = 0;
          let prYd = 0;
          let krTd = 0;
          let prTd = 0;
          let stSnaps = 0;
          let passYd = 0;
          let passTd = 0;
          let passInt = 0;
          let passSack = 0;
          let passCmp = 0;

          // Team cumulative context
          let teamPassAttInPlayedGames = 0;
          let teamAirYdInPlayedGames = 0;

          for (const l of activeLogs) {
            totalCustomPts += l.customPts;
            totalStdPts += l.stdPts;
            totalPprPts += l.pprPts;
            totalSnaps += l.snaps;
            totalTeamSnaps += l.teamSnaps;

            carries += l.rushAtt;
            rushYards += l.rushYd;
            rushTds += l.rushTd;
            rushFd += l.rushFd;
            rzCarries += l.rushRzAtt;
            rushYac += l.rushYac;
            rushBtkl += l.rushBtkl;

            targets += l.recTgt;
            receptions += l.rec;
            recYards += l.recYd;
            recTds += l.recTd;
            recFd += l.recFd;
            rzTargets += l.recRzTgt;
            airYards += l.recAirYd;

            krYd += l.krYd;
            prYd += l.prYd;
            krTd += l.krTd;
            prTd += l.prTd;
            stSnaps += l.stSnaps;

            passYd += l.passYd;
            passTd += l.passTd;
            passInt += l.passInt;
            passSack += l.passSack;
            passCmp += l.passCmp;

            const tStats = teamWeeklyTotals[team]?.[l.week];
            if (tStats) {
              teamPassAttInPlayedGames += tStats.passAtt || 0;
              teamAirYdInPlayedGames += tStats.airYd || 0;
            }
          }

          const totalTouches = carries + receptions;
          const totalFd = rushFd + recFd;
          const totalReturnYd = krYd + prYd;
          const returnTds = krTd + prTd;
          const returnPts = (krYd * scoring.kr_yd) + (prYd * scoring.pr_yd) + (returnTds * scoring.kr_td);
          const returnFloorPpg = gamesPlayed > 0 ? returnPts / gamesPlayed : 0;

          const snapPct = totalTeamSnaps > 0 ? totalSnaps / totalTeamSnaps : 0;
          
          // 3-Week Snap Trend
          const recentLogs = activeLogs.slice(-3);
          const recentSnaps = recentLogs.reduce((acc, l) => acc + l.snaps, 0);
          const recentTeamSnaps = recentLogs.reduce((acc, l) => acc + l.teamSnaps, 0);
          const recentSnapPct = recentTeamSnaps > 0 ? recentSnaps / recentTeamSnaps : snapPct;
          const snapTrend3Wk = (recentSnapPct - snapPct) * 100;

          // Advanced Rates
          const targetSharePct = teamPassAttInPlayedGames > 0 ? (targets / teamPassAttInPlayedGames) * 100 : 0;
          const airYardsSharePct = teamAirYdInPlayedGames > 0 ? (airYards / teamAirYdInPlayedGames) * 100 : 0;
          const aDoT = targets > 0 ? airYards / targets : 0;
          const wopr = (1.5 * (targetSharePct / 100)) + (0.7 * (airYardsSharePct / 100));

          const rushFdRate = carries > 0 ? (rushFd / carries) * 100 : 0;
          const recFdRate = targets > 0 ? (recFd / targets) * 100 : 0;
          const fdPerTouch = totalTouches > 0 ? (totalFd / totalTouches) * 100 : 0;
          const ypc = carries > 0 ? rushYards / carries : 0;
          const rushYacPerAtt = carries > 0 ? rushYac / carries : 0;
          const brokenTackleRate = carries > 0 ? (rushBtkl / carries) * 100 : 0;

          const hvt = rzCarries + targets;
          const hvtPerGame = gamesPlayed > 0 ? hvt / gamesPlayed : 0;

          // Compute Morty Edge Index (0 - 100): Priority on Role Growth, Volume (WOPR/HVT), and 1D Efficiency
          let edgeScore = 0;
          if (pos === 'WR' || pos === 'TE') {
            const normWopr = Math.min(wopr / 0.55, 1.0) * 40;
            const normTrend = Math.max(Math.min((snapTrend3Wk + 10) / 30, 1.0), 0) * 25;
            const normFd = Math.min((recFd / gamesPlayed) / 3.0, 1.0) * 20;
            const normRet = Math.min(returnFloorPpg / 6.0, 1.0) * 15;
            edgeScore = normWopr + normTrend + normFd + normRet;
          } else if (pos === 'RB') {
            const normHvt = Math.min(hvtPerGame / 5.5, 1.0) * 40;
            const normTrend = Math.max(Math.min((snapTrend3Wk + 10) / 30, 1.0), 0) * 25;
            const normRushFd = Math.min((rushFd / gamesPlayed) / 3.5, 1.0) * 20;
            const normYac = Math.min(rushYacPerAtt / 3.2, 1.0) * 10;
            const normRet = Math.min(returnFloorPpg / 5.0, 1.0) * 5;
            edgeScore = normHvt + normTrend + normRushFd + normYac + normRet;
          } else if (pos === 'QB') {
            const ppgNorm = Math.min((totalCustomPts / gamesPlayed) / 24.0, 1.0) * 50;
            const rushNorm = Math.min((rushFd / gamesPlayed) / 3.0, 1.0) * 30;
            const trendNorm = Math.max(Math.min((snapTrend3Wk + 10) / 20, 1.0), 0) * 20;
            edgeScore = ppgNorm + rushNorm + trendNorm;
          } else {
            edgeScore = Math.min((totalCustomPts / gamesPlayed) / 12.0, 1.0) * 100;
          }

          const rosterInfo = rosteredPlayerMap[pid];

          results.push({
            id: pid,
            name: meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || pid,
            pos,
            team,
            age: meta.age,
            yearsExp: meta.years_exp,
            avatarUrl: meta.avatar ? `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg` : undefined,

            isRostered: !!rosterInfo,
            owner: rosterInfo?.user,
            rosterId: rosterInfo?.roster.roster_id,

            gamesPlayed,
            weeksActive: activeLogs.map(l => l.week),

            totalCustomPts,
            customPpg: totalCustomPts / gamesPlayed,
            totalStdPts,
            stdPpg: totalStdPts / gamesPlayed,
            totalPprPts,
            pprPpg: totalPprPts / gamesPlayed,
            deltaVsPpr: totalCustomPts - totalPprPts,
            deltaVsStd: totalCustomPts - totalStdPts,

            totalSnaps,
            avgSnapsPerGame: totalSnaps / gamesPlayed,
            snapPct: snapPct * 100,
            snapTrend3Wk,
            totalTouches,
            touchesPerGame: totalTouches / gamesPlayed,

            targets,
            targetsPerGame: targets / gamesPlayed,
            targetSharePct,
            receptions,
            recYards,
            recTds,
            airYards,
            airYardsSharePct,
            aDoT,
            wopr,
            recFd,
            recFdRate,

            carries,
            carriesPerGame: carries / gamesPlayed,
            rushYards,
            rushTds,
            ypc,
            rushFd,
            rushFdRate,
            rzCarries,
            rzTargets,
            hvt,
            hvtPerGame,
            rushYacPerAtt,
            brokenTackleRate,

            totalFd,
            fdPerGame: totalFd / gamesPlayed,
            fdPerTouch,

            krYd,
            prYd,
            totalReturnYd,
            returnTds,
            returnPts,
            returnFloorPpg,
            stSnaps,

            passYd,
            passTd,
            passInt,
            passSack,
            passCmp,

            mortyEdgeIndex: Math.round(edgeScore),
            gameLogs: logs
          });
        }

        if (!isCancelled) {
          setTeamTotalsState(teamWeeklyTotals);
          setAllPlayersData(results);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load player evaluation data');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [leagueId, season, scoringSettings]);

  // Sliced data based on Timeframe Scope
  const getScopedData = useMemo(() => {
    return (timeframe: TimeframeScope): PlayerEvaluationItem[] => {
      if (timeframe === 'full' || completedWeeks.length === 0) {
        return allPlayersData;
      }

      let targetWeeks: number[] = [];
      const sortedWeeks = [...completedWeeks].sort((a, b) => a - b);
      if (timeframe === 'last1') {
        targetWeeks = sortedWeeks.slice(-1);
      } else if (timeframe === 'last3') {
        targetWeeks = sortedWeeks.slice(-3);
      } else if (timeframe === 'last5') {
        targetWeeks = sortedWeeks.slice(-5);
      }

      return allPlayersData.map(p => {
        const scopedLogs = p.gameLogs.filter(l => targetWeeks.includes(l.week) && l.gp);
        const scopedGames = scopedLogs.length;
        if (scopedGames === 0) {
          return {
            ...p,
            gamesPlayed: 0,
            totalCustomPts: 0,
            customPpg: 0,
            totalPprPts: 0,
            pprPpg: 0,
            deltaVsPpr: 0,
            totalTouches: 0,
            touchesPerGame: 0,
            targets: 0,
            carries: 0,
            totalFd: 0,
            wopr: 0,
            targetSharePct: 0,
            airYardsSharePct: 0,
            returnPts: 0,
            returnFloorPpg: 0,
            mortyEdgeIndex: 0
          };
        }

        const totalCustomPts = scopedLogs.reduce((acc, l) => acc + l.customPts, 0);
        const totalStdPts = scopedLogs.reduce((acc, l) => acc + l.stdPts, 0);
        const totalPprPts = scopedLogs.reduce((acc, l) => acc + l.pprPts, 0);
        const carries = scopedLogs.reduce((acc, l) => acc + l.rushAtt, 0);
        const rushYards = scopedLogs.reduce((acc, l) => acc + l.rushYd, 0);
        const rushTds = scopedLogs.reduce((acc, l) => acc + l.rushTd, 0);
        const rushFd = scopedLogs.reduce((acc, l) => acc + l.rushFd, 0);
        const rzCarries = scopedLogs.reduce((acc, l) => acc + l.rushRzAtt, 0);
        const targets = scopedLogs.reduce((acc, l) => acc + l.recTgt, 0);
        const receptions = scopedLogs.reduce((acc, l) => acc + l.rec, 0);
        const recYards = scopedLogs.reduce((acc, l) => acc + l.recYd, 0);
        const recTds = scopedLogs.reduce((acc, l) => acc + l.recTd, 0);
        const recFd = scopedLogs.reduce((acc, l) => acc + l.recFd, 0);
        const airYards = scopedLogs.reduce((acc, l) => acc + l.recAirYd, 0);
        const krYd = scopedLogs.reduce((acc, l) => acc + l.krYd, 0);
        const prYd = scopedLogs.reduce((acc, l) => acc + l.prYd, 0);
        const krTd = scopedLogs.reduce((acc, l) => acc + l.krTd, 0);
        const prTd = scopedLogs.reduce((acc, l) => acc + l.prTd, 0);
        const totalSnaps = scopedLogs.reduce((acc, l) => acc + l.snaps, 0);
        const totalTeamSnaps = scopedLogs.reduce((acc, l) => acc + l.teamSnaps, 0);

        let teamPassAttInScoped = 0;
        let teamAirYdInScoped = 0;
        for (const l of scopedLogs) {
          const tStats = teamTotalsState[p.team]?.[l.week];
          if (tStats) {
            teamPassAttInScoped += tStats.passAtt || 0;
            teamAirYdInScoped += tStats.airYd || 0;
          }
        }

        const targetSharePct = teamPassAttInScoped > 0 ? (targets / teamPassAttInScoped) * 100 : 0;
        const airYardsSharePct = teamAirYdInScoped > 0 ? (airYards / teamAirYdInScoped) * 100 : 0;
        const aDoT = targets > 0 ? airYards / targets : 0;
        const wopr = (1.5 * (targetSharePct / 100)) + (0.7 * (airYardsSharePct / 100));

        const totalTouches = carries + receptions;
        const totalFd = rushFd + recFd;
        const returnPts = (krYd * (1/15)) + (prYd * (1/20)) + ((krTd + prTd) * 6.0);
        const returnFloorPpg = returnPts / scopedGames;
        const snapPct = totalTeamSnaps > 0 ? (totalSnaps / totalTeamSnaps) * 100 : 0;

        let scopedEdgeScore = 0;
        if (p.pos === 'WR' || p.pos === 'TE') {
          const normWopr = Math.min(wopr / 0.55, 1.0) * 40;
          const normTrend = Math.max(Math.min((p.snapTrend3Wk + 10) / 30, 1.0), 0) * 25;
          const normFd = Math.min((recFd / scopedGames) / 3.0, 1.0) * 20;
          const normRet = Math.min(returnFloorPpg / 6.0, 1.0) * 15;
          scopedEdgeScore = normWopr + normTrend + normFd + normRet;
        } else if (p.pos === 'RB') {
          const normHvt = Math.min(((rzCarries + targets) / scopedGames) / 5.5, 1.0) * 40;
          const normTrend = Math.max(Math.min((p.snapTrend3Wk + 10) / 30, 1.0), 0) * 25;
          const normRushFd = Math.min((rushFd / scopedGames) / 3.5, 1.0) * 20;
          const normRet = Math.min(returnFloorPpg / 5.0, 1.0) * 15;
          scopedEdgeScore = normHvt + normTrend + normRushFd + normRet;
        } else if (p.pos === 'QB') {
          const ppgNorm = Math.min((totalCustomPts / scopedGames) / 24.0, 1.0) * 50;
          const rushNorm = Math.min((rushFd / scopedGames) / 3.0, 1.0) * 30;
          const trendNorm = Math.max(Math.min((p.snapTrend3Wk + 10) / 20, 1.0), 0) * 20;
          scopedEdgeScore = ppgNorm + rushNorm + trendNorm;
        } else {
          scopedEdgeScore = Math.min((totalCustomPts / scopedGames) / 12.0, 1.0) * 100;
        }

        return {
          ...p,
          gamesPlayed: scopedGames,
          totalCustomPts,
          customPpg: totalCustomPts / scopedGames,
          totalStdPts,
          stdPpg: totalStdPts / scopedGames,
          totalPprPts,
          pprPpg: totalPprPts / scopedGames,
          deltaVsPpr: totalCustomPts - totalPprPts,
          deltaVsStd: totalCustomPts - totalStdPts,
          totalTouches,
          touchesPerGame: totalTouches / scopedGames,
          carries,
          carriesPerGame: carries / scopedGames,
          rushYards,
          rushTds,
          ypc: carries > 0 ? rushYards / carries : 0,
          rushFd,
          rushFdRate: carries > 0 ? (rushFd / carries) * 100 : 0,
          rzCarries,
          targets,
          targetsPerGame: targets / scopedGames,
          targetSharePct,
          airYardsSharePct,
          wopr,
          receptions,
          recYards,
          recTds,
          recFd,
          recFdRate: targets > 0 ? (recFd / targets) * 100 : 0,
          airYards,
          aDoT,
          hvt: rzCarries + targets,
          hvtPerGame: (rzCarries + targets) / scopedGames,
          totalFd,
          fdPerGame: totalFd / scopedGames,
          fdPerTouch: totalTouches > 0 ? (totalFd / totalTouches) * 100 : 0,
          krYd,
          prYd,
          totalReturnYd: krYd + prYd,
          returnTds: krTd + prTd,
          returnPts,
          returnFloorPpg,
          totalSnaps,
          avgSnapsPerGame: totalSnaps / scopedGames,
          snapPct,
          mortyEdgeIndex: Math.round(scopedEdgeScore)
        };
      });
    };
  }, [allPlayersData, completedWeeks, teamTotalsState]);

  return {
    loading,
    error,
    allPlayersData,
    completedWeeks,
    getScopedData
  };
}
