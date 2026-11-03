// The page's loop. The tour reads the model directly. Live input only ever sets a target p, view and part: the model
// still poses everything, and this file eases toward those targets.
import * as M from './model.js';
import {createStage} from './stage.js';
import {createUI} from './ui.js';

const params = new URLSearchParams(location.search);
const CAPTURE = Boolean(window.__CAPTURE);
const CARD = params.has('card');
const CARD_P = M.settledAt('topSpeaker');

const canvas = document.getElementById('view');
const stageBox = document.getElementById('stage');
const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(innerWidth, innerHeight) < 720;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = window.devicePixelRatio || 1;

// Best first. A phone starts without shadows, and any device steps down if its frames run long.
const TIERS = [
  {shadows: true, pixelRatio: Math.min(dpr, 2)},
  {shadows: false, pixelRatio: Math.min(dpr, 1.5)},
  {shadows: false, pixelRatio: 1, plain: true},
];
const SLOW_FRAME_MS = 28;
const SLOW_SAMPLE = 30;
const P_RATE = 0.9;
const EL_LIMIT = 86;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.6;
const NEAR_ZERO = 0.0004;
const SWAP_TIME = 0.45;

const tiers = {index: coarse || small ? 1 : 0, sum: 0, count: 0};

const live = {
  touring: false,
  attract: false, // the tour that starts on its own: any input stops it. One the visitor started only stops when asked.
  tourTime: 0,
  blend: 1, // 0 to 1 while the tour fades in from where the visitor left it
  blendTime: 1.1,
  fadeFirst: false, // Start over: the tour clock waits for the fade
  from: null,
  p: 0,
  targetP: 0,
  view: 'three',
  focus: null,
  pick: null,
  was: null, // the part dissolving away while another takes its place
  swap: 1,
  iso: 0,
  targetIso: 0,
  cam: null,
  orbit: {az: 0, el: 0, zoom: 1},
  drag: null,
  dirty: true,
  visible: true,
};

const fail = () => {
  document.getElementById('no-webgl').hidden = false;
  canvas.hidden = true;
};

const makeStage = () => {
  try {
    return createStage(canvas, {shadows: TIERS[tiers.index].shadows, keepBuffer: CAPTURE || CARD});
  } catch {
    return null;
  }
};
const stage = makeStage();

const aspect = () => stage.size.w / stage.size.h;

const layout = () => {
  const {width, height} = canvas.getBoundingClientRect();
  stage.resize(Math.max(width, 1), Math.max(height, 1), TIERS[tiers.index].pixelRatio);
  live.dirty = true;
};

const applyTier = () => {
  stage.setShadows(TIERS[tiers.index].shadows);
  stage.phone.setDetail(!TIERS[tiers.index].plain);
  layout();
};

const showFrame = (state, cam) => {
  stage.draw(state.p, cam, state.focus, state.iso, state.pick, state.was ?? null, state.swap ?? 1);
  ui.sync(state, stage);
};

// ------------------------------------------------------------ live input
const goalCamera = () => {
  const cam = M.cameraFor(live.view, live.p, aspect(), live.iso > 0.02 || live.targetIso > 0 ? live.focus : null);
  return {
    ...cam,
    az: cam.az + live.orbit.az,
    el: Math.max(-EL_LIMIT, Math.min(EL_LIMIT, cam.el + live.orbit.el)),
    dist: cam.dist * live.orbit.zoom,
  };
};

const takeOver = () => {
  if (!live.touring) return;
  const {p, focus, iso, view, pick} = M.tourAt(live.tourTime);
  const cam = M.tourCamera(live.tourTime, aspect());
  Object.assign(live, {touring: false, attract: false, p, targetP: p, focus, pick, iso, targetIso: focus && iso > 0.5 ? 1 : 0, view, cam: {...cam}});
  if (!live.targetIso) live.focus = null;
  const goal = goalCamera();
  live.orbit = {az: cam.az - goal.az, el: 0, zoom: 1};
  live.dirty = true;
};

/** Plays from time, fading in from whatever is on screen, and takes longer to get there from further away. */
const startTour = (time, fadeFirst = false) => {
  const target = M.tourAt(time);
  live.from = {p: live.p, iso: live.iso, focus: live.focus, cam: live.cam ?? M.tourCamera(time, aspect())};
  live.blend = 0;
  live.blendTime = 1.1 + 2 * Math.abs(target.p - live.p);
  live.fadeFirst = fadeFirst;
  live.tourTime = time;
  live.touring = true;
  live.pick = null;
  live.orbit = {az: 0, el: 0, zoom: 1};
  live.dirty = true;
};

/** Carries on from the pause if nothing moved, or else from the first step past where the visitor left the phone. */
const resumeTime = () => {
  if (Math.abs(M.tourAt(live.tourTime).p - live.p) < 1e-3) return live.tourTime;
  const key = M.TOUR_KEYS.find((item) => item.p >= live.p - 1e-6 && !item.focus) ?? M.TOUR_KEYS[0];
  return key.at;
};

/** Selecting a part while another is isolated dissolves one into the other. */
const focusOn = (id) => {
  if (live.focus && live.focus !== id && live.iso > 0.02) {
    live.was = live.focus;
    live.swap = 0;
  }
  live.focus = id;
};

const ui = createUI({
  onPart(id) {
    if (!stage) return ui.show(id);
    takeOver();
    live.pick = null;
    if (live.focus === id && live.targetIso) {
      live.targetIso = 0;
    } else {
      focusOn(id);
      live.targetIso = 1;
      live.targetP = M.settledAt(id);
      live.view = M.PART[id].view;
    }
    live.orbit = {az: 0, el: 0, zoom: 1};
    live.dirty = true;
  },
  onPiece(id) {
    takeOver();
    const piece = M.PIECE[id];
    live.pick = live.pick === id ? null : id;
    focusOn(piece.host);
    live.targetIso = 1;
    live.targetP = M.settledAt(piece.host);
    // chips on the back of a board face the display, so turn the view around to see them
    live.view = piece.side === 'back' ? 'inner' : M.PART[piece.host].view;
    live.orbit = {az: 0, el: 0, zoom: 1};
    live.dirty = true;
  },
  onView(id) {
    takeOver();
    live.view = id;
    // the hinge sits behind everything else, so its view isolates it
    if (id === 'hinge') {
      focusOn('hinge');
      live.targetIso = 1;
    }
    live.orbit = {az: 0, el: 0, zoom: 1};
    live.dirty = true;
  },
  onSlide(value) {
    takeOver();
    live.targetP = value;
    live.targetIso = 0;
    live.pick = null;
    live.dirty = true;
  },
  onPlay() {
    if (live.touring) takeOver();
    else startTour(resumeTime());
  },
  onRestart() {
    takeOver();
    startTour(0, true);
  },
});

const bindInput = () => {
  const interrupt = (event) => {
    if (live.attract && !event.target.closest?.('#play, #restart')) takeOver();
  };
  for (const type of ['pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(type, interrupt, {passive: true, capture: true});

  canvas.addEventListener('pointerdown', (event) => {
    takeOver();
    live.drag = {x: event.clientX, y: event.clientY, id: event.pointerId};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!live.drag || live.drag.id !== event.pointerId) return;
    live.orbit.az -= (event.clientX - live.drag.x) * 0.3;
    live.orbit.el += (event.clientY - live.drag.y) * 0.25;
    live.drag.x = event.clientX;
    live.drag.y = event.clientY;
    live.dirty = true;
  });
  const endDrag = () => {
    live.drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  // the wheel keeps scrolling the page; a pinch or ctrl-wheel zooms
  canvas.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    takeOver();
    live.orbit.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, live.orbit.zoom * Math.exp(event.deltaY * 0.01)));
    live.dirty = true;
  }, {passive: false});

  new ResizeObserver(layout).observe(stageBox);
  new IntersectionObserver(([entry]) => {
    live.visible = entry.isIntersecting;
    live.dirty = true;
  }).observe(stageBox);
};

// ------------------------------------------------------------ frames
const stepTour = (dt) => {
  // the first stop is only a beat, so a clock running through the fade would miss the sealed phone altogether
  if (!live.fadeFirst || live.blend >= 1) live.tourTime += dt;
  // the visitor asked for one run through, so it stops at the end; on its own it loops
  if (!live.attract && live.tourTime >= M.TOUR_DURATION) {
    live.tourTime = 0;
    takeOver();
    return;
  }
  live.blend = Math.min(1, live.blend + dt / live.blendTime);
  const tour = M.tourAt(live.tourTime);
  const cam = M.tourCamera(live.tourTime, aspect());
  const k = M.ease(live.blend);
  if (k >= 1) {
    live.p = tour.p;
    live.iso = tour.iso;
    live.focus = tour.focus;
    live.cam = cam;
  } else {
    live.p = live.from.p + (tour.p - live.from.p) * k;
    live.iso = tour.focus ? tour.iso * k : live.from.iso * (1 - k);
    live.focus = tour.focus ?? live.from.focus;
    live.cam = M.blendCamera(live.from.cam, cam, k);
  }
  live.view = tour.view;
  showFrame({p: live.p, focus: live.focus, iso: live.iso, view: tour.view, touring: true, pick: tour.pick, selected: tour.selected}, live.cam);
};

const stepLive = (dt) => {
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
  const before = {p: live.p, iso: live.iso, cam: live.cam, swap: live.swap};
  const gap = live.targetP - live.p;
  const limit = reducedMotion ? Infinity : P_RATE * dt;
  const stepSize = Math.max(-limit, Math.min(limit, gap * k));
  live.p = Math.abs(gap) < NEAR_ZERO ? live.targetP : live.p + stepSize;
  live.iso += (live.targetIso - live.iso) * k;
  if (Math.abs(live.targetIso - live.iso) < 0.003) live.iso = live.targetIso;
  if (!live.iso && !live.targetIso) live.focus = live.pick = null;
  live.swap = reducedMotion ? 1 : Math.min(1, live.swap + dt / SWAP_TIME);
  if (live.swap === 1) live.was = null;
  const goal = goalCamera();
  live.cam = live.cam ? M.blendCamera(live.cam, goal, k) : goal;
  const moved = live.p !== before.p || live.iso !== before.iso || live.swap !== before.swap || !before.cam
    || Math.abs(live.cam.dist - before.cam.dist) > 0.01 || Math.abs(live.cam.az - before.cam.az) > 0.003
    || Math.abs(live.cam.el - before.cam.el) > 0.003 || live.cam.target.some((v, i) => Math.abs(v - before.cam.target[i]) > 0.01);
  if (!moved && !live.dirty) return false;
  live.dirty = moved;
  const selected = live.targetIso ? live.focus : null;
  showFrame({p: live.p, focus: live.focus, iso: live.iso, view: live.view, touring: false, pick: live.pick, selected, was: live.was, swap: live.swap}, live.cam);
  return true;
};

const watchFrameTime = (ms) => {
  if (tiers.index >= TIERS.length - 1) return;
  tiers.sum += ms;
  tiers.count += 1;
  if (tiers.count < SLOW_SAMPLE) return;
  const slow = tiers.sum / tiers.count > SLOW_FRAME_MS;
  tiers.sum = 0;
  tiers.count = 0;
  if (!slow) return;
  tiers.index += 1;
  applyTier();
};

let lastTime = 0;
const frame = (now) => {
  requestAnimationFrame(frame);
  const elapsed = Math.min(now - lastTime, 100);
  lastTime = now;
  if (!live.visible || document.hidden) return;
  const dt = elapsed / 1000;
  if (live.touring) {
    stepTour(dt);
    watchFrameTime(elapsed);
  } else if (stepLive(dt)) {
    watchFrameTime(elapsed);
  }
};

// ------------------------------------------------------------ start
const startCapture = () => {
  layout();
  window.SIM = {
    ready: true,
    duration: M.TOUR_DURATION,
    fps: 60,
    info: () => stage.renderer.info.render,
    render(time) {
      const tour = M.tourAt(time);
      showFrame({...tour, touring: true}, M.tourCamera(time, aspect()));
      return {};
    },
  };
};

const startCard = () => {
  document.body.classList.add('card');
  layout();
  const cam = M.cameraFor('three', CARD_P, aspect());
  stage.draw(CARD_P, {...cam, dist: cam.dist * 0.94}, null, 0);
  window.CARD_READY = true;
};

const startPage = () => {
  bindInput();
  layout();
  if (reducedMotion) {
    live.p = live.targetP = M.settledAt('usbC');
    live.dirty = true;
  } else {
    live.touring = true;
    live.attract = true;
    live.from = {p: 0, iso: 0, focus: null, cam: M.tourCamera(0, aspect())};
  }
  requestAnimationFrame(frame);
};

if (!stage) fail();
else if (CAPTURE) startCapture();
else if (CARD) startCard();
else startPage();
