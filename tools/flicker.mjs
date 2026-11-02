// Proves flicker on the real GPU: renders every tour step twice a hair apart in time and counts the pixels that flip.
// Faces that fight change completely for a tiny move, while clean surfaces barely change. Prints the worst steps. The
// moving steps also count the outlines of parts in flight, so the steps at rest are the number that has to stay small.
//   node tools/flicker.mjs                   the built page
//   node tools/flicker.mjs other.html        another build, to compare
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM, CHROMIUM_ARGS, DIST, playwright} from './paths.mjs';
import {TOUR_KEYS} from '../src/model.js';

const FILE = process.argv[2] ?? path.join(DIST, 'duo-live.html');
const NUDGE = 0.0005; // seconds of tour: far less than a pixel, so only depth ties can flip
const FLIP = 48; // out of 255: a change this big on a held pose is not shading
const WORST = 8;

const {chromium} = playwright();
const browser = await chromium.launch({executablePath: CHROMIUM, args: CHROMIUM_ARGS, headless: true});
const page = await browser.newPage({viewport: {width: 1440, height: 860}});
await page.addInitScript(() => {
  window.__CAPTURE = true;
});
await page.goto(pathToFileURL(path.resolve(FILE)).href);
await page.waitForFunction(() => window.SIM && window.SIM.ready);
// each step part way through its move and as it arrives, because the whole device in view is where depth is scarcest
const steps = TOUR_KEYS.filter((key) => key.move).flatMap((key) => [
  {label: `${key.label}, moving`, t: key.start + key.move / 2, moving: true},
  {label: key.label, t: key.at - 0.02, moving: false},
]);
const report = await page.evaluate(({steps, nudge, flip}) => {
  const view = document.querySelector('#view');
  const copy = document.createElement('canvas');
  copy.width = view.width;
  copy.height = view.height;
  const context = copy.getContext('2d', {willReadFrequently: true});
  const grab = (t) => {
    window.SIM.render(t);
    // over the page's paper, as a visitor sees it: a nearly clear pixel's colour on its own means nothing
    context.fillStyle = '#FAF9F6';
    context.fillRect(0, 0, copy.width, copy.height);
    context.drawImage(view, 0, 0);
    return context.getImageData(0, 0, copy.width, copy.height).data;
  };
  return steps.map(({label, t, moving}) => {
    const a = grab(t);
    const b = grab(t + nudge);
    let flipped = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > flip * 3) flipped += 1;
    }
    return {label, t: Number(t.toFixed(2)), moving, flipped};
  });
}, {steps, nudge: NUDGE, flip: FLIP});
await browser.close();
const total = (moving) => report.filter((step) => step.moving === moving).reduce((sum, step) => sum + step.flipped, 0);
for (const step of [...report].sort((a, b) => b.flipped - a.flipped).slice(0, WORST)) console.log(`${String(step.flipped).padStart(6)} px  t=${step.t}  ${step.label}`);
console.log(`${total(false)} pixels flip at rest, ${total(true)} on the move, across ${report.length} steps`);
