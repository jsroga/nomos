WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY episode_id ORDER BY created_at ASC, id ASC) AS seq
  FROM beats
)
UPDATE beats
SET sequence = ranked.seq
FROM ranked
WHERE beats.id = ranked.id;

ALTER TABLE beats
  ADD CONSTRAINT beats_episode_id_sequence_uidx UNIQUE (episode_id, sequence);
