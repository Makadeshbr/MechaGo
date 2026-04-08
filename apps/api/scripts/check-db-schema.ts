import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

async function check() {
  const sql = postgres(databaseUrl!);
  try {
    console.log("🔍 Verificando colunas de service_requests...");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'service_requests';
    `;
    console.table(columns);

    console.log("\n🔍 Verificando enums...");
    const enums = await sql`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid
      ORDER BY enum_name, e.enumsortorder;
    `;
    console.table(enums);

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

check();
