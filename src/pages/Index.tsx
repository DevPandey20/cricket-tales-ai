import { useEffect, useState } from "react";
import { IPL_TEAMS, AVAILABLE_PLAYERS, IPL_VENUES, getPrediction, type MatchStat, type Prediction } from "@/lib/ipl-data";
import { getLivePlayerStats, triggerSync } from "@/lib/live-player-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamTotalPredictor } from "@/components/TeamTotalPredictor";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

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
    setPrediction(getPrediction(team1, team2, player, venue, playerStats));
    setLoading(false);
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

  // Filter player suggestions
  const suggestions = player.trim().length >= 2
    ? AVAILABLE_PLAYERS.filter((p) => p.toLowerCase().includes(player.trim().toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-primary py-16 px-4">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(35 95% 55%) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(150 60% 40%) 0%, transparent 50%)"
        }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-primary-foreground md:text-6xl">
            IPL PREDICTOR
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Real ball-by-ball stats from Cricsheet • Auto-syncs after every match
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSync}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing Cricsheet..." : "Sync Now"}
            </Button>
            {lastSync && (
              <span className="text-xs text-primary-foreground/70">
                Latest match in DB: {lastSync}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 -mt-8 relative z-10">
        <Card className="shadow-xl border-0">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Team 1</label>
                <Select value={team1} onValueChange={(v) => { setTeam1(v); if (v === team2) setTeam2(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {IPL_TEAMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Team 2</label>
                <Select value={team2} onValueChange={setTeam2}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {team2Options.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Venue</label>
              <Select value={venue} onValueChange={setVenue}>
                <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                <SelectContent>
                  {IPL_VENUES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Player Name</label>
              <Input
                placeholder="e.g. Virat Kohli, Jasprit Bumrah, Rohit Sharma..."
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
              />
              {suggestions.length > 0 && suggestions.length <= 8 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setPlayer(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="w-full text-lg font-semibold py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handlePredict}
              disabled={!team1 || !team2 || !venue || !player.trim() || loading}
            >
              {loading ? "Analyzing..." : "🏏 Predict Match"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {prediction && (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          {/* Prediction Card */}
          <Card className="border-2 border-secondary/50 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
              <h2 className="text-2xl font-bold text-primary-foreground tracking-wide">AI PREDICTION</h2>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm uppercase tracking-wider">Predicted Winner</p>
                <h3 className="text-3xl font-bold text-accent">{prediction.winner}</h3>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-base px-4 py-1">
                    {prediction.winProbability}% win probability
                  </Badge>
                  <Badge variant="secondary" className="text-base px-4 py-1">
                    {prediction.confidence}% confidence
                  </Badge>
                </div>
              </div>
              {!notFound && (
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Predicted Runs</p>
                    <p className="text-4xl font-bold mt-1">{prediction.playerRuns}</p>
                    <p className="text-xs text-muted-foreground">{player}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Predicted Wickets</p>
                    <p className="text-4xl font-bold mt-1">{prediction.playerWickets}</p>
                    <p className="text-xs text-muted-foreground">{player}</p>
                  </div>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-4 mt-2">
                <p className="text-sm text-muted-foreground italic">{prediction.reasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Factors breakdown */}
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

          {/* Last 5 Matches Table */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl tracking-wide">
                  {player.toUpperCase()} — RECENT IPL MATCHES
                </CardTitle>
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
                          <Badge variant={s.season === "IPL 2026" ? "default" : "secondary"} className="text-xs">
                            {s.season}
                          </Badge>
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
        </div>
      )}

      {/* Team Total Predictor — separate section */}
      <div className="border-t mt-8 pt-10 bg-muted/30">
        <TeamTotalPredictor />
      </div>
    </div>
  );
};

export default Index;
