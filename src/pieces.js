// Every screw and chip is one instance, so all of them together cost a handful of draw calls. update(p) writes where each
// one is, straight from the model. Nothing here keeps a position of its own.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as M from './model.js';
import {disc, lobes, makePieceMaterial, outline} from './shapes.js';

const STEEL = '#cfd0d3';
const SHAFT = '#9c9ea3';
const DARK = '#0c0d0f';
const SUBSTRATE = '#39402f';
const MOLD = '#1a1b1f';
const MARKING = '#4e5157';
const TOPS = {package: MOLD, lid: '#c2c4c8', die: '#2c3442'};

const HEAD_R = 0.72;
const HEAD_H = 0.32;
const SHAFT_LENGTH = 1.5;
const SUNK = 0.3;

const paint = (geometry, tone) => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute('uv');
  const color = new THREE.Color(tone);
  const count = flat.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
};

// ------------------------------------------------------------ screws: +y points out of the hole, y = 0 is under the head
const shaft = () => {
  const turns = 5;
  const profile = [new THREE.Vector2(0, -SHAFT_LENGTH)];
  for (let i = 0; i <= turns * 2; i++) profile.push(new THREE.Vector2(i % 2 ? 0.38 : 0.3, -SHAFT_LENGTH + (SHAFT_LENGTH * i) / (turns * 2)));
  return paint(new THREE.LatheGeometry(profile, 7), SHAFT);
};
const roundHead = () => {
  const profile = [[0.3, 0], [HEAD_R, 0], [HEAD_R, HEAD_H * 0.6], [HEAD_R * 0.86, HEAD_H], [0, HEAD_H]].map(([x, y]) => new THREE.Vector2(x, y));
  return paint(new THREE.LatheGeometry(profile, 14), STEEL);
};
const recess = (shape, y) => paint(new THREE.ShapeGeometry(shape, 4).rotateX(-Math.PI / 2).translate(0, y + 0.012, 0), DARK);

const cross = () => {
  const a = 0.09;
  const b = 0.42;
  return outline([[a, a], [b, a], [b, -a], [a, -a], [a, -b], [-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a], [-a, b], [a, b]]);
};
const round = (radius) => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
};

/** A standoff: the top screw of a pair threads into the hole in this one. */
const superHead = () => {
  const height = 0.9;
  const body = new THREE.CylinderGeometry(0.92, 0.92, height, 6).translate(0, height / 2, 0);
  return mergeGeometries([shaft(), paint(body, '#b9a57f'), recess(round(0.46), height)]);
};

const screwShape = (shape) => mergeGeometries([shaft(), roundHead(), recess(shape, HEAD_H)]);
const SCREW_SHAPES = {
  crosshead: () => screwShape(cross()),
  pentalobe: () => screwShape(lobes(5, 0.2, 0.44)),
  trilobe: () => screwShape(lobes(3, 0.18, 0.46)),
  torx: () => screwShape(lobes(6, 0.25, 0.44)),
  super: superHead,
};

// ------------------------------------------------------------ chips: a unit block, scaled per instance
const chipUnit = (surface) => {
  const flat = (x, z, w, d, tone) => paint(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, 0.504, z), tone);
  const pieces = [
    paint(new THREE.BoxGeometry(1, 0.32, 1).translate(0, -0.34, 0), SUBSTRATE),
    paint(new THREE.BoxGeometry(0.95, 0.68, 0.95).translate(0, 0.16, 0), TOPS[surface]),
  ];
  if (surface === 'package') {
    // a pin 1 dot and a few bars standing in for the laser marking; no real marks are copied
    pieces.push(paint(disc(-0.36, -0.36, 0.05, 0.5, 0.505, 8), MARKING));
    for (const [z, w] of [[-0.14, 0.5], [0, 0.62], [0.14, 0.36]]) pieces.push(flat(w / 2 - 0.28, z, w, 0.05, MARKING));
  }
  return mergeGeometries(pieces);
};

// ------------------------------------------------------------ batches
const sortInto = (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
};

const SIDE_UP = new THREE.Vector3(0, 1, 0);
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

/** The rest pose of a piece: rotation and scale never change, so only the translation is rewritten per frame. */
const restOf = (piece) => {
  const [x, y, z] = M.pieceHome(piece);
  const position = new THREE.Vector3(x, y, z);
  if (piece.kind === 'chip') {
    return {position, quaternion: piece.side === 'back' ? FLIP : new THREE.Quaternion(), scale: new THREE.Vector3(piece.w, piece.h, piece.d)};
  }
  const out = new THREE.Vector3(...piece.dir);
  // a screw in the rail sits flush with it
  if (piece.dir[1] !== 1) position.addScaledVector(out, -SUNK);
  return {position, quaternion: new THREE.Quaternion().setFromUnitVectors(SIDE_UP, out), scale: new THREE.Vector3(1, 1, 1)};
};

const createBatch = (items, geometry, material) => {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const style = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 2), 2);
  style.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aStyle', style);
  const matrix = new THREE.Matrix4();
  const homes = items.map((piece, i) => {
    const {position, quaternion, scale} = restOf(piece);
    mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
    return position;
  });
  const update = (p, focus, iso, pick, was, swap) => {
    const matrices = mesh.instanceMatrix.array;
    items.forEach((piece, i) => {
      const [x, y, z] = M.pieceOffset(piece, p);
      const home = homes[i];
      matrices[i * 16 + 12] = home.x + x;
      matrices[i * 16 + 13] = home.y + y;
      matrices[i * 16 + 14] = home.z + z;
      const {drawing, tint} = M.pieceStyle(piece, p, focus, iso, pick, was, swap);
      style.array[i * 2] = drawing;
      style.array[i * 2 + 1] = tint;
    });
    mesh.instanceMatrix.needsUpdate = true;
    style.needsUpdate = true;
  };
  return {mesh, update};
};

/** carriers: what rides each half, by the part's side. */
export function createPieces(carriers) {
  const fastener = makePieceMaterial('fastener');
  const faces = {package: makePieceMaterial('package'), lid: makePieceMaterial('lid'), die: makePieceMaterial('die')};
  const sideOf = (piece) => M.PART[piece.host].side;
  const batches = [
    ...sortInto(M.PIECES.filter((piece) => piece.kind === 'screw'), (screw) => `${sideOf(screw)}/${screw.head}`)
      .map((items) => ({items, geometry: SCREW_SHAPES[items[0].head](), material: fastener})),
    ...sortInto(M.PIECES.filter((piece) => piece.kind === 'chip'), (chip) => `${sideOf(chip)}/${chip.surface}`)
      .map((items) => ({items, geometry: chipUnit(items[0].surface), material: faces[items[0].surface]})),
  ].map(({items, geometry, material}) => {
    const batch = createBatch(items, geometry, material);
    carriers[sideOf(items[0])].inner.add(batch.mesh);
    return batch;
  });
  return (p, focus, iso, pick, was, swap) => {
    for (const batch of batches) batch.update(p, focus, iso, pick, was, swap);
    for (const material of [fastener, ...Object.values(faces)]) material.transparent = iso > 0;
  };
}
