import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PlayerInput } from "@/components/PlayerInput";
import { Swords, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface BallRow {
  runs_batter: number;
  runs_extras: number;
  is_wicket: boolean;
  dismissal_kind: string | null;
  player_out: string | null;
  match_date: string;
  season: string;
  venue: string;
}

interface MatchupSummary {
  balls: number;
  runs: number;
  dismissals: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;
  average: number;
  bySeason: { season: string; runs: number; balls: number; dismissals: number }[];
}

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

function summarise(rows: BallRow[]): MatchupSummary {
  let balls = 0, runs = 0, dismissals = 0, fours = 0, sixes = 0, dots = 0;
  const bySeasonMap = new Map<string, { runs: number; balls: number; dismissals: number }>();
  for (const r of rows) {
    balls += 1;
    runs += r.runs_batter;
    if (r.runs_batter === 4) fours += 1;
    if (r.runs_batter === 6) sixes += 1;
    if (r.runs_batter === 0 && r.runs_extras === 0) dots += 1;
    if (r.is_wicket && r.dismissal_kind && !["run out", "retired hurt", "obstructing the field"].includes(r.dismissal_kind)) {
      dismissals += 1;
    }
    const s = bySeasonMap.get(r.season) ?? { runs: 0, balls: 0, dismissals: 0 };
    s.runs += r.runs_batter;
    s.balls += 1;
    if (r.is_wicket) s.dismissals += 1;
    bySeasonMap.set(r.season, s);
  }
  return {
    balls, runs, dismissals, fours, sixes, dots,
    strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
    average: dismissals > 0 ? runs / dismissals : runs,
    bySeason: Array.from(bySeasonMap.entries())
      .map(([season, v]) => ({ season, ...v }))
      .sort((a, b) => a.season.localeCompare(b.season)),
  };
}

const Matchups = () => {
  const [batter, setBatter] = useState("");
  const [bowler, setBowler] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MatchupSummary | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!batter.trim() || !bowler.trim()) return;
    setLoading(true);
    setSearched(true);
    const bV = nameVariants(batter);
    const bowV = nameVariants(bowler);
    const { data, error } = await supabase
      .from("ball_by_ball")
      .select("runs_batter, runs_extras, is_wicket, dismissal_kind, player_out, match_date, season, venue")
      .in("batter", bV)
      .in("bowler", bowV)
      .order("match_date", { ascending: false })
      .limit(2000);
    setLoading(false);
    if (error || !data || data.length === 0) {
      setSummary(null);
      return;
    }
    setSummary(summarise(data as BallRow[]));
  };

  return (
    <PageLayout
      title="Player vs Player Matchups"
      subtitle="True ball-by-ball head-to-head stats. Powered by every IPL delivery in the database."
    >
      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_auto_1fr_auto]">
          <PlayerInput
            label="Batter"
            value={batter}
            onChange={setBatter}
            placeholder="e.g. Virat Kohli or V Kohli"
          />
          <div className="hidden items-center md:flex">
            <Swords className="h-6 w-6 text-muted-foreground" />
          </div>
          <PlayerInput
            label="Bowler"
            value={bowler}
            onChange={setBowler}
            placeholder="e.g. Jasprit Bumrah or JJ Bumrah"
          />
          <div className="flex items-end">
            <Button onClick={search} disabled={!batter.trim() || !bowler.trim() || loading} className="w-full md:w-auto">
              {loading ? "Searching..." : "Compare"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && !summary && !loading && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No ball-by-ball data found for this pairing yet. Try syncing from the Predictor page,
              or use the Cricsheet name format (e.g. "V Kohli", "JJ Bumrah").
            </p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{batter} vs {bowler}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <BigStat label="Balls Faced" value={summary.balls} />
                <BigStat label="Runs Scored" value={summary.runs} accent />
                <BigStat label="Dismissals" value={summary.dismissals} muted />
                <BigStat label="Strike Rate" value={Math.round(summary.strikeRate)} suffix="" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <Mini label="4s" value={summary.fours} />
                <Mini label="6s" value={summary.sixes} />
                <Mini label="Dots" value={summary.dots} />
              </div>
              <div className="mt-4 rounded-lg bg-muted/40 p-4 text-sm">
                <span className="font-semibold">Average:</span>{" "}
                {summary.dismissals > 0 ? summary.average.toFixed(1) : `${summary.runs}* (not out)`}
                {" — "}
                <span className="text-muted-foreground">
                  {summary.dismissals === 0
                    ? `${bowler} has never dismissed ${batter}.`
                    : summary.strikeRate > 140
                    ? `${batter} has dominated this matchup.`
                    : summary.strikeRate < 110 && summary.dismissals > 1
                    ? `${bowler} has the upper hand.`
                    : "Closely matched contest."}
                </span>
              </div>
            </CardContent>
          </Card>

          {summary.bySeason.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Season-by-season</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.bySeason}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="season" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="runs" fill="hsl(var(--primary))" name="Runs" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dismissals" fill="hsl(var(--accent))" name="Dismissals" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageLayout>
  );
};

const BigStat = ({ label, value, accent, muted, suffix }: { label: string; value: number; accent?: boolean; muted?: boolean; suffix?: string }) => (
  <div className={`rounded-lg border p-4 text-center ${accent ? "border-accent/30 bg-accent/5" : muted ? "bg-muted/40" : "border-primary/30 bg-primary/5"}`}>
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`mt-1 text-3xl font-bold tabular-nums ${accent ? "text-accent" : muted ? "" : "text-primary"}`}>
      <AnimatedCounter value={value} suffix={suffix} />
    </div>
  </div>
);

const Mini = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-muted/30 p-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{value}</div>
  </div>
);

export default Matchups;
