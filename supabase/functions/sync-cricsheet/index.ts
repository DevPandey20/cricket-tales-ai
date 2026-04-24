// Sync IPL match data from Cricsheet (https://cricsheet.org)
// Downloads ipl_json.zip, parses matches newer than last sync,
// aggregates per-player batting/bowling stats, upserts into player_match_stats.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRICSHEET_URL = "https://cricsheet.org/downloads/ipl_json.zip";

interface CricsheetMatch {
  info: {
    dates: string[];
    venue?: string;
    city?: string;
    teams: string[];
    season?: string | number;
    event?: { name?: string };
    match_type?: string;
  };
  innings: Array<{
    team: string;
    overs: Array<{
      over: number;
      deliveries: Array<{
        batter: string;
        bowler: string;
        non_striker: string;
        runs: { batter: number; extras: number; total: number };
        wickets?: Array<{ player_out: string; kind: string }>;
        extras?: Record<string, number>;
      }>;
    }>;
  }>;
}

interface PlayerAgg {
  player_name: string;
  own_team: string;
  opponent: string;
  runs: number;
  balls: number;
  wickets: number;
  balls_bowled: number;
  runs_conceded: number;
  venue: string;
  city: string;
  match_date: string;
  season: string;
  match_id: string;
}

function aggregateMatch(matchId: string, m: CricsheetMatch): PlayerAgg[] {
  const date = m.info.dates[0];
  const venue = m.info.venue ?? "Unknown";
  const city = m.info.city ?? "";
  const season = String(m.info.season ?? new Date(date).getFullYear());
  const teams = m.info.teams;
  if (teams.length !== 2) return [];

  const players = new Map<string, PlayerAgg>();
  const ensure = (name: string, team: string): PlayerAgg => {
    const key = `${name}__${team}`;
    let p = players.get(key);
    if (!p) {
      const opp = teams[0] === team ? teams[1] : teams[0];
      p = {
        player_name: name,
        own_team: team,
        opponent: opp,
        runs: 0,
        balls: 0,
        wickets: 0,
        balls_bowled: 0,
        runs_conceded: 0,
        venue,
        city,
        match_date: date,
        season,
        match_id: matchId,
      };
      players.set(key, p);
    }
    return p;
  };

  for (const inn of m.innings) {
    const battingTeam = inn.team;
    const bowlingTeam = teams[0] === battingTeam ? teams[1] : teams[0];
    for (const over of inn.overs ?? []) {
      for (const d of over.deliveries ?? []) {
        const batter = ensure(d.batter, battingTeam);
        batter.runs += d.runs.batter;
        // Count legal deliveries faced (no wides)
        const isWide = d.extras && (d.extras as any).wides;
        if (!isWide) batter.balls += 1;

        const bowler = ensure(d.bowler, bowlingTeam);
        // Runs conceded (exclude byes/legbyes/penalty per cricket convention)
        const ext = d.extras ?? {};
        const conceded =
          d.runs.batter +
          ((ext as any).wides ?? 0) +
          ((ext as any).noballs ?? 0);
        bowler.runs_conceded += conceded;
        const isNoBall = (ext as any).noballs;
        if (!isWide && !isNoBall) bowler.balls_bowled += 1;

        for (const w of d.wickets ?? []) {
          // Bowler doesn't get credit for run outs
          if (w.kind !== "run out" && w.kind !== "retired hurt" && w.kind !== "obstructing the field") {
            bowler.wickets += 1;
          }
        }
      }
    }
  }

  return Array.from(players.values());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Get last sync date
    const { data: state } = await supabase
      .from("sync_state")
      .select("last_synced_date")
      .eq("key", "cricsheet_ipl")
      .maybeSingle();

    const lastDate = state?.last_synced_date
      ? new Date(state.last_synced_date)
      : new Date("1900-01-01");

    console.log(`Last sync date: ${lastDate.toISOString()}`);

    // Download zip
    console.log("Downloading Cricsheet zip...");
    const resp = await fetch(CRICSHEET_URL);
    if (!resp.ok) throw new Error(`Cricsheet fetch failed: ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    console.log(`Downloaded ${buf.length} bytes`);

    const files = unzipSync(buf, {
      filter: (f) => f.name.endsWith(".json") && !f.name.includes("README"),
    });

    let newMatches = 0;
    let newRows = 0;
    let newestDate = lastDate;
    const fileNames = Object.keys(files);
    console.log(`Found ${fileNames.length} match files`);

    for (const name of fileNames) {
      let match: CricsheetMatch;
      try {
        match = JSON.parse(strFromU8(files[name]));
      } catch {
        continue;
      }
      const matchId = name.replace(/\.json$/, "").split("/").pop()!;
      const dateStr = match.info?.dates?.[0];
      if (!dateStr) continue;
      const matchDate = new Date(dateStr);
      if (matchDate <= lastDate) continue;
      if (match.info.match_type && match.info.match_type !== "T20") continue;

      const aggs = aggregateMatch(matchId, match);
      if (aggs.length === 0) continue;

      const rows = aggs.map((a) => ({
        match_id: a.match_id,
        player_name: a.player_name,
        own_team: a.own_team,
        opponent: a.opponent,
        runs: a.runs,
        balls: a.balls,
        wickets: a.wickets,
        overs_bowled: Math.floor(a.balls_bowled / 6) + (a.balls_bowled % 6) / 10,
        runs_conceded: a.runs_conceded,
        economy:
          a.balls_bowled > 0 ? (a.runs_conceded / a.balls_bowled) * 6 : null,
        venue: a.venue,
        city: a.city,
        match_date: a.match_date,
        season: a.season,
      }));

      const { error } = await supabase
        .from("player_match_stats")
        .upsert(rows, { onConflict: "match_id,player_name" });
      if (error) {
        console.error(`Upsert failed for ${matchId}:`, error.message);
        continue;
      }

      newMatches += 1;
      newRows += rows.length;
      if (matchDate > newestDate) newestDate = matchDate;
    }

    // Update sync state
    await supabase.from("sync_state").upsert({
      key: "cricsheet_ipl",
      last_synced_date: newestDate.toISOString().slice(0, 10),
      last_run_at: new Date().toISOString(),
      matches_synced: newMatches,
      notes: `Synced ${newMatches} new matches, ${newRows} player rows`,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        new_matches: newMatches,
        new_player_rows: newRows,
        newest_match_date: newestDate.toISOString().slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Sync failed:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
