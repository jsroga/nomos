CREATE TABLE "relationship_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"label" text,
	"evidence" text,
	"llm_grounded" boolean DEFAULT false NOT NULL,
	"confidence" real,
	"since_beat_id" uuid,
	"until_beat_id" uuid,
	"extracted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_edges_project_id_source_id_target_id_relationship_type_unique" UNIQUE("project_id","source_id","target_id","relationship_type")
);
--> statement-breakpoint
ALTER TABLE "relationship_snapshots" ALTER COLUMN "relationship_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "relationship_snapshots" ADD COLUMN "dynamic_summary" text;--> statement-breakpoint
ALTER TABLE "relationship_snapshots" ADD COLUMN "tension_points" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "relationship_edges" ADD CONSTRAINT "relationship_edges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_edges" ADD CONSTRAINT "relationship_edges_since_beat_id_beats_id_fk" FOREIGN KEY ("since_beat_id") REFERENCES "public"."beats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_edges" ADD CONSTRAINT "relationship_edges_until_beat_id_beats_id_fk" FOREIGN KEY ("until_beat_id") REFERENCES "public"."beats"("id") ON DELETE set null ON UPDATE no action;