import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import { canonical } from "./model";

const host = "open.feishu.cn";
const tokenUrl = `https://${host}/open-apis/auth/v3/tenant_access_token/internal`;
const sendUrl = `https://${host}/open-apis/im/v1/messages?receive_id_type=chat_id`;
export const chatIdSchema = z.string().regex(/^oc_[A-Za-z0-9_-]{1,128}$/);
export const messageIdSchema = z.string().regex(/^om_[A-Za-z0-9_-]{1,128}$/);
const tokenSchema = z.object({ code: z.literal(0), tenant_access_token: z.string().regex(/^[\x21-\x7e]{1,4096}$/) });
const sentSchema = z.object({ code: z.literal(0), data: z.object({ message_id: messageIdSchema, chat_id: chatIdSchema }) });

export type NativeTransportDependencies = {
  fetcher?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
};

function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [first, second, third] = address.split(".").map(Number);
  return !(first === 0 || first === 10 || first === 127 || first >= 224 || first === 100 && second >= 64 && second <= 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && (second === 168 || second === 0 || second === 88 && third === 99) || first === 198 && (second === 18 || second === 19 || second === 51 && third === 100) || first === 203 && second === 0 && third === 113);
}

async function responseJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted || response.status !== 200 || response.redirected || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new Error("RESPONSE_REJECTED");
  }
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      if (signal.aborted) throw new Error("DEADLINE");
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 65536) throw new Error("RESPONSE_REJECTED");
      chunks.push(chunk.value);
    }
    if (signal.aborted) throw new Error("DEADLINE");
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
  }
}

export async function sendNativeCard(input: {
  appId: string; appSecret: string; chatId: string; uuid: string; content: string; timeout: number;
  assertLock: () => Promise<void>;
}, dependencies: NativeTransportDependencies): Promise<{ messageId: string; businessCode: 0 } | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("DEADLINE")); }, input.timeout);
  });
  const assertActive = async () => {
    if (controller.signal.aborted) throw new Error("DEADLINE");
    await input.assertLock();
    if (controller.signal.aborted) throw new Error("DEADLINE");
  };
  const request = async (url: string, body: unknown, accessToken?: string) => {
    await assertActive();
    const response = await (dependencies.fetcher ?? fetch)(url, {
      method: "POST", redirect: "error", credentials: "omit", signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: canonical(body),
    });
    return responseJson(response, controller.signal);
  };
  try {
    return await Promise.race([deadline, (async () => {
      const resolver = dependencies.resolveHost ?? (async (hostname: string) => (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address));
      const addresses = await resolver(host);
      if (!addresses.length || addresses.some((address) => !publicIPv4(address))) throw new Error("DNS_REJECTED");
      const token = tokenSchema.parse(await request(tokenUrl, { app_id: input.appId, app_secret: input.appSecret }));
      const sent = sentSchema.parse(await request(sendUrl, { receive_id: input.chatId, msg_type: "interactive", uuid: input.uuid, content: input.content }, token.tenant_access_token));
      if (sent.data.chat_id !== input.chatId) throw new Error("TARGET_MISMATCH");
      await assertActive();
      return { messageId: sent.data.message_id, businessCode: 0 as const };
    })()]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
