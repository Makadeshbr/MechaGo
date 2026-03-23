CREATE TYPE "public"."user_type" AS ENUM('client', 'professional', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('car', 'moto', 'suv', 'truck');--> statement-breakpoint
CREATE TYPE "public"."professional_type" AS ENUM('mechanic_mobile', 'mechanic_workshop', 'tire_repair', 'tow_truck');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('24h', 'daytime', 'nighttime', 'custom');--> statement-breakpoint
CREATE TYPE "public"."complexity" AS ENUM('simple', 'medium', 'complex');--> statement-breakpoint
CREATE TYPE "public"."context" AS ENUM('urban', 'highway');--> statement-breakpoint
CREATE TYPE "public"."problem_type" AS ENUM('tire', 'battery', 'electric', 'overheat', 'fuel', 'other');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'matching', 'waiting_queue', 'accepted', 'professional_enroute', 'professional_arrived', 'diagnosing', 'resolved', 'escalated', 'tow_requested', 'tow_enroute', 'delivered', 'completed', 'cancelled_client', 'cancelled_professional');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('diagnosis', 'repair', 'tow', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'credit_card', 'debit_card');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'captured', 'refunded', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "user_type" NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"cpf_cnpj" varchar(18) NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0.00',
	"total_reviews" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_cpf_cnpj_unique" UNIQUE("cpf_cnpj")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "vehicle_type" NOT NULL,
	"plate" varchar(10) NOT NULL,
	"brand" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"color" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "professional_type" NOT NULL,
	"specialties" varchar(50)[] DEFAULT '{}' NOT NULL,
	"vehicle_types_served" varchar(20)[] DEFAULT '{}' NOT NULL,
	"has_workshop" boolean DEFAULT false NOT NULL,
	"schedule_type" "schedule_type" DEFAULT '24h' NOT NULL,
	"custom_schedule" jsonb,
	"radius_km" integer DEFAULT 10 NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_online" boolean DEFAULT false NOT NULL,
	"is_founder" boolean DEFAULT false NOT NULL,
	"commission_rate" numeric(4, 2) DEFAULT '0.00' NOT NULL,
	"total_earnings" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"acceptance_rate" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"cancellations_this_month" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"phone" varchar(20),
	"opening_hours" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"professional_id" uuid,
	"problem_type" "problem_type" NOT NULL,
	"complexity" "complexity" NOT NULL,
	"context" "context" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"client_latitude" numeric(10, 7) NOT NULL,
	"client_longitude" numeric(10, 7) NOT NULL,
	"address" text,
	"triage_answers" jsonb,
	"estimated_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"price_justification" text,
	"diagnostic_fee" numeric(10, 2) NOT NULL,
	"diagnosis" text,
	"diagnosis_photo_url" text,
	"completion_photo_url" text,
	"resolved_on_site" boolean,
	"escalation_destination" text,
	"cancellation_reason" text,
	"cancelled_by" varchar(20),
	"cancelled_at" timestamp,
	"matched_at" timestamp,
	"arrived_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"professional_id" uuid,
	"type" "event_type" NOT NULL,
	"status" "event_status" DEFAULT 'pending' NOT NULL,
	"price" numeric(10, 2),
	"notes" text,
	"photo_url" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"gateway_id" varchar(255),
	"gateway_status" varchar(50),
	"professional_amount" numeric(10, 2),
	"platform_amount" numeric(10, 2),
	"webhook_payload" jsonb,
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"tags" text[] DEFAULT '{}',
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_type" varchar(30) NOT NULL,
	"vehicle_type" varchar(20) NOT NULL,
	"min_price" numeric(10, 2) NOT NULL,
	"max_price" numeric(10, 2) NOT NULL,
	"region" varchar(100) DEFAULT 'national',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"estimated_wait_minutes" integer,
	"alternatives_shown" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadway_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"emergency_phone" varchar(20),
	"bounds_min_lat" numeric(10, 7),
	"bounds_max_lat" numeric(10, 7),
	"bounds_min_lng" numeric(10, 7),
	"bounds_max_lng" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshops" ADD CONSTRAINT "workshops_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_events" ADD CONSTRAINT "service_events_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_events" ADD CONSTRAINT "service_events_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
