/**
 * Seed script idempotente para popular o banco com dados de teste do MechaGo.
 *
 * Execução: npx tsx scripts/seed.ts
 */
import * as dotenv from "dotenv";
import { join } from "node:path";

// 1. Carregar .env IMEDIATAMENTE
const envPath = join(process.cwd(), ".env");
dotenv.config({ path: envPath });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { parseEnv } from "../src/env";
import * as schema from "../src/db/schema";

const env = parseEnv(process.env);
const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const DEFAULT_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$6U1L6T+T9l7v7Q$v6J6T+T9l7v7Q";

const USERS = [
  { name: "Cliente 1", email: "cliente1@example.com", type: "client", cpfCnpj: "11122233344" },
  { name: "Cliente 2", email: "cliente2@example.com", type: "client", cpfCnpj: "55566677788" },
  { name: "Profissional 1", email: "pro1@example.com", type: "professional", cpfCnpj: "99900011122" },
];

const ROADWAYS = [
  {
    name: "Rodovia dos Bandeirantes",
    phone: "0800 055 5550",
    concessionaire: "AutoBAn",
    boundsMinLat: -23.51,
    boundsMaxLat: -23.01,
    boundsMinLng: -47.15,
    boundsMaxLng: -46.75,
  },
  {
    name: "Rodovia Anhanguera",
    phone: "0800 055 5550",
    concessionaire: "AutoBAn",
    boundsMinLat: -23.52,
    boundsMaxLat: -23.02,
    boundsMinLng: -47.16,
    boundsMaxLng: -46.76,
  },
  {
    name: "Rodovia Presidente Dutra",
    phone: "0800 017 3536",
    concessionaire: "CCR RioSP",
    boundsMinLat: -23.53,
    boundsMaxLat: -23.03,
    boundsMinLng: -46.50,
    boundsMaxLng: -46.00,
  },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  for (const user of USERS) {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, user.email),
    });

    if (!existing) {
      await db.insert(schema.users).values({
        ...user,
        passwordHash: DEFAULT_PASSWORD_HASH,
        phone: "11999999999",
        isActive: true,
      } as any);
      console.log(`   👤 Usuário criado: ${user.email}`);
    }
  }

  for (const roadway of ROADWAYS) {
    const existing = await db.query.roadwayInfo.findFirst({
      where: eq(schema.roadwayInfo.name, roadway.name),
    });

    if (!existing) {
      await db.insert(schema.roadwayInfo).values(roadway as any);
      console.log(`   🛣️ Rodovia cadastrada: ${roadway.name}`);
    }
  }

  console.log("✅ Seed concluído!");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
