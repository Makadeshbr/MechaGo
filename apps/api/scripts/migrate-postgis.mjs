import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");

const sql = postgres("postgresql://postgres:MechaGo_PostGIS_2026_Secure!@autorack.proxy.rlwy.net:32617/railway", { ssl: false, max: 1 });

try {
  // Tabela de controle
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at BIGINT
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  for (const file of files) {
    const hash = file.replace(".sql", "");
    const [existing] = await sql`SELECT id FROM drizzle_migrations WHERE hash = ${hash}`;

    if (existing) {
      console.log(`⏭  Skipping (already applied): ${file}`);
      continue;
    }

    const content = await readFile(join(migrationsDir, file), "utf-8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`▶  Applying: ${file} (${statements.length} statements)`);

    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    await sql`INSERT INTO drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
    console.log(`✓  Applied: ${file}`);
  }

  // Verificar tabelas criadas
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log(`\n✓ Tables: ${tables.map(t => t.tablename).join(", ")}`);
  console.log("\n✓ All migrations complete!");

} catch (err) {
  console.error("✗ Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
