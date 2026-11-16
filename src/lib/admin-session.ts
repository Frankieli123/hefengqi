import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/types/domain";

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true } });
  return user ? { session: session.session, user } : null;
}

export async function checkSecureAdmin(requiredRole?: Role) {
  const session = await getAdminSession();
  if (!session) return { ok: false, code: "UNAUTHORIZED", status: 401 } as const;
  if (requiredRole === "ADMIN" && session.user.role !== "ADMIN") return { ok: false, code: "FORBIDDEN", status: 403 } as const;
  if (!session.user.twoFactorEnabled) return { ok: false, code: "TWO_FACTOR_REQUIRED", status: 403 } as const;
  return { ok: true, session } as const;
}

export async function requireAdminSession(requiredRole?: Role) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (requiredRole === "ADMIN" && session.user.role !== "ADMIN") redirect("/admin?denied=1");
  return session;
}

export async function requireSecureAdmin(requiredRole?: Role) {
  const authorization = await checkSecureAdmin(requiredRole);
  if (!authorization.ok) {
    if (authorization.code === "UNAUTHORIZED") redirect("/admin/login");
    if (authorization.code === "TWO_FACTOR_REQUIRED") redirect("/admin/setup-2fa");
    redirect("/admin?denied=1");
  }
  return authorization.session;
}
