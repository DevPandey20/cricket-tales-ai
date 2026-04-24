import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Target, CheckCircle2, XCircle, Clock } from "lucide-react";

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

const Accuracy = () => {
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data as PredictionRow[]) ?? []);
        setLoading(false);
      });
  }, []);

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

  return (
    <PageLayout
      title="Accuracy Dashboard"
      subtitle="Every prediction made on this app is saved and graded once the match completes. Public scoreboard, no cherry-picking."
    >
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
                  {rows.slice(0, 50).map((r) => (
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
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.winner_correct === null ? (
                          <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                        ) : r.winner_correct ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, suffix, tone, sub }: { icon: any; label: string; value: number; suffix?: string; tone: "primary" | "success" | "muted"; sub?: string }) => {
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
