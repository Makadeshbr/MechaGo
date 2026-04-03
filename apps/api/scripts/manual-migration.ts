import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

// Carrega .env manualmente
dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada no .env");
  process.exit(1);
}

async function runManualMigration() {
  console.log("🚀 Iniciando migration manual no Railway...");
  const sql = postgres(databaseUrl);

  try {
    // 1. Service Requests - Colunas de Localização
    console.log("📝 Adicionando colunas de localização em service_requests...");
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS city_name text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS roadway_name text;`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS roadway_phone text;`;
    
    // 2. Service Requests - Rastreamento
    console.log("📝 Adicionando colunas de rastreamento em service_requests...");
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS professional_latitude decimal(10,7);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS professional_longitude decimal(10,7);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS distance_km decimal(10,2);`;
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS estimated_arrival_minutes integer;`;

    // 3. Users - FCM Token
    console.log("📝 Adicionando fcm_token em users...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token text;`;

    console.log("✅ Migration manual concluída com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao rodar migration manual:", err);
  } finally {
    await sql.end();
  }
}

runManualMigration();
