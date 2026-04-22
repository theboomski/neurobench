-- Run on Supabase (SQL editor or migration) before using trash talk on leaderboard.
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS trash_talk text;
