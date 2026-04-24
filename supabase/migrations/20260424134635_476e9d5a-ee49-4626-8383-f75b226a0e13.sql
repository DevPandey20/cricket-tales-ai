-- Player match stats synced from Cricsheet
CREATE TABLE public.player_match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  player_name text NOT NULL,
  own_team text NOT NULL,
  opponent text NOT NULL,
  runs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  overs_bowled numeric NOT NULL DEFAULT 0,
  runs_conceded integer NOT NULL DEFAULT 0,
  economy numeric,
  venue text NOT NULL,
  city text NOT NULL DEFAULT '',
  match_date date NOT NULL,
  season text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_name)
);

CREATE INDEX idx_pms_player_date ON public.player_match_stats (player_name, match_date DESC);
CREATE INDEX idx_pms_date ON public.player_match_stats (match_date DESC);

ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

-- Public read: stats are not sensitive
CREATE POLICY "Anyone can read player stats"
  ON public.player_match_stats FOR SELECT
  USING (true);

-- Tracks last successful Cricsheet sync (incremental)
CREATE TABLE public.sync_state (
  key text PRIMARY KEY,
  last_synced_date date,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  matches_synced integer NOT NULL DEFAULT 0,
  notes text
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sync state"
  ON public.sync_state FOR SELECT
  USING (true);

-- Schedule sync-cricsheet edge function every 6 hours
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-cricsheet-every-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/sync-cricsheet',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);