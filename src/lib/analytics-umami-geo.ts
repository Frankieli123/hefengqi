import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
export type SessionGeography = { session_id: string; country: string | null; region: string | null; city: string | null };
let client: PrismaClient | undefined;
export async function lookupSessionGeography(ids: string[]): Promise<SessionGeography[]> {
  if (!ids.length) return [];
  const configured = process.env.UMAMI_DATABASE_URL;
  if (!configured) throw new Error("UMAMI_GEO_NOT_CONFIGURED");
  if (!client) {
    const url = new URL(configured);
    url.searchParams.set("connection_limit", "1");
    url.searchParams.set("connect_timeout", "2");
    url.searchParams.set("pool_timeout", "2");
    url.searchParams.set("socket_timeout", "3");
    client = new PrismaClient({datasources:{db:{url:url.toString()}},log:[]});
  }
  return client.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
    return tx.$queryRaw<SessionGeography[]>(Prisma.sql`SELECT session_id::text, country, region, city FROM session WHERE session_id IN (${Prisma.join(ids.map(id=>Prisma.sql`${id}::uuid`))})`);
  }, {maxWait:2000,timeout:3500});
}
