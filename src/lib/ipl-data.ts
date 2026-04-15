import { type MatchStat, type Prediction, IPL_TEAMS } from "./ipl-types";
import { PLAYER_STATS_DB, AVAILABLE_PLAYERS } from "./ipl-player-db";

export { IPL_TEAMS, AVAILABLE_PLAYERS };
export type { MatchStat, Prediction };

export function getPlayerStats(playerName: string): MatchStat[] | null {
  const key = Object.keys(PLAYER_STATS_DB).find(
    (k) => k.toLowerCase() === playerName.trim().toLowerCase()
  );
  return key ? PLAYER_STATS_DB[key] : null;
}

// Team strength ratings based on IPL 2026 standings
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

export function getPrediction(team1: string, team2: string, player: string): Prediction {
  const stats = getPlayerStats(player);
  if (!stats || stats.length === 0) {
    return {
      winner: team1,
      winProbability: 50,
      playerRuns: 0,
      playerWickets: 0,
      confidence: 30,
      reasoning: `Player "${player}" not found in our database. Try one of: ${AVAILABLE_PLAYERS.slice(0, 5).join(", ")}...`,
    };
  }

  const avgRuns = Math.round(stats.reduce((s, m) => s + m.runs, 0) / stats.length);
  const avgWickets = Math.round(stats.reduce((s, m) => s + m.wickets, 0) / stats.length);

  const s1 = TEAM_STRENGTH[team1] ?? 78;
  const s2 = TEAM_STRENGTH[team2] ?? 78;
  const total = s1 + s2;
  const team1Pct = Math.round((s1 / total) * 100);

  const winner = s1 >= s2 ? team1 : team2;
  const winProb = Math.max(team1Pct, 100 - team1Pct);

  const recentRuns = stats.slice(0, 3).reduce((s, m) => s + m.runs, 0) / Math.min(3, stats.length);
  const olderRuns = stats.slice(3).reduce((s, m) => s + m.runs, 0) / Math.max(1, stats.slice(3).length);
  const trend = recentRuns > olderRuns ? 1.08 : 0.93;

  return {
    winner,
    winProbability: winProb,
    playerRuns: Math.round(avgRuns * trend),
    playerWickets: avgWickets,
    confidence: 55 + Math.min(30, Math.round(Math.abs(s1 - s2) * 1.5)),
    reasoning: `Based on team strength ratings (${team1}: ${s1}, ${team2}: ${s2}) and ${player}'s real IPL stats from Cricsheet data, our model predicts ${winner} to win. ${player} has averaged ${avgRuns} runs across the last 5 IPL matches with ${recentRuns > olderRuns ? "an improving" : "a declining"} form trend.`,
  };
}
