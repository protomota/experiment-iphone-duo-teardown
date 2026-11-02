// Bundles three.js, the page and its fonts into one offline HTML file. The teardown kit supplies esbuild and three.
//   node build.mjs                     teardown-out/dist/duo-live.html
//   SITE_URL=https://you.com/duo/ node build.mjs   fills in the absolute links the share card needs
import fs from 'node:fs';
import path from 'node:path';
import {DEPS, DIST, fromDeps} from './tools/paths.mjs';
import {COUNTS} from './src/model.js';

const esbuild = fromDeps('esbuild');
const NAME = 'duo-live';
const SITE_URL = process.env.SITE_URL || 'https://example.com/iphone-duo-teardown/';
const MAX_BYTES = 1024 * 1024;

const inline = (file) => fs.readFileSync(file).toString('base64');
const fontFace = (family, weight, file) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${inline(file)}) format('woff2');}`;
const FONTS = [
  fontFace('Space Grotesk', '300 700', 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'),
  ...[400, 600].map((w) => fontFace('JetBrains Mono', w, path.join(DEPS, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`))),
].join('\n');

const bundle = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  nodePaths: [DEPS],
  legalComments: 'none',
});
const script = bundle.outputFiles[0].text.replaceAll('</script', '<\\/script');

const page = fs.readFileSync('src/index.html', 'utf8')
  .replace('/*FONTS*/', () => FONTS)
  .replace('/*STYLE*/', () => fs.readFileSync('src/style.css', 'utf8'))
  .replace('/*SCRIPT*/', () => script)
  .replaceAll('%LOGO%', `data:image/png;base64,${inline('src/protomota-logo.png')}`)
  .replaceAll('%SITE_URL%', SITE_URL)
  .replaceAll('%PARTS%', COUNTS.parts)
  .replaceAll('%SCREWS%', COUNTS.screws)
  .replaceAll('%CHIPS%', COUNTS.chips);

fs.mkdirSync(DIST, {recursive: true});
const out = path.join(DIST, `${NAME}.html`);
fs.writeFileSync(out, page);
const bytes = Buffer.byteLength(page);
console.log(`${out}  ${(bytes / 1024).toFixed(0)} KB`);
if (bytes > MAX_BYTES) {
  console.error(`over the 1 MB limit by ${((bytes - MAX_BYTES) / 1024).toFixed(0)} KB`);
  process.exit(1);
}
