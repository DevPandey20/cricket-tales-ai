import { useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IPL_TEAMS, IPL_VENUES } from "@/lib/ipl-data";
import { buildFantasyXI, type FantasyPlayer } from "@/lib/fantasy-optimizer";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PlayerInput } from "@/components/PlayerInput";
import { Star, Trophy, UserCheck } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { WK: "Keeper", BAT: "Batter", BOWL: "Bowler", AR: "All-rounder" };
const ROLE_TONE: Record<string, string> = {
  WK: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  BAT: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  BOWL: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  AR: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

const Fantasy = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [venue, setVenue] = useState("");
  const [budget, setBudget] = useState(100);
  const [focusPlayer, setFocusPlayer] = useState("");
  const [result, setResult] = useState<ReturnType<typeof buildFantasyXI> | null>(null);

  const team2Options = IPL_TEAMS.filter((t) => t !== team1);
  const canRun = team1 && team2 && venue;

  const run = () => {
    if (!canRun) return;
    setResult(buildFantasyXI(team1, team2, venue, budget));
  };

  const captainCandidates = useMemo(() => {
    if (!result) return [];
    return [...result.picks].sort((a, b) => b.projectedPoints - a.projectedPoints).slice(0, 2);
  }, [result]);

  return (
    <PageLayout
      title="Fantasy XI Optimizer"
      subtitle="Builds an optimal 11 within budget using projected points (recent form + venue + opposition matchup)."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Star className="h-5 w-5" /> Match Setup</CardTitle></CardHeader>
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
            <Field label={`Budget: ${budget} credits`}>
              <input
                type="range"
                min={85}
                max={110}
                step={1}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </Field>
            <Button onClick={run} disabled={!canRun} className="w-full">
              Build Optimal XI
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!result && (
            <Card className="flex h-[400px] items-center justify-center text-center">
              <div>
                <Star className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">Pick teams and venue to build your XI.</p>
              </div>
            </Card>
          )}
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recommended XI</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{result.budgetUsed} / {budget} cr</Badge>
                      <Badge className="bg-primary text-primary-foreground">
                        <AnimatedCounter value={result.totalProjected} /> projected pts
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.picks.map((p, i) => (
                      <PlayerCard key={p.name} player={p} isCaptain={i === 0 && captainCandidates[0]?.name === p.name} isVc={captainCandidates[1]?.name === p.name} />
                    ))}
                  </div>
                  {result.picks.length < 11 && (
                    <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                      Only {result.picks.length} players selected — try increasing the budget.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Captain Picks</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {captainCandidates.map((c, i) => (
                    <div key={c.name} className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-primary text-primary-foreground">{i === 0 ? "C — 2x" : "VC — 1.5x"}</Badge>
                        <span className="text-2xl font-bold tabular-nums text-primary">
                          <AnimatedCounter value={c.projectedPoints} /> pts
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.team}</p>
                      <p className="mt-2 text-xs text-muted-foreground italic">{c.reasoning}</p>
                    </div>
                  ))}
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

const PlayerCard = ({ player, isCaptain, isVc }: { player: FantasyPlayer; isCaptain?: boolean; isVc?: boolean }) => (
  <div className="flex items-center justify-between rounded-lg border bg-card p-3">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold">{player.name}</span>
        {isCaptain && <Badge className="h-5 bg-primary px-1.5 text-[10px]">C</Badge>}
        {isVc && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">VC</Badge>}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${ROLE_TONE[player.role]}`}>
          {ROLE_LABEL[player.role]}
        </Badge>
        <span className="truncate text-xs text-muted-foreground">{player.team}</span>
      </div>
    </div>
    <div className="ml-3 text-right">
      <div className="text-lg font-bold tabular-nums text-primary">{player.projectedPoints}</div>
      <div className="text-[10px] text-muted-foreground">{player.credits} cr</div>
    </div>
  </div>
);

export default Fantasy;
