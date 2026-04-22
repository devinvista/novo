import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 5000))
    .pipe(z.number().int().positive()),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32).optional(),
  PG_SSL_CA: z.string().optional(),
  PG_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n✗ Invalid environment variables:\n${issues}\n`);
    process.exit(1);
  }
  const env = parsed.data;

  if (env.NODE_ENV === "production" && !env.SESSION_SECRET) {
    console.error(
      "\n✗ SESSION_SECRET is required in production. " +
        "Generate a long random string (>=32 chars) and set it before starting the server.\n"
    );
    process.exit(1);
  }

  return env;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
