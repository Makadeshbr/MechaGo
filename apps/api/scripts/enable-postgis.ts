import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

// Carrega .env para pegar a DATABASE_URL do Railway
dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada no .env");
  process.exit(1);
}

async function enablePostGIS() {
  console.log("🚀 Ativando extensões PostGIS no Railway...");
  const sql = postgres(databaseUrl);

  try {
    // Tenta ativar as extensões necessárias para busca por localização
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log("✅ Extensão 'postgis' ativada.");
    
    await sql`CREATE EXTENSION IF NOT EXISTS postgis_topology;`;
    console.log("✅ Extensão 'postgis_topology' ativada.");

    console.log("\n✨ O banco de dados agora suporta cálculos geográficos!");
  } catch (err: any) {
    if (err.message.includes("permission denied")) {
      console.error("❌ Erro de permissão: Você precisa ser superuser para ativar extensões.");
      console.error("👉 Dica: No Railway, use a DATABASE_URL que contém o usuário 'postgres'.");
    } else {
      console.error("❌ Erro ao ativar PostGIS:", err.message);
    }
  } finally {
    await sql.end();
  }
}

enablePostGIS();
