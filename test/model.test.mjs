import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as M from '../src/model.js';
import {SOURCES} from '../src/sources.js';

const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const samples = Array.from({length: 2001}, (_, i) => i / 2000);

test('the hinge lands on both of Apple’s published sizes', () => {
  const open = M.envelope(0);
  near(2 * open.x, 164.6);
  near(open.yMax - open.yMin, 5.2);
  const closed = M.envelope(Math.PI / 2);
  near(2 * closed.x, 11.3);
  near(closed.yMax - closed.yMin, 84.1);
});

test('the numbers derived from the specs check out by hand', () => {
  near(M.HINGE.faceGap, 0.9);
  near(M.HINGE.spineReach, 1.8);
  near(M.HINGE.halfOpen + M.HINGE.spineReach, 84.1);
  near(2 * 5.2 + M.HINGE.faceGap, 11.3);
  near(M.SPEC.batteryWh[0] + M.SPEC.batteryWh[1], M.SPEC.batteryTotalWh);
  near(M.DISPLAY.inner.w, 157.7, 0.1);
  near(M.DISPLAY.inner.h, 110.9, 0.1);
  // Apple rounds ppi to a whole number, so the diagonal from pixels lands within 0.02 in of its 7.58 and 5.36
  near(Math.hypot(M.DISPLAY.inner.w, M.DISPLAY.inner.h) / 25.4, 7.58, 0.02);
  near(Math.hypot(M.DISPLAY.outer.w, M.DISPLAY.outer.h) / 25.4, 5.36, 0.02);
});

test('the phone is sealed at 0 and fully exploded at 1', () => {
  near(M.foldAngle(0), 0);
  near(M.foldAngle(1), 180);
  assert.equal(M.activeAt(0).id, 'sealed');
  assert.equal(M.partsOut(0), 0);
  assert.equal(M.partsOut(1), M.PARTS.length);
  for (const part of M.PARTS) {
    assert.equal(M.partK(part.id, 0), 0, part.id);
    near(M.partK(part.id, 1), 1);
  }
});

test('the windows cover 0 to 1 with no gaps, in order', () => {
  const ids = ['unfold', ...M.PARTS.map((part) => part.id)];
  near(M.WINDOW[ids[0]][0], 0);
  near(M.WINDOW[ids[ids.length - 1]][1], 1);
  for (let i = 1; i < ids.length; i++) near(M.WINDOW[ids[i]][0], M.WINDOW[ids[i - 1]][1]);
});

test('parts come out in the order iFixit opened the phone', () => {
  const chapterOrder = M.CHAPTERS.map((c) => c.id);
  const seen = M.PARTS.map((part) => chapterOrder.indexOf(part.chapter));
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
  assert.ok(seen.every((i) => i >= 0));
  assert.deepEqual([...new Set(M.PARTS.map((part) => part.chapter))], chapterOrder.slice(1));
});

test('every pose is a finite, repeatable function of p', () => {
  for (const p of samples) {
    const once = JSON.stringify([M.rootPose(p), M.bounds(p), M.readout(p), M.calloutsAt(p), M.displayCurve(M.foldPhi(p))]);
    assert.equal(once, JSON.stringify([M.rootPose(p), M.bounds(p), M.readout(p), M.calloutsAt(p), M.displayCurve(M.foldPhi(p))]));
    assert.ok(!once.includes('null,null') && !once.includes('NaN'), `p=${p}`);
  }
});

test('a part never moves back as p rises', () => {
  for (const part of M.PARTS) {
    let last = 0;
    for (const p of samples) {
      const k = M.partK(part.id, p);
      assert.ok(k >= last - 1e-9, `${part.id} at p=${p}`);
      last = k;
    }
  }
});

test('the phone stays open while parts come out, and the frame only flexes in the hinge step', () => {
  const [, opened] = M.WINDOW.unfold;
  const [flexFrom, flexTo] = M.WINDOW.hinge;
  for (const p of samples) {
    if (p >= opened) near(M.foldPhi(p), 0);
    if (p < flexFrom || p > flexTo) near(M.framePhi(p), 0);
  }
  assert.ok(M.framePhi((flexFrom + flexTo) / 2.05) > 0.5);
});

test('every fact points at a real source, and every source is used', () => {
  const used = new Set();
  for (const {facts} of [M.SEALED, ...M.PARTS]) for (const {s, k, v} of facts) {
    assert.ok(SOURCES[s], `${k}: ${s}`);
    assert.ok(v.length > 0);
    used.add(s);
  }
  for (const {s} of M.FACTS) {
    assert.ok(SOURCES[s]);
    used.add(s);
  }
  for (const {url} of Object.values(SOURCES)) assert.match(url, /^https:\/\//);
  assert.ok(used.has('appleSpecs') && used.has('ifixitTeardown') && used.has('ifixitChips'));
});

test('the size line only ever shows a published size', () => {
  const allowed = new Set(['Closed', 'Open']);
  for (const p of samples) {
    const size = M.sizeAt(p);
    if (size) assert.ok(allowed.has(size.k));
  }
  assert.equal(M.sizeAt(0).k, 'Closed');
  assert.equal(M.sizeAt(1).k, 'Open');
  assert.equal(M.sizeAt(M.WINDOW.unfold[1] * 0.6), null);
});

test('the tour is pure, loops and ends sealed', () => {
  for (let t = 0; t < M.TOUR_DURATION; t += 0.37) {
    assert.deepEqual(M.tourAt(t), M.tourAt(t));
    assert.deepEqual(M.tourCamera(t, 1.5), M.tourCamera(t, 1.5));
    assert.deepEqual(M.tourAt(t), M.tourAt(t + M.TOUR_DURATION));
  }
  near(M.tourAt(0).p, 0);
  near(M.tourAt(M.TOUR_DURATION - 1e-9).p, 0, 1e-6);
  assert.ok(M.TOUR_KEYS.some((key) => key.p === 1));
});

test('the tour holds p still while a part is isolated, and a settled part is no longer orange', () => {
  for (const key of M.TOUR_KEYS.filter((item) => item.focus)) {
    near(M.tourAt(key.until - 1e-6).p, key.p);
    near(M.tourAt(key.until - 1e-6).iso, 1);
  }
  for (const part of M.PARTS) near(M.accentOf(part.id, M.settledAt(part.id)), 0);
  near(M.accentOf('enclosure', 1), 0);
  for (const part of M.PARTS) assert.equal(M.activeAt(M.settledAt(part.id)).id, part.id);
});

test('the rear lenses sit apart, and their rings stay on the camera island', () => {
  const {x: [left, right], ring} = M.LENSES;
  assert.ok(right - left >= 2 * ring + 1, `rings ${(right - left - 2 * ring).toFixed(1)} mm apart`);
  assert.ok(left - ring >= M.ISLAND.x0 + 1 && right + ring <= M.ISLAND.x1 - 1);
  assert.ok(ring <= M.ISLAND.halfDepth - 1);
});

test('the tour gives every part a turn at a slow, unbroken pace', () => {
  const order = M.TOUR_KEYS.filter((item) => item.focus).map((item) => item.focus).filter((id, i, list) => id !== list[i - 1]);
  assert.deepEqual(order, M.PARTS.map((part) => part.id));
  for (const key of M.TOUR_KEYS.filter((item) => item.move && item.p !== 0)) assert.ok(key.move >= 1.5, `${key.label} moves in ${key.move} s`);
  assert.ok(M.TOUR_DURATION > 120 && M.TOUR_DURATION < 300, `${M.TOUR_DURATION} s`);
});

test('the tour gets into the teardown quickly', () => {
  const first = M.TOUR_KEYS.find((key) => key.p > M.settledAt('unfold'));
  assert.ok(first.start <= 5, `the first part starts coming out at ${first.start.toFixed(1)} s`);
});

test('the tour never stands still on one thing for more than a second', () => {
  const STEP = 0.05;
  const aspect = 1.6;
  const stateAt = (t) => ({...M.tourAt(t), cam: M.tourCamera(t, aspect)});
  let last = stateAt(0);
  let still = 0;
  let longest = {time: 0, at: 0};
  for (let t = STEP; t < M.TOUR_DURATION; t += STEP) {
    const now = stateAt(t);
    const moved = Math.abs(now.p - last.p) > 1e-6 || Math.abs(now.iso - last.iso) > 1e-4 || Math.abs(now.cam.dist - last.cam.dist) > 1e-3 || now.cam.target.some((v, i) => Math.abs(v - last.cam.target[i]) > 1e-3);
    still = moved ? 0 : still + STEP;
    if (still > longest.time) longest = {time: still, at: t};
    last = now;
  }
  assert.ok(longest.time <= 1, `still for ${longest.time.toFixed(2)} s at ${longest.at.toFixed(1)} s`);
});

test('the tour names one part at a time, and the sealed phone while it goes back together', () => {
  for (let t = 0.21; t < M.TOUR_DURATION; t += 0.21) {
    const {selected, focus, iso, p} = M.tourAt(t);
    const closing = p < M.tourAt(t - 0.1).p;
    assert.equal(selected, iso > 0.5 ? focus : closing ? M.SEALED.id : null);
  }
});

test('swapping parts dissolves one into the other and leaves the rest of the phone as it was', () => {
  const p = M.settledAt('usbC');
  near(M.styleOf('taptic', p, 'usbC', 1, 'taptic', 0).drawing, 0);
  near(M.styleOf('usbC', p, 'usbC', 1, 'taptic', 0).drawing, 1);
  near(M.styleOf('taptic', p, 'usbC', 1, 'taptic', 1).drawing, 1);
  near(M.styleOf('usbC', p, 'usbC', 1, 'taptic', 1).drawing, 0);
  for (const swap of [0, 0.5, 1]) near(M.styleOf('battery1', p, 'usbC', 1, 'taptic', swap).drawing, 1);
});

const FOLDS = Array.from({length: 91}, (_, i) => (i * Math.PI) / 180);
/** The display's height at x, in the hinge cover's frame. Where the curve doubles back, the side nearest the hinge. */
const displayAt = (curve, x) => {
  let highest = -Infinity;
  for (let i = 1; i < curve.length; i++) {
    const [ax, ay] = curve[i - 1];
    const [bx, by] = curve[i];
    if (x >= Math.min(ax, bx) && x <= Math.max(ax, bx)) highest = Math.max(highest, ax === bx ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax));
  }
  return highest;
};

test('the display bends at one length, meets both halves and stays inside the hinge cover', () => {
  for (const phi of FOLDS) {
    const curve = M.displayCurve(phi);
    const length = curve.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - curve[i][0], y - curve[i][1]), 0);
    near(length, 2 * M.HINGE.displayEdge, 1e-6);
    near(curve[0][0], -curve.at(-1)[0], 1e-4);
    near(curve[0][1], curve.at(-1)[1], 1e-6);
    const crest = Math.max(...curve.map(([, y]) => y));
    assert.ok(crest < M.coverY(phi) - 0.7 - 0.5, `crest ${crest} at ${phi}`);
  }
  near(M.displayCurve(0)[8][1], -M.SPEC.open.t);
});

test('nothing in the hinge shows through the bent display at any angle', () => {
  const UNDERSIDE = -4; // the lowest face of the pins, springs, gears and bar, at rest
  for (const phi of FOLDS) {
    const curve = M.displayCurve(phi);
    for (let x = -4.8; x <= 4.8; x += 0.4) {
      const height = displayAt(curve, x);
      if (height > -Infinity) assert.ok(UNDERSIDE + M.hingeRise(phi) > height, `mechanism at x=${x}, ${phi}`);
    }
    for (const x of [M.HINGE.halfThick - 0.7, M.HINGE.halfThick]) {
      const height = Math.max(displayAt(curve, x), displayAt(curve, -x));
      if (height > -Infinity) assert.ok(-4.2 + M.coverY(phi) > height, `cover wall, ${phi}`);
    }
    for (const {x, y, rot, length} of M.hingeLinks(phi)) {
      for (let t = 0; t <= 1; t += 0.1) {
        const px = x + Math.cos(rot) * length * t + Math.sin(rot) * 0.3;
        const py = y + Math.sin(rot) * length * t - Math.cos(rot) * 0.3;
        const height = displayAt(curve, px);
        if (height > -Infinity) assert.ok(py > height, `link at x=${px}, ${phi}`);
      }
    }
  }
});

test('the flex cable stays behind the bent display and inside the body at every angle', () => {
  const samples = 72;
  const flat = M.HINGE.cableLift - M.SPEC.open.t;
  near(M.cableCurve(0)[samples][0], M.HINGE.displayEdge);
  near(M.cableCurve(0)[samples][1], flat);
  for (const phi of FOLDS) {
    const display = M.displayCurve(phi, samples);
    const cable = M.cableCurve(phi, samples);
    near(Math.hypot(cable[0][0] - display[0][0], cable[0][1] - display[0][1]), M.HINGE.cableLift);
    for (const [x, y] of cable) {
      const gap = Math.min(...display.map(([dx, dy]) => Math.hypot(x - dx, y - dy)));
      assert.ok(gap > M.HINGE.cableLift - M.HINGE.pleatDepth - 0.01, `gap ${gap}, ${phi}`);
      assert.ok(y < -0.7 + M.coverY(phi), `under the cover, ${phi}`);
    }
  }
  for (const [x] of M.cableCurve(Math.PI / 2, samples)) assert.ok(Math.abs(x) < M.HINGE.halfThick - 0.7, `inside the closed body at x=${x}`);
});

test('the inner display is clear of the flexing frame, and back in the stack at the end', () => {
  const [a, b] = M.WINDOW.hinge;
  for (let p = a; p <= b; p += (b - a) / 40) {
    const lowestFrame = -(M.HINGE.halfOpen * Math.sin(M.framePhi(p))) - M.SPEC.open.t;
    assert.ok(M.offsetOf('innerDisplay', p)[1] < lowestFrame, `p=${p}`);
  }
  near(M.offsetOf('innerDisplay', 1)[1], M.PART.innerDisplay.out[1]);
});

test('every part has a button target that shows it out', () => {
  for (const part of M.PARTS) near(M.partK(part.id, M.settledAt(part.id)), 1);
});

test('the camera fits the stack at any window shape', () => {
  for (const aspect of [0.7, 1, 1.6, 2.4]) for (const p of [0, 0.3, 0.7, 1]) for (const view of Object.keys(M.VIEWS)) {
    const cam = M.cameraFor(view, p, aspect);
    assert.ok(Number.isFinite(cam.dist) && cam.dist > 0, `${view} ${p} ${aspect}`);
  }
});

test('every screw and chip belongs to a real part and carries its source data', () => {
  assert.equal(M.COUNTS.parts, M.PARTS.length);
  const ids = new Set();
  for (const piece of M.PIECES) {
    assert.ok(M.PART[piece.host], piece.id);
    assert.ok(!ids.has(piece.id), `duplicate ${piece.id}`);
    ids.add(piece.id);
    if (piece.kind === 'screw') {
      assert.match(piece.part, /^923-\d{5}/, piece.id);
      assert.match(piece.torque, /kgf cm|Ncm/, piece.id);
      assert.ok(M.HEADS[piece.head], piece.id);
    } else {
      assert.ok(piece.name.length && piece.role.length, piece.id);
      assert.ok(piece.step >= 1 && piece.step <= 10, piece.id);
      assert.ok(['front', 'back'].includes(piece.side), piece.id);
    }
  }
  assert.ok(Object.keys(SOURCES).includes('appleScrews') && Object.keys(SOURCES).includes('ifixitChips'));
});

test('screw counts match Apple’s procedures', () => {
  const count = (host) => M.SCREWS_OF[host].length;
  assert.equal(count('backGlass'), 2);
  assert.equal(count('boardCowling'), 3);
  assert.equal(count('ioCowling'), 6);
  assert.equal(count('logicBoard'), 3);
  assert.equal(count('ioBoard'), 9);
  assert.equal(M.COUNTS.screws, 67);
  assert.equal(M.COUNTS.chips, 45);
});

test('small pieces sit at home when sealed and leave in the right order', () => {
  for (const piece of M.PIECES) {
    assert.ok(M.pieceOffset(piece, 0).every((value) => value === 0), piece.id);
    near(M.pieceK(piece, 1), 1);
    const out = samples.find((p) => M.pieceK(piece, p) >= 1);
    if (piece.kind === 'screw') assert.ok(M.partK(piece.host, out) < 0.02, `${piece.id} must be out before ${piece.host} moves`);
    else assert.ok(samples.filter((p) => M.pieceK(piece, p) > 0).every((p) => M.partK(piece.host, p) >= 1), `${piece.id} lifts only once the board is out`);
  }
});

test('a top screw leaves before the super screw under it', () => {
  const screws = M.PIECES.filter((piece) => piece.kind === 'screw');
  for (const lower of screws.filter((screw) => screw.head === 'super')) {
    for (const upper of screws.filter((screw) => screw !== lower && screw.x === lower.x && screw.z === lower.z)) {
      const gone = (screw) => samples.find((p) => M.pieceK(screw, p) >= 1);
      assert.ok(gone(upper) <= gone(lower), `${upper.id} over ${lower.id}`);
    }
  }
});

test('a pick is always a real piece, and picked pieces get the only leader', () => {
  for (const key of M.TOUR_KEYS.filter((item) => item.pick)) assert.ok(M.PIECE[key.pick], key.pick);
  const [only, ...rest] = M.calloutsAt(1, 'logicBoard', 'inner', 'a20');
  assert.equal(rest.length, 0);
  assert.equal(only.name, 'Apple A20 Pro');
  assert.ok(M.pieceStyle(M.PIECE.a20, 1, 'logicBoard', 1, 'a20').tint > M.pieceStyle(M.PIECE.a20, 1, 'logicBoard', 1, null).tint);
});
