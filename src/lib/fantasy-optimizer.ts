// Fantasy XI Optimizer
// Score every player by projected fantasy points using their recent IPL form,
// venue history, and opposition history. Greedy-pick the top 11 within a
// budget that respects role minimums.

import type { MatchStat } from "./ipl-types";
import { PLAYER_STATS_DB } from "./ipl-player-db";

export type FantasyRole = "BAT" | "BOWL" | "AR" | "WK";

export interface FantasyPlayer {
  name: string;
  team: string;
  role: FantasyRole;
  projectedPoints: number;
  credits: number;
  recentRuns: number;
  recentWickets: number;
  matches: number;
  reasoning: string;
}

// Wicketkeeper detection list (hardcoded — Cricsheet doesn't tag this).
const WK_LIST = new Set([
  "MS Dhoni", "RR Pant", "SV Samson", "JC Buttler", "Q de Kock", "KL Rahul",
  "Ishan Kishan", "Sanju Samson", "Rishabh Pant", "Jos Buttler",
  "N Pooran", "PD Salt", "Phil Salt", "Nicholas Pooran",
  "JM Bairstow", "Jonny Bairstow", "DJ Hooda",
]);

function detectRole(stats: MatchStat[], name: string): FantasyRole {
  if (WK_LIST.has(name)) return "WK";
  const batted = stats.filter((m) => m.balls > 0 || m.runs > 5).length;
  const bowled = stats.filter((m) => typeof m.economy === "number").length;
  const total = stats.length || 1;
  const batRate = batted / total;
  const bowlRate = bowled / total;
  if (bowlRate > 0.65 && batRate < 0.5) return "BOWL";
  if (batRate > 0.7 && bowlRate < 0.25) return "BAT";
  if (batRate > 0.5 && bowlRate > 0.4) return "AR";
  return batRate >= bowlRate ? "BAT" : "BOWL";
}

function projectPoints(
  stats: MatchStat[],
  team1: string,
  team2: string,
  ownTeam: string,
  venue: string,
): { points: number; recentRuns: number; recentWickets: number; reasoning: string } {
  if (stats.length === 0) return { points: 0, recentRuns: 0, recentWickets: 0, reasoning: "No data" };

  const opposition = ownTeam === team1 ? team2 : team1;

  // Weighted avg recent runs (last 10)
  const recent = stats.slice(0, 10);
  const recentRuns = recent.reduce((a, m) => a + m.runs, 0) / recent.length;
  const recentWickets = recent.reduce((a, m) => a + m.wickets, 0) / recent.length;

  const venueGames = stats.filter((m) => m.venue === venue);
  const venueRuns = venueGames.length > 0 ? venueGames.reduce((a, m) => a + m.runs, 0) / venueGames.length : recentRuns;
  const venueWkts = venueGames.length > 0 ? venueGames.reduce((a, m) => a + m.wickets, 0) / venueGames.length : recentWickets;

  const oppGames = stats.filter((m) => m.opponent === opposition);
  const oppRuns = oppGames.length > 0 ? oppGames.reduce((a, m) => a + m.runs, 0) / oppGames.length : recentRuns;
  const oppWkts = oppGames.length > 0 ? oppGames.reduce((a, m) => a + m.wickets, 0) / oppGames.length : recentWickets;

  // Blend: 50% recent form, 25% venue, 25% opposition
  const projRuns = recentRuns * 0.5 + venueRuns * 0.25 + oppRuns * 0.25;
  const projWkts = recentWickets * 0.5 + venueWkts * 0.25 + oppWkts * 0.25;

  // Dream11-ish points: 1pt/run + 4 per boundary (~10% of runs are boundaries)
  // + 25 per wicket. Simplified.
  const battingPoints = projRuns + (projRuns > 30 ? 10 : 0) + (projRuns > 50 ? 15 : 0);
  const bowlingPoints = projWkts * 25 + (projWkts >= 3 ? 8 : 0) + (projWkts >= 4 ? 12 : 0);
  const points = Math.round(battingPoints + bowlingPoints);

  const reasoning = `${recentRuns.toFixed(0)}r/${recentWickets.toFixed(1)}w avg over last ${recent.length}, ` +
    `${venueGames.length} game(s) at venue (${venueRuns.toFixed(0)}r), ` +
    `${oppGames.length} game(s) vs ${opposition} (${oppRuns.toFixed(0)}r)`;

  return { points, recentRuns, recentWickets, reasoning };
}

function creditFromPoints(points: number): number {
  // Map projected points -> credits (8.0 - 11.0)
  if (points >= 70) return 11;
  if (points >= 55) return 10.5;
  if (points >= 45) return 10;
  if (points >= 35) return 9.5;
  if (points >= 25) return 9;
  if (points >= 18) return 8.5;
  return 8;
}

export function buildFantasyXI(
  team1: string,
  team2: string,
  venue: string,
  budget = 100,
): { picks: FantasyPlayer[]; pool: FantasyPlayer[]; budgetUsed: number; totalProjected: number } {
  const pool: FantasyPlayer[] = [];

  for (const [name, stats] of Object.entries(PLAYER_STATS_DB)) {
    if (stats.length === 0) continue;
    const ownTeam = stats[0].ownTeam;
    if (ownTeam !== team1 && ownTeam !== team2) continue;

    const role = detectRole(stats, name);
    const proj = projectPoints(stats, team1, team2, ownTeam, venue);
    if (proj.points <= 0) continue;

    pool.push({
      name,
      team: ownTeam,
      role,
      projectedPoints: proj.points,
      credits: creditFromPoints(proj.points),
      recentRuns: Math.round(proj.recentRuns),
      recentWickets: Math.round(proj.recentWickets * 10) / 10,
      matches: stats.length,
      reasoning: proj.reasoning,
    });
  }

  pool.sort((a, b) => b.projectedPoints - a.projectedPoints);

  // Greedy pick with role minimums: 1+ WK, 3+ BAT, 3+ BOWL, 1+ AR, max 7 from one team.
  const picks: FantasyPlayer[] = [];
  const counts: Record<FantasyRole, number> = { BAT: 0, BOWL: 0, AR: 0, WK: 0 };
  const teamCounts: Record<string, number> = { [team1]: 0, [team2]: 0 };
  let spent = 0;

  const minRoles: Record<FantasyRole, number> = { WK: 1, BAT: 3, BOWL: 3, AR: 1 };
  const maxRoles: Record<FantasyRole, number> = { WK: 4, BAT: 5, BOWL: 5, AR: 4 };

  // Pass 1: fill minimums, prefer high points
  for (const role of ["WK", "BAT", "BOWL", "AR"] as FantasyRole[]) {
    const need = minRoles[role];
    const candidates = pool.filter(
      (p) => p.role === role && !picks.includes(p) && teamCounts[p.team] < 7,
    );
    for (const c of candidates) {
      if (counts[role] >= need) break;
      if (spent + c.credits > budget) continue;
      picks.push(c);
      counts[role] += 1;
      teamCounts[c.team] += 1;
      spent += c.credits;
    }
  }

  // Pass 2: fill to 11 with best remaining
  for (const c of pool) {
    if (picks.length >= 11) break;
    if (picks.includes(c)) continue;
    if (counts[c.role] >= maxRoles[c.role]) continue;
    if (teamCounts[c.team] >= 7) continue;
    if (spent + c.credits > budget) continue;
    picks.push(c);
    counts[c.role] += 1;
    teamCounts[c.team] += 1;
    spent += c.credits;
  }

  return {
    picks,
    pool: pool.slice(0, 25),
    budgetUsed: Math.round(spent * 10) / 10,
    totalProjected: picks.reduce((a, p) => a + p.projectedPoints, 0),
  };
}
