DO $$ BEGIN
 CREATE TYPE "public"."knowledgeType" AS ENUM('github', 'discord', 'docs');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"type" "knowledgeType",
	"link" text,
	"embedding" VECTOR(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
