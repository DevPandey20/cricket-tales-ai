export const IPL_TEAMS = [
  "Chennai Super Kings",
  "Mumbai Indians",
  "Royal Challengers Bengaluru",
  "Kolkata Knight Riders",
  "Rajasthan Royals",
  "Delhi Capitals",
  "Sunrisers Hyderabad",
  "Punjab Kings",
  "Gujarat Titans",
  "Lucknow Super Giants",
] as const;

export type IPLTeam = (typeof IPL_TEAMS)[number];

export interface MatchStat {
  match: string;
  opponent: string;
  runs: number;
  balls: number;
  wickets: number;
  economy?: number;
  date: string;
}

export interface Prediction {
  winner: string;
  winProbability: number;
  playerRuns: number;
  playerWickets: number;
  confidence: number;
  reasoning: string;
}

const PLAYER_STATS: Record<string, MatchStat[]> = {
  "Virat Kohli": [
    { match: "Match 42", opponent: "MI", runs: 82, balls: 49, wickets: 0, date: "2025-04-10" },
    { match: "Match 38", opponent: "CSK", runs: 23, balls: 20, wickets: 0, date: "2025-04-06" },
    { match: "Match 31", opponent: "RR", runs: 61, balls: 44, wickets: 0, date: "2025-03-30" },
    { match: "Match 25", opponent: "DC", runs: 100, balls: 58, wickets: 0, date: "2025-03-24" },
    { match: "Match 18", opponent: "SRH", runs: 47, balls: 35, wickets: 0, date: "2025-03-18" },
  ],
  "Jasprit Bumrah": [
    { match: "Match 41", opponent: "RCB", runs: 5, balls: 8, wickets: 3, economy: 6.5, date: "2025-04-09" },
    { match: "Match 36", opponent: "KKR", runs: 2, balls: 4, wickets: 2, economy: 7.0, date: "2025-04-04" },
    { match: "Match 29", opponent: "GT", runs: 12, balls: 10, wickets: 4, economy: 5.8, date: "2025-03-28" },
    { match: "Match 22", opponent: "PBKS", runs: 0, balls: 2, wickets: 1, economy: 8.2, date: "2025-03-21" },
    { match: "Match 15", opponent: "LSG", runs: 8, balls: 6, wickets: 2, economy: 7.5, date: "2025-03-15" },
  ],
  "MS Dhoni": [
    { match: "Match 40", opponent: "RCB", runs: 38, balls: 18, wickets: 0, date: "2025-04-08" },
    { match: "Match 35", opponent: "MI", runs: 12, balls: 10, wickets: 0, date: "2025-04-03" },
    { match: "Match 28", opponent: "DC", runs: 45, balls: 22, wickets: 0, date: "2025-03-27" },
    { match: "Match 21", opponent: "SRH", runs: 28, balls: 15, wickets: 0, date: "2025-03-20" },
    { match: "Match 14", opponent: "KKR", runs: 55, balls: 30, wickets: 0, date: "2025-03-14" },
  ],
  "Rashid Khan": [
    { match: "Match 43", opponent: "CSK", runs: 18, balls: 12, wickets: 2, economy: 6.0, date: "2025-04-11" },
    { match: "Match 37", opponent: "PBKS", runs: 5, balls: 4, wickets: 3, economy: 5.5, date: "2025-04-05" },
    { match: "Match 30", opponent: "MI", runs: 22, balls: 14, wickets: 1, economy: 7.8, date: "2025-03-29" },
    { match: "Match 24", opponent: "RR", runs: 10, balls: 8, wickets: 2, economy: 6.2, date: "2025-03-23" },
    { match: "Match 17", opponent: "DC", runs: 0, balls: 2, wickets: 4, economy: 4.5, date: "2025-03-17" },
  ],
  "Rohit Sharma": [
    { match: "Match 44", opponent: "GT", runs: 72, balls: 48, wickets: 0, date: "2025-04-12" },
    { match: "Match 39", opponent: "LSG", runs: 34, balls: 28, wickets: 0, date: "2025-04-07" },
    { match: "Match 33", opponent: "RCB", runs: 56, balls: 38, wickets: 0, date: "2025-04-01" },
    { match: "Match 26", opponent: "SRH", runs: 88, balls: 52, wickets: 0, date: "2025-03-25" },
    { match: "Match 19", opponent: "CSK", runs: 15, balls: 14, wickets: 0, date: "2025-03-19" },
  ],
};

const DEFAULT_STATS: MatchStat[] = [
  { match: "Match 40", opponent: "TBD", runs: 35, balls: 28, wickets: 1, date: "2025-04-08" },
  { match: "Match 34", opponent: "TBD", runs: 22, balls: 18, wickets: 0, date: "2025-04-02" },
  { match: "Match 27", opponent: "TBD", runs: 48, balls: 36, wickets: 0, date: "2025-03-26" },
  { match: "Match 20", opponent: "TBD", runs: 11, balls: 12, wickets: 2, date: "2025-03-20" },
  { match: "Match 13", opponent: "TBD", runs: 60, balls: 42, wickets: 0, date: "2025-03-13" },
];

export function getPlayerStats(playerName: string): MatchStat[] {
  const key = Object.keys(PLAYER_STATS).find(
    (k) => k.toLowerCase() === playerName.trim().toLowerCase()
  );
  return key ? PLAYER_STATS[key] : DEFAULT_STATS;
}

export function getPrediction(team1: string, team2: string, player: string): Prediction {
  // Deterministic mock prediction based on inputs
  const seed = (team1 + team2 + player).length;
  const winnerIdx = seed % 2;
  const winner = winnerIdx === 0 ? team1 : team2;
  const stats = getPlayerStats(player);
  const avgRuns = Math.round(stats.reduce((s, m) => s + m.runs, 0) / stats.length);
  const avgWickets = Math.round(stats.reduce((s, m) => s + m.wickets, 0) / stats.length);

  return {
    winner,
    winProbability: 52 + (seed % 30),
    playerRuns: avgRuns + ((seed * 3) % 15) - 5,
    playerWickets: Math.max(0, avgWickets + ((seed * 2) % 3) - 1),
    confidence: 60 + (seed % 25),
    reasoning: `Based on recent form analysis, head-to-head records, and ${player}'s last 5 performances, our model predicts ${winner} will edge this contest. ${player} is expected to play a key role.`,
  };
}
