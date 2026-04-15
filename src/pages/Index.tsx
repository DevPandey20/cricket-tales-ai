import { useState } from "react";
import { IPL_TEAMS, getPlayerStats, getPrediction, type MatchStat, type Prediction } from "@/lib/ipl-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [player, setPlayer] = useState("");
  const [stats, setStats] = useState<MatchStat[] | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = () => {
    if (!team1 || !team2 || !player.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setStats(getPlayerStats(player));
      setPrediction(getPrediction(team1, team2, player));
      setLoading(false);
    }, 1200);
  };

  const team2Options = IPL_TEAMS.filter((t) => t !== team1);

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
            Pick two teams and a player — get AI-powered match & performance predictions
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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Player Name</label>
              <Input
                placeholder="e.g. Virat Kohli, Jasprit Bumrah, Rohit Sharma..."
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
              />
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
      {stats && prediction && (
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
                <Badge variant="outline" className="text-base px-4 py-1">
                  {prediction.winProbability}% win probability
                </Badge>
              </div>
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
              <div className="bg-muted/50 rounded-lg p-4 mt-2">
                <p className="text-sm text-muted-foreground italic">{prediction.reasoning}</p>
              </div>
            </CardContent>
          </Card>

          {/* Last 5 Matches Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-wide">
                {player.toUpperCase()} — LAST 5 MATCHES
              </CardTitle>
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
                      <TableCell className="font-medium">{s.match}</TableCell>
                      <TableCell>{s.opponent}</TableCell>
                      <TableCell className="text-right font-semibold">{s.runs}</TableCell>
                      <TableCell className="text-right">{s.balls}</TableCell>
                      <TableCell className="text-right font-semibold">{s.wickets}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">{s.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;
