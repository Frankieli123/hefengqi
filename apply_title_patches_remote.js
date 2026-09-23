const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const dotenv = require('/mnt/vscode/hefengqi/node_modules/dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('/mnt/vscode/hefengqi/.env'));
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

const PATCHES_FILE = '/tmp/product_title_patches.json';

async function main() {
  console.log('Loading patches from', PATCHES_FILE);
  const patches = JSON.parse(fs.readFileSync(PATCHES_FILE, 'utf8'));
  const pids = Object.keys(patches);
  console.log(`Total products to patch: ${pids.length}`);

  let updatedCount = 0;
  for (const pid of pids) {
    const locMap = patches[pid];
    for (const [locale, fields] of Object.entries(locMap)) {
      const existing = await prisma.productTranslation.findUnique({
        where: { productId_locale: { productId: pid, locale } }
      });
      if (existing) {
        await prisma.productTranslation.update({
          where: { id: existing.id },
          data: fields
        });
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully applied patches to ${updatedCount} ProductTranslation records!`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
