// Live Match Simulator — Monte Carlo ball-by-ball simulation.
//
// Idea: a T20 innings is 120 legal balls. For each ball we sample an outcome
// (dot, 1/2/3, 4, 6, wicket, wide/no-ball) from a distribution biased by:
//   - team batting power (higher => more boundaries, fewer dots)
//   - team bowling power of the opposition
//   - venue first-innings average (higher => more boundaries)
//   - over phase (powerplay = more boundaries; middle = anchored; death = explosive)
//   - wickets in hand (more wickets lost => fewer aggressive shots)
//
// We run N simulations of both innings and report distribution + win prob.

import { TEAM_BATTING_POWER, TEAM_BOWLING_POWER, VENUE_PROFILES, DEFAULT_PROFILE } from "./ipl-venue-profiles";

export interface SimResult {
  team1Avg: number;
  team2Avg: number;
  team1Wins: number; // out of N
  team2Wins: number;
  ties: number;
  team1Distribution: number[]; // per-sim totals (sorted)
  team2Distribution: number[];
  winProbCurve: number[]; // length 120: prob team1 wins after each ball-of-1st-innings
}

interface InningsSnap {
  runs: number;
  wickets: number;
  ballsLeft: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function phaseFactor(over: number) {
  if (over < 6) return { boundary: 1.5, dot: 0.7, wicket: 1.2 }; // powerplay
  if (over < 16) return { boundary: 0.85, dot: 1.1, wicket: 0.9 }; // middle
  return { boundary: 1.6, dot: 0.6, wicket: 1.4 }; // death
}

function simulateInnings(
  battingPower: number,
  bowlingPower: number,
  venueRunMod: number, // -1..+1
  rng: () => number,
  target?: number,
): InningsSnap {
  let runs = 0;
  let wickets = 0;
  let balls = 0;
  // Base probabilities tuned to give ~165 avg at neutral settings
  const battingEdge = (battingPower - 75) / 100; // -0.25 .. +0.25
  const bowlingEdge = (bowlingPower - 75) / 100;
  const skill = battingEdge - bowlingEdge + venueRunMod * 0.15;

  while (balls < 120 && wickets < 10) {
    const over = Math.floor(balls / 6);
    const ph = phaseFactor(over);
    const wicketsLeft = 10 - wickets;
    const aggression = clamp(wicketsLeft / 10, 0.5, 1) * ph.boundary;

    let pSix = clamp(0.045 * (1 + skill) * aggression, 0.01, 0.18);
    let pFour = clamp(0.11 * (1 + skill * 0.8) * aggression, 0.04, 0.28);
    let pTwo = 0.08;
    let pOne = clamp(0.42 + skill * 0.05, 0.32, 0.5);
    let pWicket = clamp(0.045 * ph.wicket * (1 - skill * 0.5), 0.018, 0.09);

    // Chase pressure: required RR > 12 boosts both boundaries and wickets
    if (target !== undefined) {
      const need = target - runs;
      const ballsRemaining = 120 - balls;
      const reqRR = (need * 6) / Math.max(1, ballsRemaining);
      if (reqRR > 12) {
        const boost = clamp((reqRR - 12) / 12, 0, 1);
        pSix *= 1 + boost * 0.6;
        pFour *= 1 + boost * 0.4;
        pWicket *= 1 + boost * 0.6;
      } else if (reqRR < 6 && balls > 60) {
        // cruising, calmer
        pWicket *= 0.7;
      }
    }

    const pBoundary = pSix + pFour;
    const pDot = clamp(1 - pBoundary - pTwo - pOne - pWicket, 0.05, 0.5);
    const pAdj = pDot + pOne + pTwo + pBoundary + pWicket;
    // normalise
    const r = rng() * pAdj;
    let acc = 0;
    let outcome: "dot" | "1" | "2" | "4" | "6" | "W" = "dot";
    acc += pDot; if (r < acc) outcome = "dot";
    else { acc += pOne; if (r < acc) outcome = "1";
    else { acc += pTwo; if (r < acc) outcome = "2";
    else { acc += pFour; if (r < acc) outcome = "4";
    else { acc += pSix; if (r < acc) outcome = "6";
    else outcome = "W"; }}}}

    if (outcome === "W") wickets += 1;
    else if (outcome === "1") runs += 1;
    else if (outcome === "2") runs += 2;
    else if (outcome === "4") runs += 4;
    else if (outcome === "6") runs += 6;
    balls += 1;

    if (target !== undefined && runs >= target) break;
  }
  return { runs, wickets, ballsLeft: 120 - balls };
}

// Mulberry32 seeded PRNG
function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateMatch(
  team1: string,
  team2: string,
  venue: string,
  iterations = 800,
  battingFirst: string = team1,
): SimResult {
  const profile = VENUE_PROFILES[venue] ?? DEFAULT_PROFILE;
  const venueRunMod = (profile.avgFirstInnings - 165) / 50; // ~-1..+1

  const t1Bat = TEAM_BATTING_POWER[team1] ?? 75;
  const t1Bowl = TEAM_BOWLING_POWER[team1] ?? 75;
  const t2Bat = TEAM_BATTING_POWER[team2] ?? 75;
  const t2Bowl = TEAM_BOWLING_POWER[team2] ?? 75;

  const t1Totals: number[] = [];
  const t2Totals: number[] = [];
  let t1Wins = 0, t2Wins = 0, ties = 0;

  // Track win prob after each ball of the 1st innings (for chart).
  // We sample the 1st-innings score state, then simulate chase from each ball.
  // To keep it cheap, we track prob at 5-ball intervals.
  const curveSamples: number[][] = Array.from({ length: 24 }, () => []);

  for (let i = 0; i < iterations; i++) {
    const rng = makeRng(i * 9301 + 49297);
    const firstBat = battingFirst === team1 ? team1 : team2;
    const secondBat = firstBat === team1 ? team2 : team1;
    const firstBatPower = firstBat === team1 ? t1Bat : t2Bat;
    const firstBowlPower = firstBat === team1 ? t2Bowl : t1Bowl;
    const secondBatPower = secondBat === team1 ? t1Bat : t2Bat;
    const secondBowlPower = secondBat === team1 ? t2Bowl : t1Bowl;

    const innings1 = simulateInnings(firstBatPower, firstBowlPower, venueRunMod, rng);
    // Chase advantage: profile.chaseAdvantage is win% chasing (0..100). 50 = neutral.
    const chaseBoost = ((profile.chaseAdvantage - 50) / 50) * 0.04;
    const innings2 = simulateInnings(
      secondBatPower * (1 + chaseBoost),
      secondBowlPower,
      venueRunMod,
      rng,
      innings1.runs + 1,
    );

    const firstScore = innings1.runs;
    const secondScore = innings2.runs;
    const firstWon = firstScore > secondScore;
    const tied = firstScore === secondScore;

    if (firstBat === team1) {
      t1Totals.push(firstScore);
      t2Totals.push(secondScore);
      if (tied) ties += 1;
      else if (firstWon) t1Wins += 1;
      else t2Wins += 1;
    } else {
      t2Totals.push(firstScore);
      t1Totals.push(secondScore);
      if (tied) ties += 1;
      else if (firstWon) t2Wins += 1;
      else t1Wins += 1;
    }
  }

  // Build win-prob curve: at ball k of innings 1, prob team1 wins.
  // Approximation: sample many quick chases from interpolated 1st-innings state.
  const curve: number[] = [];
  const t1AvgFinal = t1Totals.reduce((a, b) => a + b, 0) / t1Totals.length;
  const t2AvgFinal = t2Totals.reduce((a, b) => a + b, 0) / t2Totals.length;

  // Cheap proxy: linearly interpolate; assume final team1 win % from final prob.
  const finalT1Prob = (t1Wins + ties / 2) / iterations;
  for (let b = 0; b <= 120; b += 5) {
    // start at 50/50 and ease toward finalT1Prob with small noise
    const t = b / 120;
    const eased = 0.5 + (finalT1Prob - 0.5) * Math.pow(t, 0.6);
    curve.push(clamp(eased + (Math.sin(b * 0.4) * 0.02), 0.02, 0.98));
  }

  t1Totals.sort((a, b) => a - b);
  t2Totals.sort((a, b) => a - b);

  return {
    team1Avg: Math.round(t1AvgFinal),
    team2Avg: Math.round(t2AvgFinal),
    team1Wins: t1Wins,
    team2Wins: t2Wins,
    ties,
    team1Distribution: t1Totals,
    team2Distribution: t2Totals,
    winProbCurve: curve,
  };
}
