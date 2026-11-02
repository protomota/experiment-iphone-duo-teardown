// Walks every mesh of the real model, without a browser, and reports whatever leaves the published body at each fold
// angle. A review sheet can't see a 0.7 mm tab through a rail. This can.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DEPS, fromDeps} from './paths.mjs';

const bundle = path.resolve('teardown-out/phone.node.mjs');
fs.mkdirSync('teardown-out', {recursive: true});
await fromDeps('esbuild').build({
  stdin: {contents: "export {buildPhone} from './src/phone.js'; export * as THREE from 'three';", resolveDir: process.cwd()},
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  nodePaths: [DEPS],
  logLevel: 'silent',
});
const {buildPhone, THREE} = await import(pathToFileURL(bundle).href);
const M = await import(pathToFileURL(path.resolve('src/model.js')).href);

export {M, THREE};
export const phone = buildPhone({shadows: false});
export const owner = new Map();
for (const [id, part] of Object.entries(phone.parts)) {
  for (const group of Object.values(part.groups)) group.traverse((node) => owner.set(node, id));
}
const SLACK = 0.03;
// how far a part may stand proud of the body, in mm: the camera plateau, the buttons, the rim around the big screen
const PROUD = {backGlass: 3, rearCamera: 3, volumeButtons: 0.3, touchId: 0.3, displayTrim: 0.13, innerDisplay: 0.05};

export const shown = (node) => {
  for (let at = node; at; at = at.parent) if (!at.visible) return false;
  return true;
};

const past = (point, box) => Math.max(box.min.x - point.x, point.x - box.max.x, box.min.y - point.y, point.y - box.max.y, box.min.z - point.z, point.z - box.max.z);

/** Each thing outside the box: its part, and the most it pokes out by. */
const poking = (box) => {
  phone.root.rotation.set(0, 0, 0);
  phone.root.position.set(0, 0, 0);
  phone.root.updateMatrixWorld(true);
  const worst = new Map();
  const point = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  const place = new THREE.Matrix4();
  phone.root.traverse((mesh) => {
    if (!mesh.isMesh || !shown(mesh)) return;
    const name = owner.get(mesh) ?? 'piece';
    const {position} = mesh.geometry.attributes;
    const copies = mesh.isInstancedMesh ? mesh.count : 1;
    for (let c = 0; c < copies; c++) {
      place.copy(mesh.matrixWorld);
      if (mesh.isInstancedMesh) {
        mesh.getMatrixAt(c, instance);
        place.multiply(instance);
      }
      for (let i = 0; i < position.count; i++) {
        const out = past(point.fromBufferAttribute(position, i).applyMatrix4(place), box);
        if (out > (PROUD[name] ?? SLACK) && out > (worst.get(name)?.out ?? 0)) worst.set(name, {name, out: Number(out.toFixed(2)), at: point.toArray().map((v) => Number(v.toFixed(1)))});
      }
    }
  });
  return [...worst.values()];
};

/** The published body at this fold, in the hinge cover's frame. */
const bodyAt = (phi) => {
  const {x, yMin, yMax} = M.envelope(phi);
  return new THREE.Box3(new THREE.Vector3(-x, yMin, -M.HALF_H), new THREE.Vector3(x, yMax, M.HALF_H));
};

export const openAt = (() => {
  let p = 0;
  while (M.foldPhi(p) > 0 && p < 1) p += 0.0002;
  return p;
})();

export const fitReport = () => {
  const report = [];
  for (let step = 0; step <= 24; step++) {
    const p = (openAt * step) / 24;
    phone.update(p, null, 0);
    const phi = M.foldPhi(p);
    for (const item of poking(bodyAt(phi))) report.push({angle: Math.round(M.foldAngle(p)), ...item});
  }
  return report;
};

if (process.argv[1]?.endsWith('fit.mjs')) {
  const report = fitReport();
  for (const item of report) console.log(JSON.stringify(item));
  console.log(report.length ? `${report.length} things outside the body` : 'nothing leaves the body at any fold angle');
  process.exitCode = report.length ? 1 : 0;
}
