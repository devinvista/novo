import { defineConfig } from "drizzle-kit";

const connectionUrl = postgresql://neondb_owner:npg_QqoTzSpN1wr9@ep-delicate-wave-acdednnh-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 || process.env.DATABASE_URL;

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
