ALTER TABLE usage_log ADD COLUMN estimated_cost_cents REAL DEFAULT 0;
ALTER TABLE usage_log ADD COLUMN transcription_model TEXT;
ALTER TABLE usage_log ADD COLUMN polish_model TEXT;
ALTER TABLE usage_daily ADD COLUMN total_cost_cents REAL DEFAULT 0;
