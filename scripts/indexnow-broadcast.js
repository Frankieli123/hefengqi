const https = require("https");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const INDEXNOW_KEY = "82a0a524b31046f1961939f0fd04e36c";
const HOST = "ricewind.com";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

async function main() {
  console.log("=== IndexNow 广播流水线启动 ===");
  
  const translations = await prisma.productTranslation.findMany({
    where: { published: true },
    select: { locale: true, slug: true }
  });

  const LOCALES = ["zh", "en", "ru", "fr", "de", "es", "ar"];
  const urls = [
    `https://${HOST}/llms.txt`,
    `https://${HOST}/llms-full.txt`,
    `https://${HOST}/robots.txt`,
    `https://${HOST}/sitemap.xml`,
    `https://${HOST}/image-sitemap.xml`,
  ];

  for (const loc of LOCALES) {
    urls.push(`https://${HOST}/${loc}`);
    urls.push(`https://${HOST}/${loc}/products`);
    urls.push(`https://${HOST}/${loc}/solutions`);
    urls.push(`https://${HOST}/${loc}/support/troubleshooting`);
    urls.push(`https://${HOST}/${loc}/news`);
    urls.push(`https://${HOST}/${loc}/about`);
    urls.push(`https://${HOST}/${loc}/contact`);
  }

  for (const t of translations) {
    urls.push(`https://${HOST}/${t.locale}/products/${t.slug}`);
  }

  console.log(`准备向 Bing IndexNow 广播 ${urls.length} 个核心 URL...`);

  const payload = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  });

  const req = https.request("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, (res) => {
    console.log(`Bing IndexNow 响应状态码: ${res.statusCode} (200/202 表示成功接收并入库调度)`);
    res.on("data", (d) => process.stdout.write(d));
  });

  req.on("error", (e) => {
    console.error("广播请求失败:", e);
  });

  req.write(payload);
  req.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
