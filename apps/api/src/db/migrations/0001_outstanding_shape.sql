CREATE TYPE "public"."specialty" AS ENUM('car_general', 'moto', 'diesel_truck', 'electronic_injection', 'suspension', 'brakes', 'air_conditioning', 'transmission');--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "specialties" SET DATA TYPE specialty[];--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "vehicle_types_served" SET DATA TYPE vehicle_type[];