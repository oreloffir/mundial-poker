CREATE TABLE IF NOT EXISTS "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"betting_round" smallint NOT NULL,
	"action" varchar(20) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" uuid NOT NULL,
	"team_id" varchar(3) NOT NULL,
	"fixture_id" uuid NOT NULL,
	"base_points" integer DEFAULT 0 NOT NULL,
	"high_scorer_bonus" integer DEFAULT 0 NOT NULL,
	"clean_sheet_bonus" integer DEFAULT 0 NOT NULL,
	"penalty_bonus" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(100),
	"home_team_id" varchar(3) NOT NULL,
	"away_team_id" varchar(3) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"stage" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
	"home_goals" integer,
	"away_goals" integer,
	"home_penalties_scored" integer DEFAULT 0 NOT NULL,
	"home_penalties_missed" integer DEFAULT 0 NOT NULL,
	"away_penalties_scored" integer DEFAULT 0 NOT NULL,
	"away_penalties_missed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"card_1_team_id" varchar(3),
	"card_2_team_id" varchar(3),
	"has_folded" boolean DEFAULT false NOT NULL,
	"total_score" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "round_fixtures" (
	"round_id" uuid NOT NULL,
	"fixture_id" uuid NOT NULL,
	CONSTRAINT "round_fixtures_round_id_fixture_id_pk" PRIMARY KEY("round_id","fixture_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"status" varchar(30) DEFAULT 'DEALING' NOT NULL,
	"dealer_seat_index" smallint NOT NULL,
	"pot" integer DEFAULT 0 NOT NULL,
	"winner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "table_players" (
	"table_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seat_index" smallint NOT NULL,
	"chip_stack" integer NOT NULL,
	"is_connected" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "table_players_table_id_user_id_pk" PRIMARY KEY("table_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"host_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'WAITING' NOT NULL,
	"starting_chips" integer DEFAULT 500 NOT NULL,
	"small_blind" integer,
	"big_blind" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" varchar(3) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"confederation" varchar(10) NOT NULL,
	"wc_group" char(1) NOT NULL,
	"flag_emoji" varchar(10) NOT NULL,
	"fifa_ranking" integer NOT NULL,
	"tier" char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"total_chips_won" bigint DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_scores" ADD CONSTRAINT "card_scores_hand_id_player_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."player_hands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_scores" ADD CONSTRAINT "card_scores_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_scores" ADD CONSTRAINT "card_scores_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_hands" ADD CONSTRAINT "player_hands_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_hands" ADD CONSTRAINT "player_hands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_hands" ADD CONSTRAINT "player_hands_card_1_team_id_teams_id_fk" FOREIGN KEY ("card_1_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_hands" ADD CONSTRAINT "player_hands_card_2_team_id_teams_id_fk" FOREIGN KEY ("card_2_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "round_fixtures" ADD CONSTRAINT "round_fixtures_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "round_fixtures" ADD CONSTRAINT "round_fixtures_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rounds" ADD CONSTRAINT "rounds_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rounds" ADD CONSTRAINT "rounds_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "table_players" ADD CONSTRAINT "table_players_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "table_players" ADD CONSTRAINT "table_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tables" ADD CONSTRAINT "tables_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bets_round_id_idx" ON "bets" ("round_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bets_user_id_idx" ON "bets" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_scores_hand_id_idx" ON "card_scores" ("hand_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fixtures_external_id_idx" ON "fixtures" ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fixtures_status_idx" ON "fixtures" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fixtures_scheduled_at_idx" ON "fixtures" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_hands_round_id_idx" ON "player_hands" ("round_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_hands_user_id_idx" ON "player_hands" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rounds_table_id_idx" ON "rounds" ("table_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rounds_status_idx" ON "rounds" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "table_players_table_id_idx" ON "table_players" ("table_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tables_status_idx" ON "tables" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tables_host_id_idx" ON "tables" ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");