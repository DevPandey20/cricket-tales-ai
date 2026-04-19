import { TEAM_MATCHES } from "./ipl-team-matches";
import {
  VENUE_PROFILES, DEFAULT_PROFILE, TEAM_BATTING_POWER, TEAM_BOWLING_POWER,
  type PitchType, type DewLevel,
} from "./ipl-venue-profiles";

export type TossChoice = "batting" | "chasing";
export type ConfidenceLevel = "Low" | "Medium" | "High";

export interface TeamTotalInput {
  team: string;
  opponent: string;
  venue: string;
  toss: TossChoice;
  pitchOverride?: PitchType;
  dewOverride?: DewLevel;
}

export interface BreakdownStep {
  label: string;
  delta: number; // signed adjustment
  note: string;
}

export interface TeamTotalPrediction {
  predictedRuns: number;
  bestCase: number;
  worstCase: number;
  confidence: ConfidenceLevel;
  pitchUsed: PitchType;
  dewUsed: DewLevel;
  inferredFromVenue: boolean;
  breakdown: BreakdownStep[];
  reasoning: string;
  assumptions: string[];
}

// Recent form proxy — last 5 results win/loss → small momentum delta
function recentMomentum(team: string): { played: number; wins: number; delta: number } {
  const games = TEAM_MATCHES.filter((m) => m.team1 === team || m.team2 === team).slice(0, 5);
  const wins = games.filter((g) => g.winner === team).length;
  if (games.length === 0) return { played: 0, wins: 0, delta: 0 };
  // -8 (0 wins) to +8 (5 wins)
  const delta = Math.round((wins / games.length - 0.5) * 16);
  return { played: games.length, wins, delta };
}

// How team has historically scored at this venue (proxy: win % at venue → score swing)
function venueComfort(team: string, venue: string): { played: number; winPct: number; delta: number } {
  const games = TEAM_MATCHES.filter(
    (m) => m.venue === venue && (m.team1 === team || m.team2 === team)
  );
  if (games.length === 0) return { played: 0, winPct: 50, delta: 0 };
  const wins = games.filter((g) => g.winner === team).length;
  const winPct = (wins / games.length) * 100;
  // 0% → -8, 50% → 0, 100% → +8
  const delta = Math.round((winPct - 50) / 50 * 8);
  return { played: games.length, winPct: Math.round(winPct), delta };
}

export function predictTeamTotal(input: TeamTotalInput): TeamTotalPrediction {
  const profile = VENUE_PROFILES[input.venue] ?? DEFAULT_PROFILE;
  const pitch = input.pitchOverride ?? profile.pitch;
  const dew = input.dewOverride ?? profile.dew;
  const inferredFromVenue = !input.pitchOverride && !input.dewOverride;

  const battingPower = TEAM_BATTING_POWER[input.team] ?? 80;
  const oppBowlingPower = TEAM_BOWLING_POWER[input.opponent] ?? 80;

  const breakdown: BreakdownStep[] = [];
  const assumptions: string[] = [];

  // Step 1 — Base score: blend venue avg first-innings with team batting power
  // Strong batting team gets a +/- shift around venue avg.
  const battingShift = Math.round((battingPower - 80) * 0.6); // -ve weak, +ve strong
  let total = profile.avgFirstInnings + battingShift;
  breakdown.push({
    label: "Base score (venue avg + team batting)",
    delta: total,
    note: `${profile.avgFirstInnings} venue avg ${battingShift >= 0 ? "+" : ""}${battingShift} batting power`,
  });

  // Step 2 — Ground size
  let groundDelta = 0;
  if (profile.size === "small") groundDelta = 15;
  else if (profile.size === "big") groundDelta = -15;
  if (groundDelta !== 0) {
    total += groundDelta;
    breakdown.push({
      label: "Ground size",
      delta: groundDelta,
      note: `${profile.size} ground (${groundDelta > 0 ? "boundary-friendly" : "harder to clear rope"})`,
    });
  }

  // Step 3 — Pitch
  let pitchDelta = 0;
  if (pitch === "flat") pitchDelta = 12;
  else if (pitch === "slow") pitchDelta = -12;
  else if (pitch === "spin") pitchDelta = -16;
  if (pitchDelta !== 0) {
    total += pitchDelta;
    breakdown.push({
      label: "Pitch type",
      delta: pitchDelta,
      note: `${pitch} pitch`,
    });
  }

  // Step 4 — Dew (matters mostly when chasing; helps batting in 2nd innings)
  let dewDelta = 0;
  if (input.toss === "chasing") {
    if (dew === "high") dewDelta = 15;
    else if (dew === "medium") dewDelta = 7;
  } else {
    // batting first → dew hurts opp bowlers later, but doesn't change OUR total
    if (dew === "high") dewDelta = -3; // slight psychological pressure
  }
  if (dewDelta !== 0) {
    total += dewDelta;
    breakdown.push({
      label: "Dew factor",
      delta: dewDelta,
      note: `${dew} dew, ${input.toss}`,
    });
  }

  // Step 5 — Opponent bowling strength
  // Strong bowling subtracts; weak bowling adds. Range -20 to +15.
  const bowlingDelta = Math.round((80 - oppBowlingPower) * 1.0);
  total += bowlingDelta;
  breakdown.push({
    label: "Opponent bowling",
    delta: bowlingDelta,
    note: `${input.opponent} bowling power ${oppBowlingPower}/100`,
  });

  // Step 6 — Toss / chasing advantage
  let tossDelta = 0;
  if (input.toss === "chasing" && profile.chaseAdvantage > 53) {
    tossDelta = 6;
  } else if (input.toss === "batting" && profile.chaseAdvantage < 47) {
    tossDelta = 5;
  }
  if (tossDelta !== 0) {
    total += tossDelta;
    breakdown.push({
      label: "Toss / chase bias",
      delta: tossDelta,
      note: `${input.toss} at venue with ${profile.chaseAdvantage}% chase win-rate`,
    });
  }

  // Step 7 — Recent momentum
  const momentum = recentMomentum(input.team);
  if (momentum.delta !== 0) {
    total += momentum.delta;
    breakdown.push({
      label: "Recent form (last 5)",
      delta: momentum.delta,
      note: `${momentum.wins}W/${momentum.played - momentum.wins}L`,
    });
  }

  // Step 8 — Venue comfort
  const venueRec = venueComfort(input.team, input.venue);
  if (venueRec.played > 0 && venueRec.delta !== 0) {
    total += venueRec.delta;
    breakdown.push({
      label: "Team's venue history",
      delta: venueRec.delta,
      note: `${venueRec.winPct}% win-rate (${venueRec.played} games)`,
    });
  } else if (venueRec.played === 0) {
    assumptions.push(`No prior matches for ${input.team} at this venue.`);
  }

  // Clamp to realistic IPL range
  const clamped = Math.max(120, Math.min(245, total));

  // Confidence: based on data availability + how extreme the inputs are
  let confidenceScore = 50;
  if (venueRec.played >= 3) confidenceScore += 15;
  else if (venueRec.played >= 1) confidenceScore += 7;
  if (momentum.played >= 5) confidenceScore += 10;
  if (!inferredFromVenue) confidenceScore += 10; // user supplied pitch/dew
  if (VENUE_PROFILES[input.venue]) confidenceScore += 8;
  if (Math.abs(clamped - profile.avgFirstInnings) > 35) confidenceScore -= 8;

  const confidence: ConfidenceLevel =
    confidenceScore >= 75 ? "High" : confidenceScore >= 60 ? "Medium" : "Low";

  if (inferredFromVenue) {
    assumptions.push(`Pitch (${pitch}) and dew (${dew}) inferred from venue profile. Override for sharper results.`);
  }
  if (!VENUE_PROFILES[input.venue]) {
    assumptions.push("Unknown venue — used neutral profile (avg 170, balanced pitch).");
  }

  const reasoning =
    `${input.team} ${input.toss} first at ${input.venue.split(",")[0]}. ` +
    `Started from venue avg ${profile.avgFirstInnings}, adjusted for ${pitch} pitch, ${profile.size} ground, ` +
    `${dew} dew, and ${input.opponent}'s bowling. ` +
    `${momentum.played > 0 ? `Recent form: ${momentum.wins}W in last ${momentum.played}.` : ""} ` +
    `Final projection ${clamped}.`;

  return {
    predictedRuns: clamped,
    bestCase: Math.min(245, clamped + 18),
    worstCase: Math.max(110, clamped - 22),
    confidence,
    pitchUsed: pitch,
    dewUsed: dew,
    inferredFromVenue,
    breakdown,
    reasoning,
    assumptions,
  };
}
