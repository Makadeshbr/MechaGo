import { sql } from "drizzle-orm";
const q = sql`SELECT * FROM foo`;
console.log(Object.keys(q));
