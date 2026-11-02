// Drives the built page like a visitor: the tour runs, any input hands over, buttons isolate, the slider moves the phone,
// and phone-sized screens stay smooth with no sideways scroll. Prints what it finds and exits non-zero on a failure.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM, CHROMIUM_ARGS, DIST, playwright} from './paths.mjs';

const url = pathToFileURL(path.join(DIST, 'duo-live.html')).href;
const {chromium} = playwright();
const browser = await chromium.launch({executablePath: CHROMIUM, args: CHROMIUM_ARGS, headless: true});
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
};
const errorsOn = (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  return errors;
};
const value = (page) => page.$eval('#progress', (input) => Number(input.value));
const playLabel = (page) => page.$eval('#play', (button) => button.textContent);

const desktop = await browser.newPage({viewport: {width: 1440, height: 860}});
const errors = errorsOn(desktop);
await desktop.goto(url);
const firstPart = await desktop.evaluate(async () => {
  while (!document.querySelector('.step.active') && performance.now() < 15000) await new Promise(requestAnimationFrame);
  return performance.now() / 1000;
});
check('the tour reaches the first part within 6 s of the page opening', firstPart < 6, `${firstPart.toFixed(1)} s`);
await desktop.waitForTimeout(4000);
check('tour plays on its own', (await value(desktop)) > 0, `slider at ${await value(desktop)}`);
check('the button says Pause while it plays', (await playLabel(desktop)) === 'Pause');

await desktop.click('.group.open .step:nth-of-type(2)', {force: true});
await desktop.waitForTimeout(1500);
check('a click hands control over', (await playLabel(desktop)) === 'Play');
const pressed = await desktop.$eval('[aria-pressed="true"].step', (button) => button.textContent);
const heading = await desktop.$eval('#detail h2', (node) => node.textContent);
check('part button isolates and shows its detail', pressed.endsWith(heading), `${pressed} / ${heading}`);
check('detail has a source link', (await desktop.$$('#detail .source a')).length > 0);
const held = await value(desktop);
await desktop.waitForTimeout(800);
check('nothing moves after the hand-over', Math.abs((await value(desktop)) - held) < 0.002);

await desktop.click('#views button:nth-child(2)');
await desktop.waitForTimeout(300);
check('view button selects', (await desktop.$eval('#views [aria-pressed="true"]', (button) => button.textContent)) === 'Outside');

await desktop.focus('#progress');
for (let i = 0; i < 40; i++) await desktop.keyboard.press('ArrowRight');
await desktop.waitForTimeout(900);
check('slider moves by keyboard', Math.abs((await value(desktop)) - held) > 0.02, `${held} to ${await value(desktop)}`);
check('slider clears the isolation', (await desktop.$$('[aria-pressed="true"].step')).length === 0);

await desktop.click('.chapter-toggle >> text=The flat logic board');
await desktop.waitForTimeout(200);
await desktop.click('.group.open .step:nth-of-type(2)');
await desktop.waitForTimeout(1800);
check('a board lists every chip and screw it carries', (await desktop.$$('#pieces .piece')).length === 39, `${(await desktop.$$('#pieces .piece')).length} rows`);
await desktop.click('#pieces .piece >> text=Apple A20 Pro');
await desktop.waitForTimeout(1500);
check('picking a chip presses its row', (await desktop.$eval('.piece[aria-pressed="true"] .piece-name', (node) => node.textContent)) === 'Apple A20 Pro');
check('a chip on the back turns the view around', (await desktop.$eval('#views [aria-pressed="true"]', (button) => button.textContent)) === 'Inner');
check('the leader names the picked chip', (await desktop.$eval('#leaders', (svg) => svg.textContent)).includes('Apple A20 Pro'));
await desktop.screenshot({path: 'teardown-out/picked-chip.png'});

// the list stays calm: one part lit and one chapter open at every frame of a long trip across the phone
const trip = await desktop.evaluate(async () => {
  const target = [...document.querySelectorAll('.step')].find((button) => button.textContent.includes('Bottom speaker'));
  const seen = {lit: new Set(), most: 0, open: new Set()};
  [...document.querySelectorAll('.chapter-toggle')].find((button) => button.textContent.includes('Speakers')).click();
  await new Promise((done) => setTimeout(done, 450));
  target.click();
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  const start = performance.now();
  while (performance.now() - start < 2200) {
    const lit = [...document.querySelectorAll('.step.active, .step[aria-pressed="true"]')];
    seen.most = Math.max(seen.most, lit.length);
    for (const button of lit) seen.lit.add(button.textContent);
    for (const group of document.querySelectorAll('.group.open .chapter-toggle span:first-child')) seen.open.add(group.textContent);
    await new Promise(requestAnimationFrame);
  }
  return {most: seen.most, lit: [...seen.lit], open: [...seen.open]};
});
check('a trip across the phone lights only the chosen part', trip.most === 1 && trip.lit.length === 1, JSON.stringify(trip));
check('a trip across the phone keeps its chapter open', trip.open.length === 1, trip.open.join(', '));

await desktop.click('#play');
await desktop.waitForTimeout(2500);
check('Play plays', (await playLabel(desktop)) === 'Pause');
await desktop.mouse.move(1300, 400);
await desktop.mouse.wheel(0, 40);
await desktop.waitForTimeout(300);
check('reading the panel does not stop a run the visitor started', (await playLabel(desktop)) === 'Pause');
await desktop.click('#play');
await desktop.waitForTimeout(400);
const paused = await value(desktop);
check('Pause pauses', (await playLabel(desktop)) === 'Play');
await desktop.waitForTimeout(700);
check('nothing moves while paused', Math.abs((await value(desktop)) - paused) < 0.001, `${paused}`);
await desktop.click('#play');
await desktop.waitForTimeout(600);
check('Play carries on from the pause', Math.abs((await value(desktop)) - paused) < 0.02 && (await playLabel(desktop)) === 'Pause', `${paused} to ${await value(desktop)}`);
await desktop.click('#restart');
// the phone only stays sealed for a beat, so this watches for it on the way
const sealed = await desktop.waitForFunction(() => Number(document.querySelector('#progress').value) < 0.002, null, {timeout: 4200}).then(() => true, () => false);
check('Start over goes back to the sealed phone and plays', sealed && (await playLabel(desktop)) === 'Pause', `slider at ${await value(desktop)}`);

// from the far end the fade takes seconds and the first stop is only a beat, so the tour has to wait for the fade
await desktop.$eval('#progress', (input) => {
  input.value = 1;
  input.dispatchEvent(new Event('input', {bubbles: true}));
});
await desktop.waitForTimeout(1800);
await desktop.click('#restart');
const arrival = await desktop.evaluate(async () => {
  const slider = document.querySelector('#progress');
  while (Number(slider.value) > 0.002) await new Promise(requestAnimationFrame);
  return document.querySelector('#views [aria-pressed="true"]').textContent;
});
check('Start over arrives on the sealed phone, not part way into the tour', arrival === 'Three-quarter', arrival);

// going back together, the list rests on the sealed phone instead of racing through every part
await desktop.$eval('#progress', (input) => {
  input.value = 1;
  input.dispatchEvent(new Event('input', {bubbles: true}));
});
await desktop.waitForTimeout(1800);
await desktop.click('#play');
const closing = await desktop.evaluate(async () => {
  const slider = document.querySelector('#progress');
  const lit = new Set();
  const open = new Set();
  const start = performance.now();
  while (performance.now() - start < 35000 && Number(slider.value) > 0.002) {
    await new Promise(requestAnimationFrame);
    if (Number(slider.value) > 0.95) continue;
    for (const step of document.querySelectorAll('.step.active')) lit.add(step.textContent);
    for (const group of document.querySelectorAll('.group.open')) open.add(group.textContent.slice(0, 24));
  }
  return {lit: [...lit], open: [...open]};
});
check('the list rests while the phone goes back together', closing.lit.length === 0 && closing.open.length === 1, JSON.stringify(closing));
await desktop.waitForTimeout(1500);
check('Play stops at the sealed phone', (await playLabel(desktop)) === 'Play', await playLabel(desktop));

for (const [name, act] of [
  ['the wheel', async (page) => {
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 40);
  }],
  ['a key press', (page) => page.keyboard.press('Shift')],
]) {
  const page = await browser.newPage({viewport: {width: 1280, height: 720}});
  await page.goto(url);
  await page.waitForTimeout(1200);
  await act(page);
  await page.waitForTimeout(300);
  check(`${name} hands the auto tour over`, (await playLabel(page)) === 'Play');
  await page.close();
}
check('no page errors on desktop', errors.length === 0, errors[0]);

const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, hasTouch: true, isMobile: true});
const phone = await context.newPage();
const phoneErrors = errorsOn(phone);
await phone.goto(url);
await phone.waitForTimeout(3500);
const fps = await phone.evaluate(() => new Promise((done) => {
  let frames = 0;
  const start = performance.now();
  const tick = (now) => {
    frames += 1;
    if (now - start < 3000) requestAnimationFrame(tick);
    else done(Math.round((frames * 1000) / (now - start)));
  };
  requestAnimationFrame(tick);
}));
check('phone layout has no sideways scroll', await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const buffer = await phone.$eval('#view', (canvas) => [canvas.width, canvas.height]);
console.log(`     phone canvas ${buffer.join(' x ')}, ${fps} fps here (a desktop GPU, so this only proves the loop keeps up)`);
await phone.screenshot({path: 'teardown-out/phone-tour.png'});
await phone.tap('#steps .step:nth-of-type(1)', {force: true});
await phone.waitForTimeout(1600);
check('a tap hands control over on a phone', (await playLabel(phone)) === 'Play');
await phone.screenshot({path: 'teardown-out/phone-part.png'});
const tops = await phone.evaluate(async () => {
  const slider = document.querySelector('#progress');
  const seen = new Set();
  for (let step = 0; step <= 50; step++) {
    slider.value = step / 50;
    slider.dispatchEvent(new Event('input', {bubbles: true}));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    seen.add(Math.round(document.querySelector('#play').getBoundingClientRect().top));
  }
  return [...seen];
});
check('the controls hold still as part names change length', tops.length === 1, tops.join(', '));
await phone.evaluate(() => scrollTo(0, 500));
await phone.waitForTimeout(400);
await phone.screenshot({path: 'teardown-out/phone-scrolled.png'});
const small = await phone.$$eval('button, a, input', (nodes) => nodes.filter((node) => {
  const box = node.getBoundingClientRect();
  return box.width && box.height && node.closest('.stage, .steps, .procedure') && box.height < 28;
}).map((node) => node.textContent.slice(0, 24) || node.id));
check('touch targets are at least 28 px', small.length === 0, small.join(', '));
check('no page errors on a phone', phoneErrors.length === 0, phoneErrors[0]);

const reduced = await browser.newContext({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
const calm = await reduced.newPage();
await calm.goto(url);
await calm.waitForTimeout(1200);
const first = await value(calm);
await calm.waitForTimeout(800);
check('reduced motion: no auto tour', first === (await value(calm)) && (await playLabel(calm)) === 'Play', `slider at ${first}`);

await browser.close();
process.exit(failures.length ? 1 : 0);
