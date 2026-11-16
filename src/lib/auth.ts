import "server-only";

import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Next evaluates route modules while collecting build metadata. Runtime startup
// still fails closed in production when the real secret is absent.
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const secret = env.BETTER_AUTH_SECRET ?? (env.NODE_ENV !== "production" || isProductionBuild ? "build-or-development-only-secret-123456" : undefined);
if (!secret) throw new Error("BETTER_AUTH_SECRET is required in production");

const trustedOrigins = [
  env.SITE_URL,
  ...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "HEFENGQI Admin",
  baseURL: env.BETTER_AUTH_URL ?? env.SITE_URL,
  secret,
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  trustedOrigins: [...new Set(trustedOrigins)],
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
  user: {
    additionalFields: {
      role: { type: ["ADMIN", "EDITOR"], required: true, defaultValue: "EDITOR", input: false },
      twoFactorEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 30, cookieCache: { enabled: false } },
  plugins: [twoFactor({ issuer: "HEFENGQI" }), nextCookies()],
});
