import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function dropAll() {
  console.log("⚠️ LIMPANDO BANCO DE DADOS...");
  const sql = postgres(databaseUrl);

  try {
    await sql`DROP TABLE IF EXISTS queue_entries CASCADE;`;
    await sql`DROP TABLE IF EXISTS price_tables CASCADE;`;
    await sql`DROP TABLE IF EXISTS reviews CASCADE;`;
    await sql`DROP TABLE IF EXISTS workshops CASCADE;`;
    await sql`DROP TABLE IF EXISTS roadway_info CASCADE;`;
    await sql`DROP TABLE IF EXISTS payments CASCADE;`;
    await sql`DROP TABLE IF EXISTS service_events CASCADE;`;
    await sql`DROP TABLE IF EXISTS service_requests CASCADE;`;
    await sql`DROP TABLE IF EXISTS professionals CASCADE;`;
    await sql`DROP TABLE IF EXISTS vehicles CASCADE;`;
    await sql`DROP TABLE IF EXISTS users CASCADE;`;
    
    // Opcional: remover enums para recriar do zero
    await sql`DROP TYPE IF EXISTS user_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS professional_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS specialty CASCADE;`;
    await sql`DROP TYPE IF EXISTS schedule_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS vehicle_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS request_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS complexity CASCADE;`;
    await sql`DROP TYPE IF EXISTS context CASCADE;`;
    await sql`DROP TYPE IF EXISTS problem_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS event_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS event_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS payment_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS payment_method CASCADE;`;
    await sql`DROP TYPE IF EXISTS payment_status CASCADE;`;

    console.log("✅ Banco limpo com sucesso!");
  } catch (err: any) {
    console.error("❌ Erro ao limpar banco:", err.message);
  } finally {
    await sql.end();
  }
}

dropAll();
