// Where the build and the browser tools find their dependencies. Everything comes from this project's node_modules,
// so `npm install` is the only setup. Set CHROMIUM_PATH to use a Chrome or Chromium you already have.
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export const DEPS = path.resolve('node_modules');
export const DIST = path.resolve('teardown-out/dist');
export const fromDeps = (name) => require(name);
export const playwright = () => require('playwright');
export const CHROMIUM = process.env.CHROMIUM_PATH || undefined;
// WebGL in headless Chromium: allow the software renderer when there's no GPU
export const CHROMIUM_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'];
