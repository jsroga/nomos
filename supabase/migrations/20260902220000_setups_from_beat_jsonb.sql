-- Unique description per project, then copy jsonb setupId/payoffFor into setups.
-- Operator applies this; agents do not run it against live databases.

CREATE UNIQUE INDEX IF NOT EXISTS setups_project_description_uidx
  ON setups (project_id, description);

INSERT INTO setups (project_id, setup_beat_id, description, is_resolved)
SELECT DISTINCT ON (e.project_id, b.setups_payoffs->>'setupId')
  e.project_id,
  b.id,
  b.setups_payoffs->>'setupId',
  false
FROM beats b
JOIN episodes e ON e.id = b.episode_id
WHERE jsonb_typeof(b.setups_payoffs) = 'object'
  AND COALESCE(b.setups_payoffs->>'setupId', '') <> ''
ON CONFLICT (project_id, description) DO NOTHING;

UPDATE setups s
SET payoff_beat_id = b.id, is_resolved = true
FROM beats b
JOIN episodes e ON e.id = b.episode_id
WHERE e.project_id = s.project_id
  AND COALESCE(b.setups_payoffs->>'payoffFor', '') = s.description
  AND s.payoff_beat_id IS NULL;
