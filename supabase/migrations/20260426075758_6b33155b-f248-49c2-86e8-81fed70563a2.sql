DROP POLICY IF EXISTS "Anyone can save predictions" ON public.predictions;
DROP POLICY IF EXISTS "Anyone can save valid predictions" ON public.predictions;

CREATE POLICY "Anyone can save valid predictions"
ON public.predictions
FOR INSERT
WITH CHECK (
  team1 IS NOT NULL
  AND team2 IS NOT NULL
  AND team1 <> team2
  AND char_length(team1) BETWEEN 2 AND 80
  AND char_length(team2) BETWEEN 2 AND 80
  AND char_length(venue) BETWEEN 2 AND 160
  AND char_length(predicted_winner) BETWEEN 2 AND 80
  AND predicted_winner IN (team1, team2)
  AND win_probability BETWEEN 0 AND 100
  AND confidence BETWEEN 0 AND 100
  AND (player_name IS NULL OR char_length(player_name) BETWEEN 1 AND 120)
  AND (predicted_player_runs IS NULL OR predicted_player_runs BETWEEN 0 AND 300)
  AND (predicted_player_wickets IS NULL OR predicted_player_wickets BETWEEN 0 AND 10)
);