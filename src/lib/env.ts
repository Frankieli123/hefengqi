import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  SITE_CONTENT_UPDATED_AT: z.iso.datetime().default("2026-09-07T00:00:00.000Z"),
  DEMO_MODE: z.enum(["true", "false"]).default("true"),
  IP_HASH_SECRET: z.string().min(16).default("local-development-only-change-me"),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  SALES_EMAIL: z.string().email().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  MEDIA_ROOT: z.string().default("/data/media"),
  PRIVATE_UPLOAD_ROOT: z.string().default("/data/private"),
  EDGEONE_PURGE_ENDPOINT: z.string().url().optional(),
  EDGEONE_API_TOKEN: z.string().optional(),
  UMAMI_API_URL: z.string().url().default("http://127.0.0.1:3008"),
  UMAMI_USERNAME: z.string().optional(),
  UMAMI_PASSWORD: z.string().optional(),
  UMAMI_TIMEZONE: z.string().default("Asia/Shanghai"),
  UMAMI_WEBSITE_ID: z.string().optional(),
  UMAMI_SCRIPT_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = parsed.data;
export const isDemoMode = env.DEMO_MODE === "true";
