import assert from 'node:assert/strict';
import test from 'node:test';
import {fitReport} from '../tools/fit.mjs';
import {zFightReport} from '../tools/zfight.mjs';

test('nothing leaves the published body at any fold angle', () => {
  assert.deepEqual(fitReport(), []);
});

test('no two surfaces tie for depth at any pose', () => {
  assert.deepEqual(zFightReport(), []);
});
