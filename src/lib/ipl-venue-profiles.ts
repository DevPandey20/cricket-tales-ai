// Venue profiles — pitch type, ground size, dew tendency, and historical avg first-innings score.
// Based on widely accepted IPL analyst consensus (Cricinfo / Cricbuzz pitch reports).

export type PitchType = "flat" | "slow" | "spin" | "balanced";
export type GroundSize = "small" | "medium" | "big";
export type DewLevel = "low" | "medium" | "high";

export interface VenueProfile {
  pitch: PitchType;
  size: GroundSize;
  dew: DewLevel;
  avgFirstInnings: number; // historical IPL first-innings average
  chaseAdvantage: number;  // % of matches won chasing (>50 = chase favoured)
}

export const VENUE_PROFILES: Record<string, VenueProfile> = {
  "Wankhede Stadium, Mumbai":                           { pitch: "flat",     size: "small",  dew: "high",   avgFirstInnings: 178, chaseAdvantage: 58 },
  "MA Chidambaram Stadium, Chepauk, Chennai":           { pitch: "slow",     size: "medium", dew: "low",    avgFirstInnings: 162, chaseAdvantage: 45 },
  "Narendra Modi Stadium, Ahmedabad":                   { pitch: "balanced", size: "big",    dew: "medium", avgFirstInnings: 168, chaseAdvantage: 52 },
  "Eden Gardens, Kolkata":                              { pitch: "balanced", size: "medium", dew: "high",   avgFirstInnings: 172, chaseAdvantage: 56 },
  "Arun Jaitley Stadium, Delhi":                        { pitch: "flat",     size: "medium", dew: "medium", avgFirstInnings: 175, chaseAdvantage: 54 },
  "Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium, Lucknow": { pitch: "slow", size: "medium", dew: "medium", avgFirstInnings: 165, chaseAdvantage: 48 },
  "M Chinnaswamy Stadium, Bengaluru":                   { pitch: "flat",     size: "small",  dew: "medium", avgFirstInnings: 188, chaseAdvantage: 60 },
  "Rajiv Gandhi International Stadium, Uppal, Hyderabad": { pitch: "flat",   size: "medium", dew: "medium", avgFirstInnings: 180, chaseAdvantage: 55 },
  "Dr DY Patil Sports Academy, Mumbai":                 { pitch: "flat",     size: "medium", dew: "high",   avgFirstInnings: 175, chaseAdvantage: 57 },
  "Sawai Mansingh Stadium, Jaipur":                     { pitch: "balanced", size: "medium", dew: "medium", avgFirstInnings: 170, chaseAdvantage: 53 },
  "Brabourne Stadium, Mumbai":                          { pitch: "flat",     size: "small",  dew: "high",   avgFirstInnings: 178, chaseAdvantage: 58 },
  "Maharashtra Cricket Association Stadium, Pune":      { pitch: "balanced", size: "medium", dew: "medium", avgFirstInnings: 172, chaseAdvantage: 53 },
  "Dubai International Cricket Stadium":                { pitch: "slow",     size: "big",    dew: "medium", avgFirstInnings: 158, chaseAdvantage: 50 },
  "Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur":    { pitch: "balanced", size: "medium", dew: "medium", avgFirstInnings: 170, chaseAdvantage: 52 },
  "Sharjah Cricket Stadium":                            { pitch: "slow",     size: "small",  dew: "low",    avgFirstInnings: 155, chaseAdvantage: 48 },
  "Barsapara Cricket Stadium, Guwahati":                { pitch: "flat",     size: "medium", dew: "medium", avgFirstInnings: 175, chaseAdvantage: 54 },
  "Zayed Cricket Stadium, Abu Dhabi":                   { pitch: "balanced", size: "big",    dew: "low",    avgFirstInnings: 160, chaseAdvantage: 50 },
  "Himachal Pradesh Cricket Association Stadium, Dharamsala": { pitch: "balanced", size: "medium", dew: "low", avgFirstInnings: 168, chaseAdvantage: 51 },
  "Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh": { pitch: "flat", size: "medium", dew: "medium", avgFirstInnings: 178, chaseAdvantage: 55 },
  "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium, Visakhapatnam":   { pitch: "flat", size: "medium", dew: "medium", avgFirstInnings: 172, chaseAdvantage: 54 },
  "Maharaja Yadavindra Singh International Cricket Stadium, New Chandigarh": { pitch: "balanced", size: "medium", dew: "medium", avgFirstInnings: 170, chaseAdvantage: 52 },
};

export const DEFAULT_PROFILE: VenueProfile = {
  pitch: "balanced", size: "medium", dew: "medium", avgFirstInnings: 170, chaseAdvantage: 52,
};

// Team batting power index (0-100) based on top-order + finishers strength
export const TEAM_BATTING_POWER: Record<string, number> = {
  "Mumbai Indians": 90,
  "Sunrisers Hyderabad": 92,
  "Punjab Kings": 86,
  "Royal Challengers Bengaluru": 88,
  "Kolkata Knight Riders": 84,
  "Rajasthan Royals": 87,
  "Chennai Super Kings": 82,
  "Delhi Capitals": 80,
  "Gujarat Titans": 85,
  "Lucknow Super Giants": 81,
};

// Team bowling power index (0-100)
export const TEAM_BOWLING_POWER: Record<string, number> = {
  "Mumbai Indians": 86,
  "Sunrisers Hyderabad": 80,
  "Punjab Kings": 78,
  "Royal Challengers Bengaluru": 78,
  "Kolkata Knight Riders": 84,
  "Rajasthan Royals": 82,
  "Chennai Super Kings": 83,
  "Delhi Capitals": 80,
  "Gujarat Titans": 88,
  "Lucknow Super Giants": 79,
};
