import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().startsWith("file:", "DATABASE_URL must be a SQLite file URL"),
  SECRET: z.string().min(32, "SECRET must contain at least 32 characters"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().trim().default("http://localhost:5174"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PAYSTACK_SECRET_KEY: z.string().trim().optional().default(""),
  PAYSTACK_CALLBACK_URL: z.string().url().default("http://localhost:5174/payments/paystack/callback"),
  PAYSTACK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
});

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path[0]))];
    throw new Error(`Invalid or missing environment variables: ${names.join(", ")}`);
  }

  const corsOrigins = result.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    throw new Error("Invalid or missing environment variables: CORS_ORIGINS");
  }

  const callbackUrl = new URL(result.data.PAYSTACK_CALLBACK_URL);
  const localDevelopmentCallback = callbackUrl.protocol === "http:"
    && ["localhost", "127.0.0.1"].includes(callbackUrl.hostname)
    && result.data.NODE_ENV !== "production";
  if (callbackUrl.protocol !== "https:" && !localDevelopmentCallback) {
    throw new Error("Invalid or missing environment variables: PAYSTACK_CALLBACK_URL");
  }

  return { ...result.data, corsOrigins };
}
