import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { runMigrations } from "./migrate";
import * as schema from "./schema";

const dbPath = resolve(process.env.DATABASE_PATH ?? "app.db");
const dir = dirname(dbPath);
if (dir && dir !== "." && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new DatabaseSync(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

// Auto-create all tables on first run
runMigrations(sqlite);

export const db = drizzle(
  async (sql, params, method) => {
    try {
      const stmt = sqlite.prepare(sql);
      const boundParams = params as (string | number | bigint | null)[];
      if (method === "run") {
        stmt.run(...boundParams);
        return { rows: [] };
      }
      const rows = (stmt.all(...boundParams) as Record<string, unknown>[]).map(
        (row) => Object.values(row),
      );
      return { rows };
    } catch (e) {
      console.error("SQLite error:", e, "\nSQL:", sql, "\nParams:", params);
      throw e;
    }
  },
  { schema },
);

export * from "./schema";
