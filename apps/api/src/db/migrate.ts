import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

// Carrega .env manualmente se não estiver rodando via tsx --env-file
dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function runMigration() {
  console.log("🚀 Iniciando migrações do Drizzle...");
  
  const migrationClient = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, {
      migrationsFolder: join(process.cwd(), "src/db/migrations"),
    });
    console.log("✅ Migrações concluídas com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao rodar migrações:", err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigration();
