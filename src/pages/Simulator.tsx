import { useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IPL_TEAMS, IPL_VENUES, getPrediction } from "@/lib/ipl-data";
import { simulateMatch, type SimResult } from "@/lib/match-simulator";
import { getLivePlayerStats } from "@/lib/live-player-stats";
import { WinProbGauge } from "@/components/WinProbGauge";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PlayerInput } from "@/components/PlayerInput";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Activity, User } from "lucide-react";

const Simulator = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [venue, setVenue] = useState("");
  const [battingFirst, setBattingFirst] = useState("");
  const [iterations, setIterations] = useState(800);
  const [focusPlayer, setFocusPlayer] = useState("");
  const [playerProj, setPlayerProj] = useState<{ name: string; runs: number; wickets: number; confidence: number } | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);

  const team2Options = IPL_TEAMS.filter((t) => t !== team1);
  const battingOptions = team1 && team2 ? [team1, team2] : [];

  const canRun = team1 && team2 && venue && battingFirst;

  const run = async () => {
    if (!canRun) return;
    setRunning(true);
    setPlayerProj(null);
    // tiny defer so spinner shows
    await new Promise((r) => setTimeout(r, 30));
    const r = simulateMatch(team1, team2, venue, iterations, battingFirst);
    setResult(r);
    if (focusPlayer.trim()) {
      const stats = await getLivePlayerStats(focusPlayer);
      const pred = getPrediction(team1, team2, focusPlayer, venue, stats);
      setPlayerProj({
        name: focusPlayer.trim(),
        runs: pred.playerRuns,
        wickets: pred.playerWickets,
        confidence: pred.confidence,
      });
    }
    setRunning(false);
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.winProbCurve.map((p, i) => ({
      ball: i * 5,
      team1: Math.round(p * 100),
      team2: Math.round((1 - p) * 100),
    }));
  }, [result]);

  const distData = useMemo(() => {
    if (!result) return [];
    // Build 10-run buckets from both distributions
    const buckets: Record<number, { score: number; team1: number; team2: number }> = {};
    const bucket = (score: number) => Math.floor(score / 10) * 10;
    for (const s of result.team1Distribution) {
      const b = bucket(s);
      if (!buckets[b]) buckets[b] = { score: b, team1: 0, team2: 0 };
      buckets[b].team1 += 1;
    }
    for (const s of result.team2Distribution) {
      const b = bucket(s);
      if (!buckets[b]) buckets[b] = { score: b, team1: 0, team2: 0 };
      buckets[b].team2 += 1;
    }
    return Object.values(buckets).sort((a, b) => a.score - b.score);
  }, [result]);

  const team1WinPct = result
    ? Math.round((result.team1Wins / (result.team1Wins + result.team2Wins + result.ties)) * 100)
    : 50;

  return (
    <PageLayout
      title="Live Match Simulator"
      subtitle="Monte Carlo ball-by-ball: simulates 800+ versions of the match using team strength, venue, and phase-aware modelling."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Match Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Team 1">
              <Select value={team1} onValueChange={(v) => { setTeam1(v); if (v === team2) setTeam2(""); if (v === battingFirst) setBattingFirst(""); }}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {IPL_TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Team 2">
              <Select value={team2} onValueChange={(v) => { setTeam2(v); if (v === battingFirst && v !== team1) {} }}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {team2Options.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Venue">
              <Select value={venue} onValueChange={setVenue}>
                <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                <SelectContent>
                  {IPL_VENUES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Batting First">
              <Select value={battingFirst} onValueChange={setBattingFirst}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {battingOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Simulations: ${iterations}`}>
              <input
                type="range"
                min={200}
                max={2000}
                step={100}
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </Field>
            <PlayerInput
              label="Project a player"
              optional
              value={focusPlayer}
              onChange={setFocusPlayer}
              placeholder="e.g. Virat Kohli"
            />
            <Button onClick={run} disabled={!canRun || running} className="w-full">
              {running ? "Simulating..." : `Run ${iterations} simulations`}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {!result && (
            <Card className="flex h-[400px] items-center justify-center text-center">
              <div>
                <Activity className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">Pick a match-up and run a simulation.</p>
              </div>
            </Card>
          )}
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Win Probability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <WinProbGauge team1={team1} team2={team2} team1Pct={team1WinPct} />
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat label={team1} value={result.team1Wins} />
                    <Stat label="Ties" value={result.ties} muted />
                    <Stat label={team2} value={result.team2Wins} accent />
                  </div>
                </CardContent>
              </Card>

              {playerProj && (
                <Card className="border-2 border-accent/30 bg-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4 text-accent" />
                      Projection — {playerProj.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Runs</div>
                      <div className="text-2xl font-bold tabular-nums text-accent">
                        <AnimatedCounter value={playerProj.runs} />
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Wickets</div>
                      <div className="text-2xl font-bold tabular-nums text-accent">
                        <AnimatedCounter value={playerProj.wickets} />
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
                      <div className="text-2xl font-bold tabular-nums text-accent">
                        <AnimatedCounter value={playerProj.confidence} suffix="%" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Predicted Avg Score</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ScoreLine team={team1} avg={result.team1Avg} dist={result.team1Distribution} color="primary" />
                    <ScoreLine team={team2} avg={result.team2Avg} dist={result.team2Distribution} color="accent" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Win Probability Curve</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="t1g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="ball" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Ball of innings 1", position: "insideBottom", offset: -2, fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number, n: string) => [`${v}%`, n === "team1" ? team1 : team2]}
                        />
                        <Area type="monotone" dataKey="team1" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#t1g)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Score Distribution (across {iterations} sims)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={distData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="score" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="team1" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={team1} />
                      <Line type="monotone" dataKey="team2" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name={team2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Stat = ({ label, value, accent, muted }: { label: string; value: number; accent?: boolean; muted?: boolean }) => (
  <div className={`rounded-lg border p-3 ${accent ? "border-accent/30 bg-accent/5" : muted ? "bg-muted/40" : "border-primary/30 bg-primary/5"}`}>
    <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">{label}</div>
    <div className={`text-2xl font-bold tabular-nums ${accent ? "text-accent" : muted ? "" : "text-primary"}`}>
      <AnimatedCounter value={value} />
    </div>
  </div>
);

const ScoreLine = ({ team, avg, dist, color }: { team: string; avg: number; dist: number[]; color: "primary" | "accent" }) => {
  const lo = dist[Math.floor(dist.length * 0.1)] ?? avg;
  const hi = dist[Math.floor(dist.length * 0.9)] ?? avg;
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{team}</span>
        <span className={`text-3xl font-bold tabular-nums ${color === "primary" ? "text-primary" : "text-accent"}`}>
          <AnimatedCounter value={avg} />
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Range: <Badge variant="outline" className="text-xs">{lo}–{hi}</Badge>
      </div>
    </div>
  );
};

export default Simulator;
