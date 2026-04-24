import { motion } from "framer-motion";

interface WinProbGaugeProps {
  team1: string;
  team2: string;
  team1Pct: number; // 0-100
}

export const WinProbGauge = ({ team1, team2, team1Pct }: WinProbGaugeProps) => {
  const t2 = 100 - team1Pct;
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold">
        <div>
          <span className="text-foreground">{team1}</span>
          <span className="ml-2 text-2xl font-bold tabular-nums text-primary">
            {team1Pct}%
          </span>
        </div>
        <div className="text-right">
          <span className="mr-2 text-2xl font-bold tabular-nums text-accent">
            {t2}%
          </span>
          <span className="text-foreground">{team2}</span>
        </div>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${team1Pct}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-accent to-accent/70"
          initial={{ width: 0 }}
          animate={{ width: `${t2}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
};
