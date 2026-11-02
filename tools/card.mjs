// Renders the 1200 x 630 share card from the page itself, so the card can't drift from the model.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM, CHROMIUM_ARGS, DIST, playwright} from './paths.mjs';

const {chromium} = playwright();
const browser = await chromium.launch({executablePath: CHROMIUM, args: CHROMIUM_ARGS, headless: true});
const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
await page.goto(`${pathToFileURL(path.join(DIST, 'duo-live.html')).href}?card`);
await page.waitForFunction(() => window.CARD_READY);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({path: path.join(DIST, 'duo-card.png')});
await browser.close();
