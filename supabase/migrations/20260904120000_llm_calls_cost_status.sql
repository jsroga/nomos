-- Distinguishes a real $0 (priced model, free tokens) from an unpriced model
-- recorded with cost_usd 0 because PROVIDER_PRICING had no row.
ALTER TABLE llm_calls
  ADD COLUMN IF NOT EXISTS cost_status text NOT NULL DEFAULT 'priced';
