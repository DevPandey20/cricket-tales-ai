import { supabase } from "@/integrations/supabase/client";
import type { MatchStat } from "./ipl-types";
import { getPlayerStats as getHardcodedStats } from "./ipl-data";

// Try to find the player in our DB using fuzzy-ish name matching.
// Cricsheet uses "V Kohli" style names while our hardcoded DB uses "Virat Kohli".
function nameVariants(name: string): string[] {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  const variants = new Set<string>([trimmed]);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const firstInitial = parts[0][0];
    variants.add(`${firstInitial} ${last}`);
    variants.add(`${firstInitial}${last}`);
    variants.add(last);
  }
  return Array.from(variants);
}

interface DbRow {
  player_name: string;
  own_team: string;
  opponent: string;
  runs: number;
  balls: number;
  wickets: number;
  economy: number | null;
  venue: string;
  city: string;
  match_date: string;
  season: string;
}

function rowToStat(r: DbRow): MatchStat {
  return {
    match: `${r.own_team} vs ${r.opponent}`,
    opponent: r.opponent,
    ownTeam: r.own_team,
    runs: r.runs,
    balls: r.balls,
    wickets: r.wickets,
    economy: r.economy ?? undefined,
    venue: r.venue,
    city: r.city,
    date: r.match_date,
    season: r.season,
  };
}

/**
 * Returns combined stats (live DB + hardcoded), newest first, deduped.
 * Falls back gracefully if the DB query fails or returns nothing.
 *
 * Behaviour for "recent form":
 *  - Cricsheet rows take priority because they include the latest matches.
 *  - If the player has < 5 current-season matches, older matches (from DB or
 *    hardcoded fallback) are used to fill the form window — implemented
 *    naturally by sorting all matches by date desc.
 */
export async function getLivePlayerStats(
  playerName: string,
): Promise<MatchStat[] | null> {
  const variants = nameVariants(playerName);

  // Search DB by all name variants
  let dbStats: MatchStat[] = [];
  try {
    const { data, error } = await supabase
      .from("player_match_stats")
      .select(
        "player_name, own_team, opponent, runs, balls, wickets, economy, venue, city, match_date, season",
      )
      .in("player_name", variants)
      .order("match_date", { ascending: false })
      .limit(60);
    if (!error && data) dbStats = (data as DbRow[]).map(rowToStat);
  } catch (e) {
    console.warn("Live stats fetch failed, falling back to hardcoded:", e);
  }

  const hardcoded = getHardcodedStats(playerName) ?? [];

  // Merge & dedupe by date+opponent
  const seen = new Set<string>();
  const merged: MatchStat[] = [];
  for (const s of [...dbStats, ...hardcoded]) {
    const key = `${s.date}__${s.opponent}__${s.runs}_${s.wickets}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  merged.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (merged.length === 0) return null;
  return merged;
}

export async function triggerSync(): Promise<{
  ok: boolean;
  newMatches?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("sync-cricsheet", {
      body: {},
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, newMatches: data?.new_matches ?? 0 };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
