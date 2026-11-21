const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('./inquiry-cs-monitor.cjs'), 'utf8');

test('monitor keeps inquiry group delivery single-owner and preserves private fallback', () => {
  assert.match(source, /eventKey\.startsWith\('last_inq_id:'\)\) mark\('group'\)/);
  assert.match(source, /payload\.uuid = require\('crypto'\)/);
  assert.match(source, /`\$\{key\}_pending`/);
});

test('monitor requires private runtime configuration and persists cursors', () => {
  assert.match(source, /process\.env\.FEISHU_MONITOR_APP_SECRET/);
  assert.match(source, /Missing required monitor configuration/);
  assert.match(source, /fs\.renameSync\(tmp,STATE_FILE\)/);
  assert.doesNotMatch(source, /const FEISHU_(?:GROUP_WEBHOOK|APP_SECRET) = ['"][^'"]+['"]/);
});
