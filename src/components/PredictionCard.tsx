import { type Prediction } from "@/lib/ipl-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PredictionCardProps {
  prediction: Prediction;
  team1: string;
  team2: string;
  player: string;
  notFound: boolean;
}

const PredictionCard = ({ prediction, team1, team2, player, notFound }: PredictionCardProps) => {
  return (
    <Card className="border-2 border-secondary/50 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
        <h2 className="text-2xl font-bold text-primary-foreground tracking-wide">🏏 AI PREDICTION</h2>
      </div>
      <CardContent className="pt-6 space-y-6">
        {/* Winner */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Predicted Winner</p>
          <h3 className="text-3xl font-bold text-accent">{prediction.winner}</h3>
          <Badge variant="outline" className="text-base px-4 py-1">
            {prediction.winProbability}% win probability
          </Badge>
        </div>

        {/* Toss & POTM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">🪙 Toss Winner</p>
            <p className="text-lg font-bold mt-1">{prediction.tossWinner}</p>
            <p className="text-xs text-muted-foreground">Opts to {prediction.tossDecision} first</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">⭐ Player of the Match</p>
            <p className="text-lg font-bold mt-1">{prediction.playerOfTheMatch}</p>
          </div>
        </div>

        {/* Predicted Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{team1}</p>
            <p className="text-3xl font-bold mt-1">{prediction.predictedScoreTeam1}</p>
            <p className="text-xs text-muted-foreground">Predicted Score</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{team2}</p>
            <p className="text-3xl font-bold mt-1">{prediction.predictedScoreTeam2}</p>
            <p className="text-xs text-muted-foreground">Predicted Score</p>
          </div>
        </div>

        {/* Top Scorers */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">🏏 Top Run Scorers</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">{team1}</p>
              <p className="font-bold">{prediction.topScorerTeam1.name}</p>
              <p className="text-2xl font-bold text-accent">{prediction.topScorerTeam1.runs} runs</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">{team2}</p>
              <p className="font-bold">{prediction.topScorerTeam2.name}</p>
              <p className="text-2xl font-bold text-accent">{prediction.topScorerTeam2.runs} runs</p>
            </div>
          </div>
        </div>

        {/* Top Wicket Takers */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">🎯 Top Wicket Takers</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">{team1}</p>
              <p className="font-bold">{prediction.topWicketTakerTeam1.name}</p>
              <p className="text-2xl font-bold text-accent">{prediction.topWicketTakerTeam1.wickets} wkts</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">{team2}</p>
              <p className="font-bold">{prediction.topWicketTakerTeam2.name}</p>
              <p className="text-2xl font-bold text-accent">{prediction.topWicketTakerTeam2.wickets} wkts</p>
            </div>
          </div>
        </div>

        {/* Selected Player Stats */}
        {!notFound && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Predicted Runs</p>
              <p className="text-4xl font-bold mt-1">{prediction.playerRuns}</p>
              <p className="text-xs text-muted-foreground">{player}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Predicted Wickets</p>
              <p className="text-4xl font-bold mt-1">{prediction.playerWickets}</p>
              <p className="text-xs text-muted-foreground">{player}</p>
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground italic">{prediction.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionCard;
