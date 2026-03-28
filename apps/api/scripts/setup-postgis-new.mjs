import postgres from "postgres";

const POSTGIS_URL = "postgresql://postgres:MechaGo_PostGIS_2026_Secure!@autorack.proxy.rlwy.net:32617/railway";

const sql = postgres(POSTGIS_URL, { ssl: false, max: 1 });

try {
  // 1. Habilitar PostGIS
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
  const [{ version }] = await sql`SELECT PostGIS_Version() as version`;
  console.log("✓ PostGIS habilitado:", version.trim());

  // 2. Verificar conexão
  const [{ now }] = await sql`SELECT NOW() as now`;
  console.log("✓ Banco conectado:", now);

} catch (err) {
  console.error("✗ Erro:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
