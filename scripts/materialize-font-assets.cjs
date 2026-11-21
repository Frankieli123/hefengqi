const { readFileSync, mkdirSync, writeFileSync, copyFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const upstream = path.dirname(require.resolve('@fontsource/noto-sans-sc/400.css', { paths: [process.cwd()] }));
const metadata = JSON.parse(readFileSync(path.join(upstream, 'package.json'), 'utf8'));
assert.equal(metadata.version, '5.3.0');
const out = 'public/fonts/noto-sans-sc-v1-5.3.0';
mkdirSync(path.join(out, 'files'), { recursive: true });
let total=0;
for (const weight of [400, 500, 600]) {
  const css = readFileSync(path.join(upstream, `${weight}.css`), 'utf8');
  const files = [...css.matchAll(/url\(\.\/files\/(noto-sans-sc-[\w-]+\.woff2?)\)/g)].map(m => m[1]);
  assert.equal(files.length, 202);
  files.forEach(file => copyFileSync(path.join(upstream, 'files', file), path.join(out, 'files', file)));
  const compact = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{}:;,])\s*/g, '$1').trim();
  assert.equal((compact.match(/@font-face\{/g) || []).length, 101);
  writeFileSync(path.join(out, `${weight}.css`), compact);
  total+=files.length;
}
copyFileSync(path.join(upstream, 'LICENSE'), path.join(out, 'LICENSE.txt'));
console.log(JSON.stringify({version:metadata.version, assets:total, scopedCss:3}));
