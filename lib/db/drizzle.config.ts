import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

const dbPath = resolve(process.env.DATABASE_PATH ?? "app.db");

export default defineConfig({
  schema: resolve(__dirname, "./src/schema/index.ts"),
  dialect: "turso",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
