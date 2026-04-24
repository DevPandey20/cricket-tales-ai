import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IPL_TEAMS, IPL_VENUES, AVAILABLE_PLAYERS, getPrediction } from "@/lib/ipl-data";
import { getLivePlayerStats } from "@/lib/live-player-stats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Preview = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [venue, setVenue] = useState("");
  const [player, setPlayer] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ winner: string; prob: number } | null>(null);

  const team2Options = IPL_TEAMS.filter((t) => t !== team1);
  const suggestions = player.trim().length >= 2
    ? AVAILABLE_PLAYERS.filter((p) => p.toLowerCase().includes(player.trim().toLowerCase())).slice(0, 6)
    : [];
  const canRun = team1 && team2 && venue;

  const generate = async () => {
    if (!canRun) return;
    setLoading(true);
    setCommentary(null);
    try {
      const stats = player.trim() ? await getLivePlayerStats(player) : null;
      const pred = getPrediction(team1, team2, player.trim() || "—", venue, stats);
      setMeta({ winner: pred.winner, prob: pred.winProbability });

      const { data, error } = await supabase.functions.invoke("match-commentary", {
        body: {
          team1, team2, venue,
          predictedWinner: pred.winner,
          winProbability: pred.winProbability,
          player: player.trim() || undefined,
          predictedRuns: pred.playerRuns,
          predictedWickets: pred.playerWickets,
          factors: pred.factors,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCommentary(data.commentary);
    } catch (e) {
      toast({
        title: "Couldn't generate preview",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="AI Match Preview"
      subtitle="A Star Sports-style preview written by AI from your match data."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5" /> Match Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Team 1">
              <Select value={team1} onValueChange={(v) => { setTeam1(v); if (v === team2) setTeam2(""); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{IPL_TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Team 2">
              <Select value={team2} onValueChange={setTeam2}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{team2Options.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Venue">
              <Select value={venue} onValueChange={setVenue}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{IPL_VENUES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Player to watch (optional)">
              <Input placeholder="e.g. Virat Kohli" value={player} onChange={(e) => setPlayer(e.target.value)} />
              {suggestions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {suggestions.map((s) => (
                    <Badge key={s} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => setPlayer(s)}>
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </Field>
            <Button onClick={generate} disabled={!canRun || loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate AI Preview"}
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary via-primary/90 to-accent/80 px-6 py-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">AI Match Preview</span>
            </div>
            {meta && (
              <p className="mt-1 text-2xl font-bold">
                {meta.winner} favoured — {meta.prob}%
              </p>
            )}
          </div>
          <CardContent className="pt-6">
            {!commentary && !loading && (
              <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
                <div>
                  <Sparkles className="mx-auto h-12 w-12 opacity-40" />
                  <p className="mt-3">Set up the match and click <span className="font-semibold">Generate</span>.</p>
                </div>
              </div>
            )}
            {loading && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${100 - i * 10}%` }} />
                ))}
              </div>
            )}
            {commentary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="prose prose-sm max-w-none dark:prose-invert"
              >
                {commentary.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="text-base leading-relaxed text-foreground">{para}</p>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
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

export default Preview;
