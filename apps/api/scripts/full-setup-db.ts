import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function setup() {
  console.log("🚀 Iniciando configuração TOTAL do banco PostGIS...");
  const sql = postgres(databaseUrl);

  try {
    // 1. Enums
    console.log("📦 Criando enums...");
    await sql`CREATE TYPE professional_type AS ENUM ('mechanic_mobile', 'mechanic_workshop', 'tire_repair', 'tow_truck');`.catch(() => {});
    await sql`CREATE TYPE specialty AS ENUM ('car_general', 'moto', 'diesel_truck', 'electronic_injection', 'suspension', 'brakes', 'air_conditioning', 'transmission');`.catch(() => {});
    await sql`CREATE TYPE schedule_type AS ENUM ('24h', 'daytime', 'nighttime', 'custom');`.catch(() => {});
    await sql`CREATE TYPE vehicle_type AS ENUM ('car', 'moto', 'suv', 'truck');`.catch(() => {});
    await sql`CREATE TYPE request_status AS ENUM ('pending', 'matching', 'waiting_queue', 'accepted', 'professional_enroute', 'professional_arrived', 'diagnosing', 'resolved', 'escalated', 'tow_requested', 'tow_enroute', 'completed', 'cancelled_client', 'cancelled_professional', 'price_contested');`.catch(() => {});
    await sql`CREATE TYPE payment_type AS ENUM ('diagnostic_fee', 'service', 'tow');`.catch(() => {});
    await sql`CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');`.catch(() => {});
    await sql`CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed');`.catch(() => {});

    // 2. Tabelas
    console.log("📝 Criando tabelas...");
    
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        phone text NOT NULL,
        password_hash text NOT NULL,
        cpf_cnpj text NOT NULL UNIQUE,
        type text NOT NULL DEFAULT 'client',
        avatar_url text,
        rating decimal(3,2) DEFAULT '5.00',
        total_reviews integer DEFAULT 0,
        is_active boolean DEFAULT true,
        is_verified boolean DEFAULT false,
        fcm_token text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        type vehicle_type NOT NULL,
        brand text NOT NULL,
        model text NOT NULL,
        year integer NOT NULL,
        plate text NOT NULL,
        color text NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS professionals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) UNIQUE,
        type professional_type NOT NULL,
        specialties specialty[] NOT NULL DEFAULT '{}',
        vehicle_types_served vehicle_type[] NOT NULL DEFAULT '{}',
        has_workshop boolean DEFAULT false,
        schedule_type schedule_type DEFAULT '24h',
        custom_schedule jsonb,
        radius_km integer DEFAULT 10,
        latitude decimal(10,7),
        longitude decimal(10,7),
        is_online boolean DEFAULT false,
        is_founder boolean DEFAULT false,
        commission_rate decimal(4,2) DEFAULT '0.00',
        total_earnings decimal(12,2) DEFAULT '0.00',
        acceptance_rate decimal(5,2) DEFAULT '100.00',
        cancellations_this_month integer DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS service_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id uuid NOT NULL REFERENCES users(id),
        vehicle_id uuid NOT NULL REFERENCES vehicles(id),
        professional_id uuid REFERENCES professionals(id),
        status request_status DEFAULT 'pending',
        problem_type text NOT NULL,
        complexity text DEFAULT 'simple',
        context text DEFAULT 'urban',
        city_name text,
        roadway_name text,
        roadway_phone text,
        address text,
        client_latitude decimal(10,7) NOT NULL,
        client_longitude decimal(10,7) NOT NULL,
        professional_latitude decimal(10,7),
        professional_longitude decimal(10,7),
        distance_km decimal(10,2),
        estimated_arrival_minutes integer,
        estimated_price decimal(10,2) NOT NULL,
        diagnostic_fee decimal(10,2) NOT NULL,
        final_price decimal(10,2),
        price_justification text,
        diagnosis_notes text,
        diagnosis_photo_url text,
        completion_photo_url text,
        resolved_on_site boolean DEFAULT true,
        triage_answers jsonb,
        matched_at timestamp,
        arrived_at timestamp,
        completed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL REFERENCES service_requests(id),
        type payment_type NOT NULL,
        amount decimal(10,2) NOT NULL,
        method payment_method NOT NULL,
        status payment_status DEFAULT 'pending',
        gateway_id text,
        gateway_status text,
        professional_amount decimal(10,2),
        platform_amount decimal(10,2),
        pix_qr_code text,
        pix_qr_code_base64 text,
        webhook_payload jsonb,
        paid_at timestamp,
        created_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS roadway_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        phone text NOT NULL,
        concessionaire text NOT NULL,
        bounds_min_lat decimal(10,7),
        bounds_max_lat decimal(10,7),
        bounds_min_lng decimal(10,7),
        bounds_max_lng decimal(10,7),
        is_active boolean DEFAULT true
      );
    `;

    console.log("✅ Banco configurado com sucesso!");
  } catch (err: any) {
    console.error("❌ Erro no setup:", err.message);
  } finally {
    await sql.end();
  }
}

setup();
