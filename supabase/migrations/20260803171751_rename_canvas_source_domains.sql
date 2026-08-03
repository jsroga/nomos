-- Remap game entity source_domain after domain folder rename:
-- interior-designer → 3d-canvas, world-building → 2d-canvas
UPDATE public.game_entities
SET source_domain = '3d-canvas'
WHERE source_domain = 'interior-designer';

UPDATE public.game_entities
SET source_domain = '2d-canvas'
WHERE source_domain = 'world-building';
