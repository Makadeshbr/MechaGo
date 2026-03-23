import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Cliente PostgreSQL com pool de conexões
const client = postgres(env.DATABASE_URL, {
  max: 10, // Máximo de conexões no pool
  idle_timeout: 20, // Fechar conexão idle após 20s
  connect_timeout: 10, // Timeout de conexão 10s
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
