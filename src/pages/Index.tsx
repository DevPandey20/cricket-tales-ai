import { useEffect, useState } from "react";
import { IPL_TEAMS, AVAILABLE_PLAYERS, IPL_VENUES, getPrediction, type MatchStat, type Prediction } from "@/lib/ipl-data";
import { getLivePlayerStats, triggerSync } from "@/lib/live-player-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamTotalPredictor } from "@/components/TeamTotalPredictor";
import { PageLayout } from "@/components/PageLayout";
import { WinProbGauge } from "@/components/WinProbGauge";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PlayerInput } from "@/components/PlayerInput";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const Index = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [venue, setVenue] = useState("");
  const [player, setPlayer] = useState("");
  const [stats, setStats] = useState<MatchStat[] | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("sync_state")
      .select("last_synced_date")
      .eq("key", "cricsheet_ipl")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.last_synced_date) setLastSync(data.last_synced_date);
      });
  }, []);

  const handlePredict = async () => {
    if (!team1 || !team2 || !venue || !player.trim()) return;
    setLoading(true);
    setNotFound(false);
    const playerStats = await getLivePlayerStats(player);
    setStats(playerStats);
    setNotFound(!playerStats);
    const pred = getPrediction(team1, team2, player, venue, playerStats);
    setPrediction(pred);
    setLoading(false);

    // Save the prediction (fire-and-forget; powers the Accuracy dashboard)
    supabase.from("predictions").insert({
      team1, team2, venue,
      player_name: player.trim(),
      predicted_winner: pred.winner,
      win_probability: pred.winProbability,
      predicted_player_runs: pred.playerRuns,
      predicted_player_wickets: pred.playerWickets,
      confidence: pred.confidence,
      match_date: new Date().toISOString().slice(0, 10),
    }).then(({ error }) => {
      if (error) console.warn("Could not save prediction:", error.message);
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await triggerSync();
    setSyncing(false);
    if (res.ok) {
      toast({
        title: "Sync complete",
        description: `Pulled ${res.newMatches} new match${res.newMatches === 1 ? "" : "es"} from Cricsheet.`,
      });
      const { data } = await supabase
        .from("sync_state")
        .select("last_synced_date")
        .eq("key", "cricsheet_ipl")
        .maybeSingle();
      if (data?.last_synced_date) setLastSync(data.last_synced_date);
      if (stats && player.trim()) {
        const fresh = await getLivePlayerStats(player);
        setStats(fresh);
        if (fresh && team1 && team2 && venue) {
          setPrediction(getPrediction(team1, team2, player, venue, fresh));
        }
      }
    } else {
      toast({
        title: "Sync failed",
        description: res.error ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  const team2Options = IPL_TEAMS.filter((t) => t !== team1);
  // Derive team-1 win % from prediction (it stores winProbability for the predicted winner)
  const team1Pct = prediction
    ? (prediction.winner === team1 ? prediction.winProbability : 100 - prediction.winProbability)
    : 50;

  // Build a small "form curve" of recent runs for the chart
  const recentChart = stats && stats.length > 0
    ? stats.slice(0, 10).reverse().map((s, i) => ({
        idx: i + 1,
        runs: s.runs,
        opp: s.opponent.split(" ").pop(),
      }))
    : [];

  return (
    <PageLayout>
      {/* Hero */}
      <div className="relative -mx-4 -mt-8 mb-6 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-4 py-12">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(35 95% 55%) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(150 60% 40%) 0%, transparent 50%)"
        }} />
        <div className="relative mx-auto max-w-3xl text-center text-primary-foreground">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">IPL EDGE</h1>
          <p className="mt-2 text-primary-foreground/80">
            Real ball-by-ball stats from Cricsheet • Auto-syncs after every match
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing Cricsheet..." : "Sync Now"}
            </Button>
            {lastSync && (
              <span className="text-xs text-primary-foreground/70">Latest in DB: {lastSync}</span>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto mb-8 max-w-3xl">
        <Card className="border-dashed">
          <CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold">👋 New here? Three steps:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Pick two teams + venue + a player below</li>
                <li>Hit <em>Predict Match</em> for an instant forecast</li>
                <li>Use the top nav to explore Simulator, Matchups, Fantasy XI & more</li>
              </ol>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">All numbers are real.</p>
              <p className="mt-1">
                Powered by every IPL ball ever bowled (Cricsheet). Predictions are saved to the
                public <strong>Accuracy</strong> page so you can see how often we're right.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl">
        <Card className="shadow-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Team 1">
                <Select value={team1} onValueChange={(v) => { setTeam1(v); if (v === team2) setTeam2(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {IPL_TEAMS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Team 2">
                <Select value={team2} onValueChange={setTeam2}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {team2Options.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Venue">
              <Select value={venue} onValueChange={setVenue}>
                <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                <SelectContent>
                  {IPL_VENUES.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Player Name">
              <PlayerInput
                placeholder="e.g. Virat Kohli, Jasprit Bumrah, Rohit Sharma..."
                value={player}
                onChange={setPlayer}
              />
            </Field>
            <Button
              className="w-full text-lg font-semibold py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handlePredict}
              disabled={!team1 || !team2 || !venue || !player.trim() || loading}>
              {loading ? "Analyzing..." : "🏏 Predict Match"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-3xl py-10 space-y-6"
        >
          <Card className="border-2 border-secondary/50 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
              <h2 className="text-2xl font-bold text-primary-foreground tracking-wide">AI PREDICTION</h2>
            </div>
            <CardContent className="pt-6 space-y-6">
              <WinProbGauge team1={team1} team2={team2} team1Pct={team1Pct} />
              <div className="text-center">
                <p className="text-muted-foreground text-sm uppercase tracking-wider">Predicted Winner</p>
                <h3 className="text-3xl font-bold text-accent">{prediction.winner}</h3>
                <Badge variant="secondary" className="mt-2 text-base px-4 py-1">
                  {prediction.confidence}% confidence
                </Badge>
              </div>
              {!notFound && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Predicted Runs</p>
                    <p className="text-4xl font-bold mt-1 tabular-nums">
                      <AnimatedCounter value={prediction.playerRuns} />
                    </p>
                    <p className="text-xs text-muted-foreground">{player}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Predicted Wickets</p>
                    <p className="text-4xl font-bold mt-1 tabular-nums">
                      <AnimatedCounter value={prediction.playerWickets} />
                    </p>
                    <p className="text-xs text-muted-foreground">{player}</p>
                  </div>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground italic">{prediction.reasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent form chart */}
          {recentChart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{player} — Last {recentChart.length} Innings (runs)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={recentChart}>
                    <defs>
                      <linearGradient id="recentG" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="opp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="runs" stroke="url(#recentG)" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {prediction.factors && prediction.factors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl tracking-wide">PREDICTION FACTORS</CardTitle>
                <p className="text-sm text-muted-foreground">What went into this forecast</p>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {prediction.factors.map((f, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 gap-4">
                      <span className="text-sm text-muted-foreground">{f.label}</span>
                      <span className="text-sm font-semibold text-right">{f.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl tracking-wide">{player.toUpperCase()} — RECENT IPL MATCHES</CardTitle>
                <p className="text-sm text-muted-foreground">Real data from Cricsheet (cricsheet.org)</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>vs</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Balls</TableHead>
                      <TableHead className="text-right">Wkts</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead className="text-right">Season</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.slice(0, 8).map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.opponent}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.venue.split(",")[0]}</TableCell>
                        <TableCell className="text-right font-semibold">{s.runs}</TableCell>
                        <TableCell className="text-right">{s.balls}</TableCell>
                        <TableCell className="text-right font-semibold">{s.wickets}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">{s.date}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.season === "IPL 2026" ? "default" : "secondary"} className="text-xs">{s.season}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {notFound && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <p className="text-destructive font-semibold">Player not found in database.</p>
                <p className="text-sm text-muted-foreground mt-2">Team-only prediction shown above. Try a name from the suggestions as you type.</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <div className="mx-auto max-w-5xl mt-12 pt-10 border-t">
        <TeamTotalPredictor />
      </div>
    </PageLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

export default Index;
