CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"image_filename" text NOT NULL,
	"model_filename" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"logline" text NOT NULL,
	"beat_type" text NOT NULL,
	"content" text,
	"visual_hook" text,
	"characters_involved" jsonb DEFAULT '[]'::jsonb,
	"emotional_shifts" jsonb DEFAULT '{}'::jsonb,
	"causal_dependencies" jsonb DEFAULT '[]'::jsonb,
	"setups_payoffs" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'proposed',
	"image_url" text,
	"image_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"gender" text,
	"description" text,
	"portrait_url" text,
	"character_prompt" text,
	"mbti" text,
	"valence" integer DEFAULT 0,
	"arousal" integer DEFAULT 50,
	"autonomy" integer DEFAULT 60,
	"competence" integer DEFAULT 60,
	"relatedness" integer DEFAULT 50,
	"cognitive_clarity" integer DEFAULT 70,
	"perceived_stakes" integer DEFAULT 40,
	"social_safety" integer DEFAULT 60,
	"moral_alignment" integer DEFAULT 70,
	"transformation_progress" integer DEFAULT 0,
	"voice_signature" text,
	"psychology" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"arc_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_references" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"project_id" uuid NOT NULL,
	"source_entity_id" uuid,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_referenced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"title" text,
	"master_prompt" text,
	"summary" text,
	"premise" text,
	"thematic_focus" text,
	"script_content" text,
	"story_plan" jsonb,
	"plan_approved" boolean DEFAULT false,
	"current_phase" text DEFAULT 'premise',
	"status" text DEFAULT 'planning',
	"poster_url" text,
	"poster_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source_domain" text NOT NULL,
	"source_entity_id" uuid,
	"used_in_domains" text[] DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" text[] DEFAULT '{}',
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_loops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"analysis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interior_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"scene_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_loop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"recommendations" text[] DEFAULT '{}',
	"risks" text[] DEFAULT '{}',
	"opportunities" text[] DEFAULT '{}',
	"sources_used" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_audience_fit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"target_demographic" text NOT NULL,
	"fit_score" integer NOT NULL,
	"strengths" text[] DEFAULT '{}',
	"concerns" text[] DEFAULT '{}',
	"recommendations" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "market_analysis_competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"name" text NOT NULL,
	"genre" text NOT NULL,
	"platforms" text[] DEFAULT '{}',
	"player_count" text,
	"similarity_score" integer NOT NULL,
	"strengths" text[] DEFAULT '{}',
	"weaknesses" text[] DEFAULT '{}',
	"market_position" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_genre_momentum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"momentum_id" uuid NOT NULL,
	"genre" text NOT NULL,
	"trend" text NOT NULL,
	"momentum_score" integer NOT NULL,
	"market_timing" text NOT NULL,
	"competitor_density" text NOT NULL,
	"top_performers" text[] DEFAULT '{}',
	"opportunities" text[] DEFAULT '{}',
	"risks" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_market_size" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"tam" text NOT NULL,
	"sam" text NOT NULL,
	"relevant_segment" text NOT NULL,
	"growth_rate" text NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"sources" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "market_analysis_momentum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"overall_momentum" integer NOT NULL,
	"momentum_label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"pattern_name" text NOT NULL,
	"match_score" integer NOT NULL,
	"description" text NOT NULL,
	"examples" text[] DEFAULT '{}',
	"applicability" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_primary_archetype" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"archetype_id" text NOT NULL,
	"archetype_name" text NOT NULL,
	"score" integer NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"key_patterns" text[] DEFAULT '{}',
	"weak_patterns" text[] DEFAULT '{}',
	"interpretation" text,
	"market_implication" text,
	"viability_verdict" text,
	"viability_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_reference_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"disco_elysium_score" integer NOT NULL,
	"vampire_survivors_score" integer NOT NULL,
	"counter_strike_score" integer NOT NULL,
	"disco_elysium_notes" text,
	"vampire_survivors_notes" text,
	"counter_strike_notes" text
);
--> statement-breakpoint
CREATE TABLE "market_analysis_rising_competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"momentum_id" uuid NOT NULL,
	"game_name" text NOT NULL,
	"genres" text[] DEFAULT '{}',
	"momentum_score" integer NOT NULL,
	"why_successful" text NOT NULL,
	"lessons_to_learn" text[] DEFAULT '{}',
	"differentiators" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_social_buzz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"momentum_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"buzz_score" integer NOT NULL,
	"sentiment" text NOT NULL,
	"viral_potential" text NOT NULL,
	"sources" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_analysis_id" uuid NOT NULL,
	"trend_name" text NOT NULL,
	"direction" text NOT NULL,
	"relevance" integer NOT NULL,
	"description" text NOT NULL,
	"timeframe" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"master_prompt" text,
	"series_bible" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"story_plan" jsonb,
	"style_reference_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "select_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"label" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_bibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "series_bibles_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "story_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_plans_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "tiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"tile_prompt" text,
	"image_filename" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiles_project_id_x_y_unique" UNIQUE("project_id","x","y")
);
--> statement-breakpoint
CREATE TABLE "document_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"setup_beat_id" uuid,
	"payoff_beat_id" uuid,
	"description" text NOT NULL,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beats" ADD CONSTRAINT "beats_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_references" ADD CONSTRAINT "entity_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_from_entity_id_game_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."game_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_to_entity_id_game_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."game_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_entities" ADD CONSTRAINT "game_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_loops" ADD CONSTRAINT "game_loops_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interior_designs" ADD CONSTRAINT "interior_designs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analyses" ADD CONSTRAINT "market_analyses_game_loop_id_game_loops_id_fk" FOREIGN KEY ("game_loop_id") REFERENCES "public"."game_loops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_audience_fit" ADD CONSTRAINT "market_analysis_audience_fit_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_competitors" ADD CONSTRAINT "market_analysis_competitors_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_genre_momentum" ADD CONSTRAINT "market_analysis_genre_momentum_momentum_id_market_analysis_momentum_id_fk" FOREIGN KEY ("momentum_id") REFERENCES "public"."market_analysis_momentum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_market_size" ADD CONSTRAINT "market_analysis_market_size_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_momentum" ADD CONSTRAINT "market_analysis_momentum_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_patterns" ADD CONSTRAINT "market_analysis_patterns_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_primary_archetype" ADD CONSTRAINT "market_analysis_primary_archetype_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_reference_scores" ADD CONSTRAINT "market_analysis_reference_scores_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_rising_competitors" ADD CONSTRAINT "market_analysis_rising_competitors_momentum_id_market_analysis_momentum_id_fk" FOREIGN KEY ("momentum_id") REFERENCES "public"."market_analysis_momentum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_social_buzz" ADD CONSTRAINT "market_analysis_social_buzz_momentum_id_market_analysis_momentum_id_fk" FOREIGN KEY ("momentum_id") REFERENCES "public"."market_analysis_momentum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis_trends" ADD CONSTRAINT "market_analysis_trends_market_analysis_id_market_analyses_id_fk" FOREIGN KEY ("market_analysis_id") REFERENCES "public"."market_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "select_points" ADD CONSTRAINT "select_points_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_bibles" ADD CONSTRAINT "series_bibles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_plans" ADD CONSTRAINT "story_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiles" ADD CONSTRAINT "tiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setups" ADD CONSTRAINT "setups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setups" ADD CONSTRAINT "setups_setup_beat_id_beats_id_fk" FOREIGN KEY ("setup_beat_id") REFERENCES "public"."beats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setups" ADD CONSTRAINT "setups_payoff_beat_id_beats_id_fk" FOREIGN KEY ("payoff_beat_id") REFERENCES "public"."beats"("id") ON DELETE no action ON UPDATE no action;