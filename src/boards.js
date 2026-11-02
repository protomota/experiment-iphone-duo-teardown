// The two boards, drawn with their shields off, the way iFixit photographed them for its chip ID. The chips themselves are
// instances (pieces.js) so they can lift away; what stays here is everything they leave behind: the land pattern under
// each one, the connectors and the crowd of tiny passives. The passives are drawn, not counted.
import {IO_CONNECTORS, IO_HOLES, IO_OUTLINE, LOGIC_CONNECTORS, LOGIC_HOLES, LOGIC_OUTLINE} from './hardware.js';
import * as M from './model.js';
import {block, createPart, disc, flexRun, outline, pierced, ring, slab} from './shapes.js';

const TONES = [
  {w: 0.6, d: 0.3, h: 0.28, odds: 0.46, tone: '#8f7d5c'},
  {w: 0.6, d: 0.3, h: 0.22, odds: 0.32, tone: '#17181b'},
  {w: 0.4, d: 0.2, h: 0.18, odds: 0.14, tone: '#6d604a'},
  {w: 1, d: 0.5, h: 0.4, odds: 0.06, tone: '#8a7856'},
  {w: 1.6, d: 1.2, h: 0.62, odds: 0.02, tone: '#5e6167'},
];
const TERMINAL = 0.16;
const CELL = 0.4;

const random = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let v = Math.imul(s ^ (s >>> 15), s | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
};

const inside = (points, x, z) => {
  let hit = false;
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    if (az > z !== bz > z && x < ax + ((z - az) / (bz - az)) * (bx - ax)) hit = !hit;
  });
  return hit;
};

/** Pads under a chip, thinned out on big packages so the pattern stays cheap. */
const landPattern = ({x, z, w, d}, y) => {
  const pitch = Math.max(0.6, Math.sqrt((w * d) / 70));
  const across = Math.floor((w - 0.4) / pitch);
  const down = Math.floor((d - 0.4) / pitch);
  const pads = [];
  for (let i = 0; i < across; i++) for (let j = 0; j < down; j++) {
    pads.push([x + (i - (across - 1) / 2) * pitch, y, z + (j - (down - 1) / 2) * pitch, pitch * 0.5, 1, pitch * 0.5]);
  }
  return pads;
};

/**
 * Scatters passives around the chips, same layout on every load. Most land in rows hugging a chip, the way real boards
 * are laid out, and none lands on a chip, a connector, a hole or another passive.
 */
const sprinkle = (seed, count, points, keepOut, y, sign) => {
  const next = random(seed);
  const taken = new Set();
  const cells = (x, z, w, d) => {
    const list = [];
    const cell = (value) => Math.floor(value / CELL);
    for (let i = cell(x - w / 2 - 0.1); i <= cell(x + w / 2 + 0.1); i++) for (let j = cell(z - d / 2 - 0.1); j <= cell(z + d / 2 + 0.1); j++) list.push(`${i},${j}`);
    return list;
  };
  const claim = (list) => list.forEach((cell) => taken.add(cell));
  for (const [x, z, w, d] of keepOut) claim(cells(x, z, w, d));
  const bodies = [];
  const ends = [];
  const pick = () => {
    let roll = next();
    return TONES.find((tone) => (roll -= tone.odds) < 0) ?? TONES[0];
  };
  for (let tries = 0; tries < count * 8 && bodies.length < count; tries++) {
    const part = pick();
    const turned = next() < 0.5;
    const w = turned ? part.d : part.w;
    const d = turned ? part.w : part.d;
    const near = next() < 0.8 ? keepOut[Math.floor(next() * keepOut.length)] : null;
    const edge = next() < 0.5;
    const flip = next() < 0.5 ? -1 : 1;
    const reach = 0.6 + next() * next() * 3;
    const x = near ? near[0] + (edge ? flip * (near[2] / 2 + reach) : (next() - 0.5) * near[2]) : -60 + next() * 140;
    const z = near ? near[1] + (edge ? (next() - 0.5) * near[3] : flip * (near[3] / 2 + reach)) : -60 + next() * 120;
    const sx = Math.round(x / 0.25) * 0.25;
    const sz = Math.round(z / 0.25) * 0.25;
    const corners = [[sx - w / 2, sz - d / 2], [sx + w / 2, sz - d / 2], [sx + w / 2, sz + d / 2], [sx - w / 2, sz + d / 2]];
    if (!corners.every(([cx, cz]) => inside(points, cx, cz))) continue;
    const footprint = cells(sx, sz, w, d);
    if (footprint.some((cell) => taken.has(cell))) continue;
    claim(footprint);
    // no two neighbours are quite the same size, so their faces never tie
    const grow = (bodies.length % 4) * 0.012;
    bodies.push([sx, y + (sign * (part.h + grow)) / 2, sz, w + grow, part.h + grow, d + grow, part.tone]);
    if (part.w > 1.2) continue;
    const top = y + sign * (part.h + grow + 0.004);
    const span = Math.max(w, d);
    const offset = (span / 2) * (1 - TERMINAL * 1.4);
    for (const side of [-1, 1]) {
      ends.push(turned
        ? [sx, top, sz + side * offset, w, 1, span * TERMINAL]
        : [sx + side * offset, top, sz, span * TERMINAL, 1, d]);
    }
  }
  return {bodies, ends};
};

const connector = (part, [x, z, w, d], y) => {
  const [x0, x1, z0, z1] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
  part.add('plastic', block(x0, z0, x1, z1, y, y + 0.38, 0.14));
  const long = w > d;
  const inset = 0.22;
  part.fine('steel', block(x0 + inset, z0 + inset, x1 - inset, z1 - inset, y + 0.38, y + 0.4, 0.06));
  const count = Math.round((long ? w : d) / 0.42);
  const pins = [];
  for (const side of [-1, 1]) for (let i = 0; i < count; i++) {
    const along = -((long ? w : d) - 0.6) / 2 + (i * ((long ? w : d) - 0.6)) / Math.max(count - 1, 1);
    const across = side * ((long ? d : w) / 2 + 0.1);
    pins.push(long ? [x + along, y + 0.02, z + across, 0.16, 1, 0.22] : [x + across, y + 0.02, z + along, 0.22, 1, 0.16]);
  }
  return pins;
};

const fence = (part, path, y, sign) => part.fine('steel', flexRun(path, 0.32, sign > 0 ? y : y - 0.3, sign > 0 ? y + 0.3 : y));

const rects = (chips) => chips.map(({x, z, w, d}) => [x, z, w + 0.5, d + 0.5]);

const buildBoard = ({id, points, connectors, holes, fences, seed, counts}) => {
  const part = createPart(id);
  const [y0, y1] = M.PART[id].y;
  const chips = M.CHIPS_ON[id];
  const front = chips.filter((chip) => chip.side === 'front');
  const back = chips.filter((chip) => chip.side === 'back');
  part.add('board', slab(pierced(outline(points, 0.8), holes, 1), y0, y1, 0, 4));

  for (const [x, z] of holes) {
    part.fine('gold', ring(x, z, 1, 1.6, y1, y1 + 0.02, 14));
    part.fine('gold', ring(x, z, 1, 1.6, y0 - 0.02, y0, 14));
  }

  const pins = connectors.flatMap((box) => connector(part, box, y1));
  part.crowd('gold', [...pins, ...front.flatMap((chip) => landPattern(chip, y1 + 0.006))], 'top');
  part.crowd('gold', back.flatMap((chip) => landPattern(chip, y0 - 0.006)), 'bottom');

  const round = holes.map(([x, z]) => [x, z, 3.4, 3.4]);
  const up = sprinkle(seed, counts.front, points, [...rects(front), ...connectors, ...round], y1, 1);
  const down = sprinkle(seed + 1, counts.back, points, [...rects(back), ...round], y0, -1);
  part.crowd('component', up.bodies);
  part.crowd('component', down.bodies);
  part.crowd('steel', up.ends, 'top');
  part.crowd('steel', down.ends, 'bottom');

  for (const path of fences.front) fence(part, path, y1, 1);
  for (const path of fences.back) fence(part, path, y0, -1);
  return part;
};

export const buildLogicBoard = () => {
  const part = buildBoard({
    id: 'logicBoard',
    points: LOGIC_OUTLINE,
    connectors: LOGIC_CONNECTORS,
    holes: LOGIC_HOLES,
    seed: 20261023,
    counts: {front: 1300, back: 640},
    fences: {
      front: [
        [[-42, -22], [-42, 10.4], [-29.4, 10.4], [-29.4, -6], [-27.8, -6], [-27.8, -22], [-42, -22]],
        [[-28.6, -29.4], [-28.6, -7.4], [-18.8, -7.4], [-18.8, -29.4], [-28.6, -29.4]],
        [[-37, -29.8], [-30.2, -29.8], [-30.2, -23.4], [-37, -23.4], [-37, -29.8]],
      ],
      back: [
        [[-43.2, -21], [-43.2, 10.4], [-25.2, 10.4], [-25.2, -21], [-43.2, -21]],
        [[-24.6, 10.4], [-12.2, 10.4], [-12.2, -22.2], [-24.6, -22.2], [-24.6, 10.4]],
        [[-31.6, -32.4], [-18.8, -32.4], [-18.8, -41.8], [-31.6, -41.8], [-31.6, -32.4]],
      ],
    },
  });
  const [, top] = M.PART.logicBoard.y;
  // the black pad and long oval on the front, after iFixit's board photo
  part.add('plastic', block(-28.1, -44.9, -19.7, -32.1, top, top + 0.08, 0.5));
  part.add('plastic', slab(outline([[-18.4, -54.7], [-13.3, -54.7], [-13.3, -30.9], [-18.4, -30.9]], 2.4), top, top + 0.08, 0, 8));
  for (const [x, z] of [[-40.4, -46.4], [-40.4, 8.6]]) part.fine('gold', disc(x, z, 0.5, top, top + 0.02, 10));
  return part;
};

export const buildIoBoard = () => {
  const part = buildBoard({
    id: 'ioBoard',
    points: IO_OUTLINE,
    connectors: IO_CONNECTORS,
    holes: IO_HOLES,
    seed: 20261027,
    counts: {front: 380, back: 460},
    fences: {
      front: [],
      back: [
        [[15, 43], [34, 43], [34, 49.2], [15, 49.2], [15, 43]],
        [[50.6, 43.2], [70, 43.2], [70, 50.6], [50.6, 50.6], [50.6, 43.2]],
      ],
    },
  });
  // the two grounding springs and the side tabs reaching out to their screws
  const [, top] = M.PART.ioBoard.y;
  for (const [x, z] of [[21.8, 56.5], [59.2, 56.5]]) {
    part.add('gold', block(x - 2, z - 3.6, x + 2, z + 0.9, top - 0.2, top, 0.4));
    part.add('steel', block(x - 1.4, z - 2.4, x + 1.4, z - 1.4, top, top + 0.3, 0.2));
  }
  part.add('gold', block(50, 51.6, 52.8, 54.6, top - 0.2, top, 0.4));
  return part;
};
