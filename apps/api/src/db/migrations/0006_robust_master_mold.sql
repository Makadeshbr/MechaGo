ALTER TABLE "service_requests" ADD COLUMN "professional_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "professional_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "distance_km" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "estimated_arrival_minutes" integer;