// Local, read-only lab trace. Requires an already-running isolated demo server.
// This is NOT field CWV or field INP. No browser installation or server changes.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [input, output = '/tmp/ricewind-wp01-lab'] = process.argv.slice(2);
if (!input) throw new Error('Usage: node scripts/measure-seo-wp01.mjs http://127.0.0.1:PORT/en /tmp/output');
const url = new URL(input);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !/^\/(zh|en|ru|fr|de|es|ar)(\/|$)/.test(url.pathname)) throw new Error('Only an isolated local public page is allowed');
if (!path.resolve(output).startsWith('/tmp/')) throw new Error('Artifacts must go under /tmp/');
const browser = await chromium.launch({ headless: true });
try {
  await mkdir(output, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true });
  // Prevent third-party traffic and accidental public API calls; navigation remains read-only.
  await context.route('**/*', (route) => {
    const request = route.request();
    const target = new URL(request.url());
    return target.origin === url.origin && request.method() === 'GET' && !target.pathname.startsWith('/api/') ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__wp01 = { lcpMs: null, cls: 0 };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__wp01.lcpMs = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__wp01.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,loading,blink.user_timing', transferMode: 'ReturnAsStream' });
  const response = await page.goto(url.href, { waitUntil: 'load' });
  if (response?.status() !== 200) throw new Error(`Navigation status ${response?.status()}`);
  await page.waitForTimeout(5000);
  const metrics = await page.evaluate(() => ({ ...window.__wp01, navigation: performance.getEntriesByType('navigation')[0]?.toJSON() }));
  const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await completed;
  let trace = '';
  for (;;) {
    const chunk = await cdp.send('IO.read', { handle: stream });
    trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  await writeFile(path.join(output, 'trace.json'), trace);
  await writeFile(path.join(output, 'metrics.json'), JSON.stringify({ url: url.href, type: 'single-run mobile lab navigation', fieldCWV: 'unavailable', fieldINP: 'unavailable', cpuSlowdown: 4, latencyMs: 150, metrics }, null, 2));
  console.log(`Lab artifacts: ${output}`);
} finally {
  await browser.close();
}
