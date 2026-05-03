-- Allow anonymous completed plays to record ugc_play_history rows (user_id = null)
-- so final win counts match play_count and final_win_ratio sums to 100% across items.
alter table public.ugc_play_history
  alter column user_id drop not null;
