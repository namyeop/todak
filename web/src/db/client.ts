import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as typeof globalThis & {
  todakSql?: ReturnType<typeof postgres>;
};

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql =
    globalForDb.todakSql ??
    postgres(process.env.DATABASE_URL, {
      prepare: false,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.todakSql = sql;
  }

  return drizzle(sql);
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});
