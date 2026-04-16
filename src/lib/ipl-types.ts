export interface MatchStat {
  match: string;
  opponent: string;
  runs: number;
  balls: number;
  wickets: number;
  economy?: number;
  date: string;
  season: string;
}

export interface Prediction {
  winner: string;
  winProbability: number;
  playerRuns: number;
  playerWickets: number;
  confidence: number;
  reasoning: string;
  tossWinner: string;
  tossDecision: "bat" | "bowl";
  playerOfTheMatch: string;
  topScorerTeam1: { name: string; runs: number };
  topScorerTeam2: { name: string; runs: number };
  topWicketTakerTeam1: { name: string; wickets: number };
  topWicketTakerTeam2: { name: string; wickets: number };
  predictedScoreTeam1: number;
  predictedScoreTeam2: number;
}

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
