// Sync IPL match data from Cricsheet (https://cricsheet.org)
// - Downloads ipl_json.zip
// - Aggregates per-player batting/bowling stats -> player_match_stats
// - Stores every legal delivery -> ball_by_ball (for true H2H matchups)
// - Grades any pending predictions whose match has now completed

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
    outcome?: { winner?: string; result?: string };
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

interface BallRow {
  match_id: string;
  innings: number;
  over_num: number;
  batter: string;
  bowler: string;
  non_striker: string | null;
  batter_team: string;
  bowler_team: string;
  runs_batter: number;
  runs_extras: number;
  runs_total: number;
  is_wicket: boolean;
  dismissal_kind: string | null;
  player_out: string | null;
  venue: string;
  match_date: string;
  season: string;
}

const teamKey = (name: string) =>
  name.toLowerCase().replace(/\b(bengaluru|bangalore)\b/g, "rcb-city").replace(/[^a-z0-9]/g, "");

const sameTeam = (a: string, b: string) => teamKey(a) === teamKey(b);

function nameVariants(name: string): string[] {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
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

function namesLikelyMatch(input: string, actual: string): boolean {
  const inKey = input.toLowerCase().replace(/[^a-z]/g, "");
  const actualKey = actual.toLowerCase().replace(/[^a-z]/g, "");
  if (inKey === actualKey) return true;
  return nameVariants(input).some((v) =>
    actual.toLowerCase() === v.toLowerCase() ||
    actualKey === v.toLowerCase().replace(/[^a-z]/g, "") ||
    actual.toLowerCase().includes(v.toLowerCase()),
  );
}

const daysBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

function aggregateMatch(matchId: string, m: CricsheetMatch): {
  aggs: PlayerAgg[];
  balls: BallRow[];
} {
  const date = m.info.dates[0];
  const venue = m.info.venue ?? "Unknown";
  const city = m.info.city ?? "";
  const season = String(m.info.season ?? new Date(date).getFullYear());
  const teams = m.info.teams;
  if (teams.length !== 2) return { aggs: [], balls: [] };

  const players = new Map<string, PlayerAgg>();
  const balls: BallRow[] = [];
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

  m.innings.forEach((inn, innIdx) => {
    const battingTeam = inn.team;
    const bowlingTeam = teams[0] === battingTeam ? teams[1] : teams[0];
    for (const over of inn.overs ?? []) {
      let ballInOver = 0;
      for (const d of over.deliveries ?? []) {
        const batter = ensure(d.batter, battingTeam);
        batter.runs += d.runs.batter;
        const ext = d.extras ?? {};
        const isWide = (ext as any).wides;
        const isNoBall = (ext as any).noballs;
        if (!isWide) batter.balls += 1;

        const bowler = ensure(d.bowler, bowlingTeam);
        const conceded =
          d.runs.batter +
          ((ext as any).wides ?? 0) +
          ((ext as any).noballs ?? 0);
        bowler.runs_conceded += conceded;
        if (!isWide && !isNoBall) bowler.balls_bowled += 1;

        let isWicket = false;
        let dismissalKind: string | null = null;
        let playerOut: string | null = null;
        for (const w of d.wickets ?? []) {
          isWicket = true;
          dismissalKind = w.kind;
          playerOut = w.player_out;
          if (
            w.kind !== "run out" &&
            w.kind !== "retired hurt" &&
            w.kind !== "obstructing the field"
          ) {
            bowler.wickets += 1;
          }
        }

        if (!isWide) ballInOver += 1;
        balls.push({
          match_id: matchId,
          innings: innIdx + 1,
          over_num: over.over + ballInOver / 10,
          batter: d.batter,
          bowler: d.bowler,
          non_striker: d.non_striker ?? null,
          batter_team: battingTeam,
          bowler_team: bowlingTeam,
          runs_batter: d.runs.batter,
          runs_extras: d.runs.extras,
          runs_total: d.runs.total,
          is_wicket: isWicket,
          dismissal_kind: dismissalKind,
          player_out: playerOut,
          venue,
          match_date: date,
          season,
        });
      }
    }
  });

  return { aggs: Array.from(players.values()), balls };
}

// Grade any pending predictions whose match has now been synced.
async function gradePredictions(supabase: any) {
  const { data: pending } = await supabase
    .from("predictions")
    .select("*")
    .is("graded_at", null)
    .not("match_date", "is", null);
  if (!pending || pending.length === 0) return 0;

  let graded = 0;
  for (const p of pending) {
    const predictionDate = p.match_date as string;
    const from = new Date(new Date(predictionDate).getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date(new Date(predictionDate).getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const { data: resultRows } = await supabase
      .from("match_results")
      .select("match_id, match_date, team1, team2, winner")
      .gte("match_date", from)
      .lte("match_date", to)
      .not("winner", "is", null)
      .order("match_date", { ascending: true });
    const result = (resultRows ?? []).find((r: any) =>
      ((sameTeam(r.team1, p.team1) && sameTeam(r.team2, p.team2)) ||
        (sameTeam(r.team1, p.team2) && sameTeam(r.team2, p.team1))) &&
      daysBetween(predictionDate, r.match_date) <= 7,
    );
    if (!result) continue;

    const matchId = result.match_id;
    const actualWinner = sameTeam(result.winner, p.team1) ? p.team1 : sameTeam(result.winner, p.team2) ? p.team2 : result.winner;

    // Player actuals
    let actualRuns: number | null = null;
    let actualWkts: number | null = null;
    if (p.player_name) {
      const { data: playerRows } = await supabase
        .from("player_match_stats")
        .select("player_name, runs, wickets")
        .eq("match_id", matchId)
        .limit(80);
      const pRow = (playerRows ?? []).find((r: any) => namesLikelyMatch(p.player_name, r.player_name));
      if (pRow) {
        actualRuns = pRow.runs;
        actualWkts = pRow.wickets;
      }
    }

    await supabase
      .from("predictions")
      .update({
        actual_winner: actualWinner,
        actual_player_runs: actualRuns,
        actual_player_wickets: actualWkts,
        winner_correct: actualWinner === p.predicted_winner,
        runs_error:
          actualRuns !== null && p.predicted_player_runs !== null
            ? Math.abs(actualRuns - p.predicted_player_runs)
            : null,
        wickets_error:
          actualWkts !== null && p.predicted_player_wickets !== null
            ? Math.abs(actualWkts - p.predicted_player_wickets)
            : null,
        graded_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    graded += 1;
  }
  return graded;
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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const forceRecent = Boolean(body?.force);
    const { data: state } = await supabase
      .from("sync_state")
      .select("last_synced_date")
      .eq("key", "cricsheet_ipl")
      .maybeSingle();

    const storedLastDate = state?.last_synced_date
      ? new Date(state.last_synced_date)
      : new Date("1900-01-01");
    const lastDate = forceRecent
      ? new Date(Date.now() - 75 * 86_400_000)
      : storedLastDate;

    console.log(`Last sync date: ${lastDate.toISOString()} force=${forceRecent}`);
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
    let newBalls = 0;
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

      await supabase.from("match_results").upsert({
        match_id: matchId,
        match_date: dateStr,
        season: String(match.info.season ?? new Date(dateStr).getFullYear()),
        venue: match.info.venue ?? "Unknown",
        city: match.info.city ?? "",
        team1: match.info.teams?.[0] ?? "Unknown",
        team2: match.info.teams?.[1] ?? "Unknown",
        winner: match.info.outcome?.winner ?? null,
        result: match.info.outcome?.result ?? null,
        synced_at: new Date().toISOString(),
      });

      const { aggs, balls } = aggregateMatch(matchId, match);
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

      // Insert balls in chunks (avoid huge payloads)
      await supabase.from("ball_by_ball").delete().eq("match_id", matchId);
      const CHUNK = 500;
      for (let i = 0; i < balls.length; i += CHUNK) {
        const slice = balls.slice(i, i + CHUNK);
        const { error: bErr } = await supabase
          .from("ball_by_ball")
          .insert(slice);
        if (bErr) console.error(`Ball insert failed for ${matchId}:`, bErr.message);
        else newBalls += slice.length;
      }

      newMatches += 1;
      newRows += rows.length;
      if (matchDate > newestDate) newestDate = matchDate;
    }

    const gradedCount = await gradePredictions(supabase);

    await supabase.from("sync_state").upsert({
      key: "cricsheet_ipl",
      last_synced_date: newestDate.toISOString().slice(0, 10),
      last_run_at: new Date().toISOString(),
      matches_synced: newMatches,
      notes: `Synced ${newMatches} matches, ${newRows} player rows, ${newBalls} balls, ${gradedCount} predictions graded`,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        new_matches: newMatches,
        new_player_rows: newRows,
        new_balls: newBalls,
        graded_predictions: gradedCount,
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
