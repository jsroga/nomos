-- Redesign character metrics to use psychologically-grounded dimensions
-- Based on: Affective Circumplex Model (Russell, 1980) + Self-Determination Theory (Deci & Ryan)

-- Drop old metric columns
ALTER TABLE characters DROP COLUMN IF EXISTS stress_level;
ALTER TABLE characters DROP COLUMN IF EXISTS trust_level;
ALTER TABLE characters DROP COLUMN IF EXISTS power_level;
ALTER TABLE characters DROP COLUMN IF EXISTS morality_level;
ALTER TABLE characters DROP COLUMN IF EXISTS hope_level;
ALTER TABLE characters DROP COLUMN IF EXISTS isolation_level;

-- Add new psychologically-grounded metrics

-- Core Affective State (Emotional Circumplex)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS valence integer DEFAULT 0 CHECK (valence >= -100 AND valence <= 100);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS arousal integer DEFAULT 50 CHECK (arousal >= 0 AND arousal <= 100);

-- Psychological Needs (Self-Determination Theory)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS autonomy integer DEFAULT 60 CHECK (autonomy >= 0 AND autonomy <= 100);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS competence integer DEFAULT 60 CHECK (competence >= 0 AND competence <= 100);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS relatedness integer DEFAULT 50 CHECK (relatedness >= 0 AND relatedness <= 100);

-- Cognitive & Threat Assessment
ALTER TABLE characters ADD COLUMN IF NOT EXISTS cognitive_clarity integer DEFAULT 70 CHECK (cognitive_clarity >= 0 AND cognitive_clarity <= 100);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS perceived_stakes integer DEFAULT 40 CHECK (perceived_stakes >= 0 AND perceived_stakes <= 100);

-- Social & Moral Mechanisms
ALTER TABLE characters ADD COLUMN IF NOT EXISTS social_safety integer DEFAULT 60 CHECK (social_safety >= 0 AND social_safety <= 100);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS moral_alignment integer DEFAULT 70 CHECK (moral_alignment >= 0 AND moral_alignment <= 100);

-- Add comments for documentation
COMMENT ON COLUMN characters.valence IS 'Emotional tone from -100 (very negative) to +100 (very positive)';
COMMENT ON COLUMN characters.arousal IS 'Energy/activation level from 0 (lethargic) to 100 (highly energized)';
COMMENT ON COLUMN characters.autonomy IS 'Perceived freedom and self-direction from 0 (controlled) to 100 (self-determined)';
COMMENT ON COLUMN characters.competence IS 'Belief in capability from 0 (helpless) to 100 (masterful)';
COMMENT ON COLUMN characters.relatedness IS 'Sense of connection to others from 0 (isolated) to 100 (deeply connected)';
COMMENT ON COLUMN characters.cognitive_clarity IS 'Mental sharpness from 0 (confused) to 100 (crystal clear)';
COMMENT ON COLUMN characters.perceived_stakes IS 'How much is on the line from 0 (nothing matters) to 100 (everything at risk)';
COMMENT ON COLUMN characters.social_safety IS 'Perceived safety in social context from 0 (threatened) to 100 (completely safe)';
COMMENT ON COLUMN characters.moral_alignment IS 'Alignment between actions and values from 0 (severe moral injury) to 100 (acting with integrity)';
