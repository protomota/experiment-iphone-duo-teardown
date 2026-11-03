// The phone, built from code. Shapes and sizes of the parts come from the model's traced layout; update(p) poses
// everything from the model and holds no state of its own. No images anywhere, and no Apple logo on the back.
import * as THREE from 'three';
import {buildIoBoard, buildLogicBoard} from './boards.js';
import * as B from './brackets.js';
import {createPieces} from './pieces.js';
import * as M from './model.js';
import {block, createPart, disc, flexRun, gear, makeMaterial, outline, rect, ring, slab, spring} from './shapes.js';

const {HALF_H, HINGE, PART, SPEC, ISLAND, LENSES} = M;
const THICK = SPEC.open.t;
const CORNER = 11;
const EDGE = HINGE.panelEdge;
const INK = new THREE.Color('#17191c');
const ORANGE = new THREE.Color('#f58025');

// ------------------------------------------------------------ the parts
/** Mirrors a closed outline onto the back glass half, keeping its winding. */
const onSide = (sign, points, radii) => (sign > 0 ? outline(points, radii) : outline(points.map(([x, z]) => [-x, z]).reverse(), [...radii].reverse()));

/** The titanium rail: a C around the three free edges, open at the hinge so the hinge sits in the clear. */
const railOutline = (sign) => {
  const wall = 1.05;
  const x = HINGE.halfOpen;
  const z = HALF_H;
  const points = [[EDGE, -z], [x, -z], [x, z], [EDGE, z], [EDGE, z - wall], [x - wall, z - wall], [x - wall, -z + wall], [EDGE, -z + wall]];
  return onSide(sign, points, [0, CORNER, CORNER, 0, 0, CORNER - wall, CORNER - wall, 0]);
};

// The display side of each half stops short of the hinge's steel arms. A shelf carries the frame over them, on the
// exterior side, with a row of screws along it and a gap for the flex cable.
const FRAME_EDGE = 11.8;
const BACKING_EDGE = FRAME_EDGE - 0.05;
const SHELF_EDGE = HINGE.halfThick + 0.25;
const floorOutline = (sign) => {
  const x = HINGE.halfOpen - 0.9;
  const z = HALF_H - 0.9;
  return onSide(sign, [[FRAME_EDGE, -z], [x, -z], [x, z], [FRAME_EDGE, z]], [0, CORNER - 1, CORNER - 1, 0]);
};

const buildEnclosure = () => {
  const part = createPart('enclosure');
  for (const [sign, carrier] of [[-1, 'B'], [1, 'O']]) {
    part.add('rail', slab(railOutline(sign), -THICK, -0.02, 0.16, 10), carrier);
    part.add('frame', slab(floorOutline(sign), -4.5, -4.1, 0, 8), carrier);
    const [near, far] = sign > 0 ? [SHELF_EDGE, FRAME_EDGE + 0.4] : [-FRAME_EDGE - 0.4, -SHELF_EDGE];
    for (const [z0, z1] of [[-57.4, -7], [7, 57.4]]) part.add('frame', block(near, z0, far, z1, -2.6, -1.8, 0.3), carrier);
    for (const z of [-50, -37.5, -25, -12.5, 12.5, 25, 37.5, 50]) {
      part.add('steel', disc(sign * 9, z, 1.15, -1.8, -1.62, 14), carrier);
      part.add('plastic', disc(sign * 9, z, 0.5, -1.62, -1.58, 8), carrier);
    }
    // ribs that stiffen the shell
    for (const z of [-22, 22]) part.add('frame', block(sign > 0 ? 17 : -81, z - 0.5, sign > 0 ? 81 : -17, z + 0.5, -4.1, -3.7, 0.2), carrier);
    // antenna splits across the rail
    for (const [x, z] of [[70, -58.7], [70, 58.7], [28, -58.7], [28, 58.7]]) part.add('plastic', block(sign * x - 0.6, z - 0.21, sign * x + 0.6, z + 0.21, -5, -0.3, 0.05), carrier);
    // screw bosses around the floor
    for (const [x, z] of [[20, -55], [50, -56], [78, -48], [79.5, 0], [78, 48], [50, 56], [20, 55]]) {
      part.add('steel', disc(sign * x, z, 1.05, -4.1, -3.5, 12), carrier);
      part.add('plastic', disc(sign * x, z, 0.5, -3.5, -3.45, 8), carrier);
    }
  }
  // the bare brushed patches under the batteries, traced from iFixit's strip-down photos
  const patch = (points, r, y, carrier) => part.add('brushed', slab(outline(points, r), -4.1, y, 0, 4), carrier);
  patch([[-70, -34], [-44, -34], [-37, 4], [-37, 9], [-58, 26], [-70, 26]], 1.4, -3.96, 'B');
  patch([[-44, 37], [-12.4, 16.2], [-12.4, 37]], 1, -3.96, 'B');
  patch(rect(-22, -35, -12.4, -8), 1, -3.96, 'B');
  patch(rect(17, -41, 38, -14), 2, -3.96, 'O');
  patch(rect(62.6, -43, 78, 21), 1.4, -3.96, 'O');
  // the dimpled pad between them, edged in copper
  part.add('copper', slab(outline(rect(40.6, -42.6, 61.7, 23.6), 2.4), -4.1, -3.98, 0, 5), 'O');
  patch(rect(41.4, -41.8, 60.9, 22.8), 1.8, -3.92, 'O');
  for (let i = 0; i < 12; i++) for (let j = 0; j < 36; j++) {
    part.fine('plastic', disc(42.8 + i * 1.53, -40.4 + j * 1.77, 0.34, -3.92, -3.9, 6), 'O');
  }
  // speaker holes along the bottom rail
  for (let i = 0; i < 6; i++) {
    const x = 66 - i * 2.4;
    const hole = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 8);
    hole.rotateX(Math.PI / 2);
    for (const sign of [-1, 1]) part.add('plastic', hole.clone().translate(sign * x, -2.6, HALF_H - 0.24), sign < 0 ? 'B' : 'O');
    part.add('plastic', hole.clone().translate(i * 2.4 + 16, -2.6, -HALF_H + 0.24), 'O');
  }
  // the USB-C opening, the slots the side buttons sit in, and the panel screw holes either side of the port
  part.add('plastic', block(36.1, HALF_H - 0.2, 45.1, HALF_H + 0.02, -3.9, -1.1, 0.9), 'O');
  for (const [x0, x1] of [[-62, -51.2], [-48.8, -38]]) part.add('plastic', block(x0, -HALF_H - 0.02, x1, -HALF_H + 0.3, -3.6, -1.4, 0.4), 'B');
  for (const [z0, z1] of [[-30, -8], [8, 24]]) part.add('plastic', block(-HINGE.halfOpen - 0.02, z0, -HINGE.halfOpen + 0.3, z1, -3.6, -1.4, 0.4), 'B');
  for (const x of [33.6, 47.6]) for (const [sign, carrier] of [[-1, 'B'], [1, 'O']]) {
    const hole = new THREE.CylinderGeometry(0.46, 0.46, 0.2, 10);
    hole.rotateX(Math.PI / 2);
    part.add('plastic', hole.translate(sign * x, -2.6, HALF_H - 0.09), carrier);
  }
  // The hinge cover, after Apple's end-on photo. The matte centre band is what shows between the panels when open. A
  // black split runs the full height either side of it, then a polished shoulder on each side, which matches the rails.
  // The whole channel stays open toward the display, flush when closed, sunk under the panels when open.
  const half = HINGE.halfThick;
  const wall = 0.7;
  const band = HINGE.coverBand;
  const split = HINGE.coverSplit;
  const extrude = (shape) => {
    const solid = new THREE.ExtrudeGeometry(shape, {depth: SPEC.open.h - 1, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.2, bevelOffset: -0.2, bevelSegments: 2});
    return solid.translate(0, 0, -HALF_H + 0.5);
  };
  const shoulder = (sign) => {
    const shape = new THREE.Shape();
    shape.moveTo(sign * (band + split), -wall);
    shape.lineTo(sign * (half - wall), -wall);
    shape.lineTo(sign * (half - wall), -4.2);
    shape.lineTo(sign * half, -4.2);
    shape.lineTo(sign * half, -2.6);
    shape.quadraticCurveTo(sign * half, 0, sign * (half - 2.6), 0);
    shape.lineTo(sign * (band + split), 0);
    shape.closePath();
    return shape;
  };
  const centre = new THREE.Shape();
  centre.moveTo(-band, -wall);
  centre.lineTo(band, -wall);
  centre.lineTo(band, 0);
  centre.lineTo(-band, 0);
  centre.closePath();
  for (const z of [-HALF_H + 0.3, HALF_H - 1.1]) part.add('cover', block(-half + 0.3, z, half - 0.3, z + 0.8, -4.1, -0.5, 0.2), 'cover');
  part.add('cover', extrude(centre), 'cover');
  for (const sign of [-1, 1]) part.add('rail', extrude(shoulder(sign)), 'cover');
  // the black seen down each split
  for (const sign of [-1, 1]) {
    const [near, far] = [band + 0.04, band + split - 0.04].map((x) => sign * x);
    part.add('plastic', block(Math.min(near, far), -HALF_H + 0.8, Math.max(near, far), HALF_H - 0.8, -wall - 0.2, -0.08, 0.02), 'cover');
  }
  return part;
};

const buildBackGlass = () => {
  const part = createPart('backGlass');
  const [x0, , x1] = PART.backGlass.rect;
  part.add('backGlass', slab(outline(rect(x0, -58, x1, 58), [10.3, 1, 1, 10.3]), -0.7, 0, 0.12, 10));
  // the camera island, its two lenses and the flash
  const {z: lensZ, ring: lensRing} = LENSES;
  part.add('backGlass', slab(outline(rect(ISLAND.x0, lensZ - ISLAND.halfDepth, ISLAND.x1, lensZ + ISLAND.halfDepth), 11), 0, 1.5, 0.5, 14));
  for (const x of LENSES.x) {
    part.add('rail', ring(x, lensZ, lensRing - 2.1, lensRing, 1.4, 2.5));
    part.add('lens', disc(x, lensZ, lensRing - 2, 1.2, 2.3, 36));
    part.add('plastic', ring(x, lensZ, lensRing - 4.4, lensRing - 2, 2.3, 2.34, 32));
  }
  part.add('flash', disc(-37.5, lensZ, 2.4, -0.1, 0.05, 20));
  part.add('plastic', ring(-37.5, lensZ, 2.4, 2.9, -0.1, 0.03, 20));
  // the magnet ring on the underside and the flex that tethers the panel
  part.add('steel', ring(-42.5, 3, 23, 27.5, -1, -0.7, 56));
  for (let r = 7; r < 21; r += 1.4) part.fine('copper', ring(-42.5, 3, r, r + 1.05, -0.92, -0.72, 40));
  part.add('ribbon', flexRun([[-22, 40], [-22, 28], [-27, 18]], 5, -1, -0.86));
  part.add('plastic', block(-30, 37, -14, 42, -0.9, -0.7, 0.6));
  return part;
};

const buildOuterDisplay = () => {
  const part = createPart('outerDisplay');
  const [x0, , x1] = PART.outerDisplay.rect;
  part.add('screen', slab(outline(rect(x0, -58, x1, 58), [1, 10.3, 10.3, 1]), -0.7, 0, 0.12, 10));
  part.add('lens', disc(73.5, -49.8, 1.9, -0.02, 0.02, 20));
  part.add('rail', ring(73.5, -49.8, 1.9, 2.15, -0.02, 0.02, 20));
  part.add('plastic', block(30, 46, 58, 53, -1.1, -0.7, 0.8));
  part.add('ribbon', flexRun([[34, 50], [34, 40], [28, 30]], 6, -1, -0.86));
  return part;
};

const cellDetails = (part, x0, z0) => {
  // the printed rating block, as a few grey lines: no marks copied from the real label
  for (let i = 0; i < 6; i++) part.fine('brushed', block(x0, z0 + i * 1.1, x0 + 15 - ((i * 37) % 7), z0 + i * 1.1 + 0.26, -0.9, -0.89, 0.03));
};

const buildBattery1 = () => {
  const part = createPart('battery1');
  const points = [[-78, -28], [-42.7, -28], [-42.7, 11], [-16, 11], [-16, 40.6], [-78, 40.6]];
  part.add('pouch', slab(outline(points, [2.4, 2.4, 2, 2.4, 2.4, 2.4]), -3.7, -0.9, 0.34, 6));
  part.add('plastic', block(-78.2, -20, -77.2, 30, -3.4, -1.1, 0.2));
  part.add('plastic', block(-17, 15, -15.8, 36, -3.4, -1.1, 0.2));
  // the two silver release tabs and the flex to the logic board
  part.add('steel', block(-74, 40.2, -60, 42, -1.2, -0.9, 0.3));
  part.add('steel', block(-34, 40.2, -20, 42, -1.2, -0.9, 0.3));
  part.add('ribbon', flexRun([[-24, 15], [-24, 9]], 6, -1, -0.86));
  part.add('plastic', block(-27, 7.5, -21, 11, -1.1, -0.9, 0.5));
  part.fine('gold', block(-26.4, 8.2, -21.6, 10.4, -0.9, -0.88, 0.1));
  cellDetails(part, -72, 16);
  return part;
};

const buildBattery2 = () => {
  const part = createPart('battery2');
  const points = [[17.4, -40], [72, -40], [72, -33], [79.8, -33], [79.8, 37.4], [17.4, 37.4]];
  part.add('pouch', slab(outline(points, [2.4, 1, 1.4, 2.4, 2.4, 2.4]), -3.7, -0.9, 0.34, 6));
  part.add('plastic', block(30, 36.6, 72, 37.7, -3.4, -1.1, 0.2));
  part.add('plastic', block(17.1, -30, 18, 30, -3.4, -1.1, 0.2));
  // the two black release tabs Apple names for this cell
  part.add('plastic', block(34, 37.6, 46, 39, -1.2, -0.9, 0.3));
  part.add('plastic', block(52, 37.6, 64, 39, -1.2, -0.9, 0.3));
  part.add('plastic', disc(68, -36, 2.2, -1, -0.86, 16));
  part.add('steel', ring(68, -36, 2.2, 3, -1, -0.86, 16));
  part.add('ribbon', flexRun([[27, 34], [27, 45]], 5.4, -1, -0.86));
  part.add('plastic', block(23.6, 42, 30.4, 46, -1.1, -0.9, 0.4));
  cellDetails(part, 26, 12);
  return part;
};

const speaker = (id, x0, z0, x1, z1) => {
  const part = createPart(id);
  const {y} = PART[id];
  part.add('plastic', slab(outline(rect(x0, z0, x1, z1), 1.6), y[0], y[1], 0.25, 5));
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  const w = (x1 - x0) * 0.32;
  const h = (z1 - z0) * 0.26;
  part.add('steel', slab(outline(rect(mx - w, mz - h, mx + w, mz + h), 1), y[1], y[1] + 0.08, 0, 4));
  const span = x1 - x0;
  for (let i = 0; i < 14; i++) part.fine('steel', disc(x0 + span * 0.14 + (i * span * 0.72) / 13, id === 'topSpeaker' ? z0 + 1 : z1 - 1, 0.32, y[1], y[1] + 0.02, 8));
  part.add('ribbon', flexRun(id === 'topSpeaker' ? [[x1 - 6, z1 - 1], [x1 + 2, z1 + 3]] : [[x1 - 8, z0 + 1], [x1 + 3, z0 - 1]], 2.4, y[1] - 0.16));
  return B.collars(part, id);
};

const buildTaptic = () => {
  const part = createPart('taptic');
  const [x0, z0, x1] = PART.taptic.rect;
  const [y0, y1] = PART.taptic.y;
  const z1 = 52.4;
  part.add('steel', slab(outline(rect(x0 + 2.2, z0, x1 - 2.2, z1), 0.6), y0, y1, 0.16, 4));
  part.add('plastic', block(x0, z0 + 0.4, x0 + 2.4, z1 - 0.4, y0 + 0.2, y1 - 0.2, 0.5));
  part.add('plastic', block(x1 - 2.4, z0 + 0.4, x1, z1 - 0.4, y0 + 0.2, y1 - 0.2, 0.5));
  part.add('gold', block(x0 + 6, z0 + 2, x0 + 12, z0 + 3.6, y1, y1 + 0.05, 0.1));
  part.add('cowl', block(-34.4, 51.6, -31.6, 56.4, y1 - 0.2, y1, 0.5));
  part.add('cowl', block(-15.2, 51.6, -12.4, 55.4, y1 - 0.2, y1, 0.5));
  part.add('ribbon', flexRun([[x0 + 9, z0 + 1], [x0 + 9, 40]], 3, y1 - 0.16));
  return B.collars(part, 'taptic');
};

const buildUsbC = () => {
  const part = createPart('usbC');
  const [x0, z0, x1, z1] = PART.usbC.rect;
  const [y0, y1] = PART.usbC.y;
  part.add('steel', slab(outline(rect(x0 + 2.8, z0 + 2, x1 - 2.8, z1), 0.9), y0, y1, 0.14, 4));
  part.add('plastic', block(x0 + 3.8, z1 - 3.6, x1 - 3.8, z1 + 0.06, y0 + 0.7, y1 - 0.7, 0.6));
  part.add('gold', block(x0 + 5, z1 - 1.2, x1 - 5, z1 + 0.08, y0 + 1.25, y1 - 1.25, 0.05));
  part.add('cowl', block(x0, z0, x1, z0 + 2.6, y1 - 0.3, y1, 0.5));
  part.add('ribbon', flexRun([[40.6, z0 + 1], [40.6, z0 - 3]], 8, y1 - 0.14));
  // the gasket around the port
  part.add('plastic', block(x0 + 2.2, z1 - 1.6, x0 + 2.8, z1 - 0.6, y0 + 0.3, y1 - 0.3, 0.1));
  part.add('plastic', block(x1 - 2.8, z1 - 1.6, x1 - 2.2, z1 - 0.6, y0 + 0.3, y1 - 0.3, 0.1));
  return B.collars(part, 'usbC');
};

const buildRearCamera = () => {
  const part = createPart('rearCamera');
  const lensZ = LENSES.z;
  part.add('steel', block(-78.4, -55, -60, -35, -4.2, -1.8, 1.2, 0.14));
  part.add('steel', block(-60.5, -55, -42.7, -35, -4.2, -1.8, 1.2, 0.14));
  for (const [x, r] of [[LENSES.x[0], 7.2], [LENSES.x[1], 7.8]]) {
    part.add('plastic', disc(x, lensZ, r, -1.8, -0.9, 32));
    part.add('plastic', disc(x, lensZ, r * 0.76, -0.9, -0.3, 28));
    part.add('lens', disc(x, lensZ, r * 0.52, -0.3, -0.24, 24));
  }
  part.add('cowl', block(-60.6, -36, -57, -33, -2.2, -1.8, 0.5));
  part.add('cowl', block(-43.4, -42.2, -35.6, -39, -1.5, -1.3, 0.6));
  part.add('cowl', block(-78.4, -53.4, -74.8, -49.6, -2, -1.8, 0.5));
  for (const [x, z, w] of [[-52, -35, 2.4], [-47, -35, 2.4]]) {
    part.add('ribbon', flexRun([[x, z + 1], [x, z - 1.6], [-40.6, z + 8 + (x === -52 ? -6 : 0)]], w, -1.5, -1.36));
  }
  return B.collars(part, 'rearCamera', -1.8);
};

const buildFaceTime = () => {
  const part = createPart('faceTime');
  const [x0, z0, x1, z1] = PART.faceTime.rect;
  const [y0, y1] = PART.faceTime.y;
  part.add('plastic', block(x0, z0, x1, z1, y0 + 0.8, y1, 0.4, 0.1));
  part.add('plastic', disc((x0 + x1) / 2, (z0 + z1) / 2, 2.2, y0, y0 + 0.8, 18));
  part.add('lens', disc((x0 + x1) / 2, (z0 + z1) / 2, 1.3, y0 - 0.04, y0, 16));
  part.add('steel', block(x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, y1, y1 + 0.1, 0.3));
  part.add('ribbon', flexRun([[x1 - 1, z0 + 3.4], [x1 + 3, z0 + 3.4], [x1 + 3, z0 + 8]], 2.4, y1 - 0.3));
  return part;
};

const buildOuterFront = () => {
  const part = createPart('outerFront');
  const [x0, z0, x1, z1] = PART.outerFront.rect;
  const [y0, y1] = PART.outerFront.y;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  part.add('steel', block(x0, z0, x1, z1, y0, y0 + 0.5, 0.5, 0.08));
  part.add('plastic', disc(cx, cz, 3.2, y0 + 0.5, y1 - 0.5, 20));
  part.add('plastic', disc(cx, cz, 2.1, y1 - 0.5, y1, 18));
  part.add('lens', disc(cx, cz, 1.3, y1, y1 + 0.04, 16));
  part.add('cowl', block(70, -56.4, 72.2, cz, y1 - 0.2, y1, 0.4));
  part.add('cowl', block(77.8, -51.4, 80, -49.2, y1 - 0.2, y1, 0.4));
  part.add('ribbon', flexRun([[cx, cz + 3], [cx - 8, cz + 3]], 2.4, y0 + 0.5));
  return B.collars(part, 'outerFront');
};

/** A ribbon across the fold for each z span, both faces shared, that the model reshapes as the phone folds. */
const flexingStrip = (part, frontFace, backFace, spans, curveAt = M.displayCurve, samples = 32) => {
  const count = (samples + 1) * 2;
  const positions = new Float32Array(count * spans.length * 3);
  const normals = new Float32Array(count * spans.length * 3);
  const index = [];
  spans.forEach((_, span) => {
    for (let i = 0; i < samples; i++) {
      const a = span * count + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  ribbon.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  ribbon.setIndex(index);
  const front = new THREE.Mesh(ribbon, makeMaterial(frontFace, part.style, THREE.BackSide));
  const back = new THREE.Mesh(ribbon, makeMaterial(backFace, part.style, THREE.FrontSide));
  part.group('strip').add(front, back);
  part.meshes.push(front, back);
  return (phi) => {
    const curve = curveAt(phi, samples);
    spans.forEach(([z0, z1], span) => {
      for (let i = 0; i <= samples; i++) {
        const [x, y] = curve[i];
        const [px, py] = curve[Math.max(i - 1, 0)];
        const [nx, ny] = curve[Math.min(i + 1, samples)];
        const tx = nx - px;
        const ty = ny - py;
        const len = Math.hypot(tx, ty) || 1;
        const at = (span * count + i * 2) * 3;
        positions.set([x, y, z0, x, y, z1], at);
        normals.set([-ty / len, tx / len, 0, -ty / len, tx / len, 0], at);
      }
    });
    ribbon.attributes.position.needsUpdate = true;
    ribbon.attributes.normal.needsUpdate = true;
    ribbon.computeBoundingSphere();
  };
};

const buildInnerDisplay = () => {
  const part = createPart('innerDisplay');
  const edge = HINGE.displayEdge;
  for (const [sign, carrier] of [[-1, 'B'], [1, 'O']]) {
    const near = sign * edge;
    const far = sign * 81;
    const points = sign > 0 ? rect(near, -57, far, 57) : rect(far, -57, near, 57);
    const radii = sign > 0 ? [0, 9.5, 9.5, 0] : [9.5, 0, 0, 9.5];
    part.add('matte', slab(outline(points, radii), -5.2, -4.95, 0, 8), carrier);
    part.add('plate', slab(outline(points, radii), -4.95, -4.6, 0, 8), carrier);
    // the dark bands the display's backing carries near the fold
    part.add('plastic', block(sign > 0 ? near + 1 : near - 7, -54, sign > 0 ? near + 7 : near - 1, 54, -4.6, -4.54, 0.3), carrier);
    for (const z of [-46, -10, 26, 50]) part.add('copper', disc(sign * 74, z, 0.9, -4.6, -4.56, 10), carrier);
  }
  part.add('lens', disc(-68, -40, 1.6, -5.24, -5.2, 18), 'B');
  part.add('plastic', block(36, -56, 60, -44, -4.6, -4.5, 1), 'O');
  // the flexing middle
  part.setStrip = flexingStrip(part, 'matte', 'plate', [[-57, 57]]);
  return part;
};

const buildDisplayTrim = () => {
  const part = createPart('displayTrim');
  const edge = HINGE.displayEdge;
  for (const [sign, carrier] of [[-1, 'B'], [1, 'O']]) {
    const far = sign * 81;
    const trim = outline(sign > 0 ? rect(edge, -58, sign * 82, 58) : rect(sign * 82, -58, -edge, 58), sign > 0 ? [0, 10, 10, 0] : [10, 0, 0, 10]);
    trim.holes.push(new THREE.Path(outline(sign > 0 ? rect(edge + 0.1, -56.6, far - 0.4, 56.6) : rect(far + 0.4, -56.6, -edge - 0.1, 56.6), sign > 0 ? [0, 9, 9, 0] : [9, 0, 0, 9]).getPoints(8)));
    part.add('plastic', slab(trim, -5.32, -4.9, 0, 8), carrier);
    // the clips at the hinge end that Apple has you unhook
    for (const z of [-57.2, 56.2]) part.add('steel', block(sign > 0 ? edge + 1 : -edge - 7, z, sign > 0 ? edge + 7 : -edge - 1, z + 1, -4.9, -4.7, 0.2), carrier);
  }
  // the trim follows the display round the bend, along both ends of the fold
  part.setStrip = flexingStrip(part, 'plastic', 'plastic', [[-57.8, -57], [57, 57.8]]);
  return part;
};

const buildCoverLayer = () => {
  const part = createPart('coverLayer');
  const [x0, z0, x1, z1] = PART.coverLayer.rect;
  const [y0, y1] = PART.coverLayer.y;
  part.add('nano', slab(outline(rect(x0, z0, x1, z1), 9.5), y0, y1, 0, 8));
  return part;
};

// The hinge, after iFixit's end-on photo: at each end a pin block, a bank of springs, the gear train, a second bank of
// springs and a second block, with the flat center support between the two groups.
const ZONES = {pinOuter: [52, 57], springOuter: [40, 51.4], gears: [33, 39.4], springInner: [21, 32.4], pinInner: [14.4, 20.4]};
const GEAR_R = 1.1;
const GEAR_Y = -2.9;
const GEAR_X = [-3 * GEAR_R, -GEAR_R, GEAR_R, 3 * GEAR_R];
const ARM_ROWS = [[15, 23.5], [24, 32.5], [33, 41.5], [42, 50.5], [51, 56.5]].flatMap(([a, b]) => [[a, b], [-b, -a]]);

// A dual-axis hinge: the blocks' outer wings ride on each half's axis, so they turn with the half while the middle
// stays with the cover. A part outside an axis goes to that side's wing; a block across both is cut at the axes.
const WING = HINGE.axisX;
const wingOf = (x) => (x > WING ? 'R' : x < -WING ? 'L' : '');

const buildHinge = () => {
  const part = createPart('hinge');
  const y = -3.3;
  const wide = (material, x0, x1, z0, z1, y0, y1, r, bevel, name) => {
    for (const [a, b] of [[x0, -WING], [-WING, WING], [WING, x1]]) {
      const lo = Math.max(a, x0);
      const hi = Math.min(b, x1);
      if (hi - lo > 0.05) part.add(material, block(lo, z0, hi, z1, y0, y1, Math.min(r, (hi - lo) / 2 - 0.01), bevel), name + wingOf((lo + hi) / 2));
    }
  };
  for (const end of [-1, 1]) {
    const zone = (name) => {
      const [a, b] = ZONES[name];
      return end > 0 ? [a, b] : [-b, -a];
    };
    for (const name of ['pinOuter', 'pinInner']) {
      const [z0, z1] = zone(name);
      wide('steel', -4.8, 4.8, z0, z1, -3.9, -2.4, 0.5, 0.1, 'pins');
      for (const x of [-3, 3]) {
        part.add('gold', disc(x, (z0 + z1) / 2, 1.4, -3.96, -3.9, 16), 'pins' + wingOf(x));
        part.add('plastic', disc(x, (z0 + z1) / 2, 0.6, -4, -3.96, 10), 'pins' + wingOf(x));
      }
      // the pins through each block, and the retaining clips on their ends
      for (const x of [-4.2, -1.2, 1.2, 4.2]) {
        const pin = new THREE.CylinderGeometry(0.34, 0.34, z1 - z0 + 0.8, 8);
        pin.rotateX(Math.PI / 2);
        part.fine('steel', pin.translate(x, -2.2, (z0 + z1) / 2), 'pins' + wingOf(x));
        for (const z of [z0 - 0.3, z1 + 0.3]) {
          const clip = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 10);
          clip.rotateX(Math.PI / 2);
          part.fine('gold', clip.translate(x, -2.2, z), 'pins' + wingOf(x));
        }
      }
    }
    for (const name of ['springOuter', 'springInner']) {
      const [z0, z1] = zone(name);
      for (const x of [-4, -2.4, -0.8, 0.8, 2.4, 4]) part.fine('steel', spring(x, y, z0, z1, 0.7), 'springs' + wingOf(x));
      wide('frame', -4.8, 4.8, z0 - 0.2, z0 + 0.2, -3.9, -2.6, 0.1, 0, 'springs');
      wide('frame', -4.8, 4.8, z1 - 0.2, z1 + 0.2, -3.9, -2.6, 0.1, 0, 'springs');
    }
    const [z0, z1] = zone('gears');
    wide('frame', -4.8, 4.8, z0, z0 + 0.8, -3.9, -2.4, 0.2, 0, 'gears');
    wide('frame', -4.8, 4.8, z1 - 0.8, z1, -3.9, -2.4, 0.2, 0, 'gears');
  }
  // the center support bar, dark, with a gap for the flex cable
  for (const [z0, z1] of [[-13.6, -7.6], [7.6, 13.6]]) {
    wide('plastic', -4.8, 4.8, z0, z1, -3.9, -2.6, 0.4, 0.06, 'bar');
    for (const x of [-3.4, 3.4]) part.fine('steel', disc(x, (z0 + z1) / 2, 0.6, -2.6, -2.56, 10), 'bar' + wingOf(x));
  }
  part.add('plastic', block(-4.8, -13.6, -3.4, 13.6, -3.9, -2.6, 0.3), 'barL');
  part.add('plastic', block(3.4, -13.6, 4.8, 13.6, -3.9, -2.6, 0.3), 'barR');
  // the backing over each wing, joining the plate on the arms, so only the spine between the two axes shows
  const reach = M.hingeLinks(0)[2].x + 0.15;
  for (const [sign, side] of [[-1, 'L'], [1, 'R']]) {
    for (const [z0, z1] of [[-57.4, 57.4]]) {
      const [x0, x1] = sign > 0 ? [WING + 0.1, reach] : [-reach, -WING - 0.1];
      part.add('frame', block(x0, z0, x1, z1, HINGE.axisY - 0.98, HINGE.axisY - 0.58, 0.2), 'pins' + side);
    }
  }
  M.hingeLinks(0).forEach(({length}, level) => {
    for (const sign of [-1, 1]) {
      const carrier = `link${sign > 0 ? 'R' : 'L'}${level}`;
      for (const [z0, z1] of ARM_ROWS) {
        const fit = (geometry) => (sign > 0 ? geometry : geometry.rotateY(Math.PI).translate(0, 0, z0 + z1));
        part.add(level === 1 ? 'can' : 'steel', fit(block(0, z0 + level * 0.2, length, z1 - level * 0.2, -0.3, 0.3, 0.3)), carrier);
        if (level < 2) continue;
        part.add('steel', fit(block(1.4, z0 + 1.6, 4.8, z1 - 1.6, -0.5, -0.3, 0.4)), carrier);
        part.add('gold', fit(disc(length - 0.9, (z0 + z1) / 2, 0.7, -0.36, -0.3, 12)), carrier);
      }
      if (level < 2) continue;
      // the frame around the cable's window, at the middle of the arm column
      const flip = (geometry) => (sign > 0 ? geometry : geometry.rotateY(Math.PI));
      for (const z of [-13.6, 12.6]) part.add('steel', flip(block(0, z, length, z + 1, -0.3, 0.3, 0.2)), carrier);
      part.add('steel', flip(block(length - 1, -13.6, length, 13.6, -0.3, 0.3, 0.2)), carrier);
      // the backing plate over the arms, level with the frame's floor, so from the display side only the middle of the
      // hinge shows. It leaves a window for the flex cable.
      const plate = BACKING_EDGE - M.hingeLinks(0)[level].x;
      for (const [z0, z1] of [[-57.4, 57.4]]) part.add('frame', flip(block(0.15, z0, plate, z1, -0.98, -0.58, 0.2)), carrier);
    }
  });
  const tooth = gear(GEAR_R, 10, 4);
  const toothMaterial = makeMaterial('gold', part.style);
  part.gears = [];
  for (const end of [-1, 1]) {
    const [a, b] = ZONES.gears;
    const z = end * ((a + b) / 2);
    GEAR_X.forEach((x, i) => {
      const mesh = new THREE.Mesh(tooth, toothMaterial);
      mesh.position.set(x, GEAR_Y, z);
      mesh.userData.index = i;
      part.group('gears' + wingOf(x)).add(mesh);
      part.meshes.push(mesh);
      part.gears.push(mesh);
    });
  }
  return part;
};

const buildFlexCable = () => {
  const part = createPart('flexCable');
  const [y0] = PART.flexCable.y;
  const edge = HINGE.displayEdge;
  part.setStrip = flexingStrip(part, 'plastic', 'plastic', [[-6.5, 6.5]], M.cableCurve, 72);
  for (const [sign, carrier] of [[-1, 'B'], [1, 'O']]) {
    part.add('plastic', block(sign > 0 ? edge - 0.4 : -28, -6.5, sign > 0 ? 28 : 0.4 - edge, 6.5, y0, y0 + 0.3, 0.4), carrier);
    part.add('gold', block(sign > 0 ? 24.5 : -27.2, -5.6, sign > 0 ? 27.2 : -24.5, 5.6, y0 + 0.3, y0 + 0.36, 0.2), carrier);
    // the traces that carry power, video and audio, and a stiffener behind each connector
    for (let z = -5; z <= 5; z += 1.25) part.fine('copper', block(sign > 0 ? edge : -24.4, z - 0.09, sign > 0 ? 24.4 : -edge, z + 0.09, y0 + 0.3, y0 + 0.32, 0.02), carrier);
    part.add('cowl', block(sign > 0 ? 20 : -24, -6.4, sign > 0 ? 24 : -20, 6.4, y0 + 0.3, y0 + 0.42, 0.3), carrier);
  }
  return part;
};

const BUILD = {
  enclosure: buildEnclosure,
  backGlass: buildBackGlass,
  outerDisplay: buildOuterDisplay,
  backAdhesive: B.buildBackAdhesive,
  outerAdhesive: B.buildOuterAdhesive,
  batteryCowling: B.buildBatteryCowling,
  boardCowling: B.buildBoardCowling,
  faceTimeCowling: B.buildFaceTimeCowling,
  ioCowling: B.buildIoCowling,
  alsCowling: B.buildAlsCowling,
  battery1: buildBattery1,
  battery2: buildBattery2,
  bottomSpeaker: () => speaker('bottomSpeaker', ...PART.bottomSpeaker.rect),
  lowerAntenna: B.buildLowerAntenna,
  taptic: buildTaptic,
  mainMic: B.buildMainMic,
  topSpeaker: () => speaker('topSpeaker', ...PART.topSpeaker.rect),
  usbC: buildUsbC,
  cameraSpacer: B.buildCameraSpacer,
  rearCamera: buildRearCamera,
  faceTime: buildFaceTime,
  outerFront: buildOuterFront,
  upperAntenna: B.buildUpperAntenna,
  logicBoard: buildLogicBoard,
  ioBoard: buildIoBoard,
  displayTrim: buildDisplayTrim,
  coverLayer: buildCoverLayer,
  innerDisplay: buildInnerDisplay,
  hinge: buildHinge,
  flexCable: buildFlexCable,
  volumeButtons: B.buildVolumeButtons,
  touchId: B.buildTouchId,
};

// ------------------------------------------------------------ assembly
/** A carrier turns about one hinge axis while its children keep flat-open coordinates. */
const carrier = (sign) => {
  const pivot = new THREE.Group();
  pivot.position.set(sign * HINGE.axisX, HINGE.axisY, 0);
  const inner = new THREE.Group();
  inner.position.set(-sign * HINGE.axisX, -HINGE.axisY, 0);
  pivot.add(inner);
  return {pivot, inner};
};

export function buildPhone({shadows}) {
  const root = new THREE.Group();
  const parts = Object.fromEntries(Object.entries(BUILD).map(([id, make]) => {
    const part = make();
    part.build(shadows);
    return [id, part];
  }));

  // what rides on each half until it is removed, and the shell, which keeps flexing in the hinge step
  const cargoB = carrier(-1);
  const cargoO = carrier(1);
  const shellB = carrier(-1);
  const shellO = carrier(1);
  root.add(cargoB.pivot, cargoO.pivot, shellB.pivot, shellO.pivot);

  const side = {B: cargoB, O: cargoO};
  for (const part of Object.values(parts)) {
    if (PART[part.id].side !== 'C') side[PART[part.id].side].inner.add(part.group());
  }
  const placePieces = createPieces(side);
  shellB.inner.add(parts.enclosure.group('B'));
  shellO.inner.add(parts.enclosure.group('O'));
  root.add(parts.enclosure.group('cover'));
  for (const id of ['innerDisplay', 'displayTrim']) {
    cargoB.inner.add(parts[id].group('B'));
    cargoO.inner.add(parts[id].group('O'));
  }
  root.add(parts.innerDisplay.group('strip'), parts.displayTrim.group('strip'), parts.coverLayer.group());
  shellB.inner.add(parts.flexCable.group('B'));
  shellO.inner.add(parts.flexCable.group('O'));
  root.add(parts.flexCable.group('strip'));

  // the hinge's chain of links lives in the cover's frame, posed joint by joint
  const hingeRoot = new THREE.Group();
  const HINGE_GROUPS = ['pins', 'springs', 'gears', 'bar'];
  const hingeGroups = Object.fromEntries(HINGE_GROUPS.map((name) => [name, parts.hinge.group(name)]));
  hingeRoot.add(...Object.values(hingeGroups));
  // each wing turns about its half's axis
  const wings = Object.fromEntries(HINGE_GROUPS.map((name) => {
    const pair = {L: carrier(-1), R: carrier(1)};
    pair.L.inner.add(parts.hinge.group(`${name}L`));
    pair.R.inner.add(parts.hinge.group(`${name}R`));
    hingeRoot.add(pair.L.pivot, pair.R.pivot);
    return [name, pair];
  }));
  const links = [0, 1, 2].map((level) => ({L: parts.hinge.group(`linkL${level}`), R: parts.hinge.group(`linkR${level}`)}));
  for (const {L, R} of links) hingeRoot.add(L, R);
  root.add(hingeRoot);

  const list = Object.values(parts);
  // the first thing to go on a struggling device: the crowd of tiny passives and pads
  let detail = true;
  const setDetail = (on) => {
    detail = on;
  };

  const update = (p, focus = null, iso = 0, pick = null, was = null, swap = 1) => {
    const pose = M.rootPose(p);
    root.rotation.z = pose.rot;
    root.position.set(pose.x, pose.y, 0);
    const phi = pose.phi;
    const shell = phi + M.framePhi(p);
    cargoB.pivot.rotation.z = phi;
    cargoO.pivot.rotation.z = -phi;
    shellB.pivot.rotation.z = shell;
    shellO.pivot.rotation.z = -shell;
    parts.enclosure.group('cover').position.y = M.coverY(shell);

    for (const part of list) {
      const [x, y, z] = M.offsetOf(part.id, p);
      for (const name of Object.keys(part.groups)) {
        if (part.id === 'enclosure' || part.id === 'hinge') continue;
        part.groups[name].position.set(x, y, z);
      }
      const style = M.styleOf(part.id, p, focus, iso, was, swap);
      part.style.uDrawing.value = style.drawing;
      part.style.uTint.value = style.tint;
      part.lines.color.copy(INK).lerp(ORANGE, style.line);
      part.lines.opacity = 0.26 - 0.15 * style.drawing + 0.44 * style.line;
      for (const mesh of part.meshes) {
        mesh.castShadow = style.drawing < 0.5;
        mesh.visible = style.drawing < 1;
        mesh.material.transparent = style.drawing > 0;
      }
      for (const mesh of part.details) {
        mesh.visible = detail && style.drawing < 1;
        mesh.material.transparent = style.drawing > 0;
      }
    }

    const [, drop] = M.offsetOf('hinge', p);
    hingeRoot.position.y = drop;
    const joints = M.hingeLinks(shell);
    joints.forEach(({x, y, rot}, level) => {
      links[level].R.position.set(x, y, 0);
      links[level].R.rotation.z = rot;
      links[level].L.position.set(-x, y, 0);
      links[level].L.rotation.z = -rot;
    });
    for (const mesh of parts.hinge.gears) mesh.rotation.z = M.gearTurn(shell, mesh.userData.index);
    const rise = M.hingeRise(shell);
    const spread = M.hingeSpread(p);
    for (const name of HINGE_GROUPS) {
      const lift = rise + (spread[name] ?? 0);
      hingeGroups[name].position.y = lift;
      wings[name].L.pivot.position.y = HINGE.axisY + lift;
      wings[name].R.pivot.position.y = HINGE.axisY + lift;
      wings[name].L.pivot.rotation.z = shell;
      wings[name].R.pivot.rotation.z = -shell;
    }
    parts.innerDisplay.setStrip(phi);
    parts.displayTrim.setStrip(phi);
    parts.flexCable.setStrip(phi);
    // one flat sheet across the fold: it only exists once the phone is open and the sheet has started to come off
    parts.coverLayer.group().visible = M.partK('coverLayer', p) > 0;
    placePieces(p, focus, iso, pick, was, swap);
  };

  return {root, parts, update, setDetail};
}
