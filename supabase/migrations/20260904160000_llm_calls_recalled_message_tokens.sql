-- Recalled Mastra thread tokens, billed separately from prompt_tokens.
ALTER TABLE llm_calls
  ADD COLUMN IF NOT EXISTS recalled_message_tokens integer NOT NULL DEFAULT 0;
