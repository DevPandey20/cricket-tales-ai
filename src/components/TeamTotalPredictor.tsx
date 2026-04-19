import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IPL_TEAMS } from "@/lib/ipl-types";
import { IPL_VENUES } from "@/lib/ipl-venues";
import { VENUE_PROFILES, DEFAULT_PROFILE } from "@/lib/ipl-venue-profiles";
import { predictTeamTotal, type TeamTotalPrediction, type TossChoice } from "@/lib/team-total-predictor";

const PITCH_OPTIONS = ["auto", "flat", "slow", "spin", "balanced"] as const;
const DEW_OPTIONS = ["auto", "low", "medium", "high"] as const;

export const TeamTotalPredictor = () => {
  const [team, setTeam] = useState("");
  const [opponent, setOpponent] = useState("");
  const [venue, setVenue] = useState("");
  const [toss, setToss] = useState<TossChoice | "">("");
  const [pitch, setPitch] = useState<typeof PITCH_OPTIONS[number]>("auto");
  const [dew, setDew] = useState<typeof DEW_OPTIONS[number]>("auto");
  const [result, setResult] = useState<TeamTotalPrediction | null>(null);

  const opponentOptions = IPL_TEAMS.filter((t) => t !== team);
  const inferredProfile = venue ? (VENUE_PROFILES[venue] ?? DEFAULT_PROFILE) : null;

  const canPredict = team && opponent && venue && toss;

  const handlePredict = () => {
    if (!canPredict) return;
    const out = predictTeamTotal({
      team,
      opponent,
      venue,
      toss: toss as TossChoice,
      pitchOverride: pitch === "auto" ? undefined : pitch,
      dewOverride: dew === "auto" ? undefined : dew,
    });
    setResult(out);
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!team) m.push("team");
    if (!opponent) m.push("opponent");
    if (!venue) m.push("venue");
    if (!toss) m.push("toss decision");
    return m;
  }, [team, opponent, venue, toss]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 space-y-6">
      <Card className="border-2 border-accent/40 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-accent to-accent/80 px-6 py-4">
          <h2 className="text-2xl font-bold text-accent-foreground tracking-wide">
            🎯 TEAM TOTAL PREDICTOR
          </h2>
          <p className="text-sm text-accent-foreground/80 mt-1">
            Realistic T20 total runs forecast — venue, pitch, dew & matchup aware
          </p>
        </div>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Batting Team</label>
              <Select value={team} onValueChange={(v) => { setTeam(v); if (v === opponent) setOpponent(""); }}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {IPL_TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Opponent</label>
              <Select value={opponent} onValueChange={setOpponent}>
                <SelectTrigger><SelectValue placeholder="Select opponent" /></SelectTrigger>
                <SelectContent>
                  {opponentOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Venue</label>
            <Select value={venue} onValueChange={setVenue}>
              <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
              <SelectContent>
                {IPL_VENUES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Toss / Innings</label>
              <Select value={toss} onValueChange={(v) => setToss(v as TossChoice)}>
                <SelectTrigger><SelectValue placeholder="Bat or chase?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="batting">Batting first</SelectItem>
                  <SelectItem value="chasing">Chasing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Pitch {pitch === "auto" && inferredProfile && <span className="text-xs normal-case opacity-60">(auto: {inferredProfile.pitch})</span>}
              </label>
              <Select value={pitch} onValueChange={(v) => setPitch(v as typeof PITCH_OPTIONS[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PITCH_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p === "auto" ? "Auto (from venue)" : p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Dew {dew === "auto" && inferredProfile && <span className="text-xs normal-case opacity-60">(auto: {inferredProfile.dew})</span>}
              </label>
              <Select value={dew} onValueChange={(v) => setDew(v as typeof DEW_OPTIONS[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEW_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d === "auto" ? "Auto (from venue)" : d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {missing.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Smart Mode: still need <span className="font-semibold">{missing.join(", ")}</span> before predicting.
            </p>
          )}

          <Button
            className="w-full text-lg font-semibold py-6"
            onClick={handlePredict}
            disabled={!canPredict}
            variant="default"
          >
            📊 Predict Total Runs
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-2 border-secondary/50 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
            <h3 className="text-xl font-bold text-primary-foreground tracking-wide">PROJECTED TOTAL</h3>
          </div>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm uppercase tracking-wider">Predicted Runs</p>
              <p className="text-6xl font-bold text-accent">{result.predictedRuns}</p>
              <Badge variant="outline" className="text-base px-4 py-1 mt-2">
                {result.confidence} confidence
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Case</p>
                <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{result.bestCase}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Worst Case</p>
                <p className="text-3xl font-bold mt-1 text-destructive">{result.worstCase}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detailed Breakdown</h4>
              <div className="divide-y rounded-lg border">
                {result.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2.5 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{b.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.note}</p>
                    </div>
                    <span className={`text-sm font-bold whitespace-nowrap ${
                      i === 0 ? "" : b.delta > 0 ? "text-green-600 dark:text-green-400" : b.delta < 0 ? "text-destructive" : ""
                    }`}>
                      {i === 0 ? b.delta : (b.delta > 0 ? `+${b.delta}` : b.delta)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm italic text-muted-foreground">{result.reasoning}</p>
            </div>

            {result.assumptions.length > 0 && (
              <div className="border-l-4 border-accent bg-accent/10 p-3 rounded">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground mb-1">Assumptions</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {result.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
