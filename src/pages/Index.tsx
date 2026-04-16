import { useState } from "react";
import { IPL_TEAMS, AVAILABLE_PLAYERS, getPlayerStats, getPrediction, type MatchStat, type Prediction } from "@/lib/ipl-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PredictionCard from "@/components/PredictionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [player, setPlayer] = useState("");
  const [stats, setStats] = useState<MatchStat[] | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handlePredict = () => {
    if (!team1 || !team2 || !player.trim()) return;
    setLoading(true);
    setNotFound(false);
    setTimeout(() => {
      const playerStats = getPlayerStats(player);
      setStats(playerStats);
      setNotFound(!playerStats);
      setPrediction(getPrediction(team1, team2, player));
      setLoading(false);
    }, 800);
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
            Real ball-by-ball stats from Cricsheet • Pick two teams and a player
          </p>
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
              disabled={!team1 || !team2 || !player.trim() || loading}
            >
              {loading ? "Analyzing..." : "🏏 Predict Match"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {prediction && (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          <PredictionCard
            prediction={prediction}
            team1={team1}
            team2={team2}
            player={player}
            notFound={notFound}
          />

          {/* Last 5 Matches Table */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl tracking-wide">
                  {player.toUpperCase()} — LAST 5 IPL MATCHES
                </CardTitle>
                <p className="text-sm text-muted-foreground">Real data from Cricsheet (cricsheet.org)</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>vs</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Balls</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead className="text-right">Season</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{s.match}</TableCell>
                        <TableCell>{s.opponent}</TableCell>
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
                <p className="text-sm text-muted-foreground mt-2">Available players: {AVAILABLE_PLAYERS.join(", ")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
