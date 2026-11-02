// The small parts that are not boards or chips: adhesive sheets, steel cowlings, antenna flex cables, the spacer, the
// microphone and the side buttons. Shapes are traced from Apple's procedures and every hole lands on a real screw position.
import {IO_OUTLINE} from './hardware.js';
import * as M from './model.js';
import {block, createPart, disc, flexRun, outline, pierced, rect, ring, slab} from './shapes.js';

const {HALF_H, HINGE, PART} = M;
const RAIL = HINGE.halfOpen;

/** Screws that go straight down into this part. */
const seated = (id) => (M.SCREWS_OF[id] ?? []).filter((screw) => screw.dir[1] === 1).map(({x, z}) => [x, z]);

/** A collar around each screw, on the part's top face, so an empty hole still reads once the screw is out. */
export const collars = (part, id, y = PART[id].y[1]) => {
  for (const [x, z] of seated(id)) part.fine('steel', ring(x, z, 0.62, 1.1, y - 0.02, y + 0.03, 14));
  return part;
};

const plate = (id, points, surface = 'cowl', radius = 0.8) => {
  const part = createPart(id);
  const [y0, y1] = PART[id].y;
  part.add(surface, slab(pierced(outline(points, radius), seated(id), 0.72), y0, y1, 0, 4));
  return collars(part, id);
};

// ------------------------------------------------------------ adhesive: a sheet cut to the edge of the panel
const sheet = (id, corners) => {
  const part = createPart(id);
  const [x0, z0, x1, z1] = PART[id].rect;
  const [y0, y1] = PART[id].y;
  const edge = 2.6;
  const shape = outline(rect(x0, z0, x1, z1), corners);
  shape.holes.push(outline(rect(x0 + edge, z0 + edge, x1 - edge, z1 - edge), corners.map((r) => Math.max(r - edge, 0.4))));
  part.add('film', slab(shape, y0, y1, 0, 8));
  // the pull tabs Apple's steps start from
  part.fine('film', block(x0 + 10, z1 - 2.6, x0 + 18, z1 + 0.6, y0, y1, 0.8));
  return part;
};
export const buildBackAdhesive = () => sheet('backAdhesive', [10.3, 1, 1, 10.3]);
export const buildOuterAdhesive = () => sheet('outerAdhesive', [1, 10.3, 10.3, 1]);

// ------------------------------------------------------------ cowlings
export const buildBatteryCowling = () => plate('batteryCowling', [[-16, -26.5], [-12.6, -26.5], [-12.6, -10], [-18, -8], [-18, 12], [-30, 12], [-30, 7], [-21, 7], [-21, -8], [-16, -12]]);
export const buildBoardCowling = () => plate('boardCowling', [[-41, -44], [-24, -44], [-24, -29], [-33, -29], [-33, -16], [-41, -16]]);
export const buildFaceTimeCowling = () => plate('faceTimeCowling', rect(-43, -56.4, -8, -47.6), 'cowl', 1.4);
export const buildAlsCowling = () => plate('alsCowling', rect(...PART.alsCowling.rect), 'cowl', 1);
export const buildIoCowling = () => {
  const part = plate('ioCowling', IO_OUTLINE, 'cowl', 0.6);
  // the two caps Apple has you lift off before the screws
  for (const [x, z] of [[47.6, 46.8], [41.1, 38.9]]) part.fine('plastic', disc(x, z, 1.2, -0.82, -0.78, 12));
  return part;
};

// ------------------------------------------------------------ antenna flex cables
const antenna = (id, path) => {
  const part = createPart(id);
  const [y0, y1] = PART[id].y;
  part.add('ribbon', flexRun(path, 2.4, y0, y1));
  for (const [x, z] of seated(id)) part.fine('gold', disc(x, z, 1.3, y1, y1 + 0.02, 12));
  return collars(part, id);
};
export const buildLowerAntenna = () => antenna('lowerAntenna', [[-6.4, 8], [-6.4, 42], [-8.6, 57], [-27.6, 57], [-27.6, 54]]);
export const buildUpperAntenna = () => antenna('upperAntenna', [[-6.4, 8.1], [-8, -20], [-8, -53.7], [-14.1, -53.7], [-22.5, -55.8]]);

// ------------------------------------------------------------ the spacer and the microphone
export const buildCameraSpacer = () => {
  const part = plate('cameraSpacer', [[-80, -38], [-44, -38], [-44, -32.6], [-62, -32.6], [-62, -28.6], [-74, -28.6], [-74, -34.6], [-80, -34.6]], 'frame', 0.6);
  return part;
};

export const buildMainMic = () => {
  const part = createPart('mainMic');
  const [x0, z0, x1, z1] = PART.mainMic.rect;
  const [y0, y1] = PART.mainMic.y;
  part.add('steel', block(x0 + 5, z0 + 0.6, x1 - 0.4, z1 - 0.8, y0, y1 - 0.5, 0.6, 0.08));
  part.add('plastic', block(x0 + 6, z1 - 0.8, x1 - 1.4, z1, y0 + 0.2, y1 - 0.8, 0.2));
  part.add('cowl', block(x0, z0, x1, z1 - 1.6, y1 - 0.2, y1, 0.8));
  part.fine('gold', block(x0 + 6.4, z0 + 1.4, x1 - 2, z0 + 3, y1, y1 + 0.02, 0.1));
  part.add('ribbon', flexRun([[x1 - 2, z0 + 1], [x1 + 5, z0 + 1]], 2, y1 - 0.3));
  return collars(part, 'mainMic');
};

// ------------------------------------------------------------ the side buttons
const rollBar = (part, x, z, length, axis) => {
  const [dx, dz] = axis === 'x' ? [length / 2, 0.22] : [0.22, length / 2];
  part.add('steel', block(x - dx, z - dz, x + dx, z + dz, -2.7, -2.3, 0.18));
};

export const buildVolumeButtons = () => {
  const part = createPart('volumeButtons');
  for (const [x0, x1] of [[-62, -51.2], [-48.8, -38]]) {
    part.add('rail', block(x0, -HALF_H - 0.28, x1, -HALF_H + 0.1, -3.6, -1.4, 0.5, 0.1));
    part.add('frame', block(x0 + 1, -HALF_H + 0.1, x1 - 1, -HALF_H + 1.1, -3.3, -1.7, 0.2));
    rollBar(part, (x0 + x1) / 2, -HALF_H + 1.5, x1 - x0 - 2, 'x');
    // the clip that the roll bar rides in
    part.add('steel', block((x0 + x1) / 2 - 1.4, -HALF_H + 1, (x0 + x1) / 2 + 1.4, -HALF_H + 2.1, -3, -2.8, 0.2));
  }
  part.add('cowl', block(-63, -57.2, -32.6, -55.6, -3.2, -1.8, 0.4));
  part.add('ribbon', flexRun([[-33.6, -55.4], [-72, -55.4]], 1.8, -3.3, -3.16));
  for (const x of [-70.9, -66.2]) part.fine('gold', disc(x, -55.8, 1.1, -3.16, -3.14, 12));
  return part;
};

export const buildTouchId = () => {
  const part = createPart('touchId');
  for (const [z0, z1] of [[-30, -8], [8, 24]]) {
    part.add('rail', block(-RAIL - 0.28, z0, -RAIL + 0.1, z1, -3.6, -1.4, 0.5, 0.1));
    part.add('frame', block(-RAIL + 0.1, z0 + 1, -RAIL + 1.1, z1 - 1, -3.3, -1.7, 0.2));
    rollBar(part, -RAIL + 1.5, (z0 + z1) / 2, z1 - z0 - 2, 'z');
    // a steel cowling over each button, part 923-15753
    part.add('cowl', block(-80.4, z0 + 2, -76.2, z1 - 2, -3.2, -3, 0.5));
  }
  part.add('ribbon', flexRun([[-78, -29], [-78, 25]], 2.2, -3.4, -3.26));
  for (const [x, z] of seated('touchId')) part.fine('steel', ring(x, z, 0.62, 1.1, -3.02, -2.98, 14));
  return part;
};
