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
  console.log("🚀 Iniciando configuração TOTAL do banco PostGIS (Resgate de Esquema v2)...");
  const sql = postgres(databaseUrl);

  try {
    // 0. Extensões PostGIS (Garantia)
    console.log("🌍 Ativando extensões PostGIS...");
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`.catch(() => {});
    await sql`CREATE EXTENSION IF NOT EXISTS postgis_topology;`.catch(() => {});

    // 1. Enums
    console.log("📦 Criando/Verificando enums...");
    await sql`CREATE TYPE user_type AS ENUM ('client', 'professional', 'admin');`.catch(() => {});
    await sql`CREATE TYPE professional_type AS ENUM ('mechanic_mobile', 'mechanic_workshop', 'tire_repair', 'tow_truck');`.catch(() => {});
    await sql`CREATE TYPE specialty AS ENUM ('car_general', 'moto', 'diesel_truck', 'electronic_injection', 'suspension', 'brakes', 'air_conditioning', 'transmission');`.catch(() => {});
    await sql`CREATE TYPE schedule_type AS ENUM ('24h', 'daytime', 'nighttime', 'custom');`.catch(() => {});
    await sql`CREATE TYPE vehicle_type AS ENUM ('car', 'moto', 'suv', 'truck');`.catch(() => {});
    await sql`CREATE TYPE request_status AS ENUM ('pending', 'matching', 'waiting_queue', 'accepted', 'professional_enroute', 'professional_arrived', 'diagnosing', 'resolved', 'escalated', 'tow_requested', 'tow_enroute', 'delivered', 'completed', 'cancelled_client', 'cancelled_professional', 'price_contested');`.catch(() => {});
    await sql`CREATE TYPE complexity AS ENUM ('simple', 'medium', 'complex');`.catch(() => {});
    await sql`CREATE TYPE context AS ENUM ('urban', 'highway');`.catch(() => {});
    await sql`CREATE TYPE problem_type AS ENUM ('tire', 'battery', 'electric', 'overheat', 'fuel', 'other');`.catch(() => {});
    await sql`CREATE TYPE event_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');`.catch(() => {});
    await sql`CREATE TYPE event_type AS ENUM ('diagnosis', 'repair', 'tow', 'delivery');`.catch(() => {});
    await sql`CREATE TYPE payment_type AS ENUM ('diagnostic_fee', 'service', 'tow');`.catch(() => {});
    await sql`CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');`.catch(() => {});
    await sql`CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed');`.catch(() => {});

    // 2. Tabelas
    console.log("📝 Criando/Atualizando tabelas...");
    
    // USERS
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        email varchar(255) NOT NULL UNIQUE,
        phone varchar(20) NOT NULL,
        password_hash text NOT NULL,
        cpf_cnpj varchar(18) NOT NULL UNIQUE,
        type user_type NOT NULL DEFAULT 'client',
        avatar_url text,
        rating decimal(3,2) DEFAULT '0.00',
        total_reviews integer DEFAULT 0,
        is_active boolean DEFAULT true NOT NULL,
        is_verified boolean DEFAULT false NOT NULL,
        fcm_token text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // VEHICLES
    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type vehicle_type NOT NULL,
        brand varchar(50) NOT NULL,
        model varchar(100) NOT NULL,
        year integer NOT NULL,
        plate varchar(10) NOT NULL,
        color varchar(30),
        created_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS vehicles_active_plate_idx ON vehicles (plate) WHERE deleted_at IS NULL;`.catch(() => {});

    // PROFESSIONALS
    await sql`
      CREATE TABLE IF NOT EXISTS professionals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) UNIQUE,
        type professional_type NOT NULL,
        specialties varchar(50)[] NOT NULL DEFAULT '{}',
        vehicle_types_served varchar(20)[] NOT NULL DEFAULT '{}',
        has_workshop boolean DEFAULT false NOT NULL,
        schedule_type schedule_type DEFAULT '24h' NOT NULL,
        custom_schedule jsonb,
        radius_km integer DEFAULT 10 NOT NULL,
        latitude decimal(10,7),
        longitude decimal(10,7),
        is_online boolean DEFAULT false NOT NULL,
        is_founder boolean DEFAULT false NOT NULL,
        commission_rate decimal(4,2) DEFAULT '0.00' NOT NULL,
        total_earnings decimal(12,2) DEFAULT '0.00' NOT NULL,
        acceptance_rate decimal(5,2) DEFAULT '100.00' NOT NULL,
        cancellations_this_month integer DEFAULT 0 NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // SERVICE REQUESTS
    await sql`
      CREATE TABLE IF NOT EXISTS service_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id uuid NOT NULL REFERENCES users(id),
        vehicle_id uuid NOT NULL REFERENCES vehicles(id),
        professional_id uuid REFERENCES professionals(id),
        status request_status DEFAULT 'pending' NOT NULL,
        problem_type problem_type NOT NULL,
        complexity complexity DEFAULT 'simple' NOT NULL,
        context context DEFAULT 'urban' NOT NULL,
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
        estimated_price decimal(10,2),
        diagnostic_fee decimal(10,2) NOT NULL,
        final_price decimal(10,2),
        price_justification text,
        diagnosis text,
        diagnosis_photo_url text,
        completion_photo_url text,
        resolved_on_site boolean,
        escalation_destination text,
        cancellation_reason text,
        cancelled_by varchar(20),
        cancelled_at timestamp,
        triage_answers jsonb,
        matched_at timestamp,
        arrived_at timestamp,
        completed_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // SERVICE EVENTS
    await sql`
      CREATE TABLE IF NOT EXISTS service_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL REFERENCES service_requests(id),
        professional_id uuid REFERENCES professionals(id),
        type event_type NOT NULL,
        status event_status DEFAULT 'pending' NOT NULL,
        price decimal(10,2),
        notes text,
        photo_url text,
        started_at timestamp,
        completed_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // PAYMENTS
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL REFERENCES service_requests(id),
        type varchar(20) NOT NULL,
        amount decimal(10,2) NOT NULL,
        method payment_method NOT NULL,
        status payment_status DEFAULT 'pending' NOT NULL,
        gateway_id varchar(255),
        gateway_status varchar(50),
        professional_amount decimal(10,2),
        platform_amount decimal(10,2),
        webhook_payload jsonb,
        paid_at timestamp,
        refunded_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // ROADWAY INFO
    await sql`
      CREATE TABLE IF NOT EXISTS roadway_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        phone varchar(20) NOT NULL,
        emergency_phone varchar(20),
        bounds_min_lat decimal(10,7),
        bounds_max_lat decimal(10,7),
        bounds_min_lng decimal(10,7),
        bounds_max_lng decimal(10,7),
        created_at timestamp DEFAULT now() NOT NULL,
        path_geometry geometry(LineString, 4326)
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_roadway_info_path_geometry ON roadway_info USING GIST (path_geometry);`.catch(() => {});

    // WORKSHOPS
    await sql`
      CREATE TABLE IF NOT EXISTS workshops (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        address text NOT NULL,
        latitude decimal(10,7) NOT NULL,
        longitude decimal(10,7) NOT NULL,
        phone varchar(20),
        opening_hours jsonb,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // REVIEWS
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL REFERENCES service_requests(id),
        from_user_id uuid NOT NULL REFERENCES users(id),
        to_user_id uuid NOT NULL REFERENCES users(id),
        rating integer NOT NULL,
        tags text[] DEFAULT '{}',
        comment text,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // PRICE TABLES
    await sql`
      CREATE TABLE IF NOT EXISTS price_tables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_type varchar(30) NOT NULL,
        vehicle_type varchar(20) NOT NULL,
        min_price decimal(10,2) NOT NULL,
        max_price decimal(10,2) NOT NULL,
        region varchar(100) DEFAULT 'national',
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `;

    // QUEUE ENTRIES
    await sql`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL REFERENCES service_requests(id),
        position integer NOT NULL,
        estimated_wait_minutes integer,
        alternatives_shown varchar(500),
        created_at timestamp DEFAULT now() NOT NULL,
        resolved_at timestamp
      );
    `;

    console.log("✅ Banco configurado com sucesso com esquema completo (PostGIS nativo)!");
  } catch (err: any) {
    console.error("❌ Erro no setup:", err.message);
  } finally {
    await sql.end();
  }
}

setup();
