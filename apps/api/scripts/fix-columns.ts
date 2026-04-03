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
  console.log("🚀 Forçando colunas em users...");
  const sql = postgres(databaseUrl);

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token text;`;
    console.log("✅ Coluna fcm_token garantida em users.");
    
    console.log("🚀 Forçando colunas em service_requests...");
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS professional_latitude decimal(10,7);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS professional_longitude decimal(10,7);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS distance_km decimal(10,2);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS estimated_arrival_minutes integer;`;
    console.log("✅ Colunas de rastreio garantidas.");

    console.log("🚀 Garantindo colunas de localização em service_requests...");
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS city_name text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS roadway_name text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS roadway_phone text;`;
    console.log("✅ Colunas city_name, roadway_name, roadway_phone garantidas.");

    console.log("🚀 Garantindo coluna diagnosis em service_requests...");
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS diagnosis text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS escalation_destination text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cancellation_reason text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cancelled_by varchar(20);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cancelled_at timestamp;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arrived_at timestamp;`;
    console.log("✅ Colunas extras de service_requests garantidas.");

  } catch (err: any) {
    console.error("❌ Erro no setup:", err.message);
  } finally {
    await sql.end();
  }
}

setup();
