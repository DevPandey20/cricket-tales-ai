import { type MatchStat, type Prediction, IPL_TEAMS } from "./ipl-types";
import { PLAYER_STATS_DB, AVAILABLE_PLAYERS } from "./ipl-player-db";
import { TEAM_MATCHES } from "./ipl-team-matches";
import { IPL_VENUES } from "./ipl-venues";

export { IPL_TEAMS, AVAILABLE_PLAYERS, IPL_VENUES };
export type { MatchStat, Prediction };

export function getPlayerStats(playerName: string): MatchStat[] | null {
  const key = Object.keys(PLAYER_STATS_DB).find(
    (k) => k.toLowerCase() === playerName.trim().toLowerCase()
  );
  return key ? PLAYER_STATS_DB[key] : null;
}

// Baseline team strength
const TEAM_STRENGTH: Record<string, number> = {
  "Chennai Super Kings": 87,
  "Mumbai Indians": 85,
  "Royal Challengers Bengaluru": 83,
  "Kolkata Knight Riders": 86,
  "Rajasthan Royals": 84,
  "Delhi Capitals": 79,
  "Sunrisers Hyderabad": 82,
  "Punjab Kings": 76,
  "Gujarat Titans": 81,
  "Lucknow Super Giants": 80,
};

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Recent team form: win % over last N matches
function teamRecentForm(team: string, n = 10): { winPct: number; played: number } {
  const games = TEAM_MATCHES.filter((m) => m.team1 === team || m.team2 === team).slice(0, n);
  if (games.length === 0) return { winPct: 50, played: 0 };
  const wins = games.filter((g) => g.winner === team).length;
  return { winPct: Math.round((wins / games.length) * 100), played: games.length };
}

// Team performance at a venue
function teamVenueRecord(team: string, venue: string): { winPct: number; played: number } {
  const games = TEAM_MATCHES.filter(
    (m) => m.venue === venue && (m.team1 === team || m.team2 === team)
  );
  if (games.length === 0) return { winPct: 50, played: 0 };
  const wins = games.filter((g) => g.winner === team).length;
  return { winPct: Math.round((wins / games.length) * 100), played: games.length };
}

// Head-to-head between two teams
function headToHead(team1: string, team2: string): { team1WinPct: number; played: number } {
  const games = TEAM_MATCHES.filter(
    (m) =>
      (m.team1 === team1 && m.team2 === team2) ||
      (m.team1 === team2 && m.team2 === team1)
  );
  if (games.length === 0) return { team1WinPct: 50, played: 0 };
  const t1Wins = games.filter((g) => g.winner === team1).length;
  return { team1WinPct: Math.round((t1Wins / games.length) * 100), played: games.length };
}

export function getPrediction(
  team1: string,
  team2: string,
  player: string,
  venue: string
): Prediction {
  const stats = getPlayerStats(player);

  // === Team prediction ===
  const s1Base = TEAM_STRENGTH[team1] ?? 78;
  const s2Base = TEAM_STRENGTH[team2] ?? 78;

  const form1 = teamRecentForm(team1);
  const form2 = teamRecentForm(team2);
  const venue1 = teamVenueRecord(team1, venue);
  const venue2 = teamVenueRecord(team2, venue);
  const h2h = headToHead(team1, team2);

  // Composite score per team — weighted blend
  // 35% squad strength, 30% recent form, 20% venue record, 15% H2H
  const score1 =
    s1Base * 0.35 +
    form1.winPct * 0.30 +
    venue1.winPct * 0.20 +
    h2h.team1WinPct * 0.15;
  const score2 =
    s2Base * 0.35 +
    form2.winPct * 0.30 +
    venue2.winPct * 0.20 +
    (100 - h2h.team1WinPct) * 0.15;

  const total = score1 + score2;
  const team1Pct = Math.round((score1 / total) * 100);
  const winner = score1 >= score2 ? team1 : team2;
  const winProb = Math.max(team1Pct, 100 - team1Pct);

  const factors = [
    { label: `${team1} recent form (last ${form1.played})`, value: `${form1.winPct}% wins` },
    { label: `${team2} recent form (last ${form2.played})`, value: `${form2.winPct}% wins` },
    {
      label: `${team1} at ${venue.split(",")[0]}`,
      value: venue1.played > 0 ? `${venue1.winPct}% (${venue1.played} games)` : "No data",
    },
    {
      label: `${team2} at ${venue.split(",")[0]}`,
      value: venue2.played > 0 ? `${venue2.winPct}% (${venue2.played} games)` : "No data",
    },
    {
      label: `Head-to-head`,
      value: h2h.played > 0 ? `${team1}: ${h2h.team1WinPct}% (${h2h.played} games)` : "No data",
    },
  ];

  if (!stats || stats.length === 0) {
    return {
      winner,
      winProbability: winProb,
      playerRuns: 0,
      playerWickets: 0,
      confidence: 50,
      reasoning: `Player "${player}" not found. Prediction based on team factors only. Try: ${AVAILABLE_PLAYERS.slice(0, 5).join(", ")}...`,
      factors,
    };
  }

  // === Player prediction with venue + opposition + recent form ===
  const overall = stats; // already sorted by date desc
  const recent5 = overall.slice(0, 5);
  const older = overall.slice(5);

  const overallAvgRuns = avg(overall.map((m) => m.runs));
  const overallAvgWkts = avg(overall.map((m) => m.wickets));

  // Recent form trend
  const recentAvg = avg(recent5.map((m) => m.runs));
  const olderAvg = older.length > 0 ? avg(older.map((m) => m.runs)) : recentAvg;
  const formMultiplier = olderAvg > 0 ? Math.max(0.75, Math.min(1.25, recentAvg / olderAvg)) : 1;

  // Venue stats for player
  const atVenue = overall.filter((m) => m.venue === venue);
  const venueAvgRuns = atVenue.length > 0 ? avg(atVenue.map((m) => m.runs)) : null;
  const venueAvgWkts = atVenue.length > 0 ? avg(atVenue.map((m) => m.wickets)) : null;

  // Opposition (the other team — not the player's own team)
  // Determine the opponent we should look at: the player's own team is in stats
  const ownTeam = stats[0].ownTeam;
  const opposition = ownTeam === team1 ? team2 : team1;
  const vsOpp = overall.filter((m) => m.opponent === opposition);
  const oppAvgRuns = vsOpp.length > 0 ? avg(vsOpp.map((m) => m.runs)) : null;
  const oppAvgWkts = vsOpp.length > 0 ? avg(vsOpp.map((m) => m.wickets)) : null;

  // Weighted blend for runs:
  //   recent form (career * trend) baseline 40%
  //   venue history 30% (if available)
  //   opposition history 30% (if available)
  // Re-normalize when one is missing.
  let runsWeights: { val: number; w: number }[] = [
    { val: overallAvgRuns * formMultiplier, w: 0.4 },
  ];
  if (venueAvgRuns !== null) runsWeights.push({ val: venueAvgRuns, w: 0.3 });
  if (oppAvgRuns !== null) runsWeights.push({ val: oppAvgRuns, w: 0.3 });
  const runsTotalW = runsWeights.reduce((a, b) => a + b.w, 0);
  const predictedRuns = Math.round(
    runsWeights.reduce((a, b) => a + b.val * b.w, 0) / runsTotalW
  );

  let wktsWeights: { val: number; w: number }[] = [{ val: overallAvgWkts, w: 0.4 }];
  if (venueAvgWkts !== null) wktsWeights.push({ val: venueAvgWkts, w: 0.3 });
  if (oppAvgWkts !== null) wktsWeights.push({ val: oppAvgWkts, w: 0.3 });
  const wktsTotalW = wktsWeights.reduce((a, b) => a + b.w, 0);
  const predictedWkts = Math.round(
    wktsWeights.reduce((a, b) => a + b.val * b.w, 0) / wktsTotalW
  );

  // Confidence: more data => higher confidence
  const confidence = Math.min(
    95,
    50 +
      Math.min(15, overall.length) +
      (atVenue.length > 0 ? 8 : 0) +
      (vsOpp.length > 0 ? 8 : 0) +
      Math.min(10, Math.round(Math.abs(score1 - score2) * 0.3))
  );

  factors.push(
    {
      label: `${player} career avg`,
      value: `${overallAvgRuns.toFixed(1)} runs / ${overallAvgWkts.toFixed(1)} wkts (${overall.length} matches)`,
    },
    {
      label: `${player} at ${venue.split(",")[0]}`,
      value:
        atVenue.length > 0
          ? `${venueAvgRuns!.toFixed(1)} runs / ${venueAvgWkts!.toFixed(1)} wkts (${atVenue.length} games)`
          : "No data",
    },
    {
      label: `${player} vs ${opposition}`,
      value:
        vsOpp.length > 0
          ? `${oppAvgRuns!.toFixed(1)} runs / ${oppAvgWkts!.toFixed(1)} wkts (${vsOpp.length} games)`
          : "No data",
    },
    {
      label: `${player} recent form trend`,
      value: `${formMultiplier > 1.05 ? "📈 Improving" : formMultiplier < 0.95 ? "📉 Declining" : "➡️ Stable"} (×${formMultiplier.toFixed(2)})`,
    }
  );

  const reasoning =
    `${winner} are favourites (${winProb}%) — squad strength ${winner === team1 ? s1Base : s2Base}, ` +
    `recent form ${winner === team1 ? form1.winPct : form2.winPct}% wins, ` +
    `${(winner === team1 ? venue1 : venue2).played > 0 ? `${(winner === team1 ? venue1 : venue2).winPct}% record at this venue` : "no venue history"}. ` +
    `${player} prediction blends career average (${overallAvgRuns.toFixed(0)} runs), ` +
    `${atVenue.length > 0 ? `${atVenue.length} match(es) at this venue` : "no venue data"}, ` +
    `and ${vsOpp.length > 0 ? `${vsOpp.length} match(es) vs ${opposition}` : `no prior data vs ${opposition}`}.`;

  return {
    winner,
    winProbability: winProb,
    playerRuns: predictedRuns,
    playerWickets: predictedWkts,
    confidence,
    reasoning,
    factors,
  };
}
