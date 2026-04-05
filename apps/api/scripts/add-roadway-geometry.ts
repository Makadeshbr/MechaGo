/**
 * Migration: adiciona coluna path_geometry (LineString PostGIS) na tabela roadway_info.
 *
 * A coluna armazena o traçado real da rodovia como uma linha geográfica,
 * permitindo queries ST_DWithin precisas — cliente está na rodovia se
 * a distância ao traçado for < 500m.
 *
 * Isso substitui a abordagem por bounding box, que é imprecisa para rodovias
 * longas (ex: Bandeirantes tem 100km — seu bbox cobre boa parte da RMSP).
 */
import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function migrate() {
  const sql = postgres(databaseUrl!);

  try {
    console.log("🗺️  Adicionando coluna path_geometry em roadway_info...");

    // Adiciona coluna geométrica do tipo LineString com SRID 4326 (WGS84)
    await sql.unsafe(`
      ALTER TABLE roadway_info
        ADD COLUMN IF NOT EXISTS path_geometry geometry(LineString, 4326);
    `);

    // Índice espacial GIST para queries ST_DWithin eficientes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_roadway_info_path_geometry
        ON roadway_info USING GIST (path_geometry);
    `);

    console.log("✅ Coluna path_geometry e índice GIST criados com sucesso.");
    console.log("   Execute o seed para popular as geometrias reais das rodovias.");
  } catch (err: unknown) {
    console.error("❌ Erro na migration:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
