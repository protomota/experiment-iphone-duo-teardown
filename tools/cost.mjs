// What a frame costs: draw calls and triangles from the renderer, and script time per frame with the CPU slowed 6x,
// which is roughly a mid-range phone. The GPU itself can't be slowed here, so the triangle count stands in for it.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM, CHROMIUM_ARGS, DIST, playwright} from './paths.mjs';

const {chromium} = playwright();
const browser = await chromium.launch({executablePath: CHROMIUM, args: CHROMIUM_ARGS, headless: true});
const page = await browser.newPage({viewport: {width: 390, height: 844}});
await page.addInitScript(() => {
  window.__CAPTURE = true;
});
await page.goto(pathToFileURL(path.join(DIST, 'duo-live.html')).href);
await page.waitForFunction(() => window.SIM && window.SIM.ready);
const cdp = await page.context().newCDPSession(page);
const sample = (rate) => page.evaluate(async () => {
  const start = performance.now();
  const count = 240;
  for (let i = 0; i < count; i++) window.SIM.render((i / count) * window.SIM.duration);
  return (performance.now() - start) / count;
});
await sample();
const busiest = await page.evaluate(() => {
  let most = {calls: 0, triangles: 0};
  for (let i = 0; i < 240; i++) {
    window.SIM.render((i / 240) * window.SIM.duration);
    const {calls, triangles} = window.SIM.info();
    most = {calls: Math.max(most.calls, calls), triangles: Math.max(most.triangles, triangles)};
  }
  return most;
});
console.log('busiest frame', JSON.stringify(busiest));
console.log(`script per frame, normal CPU: ${(await sample()).toFixed(2)} ms`);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: 6});
console.log(`script per frame, CPU slowed 6x: ${(await sample()).toFixed(2)} ms`);
await browser.close();
