import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { checkSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import type { Role } from "@/types/domain";

export interface ApiAuthSuccess {
  ok: true;
  actorId: string;
  actorType: "AI" | "USER";
  role: Role;
}

export interface ApiAuthFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

export const DEFAULT_DEV_AI_KEY = "hfq-ai-dev-token-2026";

export interface StoredAiApiKey {
  [key: string]: string | number;
  version: 1;
  algorithm: "sha256";
  digest: string;
}

export interface AiApiKeyStatus {
  configured: boolean;
  source: "environment" | "database" | "development" | "none";
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function equalDigest(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function equalSecret(candidate: string, expected: string) {
  return equalDigest(digest(candidate), digest(expected));
}

export function createStoredAiApiKey(value: string): StoredAiApiKey {
  return { version: 1, algorithm: "sha256", digest: digest(value.trim()) };
}

type DatabaseKey =
  | { kind: "digest"; digest: string }
  | { kind: "legacy"; value: string }
  | null;

async function getDatabaseKey(): Promise<DatabaseKey> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: "aiApiKey" } });
    if (!setting) return null;

    if (typeof setting.value === "string" && setting.value.trim()) {
      return { kind: "legacy", value: setting.value.trim() };
    }

    if (typeof setting.value !== "object" || setting.value === null || Array.isArray(setting.value)) return null;
    const value = setting.value as Record<string, unknown>;

    if (value.version === 1 && value.algorithm === "sha256" && typeof value.digest === "string") {
      return { kind: "digest", digest: value.digest };
    }

    // Compatibility with the initial implementation. Re-saving upgrades this
    // legacy value to the non-reversible digest format.
    if (typeof value.key === "string" && value.key.trim()) {
      return { kind: "legacy", value: value.key.trim() };
    }
  } catch {
    // Database may be unreachable or in seed phase.
  }

  return null;
}

export async function getAiApiKeyStatus(): Promise<AiApiKeyStatus> {
  if (env.AI_API_KEY?.trim()) return { configured: true, source: "environment" };

  if (await getDatabaseKey()) return { configured: true, source: "database" };

  if (isDemoMode || env.NODE_ENV !== "production") {
    return { configured: true, source: "development" };
  }

  return { configured: false, source: "none" };
}

export async function verifyAiApiKey(candidate: string): Promise<boolean> {
  const token = candidate.trim();
  if (!token) return false;

  const environmentKey = env.AI_API_KEY?.trim();
  if (environmentKey && equalSecret(token, environmentKey)) {
    return true;
  }

  const databaseKey = await getDatabaseKey();
  if (databaseKey?.kind === "digest" && equalDigest(digest(token), databaseKey.digest)) {
    return true;
  }
  if (databaseKey?.kind === "legacy" && equalSecret(token, databaseKey.value)) {
    return true;
  }

  if (isDemoMode || env.NODE_ENV !== "production") {
    if (equalSecret(token, DEFAULT_DEV_AI_KEY)) {
      return true;
    }
  }

  return false;
}

export async function authenticateApi(request: Request): Promise<ApiAuthResult> {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  let token: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    token = apiKeyHeader.trim();
  }

  if (token) {
    if (await verifyAiApiKey(token)) {
      return {
        ok: true,
        actorId: "ai-agent",
        actorType: "AI",
        role: "ADMIN",
      };
    }
    return {
      ok: false,
      status: 401,
      code: "INVALID_API_KEY",
      message: "The provided API key is invalid.",
    };
  }

  const sessionAuth = await checkSecureAdmin();
  if (sessionAuth.ok) {
    return {
      ok: true,
      actorId: sessionAuth.session.user.id,
      actorType: "USER",
      role: sessionAuth.session.user.role,
    };
  }

  return {
    ok: false,
    status: 401,
    code: "UNAUTHORIZED",
    message: "Missing or invalid API key in 'Authorization: Bearer <KEY>' or 'x-api-key' header, and no active admin session.",
  };
}
