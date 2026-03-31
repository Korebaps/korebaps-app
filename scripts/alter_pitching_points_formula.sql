-- Apply after verifying column names: SHOW CREATE TABLE pitching_stats;
-- New Korebaps pitching points: IP +1/inning, W +5, K +2, ER -0.5 each; RA/BB/H = 0; MVP +5.
-- Innings = outs_recorded / 3.

ALTER TABLE pitching_stats
MODIFY COLUMN pitching_points DECIMAL(10, 2)
  GENERATED ALWAYS AS (
    (
      ((`outs_recorded` / 3) * 1)
      + (`w` * 5)
      + (`strikeouts` * 2)
      - (`earned_runs` * 0.5)
      + (CASE WHEN `is_mvp` THEN 5 ELSE 0 END)
    )
  ) VIRTUAL;
