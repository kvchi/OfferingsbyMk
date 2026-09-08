import { z } from "zod";
import { resolveDatabaseConfig } from './database.js';

const envSchema = z.object({
  DATABASE_MODE: z.enum(['local', 'turso']).default('local'),
  DATABASE_URL: z.string().trim().optional().default(''),
  TURSO_DATABASE_URL: z.string().trim().optional().default(''),
  TURSO_AUTH_TOKEN: z.string().trim().optional().default(''),
  SECRET: z.string().min(32, "SECRET must contain at least 32 characters"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(1).default(0),
  CORS_ORIGINS: z.string().trim().default("http://localhost:5174"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PAYSTACK_SECRET_KEY: z.string().trim().optional().default(""),
  PAYSTACK_CALLBACK_URL: z.string().url().default("http://localhost:5174/payments/paystack/callback"),
  PAYSTACK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
  APP_BASE_URL: z.string().url().default("http://localhost:5174"),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(15).max(60).default(30),
  EMAIL_DELIVERY_MODE: z.enum(["preview", "smtp", "brevo", "test"]).default("preview"),
  SMTP_HOST: z.string().trim().optional().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SMTP_USERNAME: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().trim().optional().default(""),
  SMTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
  BREVO_API_KEY: z.string().trim().optional().default(''),
  BREVO_SENDER_EMAIL: z.string().trim().optional().default(''),
  BREVO_SENDER_NAME: z.string().trim().optional().default(''),
  BREVO_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
});

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path[0]))];
    throw new Error(`Invalid or missing environment variables: ${names.join(", ")}`);
  }

  resolveDatabaseConfig(result.data);

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

  const appBaseUrl = new URL(result.data.APP_BASE_URL);
  const localAppBaseUrl = appBaseUrl.protocol === "http:"
    && ["localhost", "127.0.0.1"].includes(appBaseUrl.hostname)
    && result.data.NODE_ENV !== "production";
  if (appBaseUrl.protocol !== "https:" && !localAppBaseUrl) {
    throw new Error("Invalid or missing environment variables: APP_BASE_URL");
  }

  if (result.data.NODE_ENV === "production" && !['smtp', 'brevo'].includes(result.data.EMAIL_DELIVERY_MODE)) {
    throw new Error("Invalid or missing environment variables: EMAIL_DELIVERY_MODE");
  }
  if (result.data.NODE_ENV !== "test" && result.data.EMAIL_DELIVERY_MODE === "test") {
    throw new Error("Invalid or missing environment variables: EMAIL_DELIVERY_MODE");
  }
  if (result.data.NODE_ENV === "test" && result.data.EMAIL_DELIVERY_MODE !== "test") {
    throw new Error("Invalid or missing environment variables: EMAIL_DELIVERY_MODE");
  }
  if (result.data.EMAIL_DELIVERY_MODE === "smtp") {
    const missingSmtp = ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM"]
      .filter((name) => !result.data[name]);
    if (missingSmtp.length > 0) {
      throw new Error(`Invalid or missing environment variables: ${missingSmtp.join(", ")}`);
    }
  }
  if (result.data.EMAIL_DELIVERY_MODE === 'brevo') {
    const missingBrevo = ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME']
      .filter((name) => !result.data[name]);
    if (missingBrevo.length > 0) {
      throw new Error(`Invalid or missing environment variables: ${missingBrevo.join(', ')}`);
    }
    if (!z.string().email().safeParse(result.data.BREVO_SENDER_EMAIL).success) {
      throw new Error('Invalid or missing environment variables: BREVO_SENDER_EMAIL');
    }
  }

  return { ...result.data, APP_BASE_URL: appBaseUrl.toString().replace(/\/$/, ""), corsOrigins };
}
