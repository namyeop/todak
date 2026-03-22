import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const globalForDb = globalThis as typeof globalThis & {
  todakSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.todakSql ??
  postgres(process.env.DATABASE_URL, {
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.todakSql = sql;
}

export const db = drizzle(sql);
