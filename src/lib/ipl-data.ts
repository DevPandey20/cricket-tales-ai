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
  venue: string,
  preloadedStats?: MatchStat[] | null
): Prediction {
  // Use injected (live + hardcoded merged) stats when supplied, otherwise fall
  // back to hardcoded-only lookup. This keeps the function pure-callable while
  // letting the UI feed in fresher Cricsheet data.
  const stats = preloadedStats !== undefined ? preloadedStats : getPlayerStats(player);

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
  // Filter "did bat" (faced at least 1 ball OR scored runs) and "did bowl" (has economy field) games
  // This avoids dragging averages down with DNB / didn't bowl entries.
  const batted = stats.filter((m) => m.balls > 0 || m.runs > 0);
  const bowled = stats.filter((m) => typeof m.economy === "number");

  // Determine player role from the data
  const battingRate = batted.length / Math.max(stats.length, 1);
  const bowlingRate = bowled.length / Math.max(stats.length, 1);
  const isPureBowler = bowlingRate > 0.6 && battingRate < 0.5;
  const isPureBatter = battingRate > 0.7 && bowlingRate < 0.2;

  // Time-weighted average: more recent matches get higher weight (exponential decay)
  const weightedAvg = (matches: MatchStat[], pick: (m: MatchStat) => number): number => {
    if (matches.length === 0) return 0;
    let weightSum = 0;
    let valueSum = 0;
    matches.forEach((m, idx) => {
      // matches[0] is most recent. Weight decays: 1.0, 0.92, 0.85, ...
      const w = Math.pow(0.92, idx);
      weightSum += w;
      valueSum += pick(m) * w;
    });
    return valueSum / weightSum;
  };

  const overallAvgRuns = batted.length > 0 ? weightedAvg(batted, (m) => m.runs) : 0;
  const overallAvgWkts = bowled.length > 0 ? weightedAvg(bowled, (m) => m.wickets) : 0;

  // Strike rate (for batters) — useful but currently informational
  const totalRuns = batted.reduce((a, m) => a + m.runs, 0);
  const totalBalls = batted.reduce((a, m) => a + m.balls, 0);
  const strikeRate = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;

  // Recent form: last 5 batted innings vs prior 10
  const recent5Bat = batted.slice(0, 5);
  const prior10Bat = batted.slice(5, 15);
  const recentAvg = avg(recent5Bat.map((m) => m.runs));
  const olderAvg = prior10Bat.length > 0 ? avg(prior10Bat.map((m) => m.runs)) : recentAvg;
  const formMultiplier =
    olderAvg > 5 ? Math.max(0.6, Math.min(1.5, recentAvg / olderAvg)) : 1;

  // Same form trend for bowling wickets
  const recent5Bowl = bowled.slice(0, 5);
  const prior10Bowl = bowled.slice(5, 15);
  const recentWktAvg = avg(recent5Bowl.map((m) => m.wickets));
  const olderWktAvg = prior10Bowl.length > 0 ? avg(prior10Bowl.map((m) => m.wickets)) : recentWktAvg;
  const wktFormMultiplier =
    olderWktAvg > 0.3 ? Math.max(0.6, Math.min(1.5, recentWktAvg / olderWktAvg)) : 1;

  // Venue stats for player (only meaningful samples)
  const atVenueBat = batted.filter((m) => m.venue === venue);
  const atVenueBowl = bowled.filter((m) => m.venue === venue);
  const venueAvgRuns = atVenueBat.length > 0 ? avg(atVenueBat.map((m) => m.runs)) : null;
  const venueAvgWkts = atVenueBowl.length > 0 ? avg(atVenueBowl.map((m) => m.wickets)) : null;

  // Opposition (the other team — not the player's own team)
  const ownTeam = stats[0].ownTeam;
  const opposition = ownTeam === team1 ? team2 : team1;
  const vsOppBat = batted.filter((m) => m.opponent === opposition);
  const vsOppBowl = bowled.filter((m) => m.opponent === opposition);
  const oppAvgRuns = vsOppBat.length > 0 ? avg(vsOppBat.map((m) => m.runs)) : null;
  const oppAvgWkts = vsOppBowl.length > 0 ? avg(vsOppBowl.map((m) => m.wickets)) : null;

  // === Weighted blend for runs ===
  // Base: time-weighted career * form trend (45%)
  // Venue: 25% — but only if we have >=2 samples, else 15% and downweight base
  // Opposition: 30% — but only if >=2 samples
  // Sample-size weighting: scale weight by min(1, samples/3) so 1-game venue records don't dominate.
  let predictedRuns = 0;
  if (batted.length === 0 || isPureBowler) {
    // Pure bowler: don't predict more than a small tail-end contribution
    predictedRuns = Math.round(overallAvgRuns); // tiny number based on actual batting innings
  } else {
    const baseRuns = overallAvgRuns * formMultiplier;
    const components: { val: number; w: number }[] = [{ val: baseRuns, w: 0.45 }];
    if (venueAvgRuns !== null) {
      const reliability = Math.min(1, atVenueBat.length / 3);
      components.push({ val: venueAvgRuns, w: 0.25 * reliability });
    }
    if (oppAvgRuns !== null) {
      const reliability = Math.min(1, vsOppBat.length / 3);
      components.push({ val: oppAvgRuns, w: 0.30 * reliability });
    }
    const totalW = components.reduce((a, b) => a + b.w, 0);
    predictedRuns = Math.round(components.reduce((a, b) => a + b.val * b.w, 0) / totalW);
  }

  // === Weighted blend for wickets ===
  let predictedWkts = 0;
  if (bowled.length === 0 || isPureBatter) {
    predictedWkts = 0;
  } else {
    const baseWkts = overallAvgWkts * wktFormMultiplier;
    const components: { val: number; w: number }[] = [{ val: baseWkts, w: 0.45 }];
    if (venueAvgWkts !== null) {
      const reliability = Math.min(1, atVenueBowl.length / 3);
      components.push({ val: venueAvgWkts, w: 0.25 * reliability });
    }
    if (oppAvgWkts !== null) {
      const reliability = Math.min(1, vsOppBowl.length / 3);
      components.push({ val: oppAvgWkts, w: 0.30 * reliability });
    }
    const totalW = components.reduce((a, b) => a + b.w, 0);
    predictedWkts = Math.round(components.reduce((a, b) => a + b.val * b.w, 0) / totalW);
  }

  // Confidence: more (relevant) data => higher confidence
  const relevantSamples = (isPureBowler ? bowled.length : batted.length);
  const confidence = Math.min(
    95,
    45 +
      Math.min(20, relevantSamples) +
      (atVenueBat.length + atVenueBowl.length >= 2 ? 8 : atVenueBat.length + atVenueBowl.length === 1 ? 4 : 0) +
      (vsOppBat.length + vsOppBowl.length >= 2 ? 8 : vsOppBat.length + vsOppBowl.length === 1 ? 4 : 0) +
      Math.min(8, Math.round(Math.abs(score1 - score2) * 0.3))
  );

  const role = isPureBowler ? "Bowler" : isPureBatter ? "Batter" : "All-rounder";

  factors.push(
    {
      label: `${player} role detected`,
      value: `${role} (batted ${batted.length}, bowled ${bowled.length})`,
    },
    {
      label: `${player} batting avg (recent-weighted)`,
      value: batted.length > 0
        ? `${overallAvgRuns.toFixed(1)} runs @ SR ${strikeRate.toFixed(0)} (${batted.length} innings)`
        : "Did not bat",
    },
    {
      label: `${player} bowling avg (recent-weighted)`,
      value: bowled.length > 0
        ? `${overallAvgWkts.toFixed(2)} wkts/match (${bowled.length} innings)`
        : "Did not bowl",
    },
    {
      label: `${player} at ${venue.split(",")[0]}`,
      value:
        atVenueBat.length + atVenueBowl.length > 0
          ? `${venueAvgRuns !== null ? `${venueAvgRuns.toFixed(1)} runs` : "—"} / ${venueAvgWkts !== null ? `${venueAvgWkts.toFixed(2)} wkts` : "—"} (${Math.max(atVenueBat.length, atVenueBowl.length)} games)`
          : "No data",
    },
    {
      label: `${player} vs ${opposition}`,
      value:
        vsOppBat.length + vsOppBowl.length > 0
          ? `${oppAvgRuns !== null ? `${oppAvgRuns.toFixed(1)} runs` : "—"} / ${oppAvgWkts !== null ? `${oppAvgWkts.toFixed(2)} wkts` : "—"} (${Math.max(vsOppBat.length, vsOppBowl.length)} games)`
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
    `${player} (${role}) prediction uses recency-weighted ${batted.length > 0 ? `batting avg ${overallAvgRuns.toFixed(0)}` : "bowling stats"}, ` +
    `${atVenueBat.length + atVenueBowl.length > 0 ? `${Math.max(atVenueBat.length, atVenueBowl.length)} game(s) at this venue` : "no venue data"}, ` +
    `and ${vsOppBat.length + vsOppBowl.length > 0 ? `${Math.max(vsOppBat.length, vsOppBowl.length)} game(s) vs ${opposition}` : `no prior data vs ${opposition}`}. ` +
    `DNB / didn't-bowl matches excluded so averages reflect actual on-field performance.`;

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
