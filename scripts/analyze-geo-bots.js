const { execSync } = require("child_process");

function analyzeBots() {
  console.log("=== RICEWIND 独立站 AI 爬虫与搜索引擎抓取日志分析 ===");
  try {
    const raw = execSync(
      "docker exec hefengqi-edge-proxy cat /var/log/caddy/access.log 2>/dev/null || true",
      { maxBuffer: 30 * 1024 * 1024, encoding: "utf-8" }
    );

    const lines = raw.trim().split("\n").filter(Boolean);
    console.log(`当前已记录访问日志条数: ${lines.length}`);

    const targetBots = [
      { name: "OpenAI (GPTBot / ChatGPT)", regex: /gptbot|chatgpt/i },
      { name: "Anthropic (ClaudeBot / anthropic-ai)", regex: /claude|anthropic/i },
      { name: "Perplexity (PerplexityBot)", regex: /perplexity/i },
      { name: "ByteDance (Bytespider)", regex: /bytespider/i },
      { name: "Apple (Applebot / Applebot-Extended)", regex: /applebot/i },
      { name: "Google (Googlebot / Google-Extended)", regex: /google/i },
      { name: "Microsoft Bing (bingbot / Copilot)", regex: /bingbot/i },
      { name: "Yandex (YandexBot / Alice)", regex: /yandex/i },
      { name: "Amazon (Amazonbot / Amzn-SearchBot)", regex: /amazonbot|amzn-search/i }
    ];

    const stats = {};
    targetBots.forEach(b => { stats[b.name] = { count: 0, samples: [] }; });

    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        const ua = record.request?.headers?.["User-Agent"]?.[0] || "";
        const uri = record.request?.uri || "";
        const ts = record.ts ? new Date(record.ts * 1000).toISOString() : "";
        const ip = record.request?.headers?.["Eo-Connecting-Ip"]?.[0] || record.request?.client_ip || "";

        for (const b of targetBots) {
          if (b.regex.test(ua)) {
            stats[b.name].count++;
            if (stats[b.name].samples.length < 3) {
              stats[b.name].samples.push({ ts, uri, ip, ua: ua.slice(0, 100) });
            }
            break;
          }
        }
      } catch (e) {}
    }

    console.log("\n--- 各 AI 引擎与主流爬虫统计 ---");
    for (const [name, data] of Object.entries(stats)) {
      console.log(`- ${name}: ${data.count} 次`);
      if (data.samples.length > 0) {
        data.samples.forEach(s => {
          console.log(`    [${s.ts}] IP: ${s.ip} | 路径: ${s.uri}`);
        });
      }
    }
  } catch (e) {
    console.error("分析失败:", e.message);
  }
}

analyzeBots();
