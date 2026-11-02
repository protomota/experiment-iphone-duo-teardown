// Finds faces that share a plane, overlap, point the same way and have the same depth bias. The depth buffer can't order
// them, so they flicker as the camera moves, and a review sheet only catches that by luck. Walks the real model at several
// poses, without a browser. tools/flicker.mjs proves the result on the real GPU.
import {M, THREE, openAt, owner, phone, shown} from './fit.mjs';

const GAP = 0.01; // mm: faces closer than this count as one plane. stage.js fits the depth range, so wider gaps resolve cleanly
const OVERLAP = 0.05; // mm: how far two faces must overlap, so that faces that only meet at an edge don't count
const SMALLEST = 0.002; // mm²: slivers can't be seen fighting

const midFold = (() => {
  let p = 0;
  while (M.foldPhi(p) > Math.PI / 4) p += 0.0002;
  return p;
})();
// not sealed: everything but the outside is hidden then, and the outside is the same in the open pose
const POSES = {'half open': midFold, open: openAt, 'half way': 0.5, exploded: 1};

const lookOf = (mesh, copy) => {
  const {color, metalness, roughness} = mesh.material;
  const tone = new THREE.Color();
  if (mesh.instanceColor) mesh.getColorAt(copy, tone);
  return `${color.getHexString()}/${metalness}/${roughness}/${mesh.instanceColor ? tone.getHexString() : ''}`;
};

const facesIn = (mesh, name, faces) => {
  const {position} = mesh.geometry.attributes;
  const index = mesh.geometry.index;
  const count = index ? index.count : position.count;
  const vertexAt = (i) => (index ? index.getX(i) : i);
  const copies = mesh.isInstancedMesh ? mesh.count : 1;
  const place = new THREE.Matrix4();
  const instance = new THREE.Matrix4();
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let copy = 0; copy < copies; copy++) {
    place.copy(mesh.matrixWorld);
    if (mesh.isInstancedMesh) {
      mesh.getMatrixAt(copy, instance);
      place.multiply(instance);
    }
    const look = lookOf(mesh, copy);
    for (let i = 0; i < count; i += 3) {
      corners.forEach((corner, k) => corner.fromBufferAttribute(position, vertexAt(i + k)).applyMatrix4(place));
      normal.subVectors(corners[1], corners[0]).cross(edge.subVectors(corners[2], corners[0]));
      const size = normal.length() / 2;
      if (size < SMALLEST) continue;
      normal.normalize();
      const [ax, ay, az] = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)];
      const drop = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
      const [u, v] = {x: ['y', 'z'], y: ['x', 'z'], z: ['x', 'y']}[drop];
      const flat = corners.map((corner) => [corner[u], corner[v]]);
      faces.push({
        name,
        look,
        bias: mesh.material.polygonOffsetUnits,
        direction: normal.toArray().map((value) => Math.round(value * 200)).join(),
        plane: normal.dot(corners[0]),
        flat,
        low: Math.min(...flat.map(([x]) => x)),
        high: Math.max(...flat.map(([x]) => x)),
        size,
        at: corners[0].toArray().map((value) => Number(value.toFixed(1))),
      });
    }
  }
};

const spread = (points, [nx, ny]) => {
  let low = Infinity;
  let high = -Infinity;
  for (const [x, y] of points) {
    const along = x * nx + y * ny;
    low = Math.min(low, along);
    high = Math.max(high, along);
  }
  return [low, high];
};

/** Separating axes: two triangles overlap by the least overlap across every edge's normal. */
const overlaps = (a, b) => {
  for (const shape of [a, b]) {
    for (let i = 0; i < 3; i++) {
      const [x0, y0] = shape[i];
      const [x1, y1] = shape[(i + 1) % 3];
      const size = Math.hypot(x1 - x0, y1 - y0);
      if (size < 1e-6) continue;
      const axis = [(y0 - y1) / size, (x1 - x0) / size];
      const [lowA, highA] = spread(a, axis);
      const [lowB, highB] = spread(b, axis);
      if (Math.min(highA, highB) - Math.max(lowA, lowB) < OVERLAP) return false;
    }
  }
  return true;
};

/** Compares neighbours along u only, so a board's thousands of level faces stay cheap. */
const fightsIn = (run, found) => {
  run.sort((a, b) => a.low - b.low);
  const active = [];
  for (const face of run) {
    for (let i = active.length - 1; i >= 0; i--) if (active[i].high < face.low) active.splice(i, 1);
    for (const other of active) {
      if (face.look === other.look || face.bias !== other.bias) continue;
      if (Math.abs(face.plane - other.plane) > GAP) continue;
      if (!overlaps(face.flat, other.flat)) continue;
      const pair = [`${face.name} ${face.look}`, `${other.name} ${other.look}`].sort().join('  and  ');
      const entry = found.get(pair) ?? {pair, faces: 0, gap: 0, at: face.at};
      entry.faces += 1;
      entry.gap = Math.max(entry.gap, Math.abs(face.plane - other.plane));
      found.set(pair, entry);
    }
    active.push(face);
  }
};

const fightsAt = (p) => {
  phone.update(p, null, 0);
  phone.root.rotation.set(0, 0, 0);
  phone.root.position.set(0, 0, 0);
  phone.root.updateMatrixWorld(true);
  const faces = [];
  phone.root.traverse((mesh) => {
    if (mesh.isMesh && shown(mesh)) facesIn(mesh, owner.get(mesh) ?? 'piece', faces);
  });
  const byDirection = new Map();
  for (const face of faces) {
    if (!byDirection.has(face.direction)) byDirection.set(face.direction, []);
    byDirection.get(face.direction).push(face);
  }
  const found = new Map();
  for (const list of byDirection.values()) {
    list.sort((a, b) => a.plane - b.plane);
    let start = 0;
    for (let i = 1; i <= list.length; i++) {
      if (i < list.length && list[i].plane - list[i - 1].plane <= GAP) continue;
      if (i - start > 1) fightsIn(list.slice(start, i), found);
      start = i;
    }
  }
  return [...found.values()];
};

export const zFightReport = () => {
  const report = new Map();
  for (const [pose, p] of Object.entries(POSES)) {
    for (const entry of fightsAt(p)) if (!report.has(entry.pair)) report.set(entry.pair, {pose, ...entry});
  }
  return [...report.values()].sort((a, b) => b.faces - a.faces);
};

if (process.argv[1]?.endsWith('zfight.mjs')) {
  const report = zFightReport();
  for (const entry of report) console.log(JSON.stringify(entry));
  console.log(report.length ? `${report.length} pairs of surfaces fight` : 'no two surfaces share a plane');
  process.exitCode = report.length ? 1 : 0;
}
