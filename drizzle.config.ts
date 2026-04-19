import { defineConfig } from "drizzle-kit";

const connectionUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/pg-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
});
