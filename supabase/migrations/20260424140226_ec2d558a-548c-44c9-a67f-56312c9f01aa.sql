-- =========================================
-- 1. Ball-by-ball table for true matchups
-- =========================================
CREATE TABLE public.ball_by_ball (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  innings INTEGER NOT NULL,
  over_num NUMERIC(4,1) NOT NULL,
  batter TEXT NOT NULL,
  bowler TEXT NOT NULL,
  non_striker TEXT,
  batter_team TEXT NOT NULL,
  bowler_team TEXT NOT NULL,
  runs_batter INTEGER NOT NULL DEFAULT 0,
  runs_extras INTEGER NOT NULL DEFAULT 0,
  runs_total INTEGER NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  dismissal_kind TEXT,
  player_out TEXT,
  venue TEXT NOT NULL,
  match_date DATE NOT NULL,
  season TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bbb_batter ON public.ball_by_ball(batter);
CREATE INDEX idx_bbb_bowler ON public.ball_by_ball(bowler);
CREATE INDEX idx_bbb_pair ON public.ball_by_ball(batter, bowler);
CREATE INDEX idx_bbb_match ON public.ball_by_ball(match_id);
CREATE INDEX idx_bbb_date ON public.ball_by_ball(match_date DESC);

ALTER TABLE public.ball_by_ball ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ball-by-ball"
  ON public.ball_by_ball FOR SELECT
  USING (true);

-- =========================================
-- 2. Predictions table for accuracy dashboard
-- =========================================
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  venue TEXT NOT NULL,
  player_name TEXT,
  predicted_winner TEXT NOT NULL,
  win_probability INTEGER NOT NULL,
  predicted_player_runs INTEGER,
  predicted_player_wickets INTEGER,
  confidence INTEGER NOT NULL,
  match_date DATE,
  -- Result fields, filled in when match completes
  actual_winner TEXT,
  actual_player_runs INTEGER,
  actual_player_wickets INTEGER,
  winner_correct BOOLEAN,
  runs_error INTEGER,
  wickets_error INTEGER,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_predictions_created ON public.predictions(created_at DESC);
CREATE INDEX idx_predictions_graded ON public.predictions(graded_at) WHERE graded_at IS NOT NULL;

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read predictions"
  ON public.predictions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can save predictions"
  ON public.predictions FOR INSERT
  WITH CHECK (true);
