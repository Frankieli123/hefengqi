import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(); const password = process.env.ADMIN_PASSWORD; const name = process.env.ADMIN_NAME?.trim() || "Administrator";
if (!email || !password || password.length < 10) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters) for this one-time command");
const adminEmail = email;
const adminPassword = password;
const db = new PrismaClient();
async function main() { const existing = await db.user.findUnique({ where: { email: adminEmail } }); if (existing) throw new Error("User already exists; bootstrap will not overwrite it"); const userId = randomUUID(); const passwordHash = await hashPassword(adminPassword); await db.$transaction([db.user.create({ data: { id: userId, email: adminEmail, name, emailVerified: true, role: "ADMIN", twoFactorEnabled: false } }), db.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash } }), db.auditLog.create({ data: { actorType: "SYSTEM", action: "ADMIN_BOOTSTRAP", entityType: "User", entityId: userId } })]); console.info("Admin created. Sign in and complete mandatory TOTP setup."); }
main().finally(() => db.$disconnect());
