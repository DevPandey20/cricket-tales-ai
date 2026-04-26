CREATE TABLE IF NOT EXISTS public.match_results (
  match_id TEXT PRIMARY KEY,
  match_date DATE NOT NULL,
  season TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  winner TEXT,
  result TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_results'
      AND policyname = 'Anyone can read match results'
  ) THEN
    CREATE POLICY "Anyone can read match results"
    ON public.match_results
    FOR SELECT
    USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_results_date ON public.match_results (match_date DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_teams ON public.match_results (team1, team2, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_pms_match_date_teams ON public.player_match_stats (match_date DESC, own_team, opponent);
CREATE INDEX IF NOT EXISTS idx_predictions_pending_date ON public.predictions (match_date) WHERE graded_at IS NULL;