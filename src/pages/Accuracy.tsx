import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { triggerSync } from "@/lib/live-player-stats";
import { toast } from "@/hooks/use-toast";
import { Target, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

interface PredictionRow {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  player_name: string | null;
  predicted_winner: string;
  win_probability: number;
  predicted_player_runs: number | null;
  predicted_player_wickets: number | null;
  confidence: number;
  match_date: string | null;
  actual_winner: string | null;
  actual_player_runs: number | null;
  actual_player_wickets: number | null;
  winner_correct: boolean | null;
  runs_error: number | null;
  graded_at: string | null;
  created_at: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const Accuracy = () => {
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadRows = async () => {
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as PredictionRow[]) ?? []);
  };

  const loadSyncState = async () => {
    const { data } = await supabase
      .from("sync_state")
      .select("last_synced_date")
      .eq("key", "cricsheet_ipl")
      .maybeSingle();
    if (data?.last_synced_date) setLastSync(data.last_synced_date);
  };

  const runSync = async (silent = false) => {
    setSyncing(true);
    const res = await triggerSync();
    setSyncing(false);
    if (res.ok) {
      if (!silent) {
        toast({
          title: "Sync complete",
          description: `Pulled ${res.newMatches} new match${res.newMatches === 1 ? "" : "es"}. Predictions re-graded.`,
        });
      }
      await Promise.all([loadRows(), loadSyncState()]);
    } else if (!silent) {
      toast({ title: "Sync failed", description: res.error, variant: "destructive" });
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadRows(), loadSyncState()]);
      setLoading(false);
    })();
  }, []);

  // Auto-sync on first visit if last sync is older than today (covers grading)
  useEffect(() => {
    if (loading) return;
    if (!lastSync) return;
    if (lastSync < todayStr()) {
      // background sync, don't toast unless user wants
      runSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lastSync]);

  const stats = useMemo(() => {
    const graded = rows.filter((r) => r.graded_at);
    const correct = graded.filter((r) => r.winner_correct === true);
    const winnerHitRate = graded.length > 0 ? Math.round((correct.length / graded.length) * 100) : 0;

    const runsErrors = graded.filter((r) => r.runs_error !== null).map((r) => r.runs_error!);
    const avgRunsErr = runsErrors.length > 0
      ? Math.round(runsErrors.reduce((a, b) => a + b, 0) / runsErrors.length)
      : 0;

    const highConfHits = graded.filter((r) => r.confidence >= 75 && r.winner_correct).length;
    const highConfTotal = graded.filter((r) => r.confidence >= 75).length;
    const highConfRate = highConfTotal > 0 ? Math.round((highConfHits / highConfTotal) * 100) : 0;

    return {
      total: rows.length,
      graded: graded.length,
      pending: rows.length - graded.length,
      winnerHitRate,
      avgRunsErr,
      highConfRate,
      highConfTotal,
    };
  }, [rows]);

  // Status text per row: explains "Pending" more clearly
  const rowStatus = (r: PredictionRow): { label: string; tone: "muted" | "wait" | "win" | "loss" } => {
    if (r.winner_correct === true) return { label: "Correct", tone: "win" };
    if (r.winner_correct === false) return { label: "Wrong", tone: "loss" };
    if (r.match_date && r.match_date > todayStr()) return { label: "Match upcoming", tone: "muted" };
    if (lastSync && r.match_date && r.match_date > lastSync) return { label: "Awaiting sync", tone: "wait" };
    return { label: "Awaiting data", tone: "wait" };
  };

  return (
    <PageLayout
      title="Accuracy Dashboard"
      subtitle="Every prediction is saved and graded once the match data syncs from Cricsheet. Public scoreboard, no cherry-picking."
    >
      {/* Sync banner */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="font-semibold">Latest synced match: {lastSync ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              Predictions for matches after this date show "Awaiting sync". Click below to refresh.
            </div>
          </div>
          <Button onClick={() => runSync(false)} disabled={syncing} size="sm" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing & grading…" : "Sync now & grade"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard icon={Target} label="Total Predictions" value={stats.total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Winner Hit Rate" value={stats.winnerHitRate} suffix="%" tone="success" sub={`${stats.graded} graded`} />
        <StatCard icon={Target} label="High-Confidence (75%+)" value={stats.highConfRate} suffix="%" tone="primary" sub={`${stats.highConfTotal} of ${stats.graded}`} />
        <StatCard icon={Clock} label="Avg Runs Error" value={stats.avgRunsErr} tone="muted" sub="actual vs predicted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No predictions yet. Head to the Predictor and make one — it'll show up here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Predicted</TableHead>
                    <TableHead className="text-center">Conf</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r) => {
                    const status = rowStatus(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.team1.split(" ").pop()} vs {r.team2.split(" ").pop()}</div>
                          <div className="text-muted-foreground">{r.venue.split(",")[0]}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{r.predicted_winner.split(" ").pop()}</div>
                          <div className="text-xs text-muted-foreground">{r.win_probability}%</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{r.confidence}%</Badge>
                        </TableCell>
                        <TableCell>
                          {r.actual_winner ? (
                            <span className="text-sm font-semibold">{r.actual_winner.split(" ").pop()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{status.label}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {status.tone === "win" ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                          ) : status.tone === "loss" ? (
                            <XCircle className="mx-auto h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {r.match_date ?? new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  tone: "primary" | "success" | "muted";
  sub?: string;
}

const StatCard = ({ icon: Icon, label, value, suffix, tone, sub }: StatCardProps) => {
  const toneClass = tone === "primary" ? "border-primary/30 bg-primary/5 text-primary"
    : tone === "success" ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400"
    : "bg-muted/40";
  return (
    <Card className={`border-2 ${toneClass}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums">
          <AnimatedCounter value={value} suffix={suffix ?? ""} />
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
};

export default Accuracy;
