CREATE TABLE "relationship_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid,
	"beat_id" uuid,
	"source_character_id" text NOT NULL,
	"target_character_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"trust" integer DEFAULT 50,
	"conflict" integer DEFAULT 0,
	"tension" integer DEFAULT 0,
	"power_balance" integer DEFAULT 50,
	"change_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "episodes" ADD COLUMN "ten_points_plan" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "relationship_snapshots" ADD CONSTRAINT "relationship_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
