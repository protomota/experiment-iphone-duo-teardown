// The iPhone Duo as pure functions of one input: teardown progress p, 0 (sealed) to 1 (fully exploded).
// No three.js, no DOM, no clock. Geometry, panels, labels, camera and the tour all read from here.
//
// Millimetres. x runs across the open phone with the hinge at 0, y points out of the exterior, z runs from the top of
// the phone (-z) to the USB-C end (+z). Flat open and exterior up: the back glass half is -x, the outer display half +x.
//
// Two kinds of number live in this file. SPEC and FACTS are published and carry a source. LAYOUT is traced by eye from
// Apple's service diagrams to place the parts: nothing from it is ever shown as a measurement.
import {CHIPS, HEADS, SCREWS} from './hardware.js';

export {HEADS};

export const SPEC = {
  open: {w: 164.6, h: 117.8, t: 5.2},
  closed: {w: 84.1, h: 117.8, t: 11.3},
  weightG: 254,
  batteryWh: [7.5, 11.6],
  batteryTotalWh: 19.1,
  batteryMah: 4883,
  repairScore: 5,
};

// Pixels over ppi, in millimetres: the active areas come straight from Apple's published display numbers.
const INCH = 25.4;
export const DISPLAY = {
  inner: {w: (2670 / 430) * INCH, h: (1878 / 430) * INCH},
  outer: {w: (1398 / 460) * INCH, h: (2034 / 460) * INCH},
};

// ------------------------------------------------------------ hinge geometry, derived from the four published sizes
// A dual-axis hinge: each half swings about its own axis at (±axisX, axisY). Solving for the two axes so a half lands on
// both published envelopes gives the numbers below; nothing here is typed in. Check by hand: 2 × 5.2 + 0.9 = 11.3, and
// 82.3 + 1.8 = 84.1.
const halfOpen = SPEC.open.w / 2;
const halfThick = SPEC.closed.t / 2;
const spineReach = SPEC.closed.w - halfOpen;
export const HINGE = {
  halfOpen,
  halfThick,
  spineReach,
  faceGap: SPEC.closed.t - 2 * SPEC.open.t,
  axisX: (halfThick - spineReach) / 2,
  axisY: -(halfThick + spineReach) / 2,
  panelEdge: 2.4, // traced: where the back glass and outer display stop short of the centre line, level with the bottom of the hinge cover's walls when closed
  coverBand: 2.1, // traced: half the width of the matte band on the hinge cover, from Apple's end-on photo
  coverSplit: 0.45, // traced: width of the black split either side of that band
  displayEdge: 14, // traced: where the inner display goes from rigid to flexing
  coverDrop: 0.7, // traced: how far the hinge cover sinks under the panels when open
  mechanismRest: 0.2, // traced: how far the moving hinge parts sit clear of the bent display when open
  cableLift: 1.25, // traced: how far the flex cable runs behind the display's front face
  pleatDepth: 0.16, // traced: how deep the flex cable's pleats are when open
};

export const HEIGHT = SPEC.open.h;
export const HALF_H = HEIGHT / 2;

// traced: the two rear lenses, and the outer radius of the ring around each, on the camera island
export const LENSES = {x: [-69.6, -51.4], z: -45.6, ring: 8.4};
export const ISLAND = {x0: -79.5, x1: -41.5, halfDepth: 11.4};

// ------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
/** Smootherstep: zero slope and curvature at both ends, so a part never jerks at the start of its move. */
export const ease = (x) => {
  const u = clamp(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const within = (p, a, b) => clamp((p - a) / (b - a));
const DEG = Math.PI / 180;

// ------------------------------------------------------------ chapters: iFixit's video order
export const CHAPTERS = [
  {id: 'look', short: 'Look', name: 'First look', time: '0:00'},
  {id: 'open', short: 'Open', name: 'Opening the phone', time: '4:02'},
  {id: 'battery', short: 'Batteries', name: 'Electrically released batteries', time: '5:22'},
  {id: 'audio', short: 'Audio', name: 'Speakers, sensors and USB-C', time: '6:33'},
  {id: 'camera', short: 'Cameras', name: 'Taking out the cameras', time: '7:26'},
  {id: 'board', short: 'Boards', name: 'The flat logic board', time: '8:39'},
  {id: 'inner', short: 'Display', name: 'Removing the inner display', time: '9:29'},
  {id: 'hinge', short: 'Hinge', name: 'Inside the hinge', time: '10:57'},
  {id: 'cable', short: 'Cable', name: 'The cable joining both halves', time: '13:05'},
  {id: 'shell', short: 'Shell', name: 'What is left in the shell', time: '13:05'},
];

// Exploded heights, one per chapter, so a chapter reads as a layer in the finished stack.
const LAYER = {panels: 204, adhesive: 192, cowlings: 136, batteries: 110, audio: 88, antennas: 76, cameras: 62, boards: 36, flex: 14, hinge: -30, display: -58, cover: -72, trim: -84, clearance: 62, button: 16};

// ------------------------------------------------------------ the parts, in removal order
// rect: [x0, z0, x1, z1] and y: [y0, y1] are LAYOUT, traced from Apple's internal views. out: where the part ends up.
const F = (k, v, s, note) => ({k, v, s, note});
export const PARTS = [
  {
    id: 'backGlass', chapter: 'open', side: 'B', name: 'Back glass', weight: 2.4, major: true,
    rect: [-81.6, -58, -HINGE.panelEdge, 58], y: [-0.7, 0], out: [0, LAYER.panels, 0], view: 'three',
    does: 'Closes up the camera half of the phone. It stays tethered to the logic board by a flex cable while it opens, and Apple warns that a poor replacement can slow wireless charging.',
    facts: [
      F('Material', 'Ceramic Shield', 'appleSpecs'),
      F('Held by', 'Adhesive and 2 pentalobe screws beside USB-C', 'appleBackGlass'),
      F('Part number', '661-65096 or 661-65097', 'appleParts'),
      F('Apple service price', '$199', 'ifixitPrices'),
    ],
  },
  {
    id: 'backAdhesive', chapter: 'open', side: 'B', name: 'Back glass adhesive', weight: 0.8,
    rect: [-81.6, -58, -HINGE.panelEdge - 0.3, 58], y: [-0.74, -0.7], out: [0, LAYER.adhesive, 0], view: 'three',
    does: 'A thin sheet cut to the edge of the panel. It seals the phone, and it never goes back: Apple has you pull it off the frame and lay a new one.',
    facts: [F('Part number', '923-15257', 'appleParts'), F('Sold as', '30 sheets', 'appleParts')],
  },
  {
    id: 'outerDisplay', chapter: 'open', side: 'O', name: 'Outer display', weight: 2.4, major: true,
    rect: [HINGE.panelEdge, -58, 81.6, 58], y: [-0.7, 0], out: [0, LAYER.panels, 0], view: 'three',
    does: 'The screen you use with the phone closed. It came off intact for iFixit, which matters because several internal repairs have to go through it.',
    facts: [
      F('Size', '5.4 in, 1398 × 2034, 460 ppi', 'appleSpecs'),
      F('Cover', 'Ceramic Shield 2', 'appleSpecs'),
      F('Held by', 'Adhesive, clips and 2 pentalobe screws', 'appleOuterDisplay'),
      F('Part number', '661-65970', 'appleParts'),
      F('Apple service price', '$379', 'ifixitPrices'),
    ],
  },
  {
    id: 'outerAdhesive', chapter: 'open', side: 'O', name: 'Outer display adhesive', weight: 0.8,
    rect: [HINGE.panelEdge + 0.3, -58, 81.6, 58], y: [-0.74, -0.7], out: [0, LAYER.adhesive, 0], view: 'three',
    does: 'The same job on the display side. Apple warns not to let it cover the top speaker grille when you clean it off.',
    facts: [F('Part number', '923-15256', 'appleParts'), F('Sold as', '30 sheets', 'appleParts')],
  },
  {
    id: 'batteryCowling', chapter: 'open', side: 'B', name: 'Battery connector cowling', weight: 1.5,
    rect: [-30, -26.5, -12.6, 12], y: [-0.98, -0.82], out: [0, LAYER.cowlings, 0], view: 'three',
    does: 'A cover that clamps the flex connectors to the board. Apple has you lift the battery flex first, so the phone stays off for everything after it.',
    facts: [F('Part number', '923-15755', 'appleParts'), F('Reassembly', 'Hooks sit under the lip of the enclosure', 'appleBackGlass')],
  },
  {
    id: 'boardCowling', chapter: 'open', side: 'B', name: 'Logic board upper cowling', weight: 1.5,
    rect: [-41, -44, -24, -16], y: [-0.98, -0.82], out: [0, LAYER.cowlings, 0], view: 'three',
    does: 'Covers flex connectors at the top of the board. Its three trilobe screws go in at two different torques.',
    facts: [F('Part number', '923-15754', 'appleParts'), F('Screws', '3 trilobe, on two different torques', 'appleScrews')],
  },
  {
    id: 'faceTimeCowling', chapter: 'open', side: 'B', name: 'FaceTime camera cowling', weight: 1.5,
    rect: [-43, -56.4, -8, -47.6], y: [-0.98, -0.82], out: [0, LAYER.cowlings, 0], view: 'three',
    does: 'A long bar across the top of the board that holds the FaceTime camera’s flex cable down.',
    facts: [F('Part number', '923-15757', 'appleParts')],
  },
  {
    id: 'ioCowling', chapter: 'open', side: 'O', name: 'I/O board cowling', weight: 1.7,
    rect: [14, 38, 72, 54.6], y: [-0.98, -0.82], out: [0, LAYER.cowlings, 0], view: 'three',
    does: 'A long cover across the I/O board. Two of its screws hide under caps, and five of them sit on top of the super screws that hold the board.',
    facts: [
      F('Part number', '923-15756', 'appleParts'),
      F('Screw caps', '2, part 923-16069', 'appleOuterDisplay'),
      F('Screws', '6 trilobe', 'appleOuterDisplay'),
    ],
  },
  {
    id: 'alsCowling', chapter: 'open', side: 'O', name: 'Ambient light sensor cowling', weight: 1.1,
    rect: [59.6, -53.6, 68, -44.6], y: [-0.98, -0.82], out: [0, LAYER.cowlings, 0], view: 'three',
    does: 'A small cover over the ambient light sensor’s flex connector. It hooks under the top speaker.',
    facts: [F('Part number', '923-15758', 'appleParts')],
  },
  {
    id: 'battery1', chapter: 'battery', side: 'B', name: 'Battery 1', weight: 2.6, major: true,
    rect: [-78, -28, -16, 40.6], y: [-3.7, -0.9], out: [0, LAYER.batteries, 0], view: 'outside',
    does: 'The L-shaped cell, wrapped around the logic board. Its adhesive lets go when current runs through the release tabs, so it lifts out without prying.',
    facts: [
      F('Energy', '7.5 Wh', 'ifixitTeardown', 'iFixit labels its cells by photo position. Matched to Apple’s Battery 1 by shape.'),
      F('Release', '9 V for 90 seconds per tab', 'appleBattery'),
      F('Part number', '661-66166', 'appleParts'),
      F('Apple service price', '$229 for both cells', 'ifixitPrices'),
    ],
  },
  {
    id: 'battery2', chapter: 'battery', side: 'O', name: 'Battery 2', weight: 2.6, major: true,
    rect: [17.4, -40, 79.8, 37.4], y: [-3.7, -0.9], out: [0, LAYER.batteries, 0], view: 'outside',
    does: 'The larger cell, on the outer display side. iFixit found charging hardware on one side only, so one of the two cells charges through the cable that crosses the hinge.',
    facts: [
      F('Energy', '11.6 Wh', 'ifixitTeardown', 'iFixit labels its cells by photo position. Matched to Apple’s Battery 2 by shape.'),
      F('Both cells', '19.1 Wh', 'ifixitTeardown'),
      F('Rated capacity', '4,883 mAh', 'macrumorsBattery'),
      F('Release tabs', '2, black, 9 V for 90 seconds each', 'appleBattery2'),
      F('Part number', '661-66165', 'appleParts'),
    ],
  },
  {
    id: 'bottomSpeaker', chapter: 'audio', side: 'B', name: 'Bottom speaker', weight: 2.2, major: true,
    rect: [-74, 41.4, -35, 57.6], y: [-3.6, -1], out: [0, LAYER.audio, 0], view: 'three',
    does: 'One half of the stereo pair. It sits in the back glass half, and its lower grounding screw doubles as the negative contact when you release Battery 1.',
    facts: [
      F('Audio', 'Built-in stereo speakers', 'appleSpecs'),
      F('Amplifier', 'Apple/Cirrus Logic 338S01377', 'ifixitChips'),
      F('Ground point', 'Lower right screw', 'appleBattery'),
      F('Part number', '923-15993', 'appleParts'),
    ],
  },
  {
    id: 'lowerAntenna', chapter: 'audio', side: 'B', name: 'Lower antenna flex', weight: 1.8,
    rect: [-30, 6, -4, 58], y: [-1, -0.84], out: [0, LAYER.antennas, 0], view: 'three',
    does: 'A long flex cable down the hinge side and along the bottom edge. Apple has you peel it back to reach the Taptic Engine.',
    facts: [F('Screws', '3 trilobe', 'appleTaptic'), F('Comes off', 'Peeled back to reach the Taptic Engine', 'appleTaptic')],
  },
  {
    id: 'taptic', chapter: 'audio', side: 'B', name: 'Taptic Engine', weight: 2,
    rect: [-34.4, 43.6, -9, 56], y: [-3.6, -1], out: [0, LAYER.audio, 0], view: 'three',
    does: 'The small motor behind the taps and clicks you feel. iFixit does not call it out, so its place in this order comes from Apple’s manual.',
    facts: [
      F('Drives Haptic Touch', 'Both displays', 'appleSpecs'),
      F('Driver chip', 'Apple/Cirrus Logic 338S01267', 'ifixitChips'),
      F('Part number', '923-15994', 'appleParts'),
    ],
  },
  {
    id: 'mainMic', chapter: 'audio', side: 'B', name: 'Main microphone', weight: 1.6,
    rect: [-31, 51.8, -18, 57.8], y: [-3, -1.4], out: [0, LAYER.audio, 0], view: 'three',
    does: 'Held by one super screw and a strong adhesive. Apple says to slide it toward the top of the enclosure until the glue lets go.',
    facts: [F('Part number', '923-15996', 'appleParts'), F('Adhesive', '923-15260', 'appleParts')],
  },
  {
    id: 'topSpeaker', chapter: 'audio', side: 'O', name: 'Top speaker', weight: 2, major: true,
    rect: [12, -56.5, 56, -41], y: [-3.6, -1], out: [0, LAYER.audio, 0], view: 'three',
    does: 'The other half of the stereo pair, in the outer display half, so the two speakers sit on opposite sides of the hinge. Apple warns not to touch its grounding springs.',
    facts: [
      F('Audio', 'Built-in stereo speakers', 'appleSpecs'),
      F('Position', 'Outer display side', 'appleParts'),
      F('Part number', '923-15995', 'appleParts'),
    ],
  },
  {
    id: 'usbC', chapter: 'audio', side: 'O', name: 'USB-C connector', weight: 1.8, major: true,
    rect: [31.6, 49.6, 49.6, 58.4], y: [-3.8, -1.2], out: [0, LAYER.audio, 0], view: 'three',
    does: 'Charging, data and video all come through here, on the outer display half. iFixit calls the charging hardware easy to reach.',
    facts: [
      F('Data', 'USB 3, up to 10 Gb/s', 'appleSpecs'),
      F('Fast charge', 'Up to 50% in around 20 min, 60 W adapter', 'appleSpecs'),
      F('Port controller', 'NXP CBTL1701B0', 'ifixitChips'),
      F('Part number', '923-16023 or 923-16024', 'appleParts'),
    ],
  },
  {
    id: 'cameraSpacer', chapter: 'camera', side: 'B', name: 'Camera spacer', weight: 1.8,
    rect: [-80, -38, -44, -28.6], y: [-1.5, -1.1], out: [0, LAYER.cameras + 13, 0], view: 'three',
    does: 'A thin frame under the camera’s edge. One of its screws sits on top of a super screw that holds the camera, the arrangement Apple calls a top screw with a screw underneath.',
    facts: [F('Part number', '923-16068', 'appleParts'), F('Screws', '4 crosshead', 'appleCamera')],
  },
  {
    id: 'rearCamera', chapter: 'camera', side: 'B', name: 'Rear camera', weight: 2.2, major: true,
    rect: [-78.4, -55, -35.6, -33], y: [-4.2, -0.8], out: [0, LAYER.cameras, 0], view: 'edge',
    does: 'Two 48 MP cameras in one assembly, sitting close to the surface under brackets and a lot of screws.',
    facts: [
      F('Main', '48 MP, 26 mm, ƒ/1.6, sensor-shift', 'appleSpecs'),
      F('Ultra Wide', '48 MP, 13 mm, ƒ/2.2', 'appleSpecs'),
      F('Part number', '661-65968', 'appleParts'),
      F('Apple service price', '$229', 'ifixitPrices'),
    ],
  },
  {
    id: 'faceTime', chapter: 'camera', side: 'B', name: 'FaceTime camera', weight: 1.4,
    rect: [-41, -55, -29.6, -48.4], y: [-5, -2.2], out: [0, LAYER.cameras, 0], view: 'edge',
    does: 'Looks out through gaps in the inner display’s pixel pattern. It keeps the screen unbroken, and iFixit notes reviewers call its photos muddy.',
    facts: [
      F('Lens', 'ƒ/1.8', 'appleSpecs'),
      F('Video', '1080p at up to 60 fps', 'appleSpecs'),
      F('Part number', '661-65969', 'appleParts'),
    ],
  },
  {
    id: 'outerFront', chapter: 'camera', side: 'O', name: 'Outer front camera', weight: 1.8,
    rect: [68, -56.4, 80, -42], y: [-3, -0.8], out: [0, LAYER.cameras, 0], view: 'edge',
    does: 'The selfie camera for the closed phone. iFixit calls it incredibly thin.',
    facts: [
      F('Sensor', '12 MP Center Stage', 'appleSpecs'),
      F('Lens', 'ƒ/2.2', 'appleSpecs'),
      F('Part number', '661-65971', 'appleParts'),
    ],
  },
  {
    id: 'upperAntenna', chapter: 'board', side: 'B', name: 'Upper antenna flex', weight: 1.8,
    rect: [-24, -57, -4, 10], y: [-1.5, -1.1], out: [0, LAYER.antennas - 28, 0], view: 'three',
    does: 'The other long flex, running up the hinge side and across the top of the board. It has to come off before the board can.',
    facts: [F('Screws', '1 trilobe, 2 crosshead', 'appleLogicBoard', 'Apple names the two crosshead screws under the lower antenna flex. They sit at the top of the board, so they are grouped with this part here.')],
  },
  {
    id: 'logicBoard', chapter: 'board', side: 'B', name: 'Logic board', weight: 6, major: true,
    rect: [-42.7, -55.6, -12, 11], y: [-3.2, -1.5], out: [0, LAYER.boards, 0], view: 'three', margin: 1.08,
    does: 'The main board, and unusually flat. Almost every iPhone since the 8 has stacked two boards, but this one is a single layer with some jobs moved to the I/O board.',
    facts: [
      F('Chip', 'A20 Pro, 6-core CPU, 7-core GPU', 'appleSpecs'),
      F('Memory', '12 GB LPDDR5X', 'ifixitDevice'),
      F('Modem', 'Apple C2 (APL1117)', 'ifixitChips'),
      F('Wireless', 'Apple N1, Wi-Fi 7 and Bluetooth 6', 'ifixitChips'),
      F('Flex cables', '8 still connected at the last step', 'appleVolume'),
      F('Part number', '661-66067 to 661-66070, by storage', 'appleParts'),
    ],
  },
  {
    id: 'ioBoard', chapter: 'board', side: 'O', name: 'I/O board', weight: 5, major: true,
    rect: [14, 38, 72, 57.4], y: [-3, -1.8], out: [0, LAYER.boards, 0], view: 'three', margin: 1.1,
    does: 'The second single-layer board. It takes on work the logic board would otherwise carry, including a battery charger and the display power supply.',
    facts: [
      F('Charger', 'TI CP3201A0P5', 'ifixitChips'),
      F('Display power', 'TI TPS65659A0', 'ifixitChips'),
      F('Grounding springs', '2, one screw each', 'appleIo'),
      F('Part number', '923-16015', 'appleParts'),
    ],
  },
  {
    id: 'displayTrim', chapter: 'inner', side: 'C', name: 'Inner display trim', weight: 1.4,
    rect: [-82, -58, 82, 58], y: [-5.32, -4.9], out: [0, LAYER.trim, 0], view: 'inner',
    does: 'The black surround of the big screen. Apple has you work it off with a black nylon stick and unhook its clips at the hinge before the display can move.',
    facts: [F('Part number', '923-16158', 'appleParts'), F('In iFixit’s teardown', 'Came off in one piece', 'ifixitTeardown')],
  },
  {
    id: 'coverLayer', chapter: 'inner', side: 'C', name: 'Cover layer', weight: 1.4,
    rect: [-81, -57, 81, 57], y: [-5.24, -5.2], out: [0, LAYER.cover, 0], view: 'inner',
    does: 'The nano-texture skin that hides the crease. It is the cheapest part of the screen to replace, and it comes off without touching the OLED under it.',
    facts: [
      F('Finish', 'Nano-texture', 'appleSpecs'),
      F('Part number', '923-16004', 'appleParts'),
      F('Apple service price', '$49', 'ifixitPrices'),
    ],
  },
  {
    id: 'innerDisplay', chapter: 'inner', side: 'C', name: 'Inner display', weight: 3, major: true,
    rect: [-81, -57, 81, 57], y: [-5.2, -4.6], out: [0, LAYER.display, 0], view: 'inner',
    does: 'The folding OLED, and the expensive part. Apple describes more than ten ultrathin layers on adhesives that let them glide.',
    facts: [
      F('Size', '7.6 in, 1878 × 2670, 430 ppi', 'appleSpecs'),
      F('Part number', '923-15877', 'appleParts'),
      F('Apple service price', '$999', 'ifixitPrices'),
    ],
  },
  {
    id: 'hinge', chapter: 'hinge', side: 'C', name: 'Hinge', weight: 6, major: true,
    rect: [-17, -57, 17, 57], y: [-4.4, -1], out: [0, LAYER.hinge, 0], view: 'three', margin: 1.2, keeps: ['enclosure', 'flexCable'],
    does: 'Gears keep the two halves moving together, springs help it hold position, and a chain of joints shares the bend like a metal watch band. iFixit’s untested hypothesis for the cracked screens is a center support bar that does not drop far enough. The cause is not confirmed.',
    facts: [
      F('Components', 'More than 100', 'applePress'),
      F('Dust test', 'Powder reached the moving parts', 'ifixitTeardown', 'iFixit says this is not an IP test.'),
      F('Apple’s repair', 'Replace the inner display assembly', 'appleHinge'),
    ],
  },
  {
    id: 'flexCable', chapter: 'cable', side: 'C', name: 'Hinge flex cable', weight: 3.6, major: true,
    rect: [-15, -7, 15, 7], y: [-4.1, -3.6], out: [0, LAYER.flex, 0], view: 'three', margin: 3,
    does: 'Crosses the gap between the halves in accordion pleats, carrying power, video and audio. One battery charges through it.',
    facts: [
      F('Shape', 'Accordion-pleated flex', 'ifixitTeardown'),
      F('Named in', 'Hinge and interposer flex cables', 'appleParts'),
    ],
  },
  {
    id: 'volumeButtons', chapter: 'shell', side: 'B', name: 'Volume buttons', weight: 2.4,
    rect: [-74, -58.8, -33, -54], y: [-3.6, -1.4], out: [0, 0, -LAYER.button], view: 'three',
    does: 'Each button is held by a clip and a tiny roll bar. Once the clips are pushed up, the buttons go out through the enclosure.',
    facts: [
      F('Roll bars', '2, reused', 'appleVolume'),
      F('Part number', '923-16122 or 923-16123', 'appleParts'),
      F('Flex cable', '923-15873', 'appleParts'),
    ],
  },
  {
    id: 'touchId', chapter: 'shell', side: 'B', name: 'Touch ID and Camera Control', weight: 2.4,
    rect: [-82.6, -31, -76, 25], y: [-3.6, -1.4], out: [-LAYER.button, 0, 0], view: 'three',
    does: 'Two side buttons sharing one flex cable. Unlike the volume buttons, their clips do not survive: Apple has you cut them with needle-nose pliers.',
    facts: [
      F('Flex cable', '923-15875 or 923-15876', 'appleParts'),
      F('Cowlings', '2, part 923-15753', 'appleTouchId'),
    ],
  },
  {
    id: 'enclosure', chapter: 'shell', side: 'C', name: 'Enclosure', weight: 1.4, major: false,
    rect: [-HINGE.halfOpen, -HALF_H, HINGE.halfOpen, HALF_H], y: [-5.2, 0], out: [0, 0, 0], view: 'three', margin: 1.2,
    does: 'What is left when everything else is out. Polished titanium side rails, a 3D-printed hinge cover and an aluminum internal frame. It is the last thing iFixit has on the table.',
    facts: [
      F('Rails', 'Grade 5 titanium', 'applePress'),
      F('Hinge cover', '3D-printed recycled titanium', 'appleSpecs'),
      F('Internal frame', 'Recycled aluminum', 'appleSpecs'),
      F('Apple service price', '$1,499 for other damage', 'ifixitPrices'),
    ],
  },
].map((part, i) => ({...part, n: i + 1}));

export const PART = Object.fromEntries(PARTS.map((part) => [part.id, part]));

// ------------------------------------------------------------ the small pieces, grouped by what they come out with
const byHost = (list) => {
  const groups = {};
  for (const item of list) (groups[item.host] ??= []).push(item);
  return groups;
};
export const SCREWS_OF = byHost(SCREWS);
export const CHIPS_ON = byHost(CHIPS);
export const PIECE = Object.fromEntries([...SCREWS, ...CHIPS].map((piece) => [piece.id, piece]));
export const PIECES = Object.values(PIECE);
const label = (piece) => (piece.kind === 'screw' ? HEADS[piece.head] : piece.name);
export const COUNTS = {parts: PARTS.length, screws: SCREWS.length, chips: CHIPS.length};

export const SEALED = {
  id: 'sealed', n: 0, chapter: 'look', name: 'Sealed phone', view: 'three',
  does: 'Closed, the Duo is about the size of a passport. Open, it is the thinnest iPhone Apple has made. Everything below comes out in the order iFixit opened it.',
  facts: [],
};

// Headline numbers, always on the page.
export const FACTS = [
  {k: 'Closed', v: '84.1 × 117.8 × 11.3 mm', s: 'appleSpecs'},
  {k: 'Open', v: '164.6 × 117.8 × 5.2 mm', s: 'appleSpecs'},
  {k: 'Weight', v: '254 g', s: 'appleSpecs'},
  {k: 'Batteries', v: '7.5 + 11.6 = 19.1 Wh', s: 'ifixitTeardown'},
  {k: 'Rated capacity', v: '4,883 mAh', s: 'macrumorsBattery'},
  {k: 'Chip', v: 'A20 Pro', s: 'appleSpecs'},
  {k: 'Screws', v: `${SCREWS.length}, in ${Object.keys(HEADS).length} head types`, s: 'appleScrews', note: 'Counted from Apple’s repair procedures.'},
  {k: 'Chips named', v: `${CHIPS.length}`, s: 'ifixitChips', note: 'Counted from iFixit’s chip ID.'},
  {k: 'Repairability', v: '5/10, provisional', s: 'ifixitTeardown'},
];

// Things a visitor might expect that nobody has published. Shown on the page instead of a guess.
export const UNSOURCED = [
  'Part-by-part sizes and weights',
  'Screw lengths and chip dimensions',
  'Hinge dimensions and tolerances',
  'Each cell’s capacity in mAh from Apple',
  'The cause of the reported screen cracks',
];

// ------------------------------------------------------------ the timeline: weighted windows along p
const SEQUENCE = [{id: 'unfold', weight: 3}, ...PARTS.map(({id, weight}) => ({id, weight}))];
const TOTAL = SEQUENCE.reduce((sum, s) => sum + s.weight, 0);
export const WINDOW = {};
{
  let at = 0;
  for (const {id, weight} of SEQUENCE) {
    WINDOW[id] = [at / TOTAL, (at + weight) / TOTAL];
    at += weight;
  }
}

/** The p at which a part has finished coming out, used by its button and by the tour. */
export const settledAt = (id) => (id === 'sealed' ? 0 : WINDOW[id][1]);

// Inside a part's window its screws come out first, then the part moves, then the chips lift off a board. The hinge spends
// the start of its window flexing, and the end of it spreading into its groups.
const SCREW_SHARE = 0.46;
const CHIP_SHARE = 0.42;
const HINGE_FLEX = 0.66;
const HINGE_SPREAD = 0.86;

const moveWindow = (id) => {
  const [a, b] = WINDOW[id];
  if (id === 'hinge') return [lerp(a, b, HINGE_FLEX), lerp(a, b, HINGE_SPREAD)];
  return [SCREWS_OF[id] ? lerp(a, b, SCREW_SHARE) : a, CHIPS_ON[id] ? lerp(a, b, 1 - CHIP_SHARE) : b];
};

/** How far a part has moved, 0 at home to 1 at its exploded position. */
export const partK = (id, p) => {
  const [a, b] = moveWindow(id);
  return ease(within(p, a, b));
};

/** A list shares a span: each item overlaps the next by half, and the last one lands on the end of the span. */
const staggered = (p, a, b, index, count) => {
  const each = (b - a) / (1 + (count - 1) / 2);
  const start = a + (index * each) / 2;
  return ease(within(p, start, start + each));
};

/** How far a small piece has gone: 0 seated, 1 out. */
export const pieceK = (piece, p) => {
  const [a, b] = WINDOW[piece.host];
  if (piece.kind === 'screw') {
    const list = SCREWS_OF[piece.host];
    return staggered(p, a, lerp(a, b, SCREW_SHARE), list.indexOf(piece), list.length);
  }
  const list = CHIPS_ON[piece.host];
  return staggered(p, lerp(a, b, 1 - CHIP_SHARE), b, list.indexOf(piece), list.length);
};

/** The hinge's groups spread apart once it is clear of the shell, so the springs and gears can be seen. */
export const hingeSpread = (p) => {
  const [a, b] = WINDOW.hinge;
  const k = ease(within(p, lerp(a, b, HINGE_SPREAD), b));
  return {springs: 6 * k, gears: 12 * k, bar: -6 * k};
};

/** The display drops clear while the frame flexes and the hinge comes out, then settles back into the stack. */
export const displayClear = (p) => {
  const [a] = WINDOW.hinge;
  const [, b] = WINDOW.flexCable;
  const span = (b - a) * 0.16;
  return -LAYER.clearance * ease(within(p, a - span, a)) * (1 - ease(within(p, b, b + span)));
};

/** A part's offset from home at p. Everything that needs a part's position reads this. */
const DISPLAY_STACK = new Set(['displayTrim', 'coverLayer', 'innerDisplay']);
export const offsetOf = (id, p) => {
  const part = PART[id];
  const k = partK(id, p);
  return [part.out[0] * k, part.out[1] * k + (DISPLAY_STACK.has(id) ? displayClear(p) : 0), part.out[2] * k];
};

const SCREW_LIFT = 8;
const CHIP_LIFT = 6;
/** Where a small piece is at p: it rides with what it came out of. */
export const pieceOffset = (piece, p) => {
  const k = pieceK(piece, p);
  const [x, y, z] = offsetOf(piece.host, p);
  if (piece.kind === 'chip') return [x, y + (piece.side === 'back' ? -CHIP_LIFT : CHIP_LIFT) * k, z];
  const [dx, dy, dz] = piece.dir;
  return [x + dx * SCREW_LIFT * k, y + dy * SCREW_LIFT * k, z + dz * SCREW_LIFT * k];
};

const CHIP_FACE = {logicBoard: [-3.2, -1.5], ioBoard: [-3, -1.8]};
/** A chip's seat, or a screw's, in the flat-open phone. */
export const pieceHome = (piece) => {
  if (piece.kind === 'screw') return [piece.x, piece.y, piece.z];
  const [back, front] = CHIP_FACE[piece.host];
  return [piece.x, piece.side === 'back' ? back - piece.h / 2 : front + piece.h / 2, piece.z];
};

// ------------------------------------------------------------ fold
/** Half the fold, radians: π/2 sealed, 0 flat open. Each half turns this much relative to the hinge cover. */
export const foldPhi = (p) => {
  const [a, b] = WINDOW.unfold;
  return (Math.PI / 2) * (1 - ease(within(p, lerp(a, b, 0.14), b)));
};

/** Extra fold on the stripped frame only: the hinge bends once with nothing attached, as in iFixit's strip-down. */
export const framePhi = (p) => {
  const [a, b] = WINDOW.hinge;
  const k = within(p, a, lerp(a, b, HINGE_FLEX));
  return 62 * DEG * Math.sin(Math.PI * ease(k)) ** 2;
};

/** Opening angle in degrees, 0 sealed to 180 flat. */
export const foldAngle = (p) => 180 - (2 * foldPhi(p)) / DEG;

// A point on the right half, in the hinge cover's frame, turned by phi about the right axis.
const swing = (x, y, phi) => {
  const dx = x - HINGE.axisX;
  const dy = y - HINGE.axisY;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [HINGE.axisX + dx * c + dy * s, HINGE.axisY - dx * s + dy * c];
};

/** Outer size of the body in the hinge cover's frame. Lands on Apple's two published sizes at phi = 0 and π/2. */
export const envelope = (phi) => {
  const corners = [[HINGE.panelEdge, 0], [halfOpen, 0], [halfOpen, -SPEC.open.t], [HINGE.panelEdge, -SPEC.open.t]].map(([x, y]) => swing(x, y, phi));
  const xs = corners.flatMap(([x]) => [x, -x]);
  const ys = corners.map(([, y]) => y);
  const coverTop = coverY(phi);
  const x = Math.max(...xs, 0);
  return {x, yMin: Math.min(...ys), yMax: Math.max(...ys, coverTop)};
};

/** The hinge cover sinks under the panels when open. It rises early in the fold, ahead of the bend in the display. */
export const coverY = (phi) => -HINGE.coverDrop * (1 - Math.sin(phi)) ** 12;

/** The hinge's moving parts ride up with the cover as the phone closes, which makes room for the bend in the display. */
export const hingeRise = (phi) => HINGE.mechanismRest + coverY(phi) - coverY(0);

/** Pose of the whole phone: the back glass half stays flat on the bench while the other half swings under it. */
export const rootPose = (p) => {
  const phi = foldPhi(p);
  const {x, yMin, yMax} = envelope(phi);
  const yc = (yMin + yMax) / 2;
  const rot = -phi;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  // keep the middle of the body at the origin, so the camera has one thing to frame
  return {rot, x: yc * s, y: -yc * c, phi, reach: x};
};

/** Where a point of a half lands in the world once the root is applied. */
const toWorld = (x, y, root) => {
  const c = Math.cos(root.rot);
  const s = Math.sin(root.rot);
  return [root.x + x * c - y * s, root.y + x * s + y * c];
};

// ------------------------------------------------------------ the hinge's moving parts
/**
 * One side's chain of joints, each taking a share of the bend: [{x, y, rot, length}], in the hinge cover's frame, right
 * side. The last link is the wide steel arm in iFixit's photos. Lengths are traced, and keep the chain inside the 5.2 mm
 * body when the phone is closed.
 */
export const hingeLinks = (phi) => {
  const lengths = [2, 2, 6.7];
  let x = HINGE.axisX;
  let y = HINGE.axisY + hingeRise(phi);
  let rot = 0;
  return lengths.map((length, i) => {
    rot = (-phi * (i + 1)) / lengths.length;
    const link = {x, y, rot, length};
    x += length * Math.cos(rot);
    y += length * Math.sin(rot);
    return link;
  });
};

/** Sync gears turn with the fold. Neighbours run opposite ways, so sign alternates along the train. */
export const gearTurn = (phi, index) => (index % 2 ? -1 : 1) * phi * 2;

// The inner display's flexing section can't stretch, so it stays one length at every angle. It leaves each half along
// the half, bows past that line by however much the extra length needs, and crosses the crest level.
const FLEX_LENGTH = 2 * HINGE.displayEdge;
const flexHeading = (phi, bow, s) => phi * Math.cos(Math.PI * s) + bow * Math.sin(2 * Math.PI * s);

/** Half the distance between the strip's two ends for a given bow. */
const flexReach = (phi, bow, samples) => {
  const half = samples / 2;
  let sum = 0;
  for (let i = 0; i < half; i++) sum += Math.cos(flexHeading(phi, bow, (i + 0.5) / samples));
  return (sum * FLEX_LENGTH) / samples;
};

/** The bow that lets a strip of that length land on both halves. */
const flexBow = (phi, reach, samples) => {
  let low = 0;
  let high = 1.2;
  for (let i = 0; i < 24; i++) {
    const bow = (low + high) / 2;
    if (flexReach(phi, bow, samples) > reach) low = bow;
    else high = bow;
  }
  return (low + high) / 2;
};

/** The flexing section as a curve in the hinge cover's frame, left to right. samples must be even. */
export const displayCurve = (phi, samples = 32) => {
  const [x0, y0] = swing(HINGE.displayEdge, -SPEC.open.t, phi);
  const bow = flexBow(phi, x0, samples);
  const step = FLEX_LENGTH / samples;
  const curve = [[-x0, y0]];
  for (let i = 0; i < samples; i++) {
    const heading = flexHeading(phi, bow, (i + 0.5) / samples);
    const [x, y] = curve[i];
    curve.push([x + Math.cos(heading) * step, y + Math.sin(heading) * step]);
  }
  return curve;
};

const PLEATS = 9;

// The flex cable runs behind the display through the same bend, so the bend can't reach it. Its pleats pull out as it
// goes round the outside of the bend.
/** The cable across the fold, in the hinge cover's frame, left to right. samples must be even. */
export const cableCurve = (phi, samples = 72) => {
  const curve = displayCurve(phi, samples);
  const depth = HINGE.pleatDepth * (1 - Math.sin(phi));
  return curve.map(([x, y], i) => {
    const [px, py] = curve[Math.max(i - 1, 0)];
    const [nx, ny] = curve[Math.min(i + 1, samples)];
    const length = Math.hypot(nx - px, ny - py);
    const s = i / samples;
    const offset = HINGE.cableLift + depth * Math.sin(2 * Math.PI * PLEATS * s) * Math.sin(Math.PI * s);
    return [x - ((ny - py) / length) * offset, y + ((nx - px) / length) * offset];
  });
};

// ------------------------------------------------------------ the state of the teardown
/** The part being worked on at p: the last one that has started to move. */
export const activeAt = (p) => {
  let current = SEALED;
  for (const part of PARTS) if (p > WINDOW[part.id][0] + 1e-6) current = part;
  return current;
};

export const chapterAt = (p) => CHAPTERS.findIndex((c) => c.id === activeAt(p).chapter);

/** Orange on the part while it moves, gone by the time it settles. */
export const accentOf = (id, p) => {
  const [a, b] = WINDOW[id];
  const span = b - a;
  return Math.min(ease(within(p, a, a + span * 0.3)), 1 - ease(within(p, lerp(a, b, 0.7), b)));
};

/** Parts fully out by p. */
export const partsOut = (p) => PARTS.filter((part) => p >= WINDOW[part.id][1] - 1e-9).length;

/** The size line under the slider. Between Apple's two published sizes the model shows the angle and no size at all. */
export const sizeAt = (p) => {
  const phi = foldPhi(p);
  if (phi >= Math.PI / 2 - 1e-6) return FACTS[0];
  if (phi <= 1e-6) return FACTS[1];
  return null;
};

/** Everything the panels show at p, in one object. */
export const readout = (p) => {
  const part = activeAt(p);
  return {
    part,
    chapter: chapterAt(p),
    angle: foldAngle(p),
    size: sizeAt(p),
    out: partsOut(p),
    total: PARTS.length,
    screws: SCREWS.filter((screw) => pieceK(screw, p) >= 1).length,
  };
};

// ------------------------------------------------------------ world positions
const onLeft = ({rect}) => rect[0] + rect[2] < 0;
/** Where a leader lands: toward the part's front outer corner, which the layer above doesn't hide. */
const landing = (part) => {
  const {rect, y} = part;
  return [lerp(rect[0], rect[2], onLeft(part) ? 0.25 : 0.75), y[1], lerp(rect[1], rect[3], 0.78)];
};

/** The part's anchor point in the world at p, once it is flat. Leader lines end here. */
export const anchorOf = (id, p) => {
  const part = PART[id];
  const [x, y, z] = landing(part);
  const [ox, oy, oz] = offsetOf(id, p);
  const [wx, wy] = toWorld(x + ox, y + oy, rootPose(p));
  return [wx, wy, z + oz];
};

/** World bounding box of everything at p. */
export const bounds = (p) => {
  const root = rootPose(p);
  const points = [];
  for (const [x, y] of [[halfOpen, 0], [halfOpen, -SPEC.open.t], [HINGE.panelEdge, 0]]) {
    const [hx, hy] = swing(x, y, root.phi);
    points.push(toWorld(hx, hy, root), toWorld(-hx, hy, root));
  }
  let top = 0;
  let low = 0;
  for (const part of PARTS) {
    const dy = offsetOf(part.id, p)[1];
    top = Math.max(top, part.y[1] + dy);
    low = Math.min(low, part.y[0] + dy);
  }
  const bump = 3;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const reach = LAYER.button * partK('volumeButtons', p);
  return {
    min: [Math.min(...xs) - LAYER.button * partK('touchId', p), Math.min(...ys, low + root.y), -HALF_H - reach],
    max: [Math.max(...xs), Math.max(...ys, top + bump + root.y), HALF_H],
  };
};

/** A part's own box at p, with a little air. */
export const partBox = (id, p) => {
  const part = PART[id];
  const dy = offsetOf(id, p)[1];
  const root = rootPose(p);
  const pad = 3;
  const air = CHIPS_ON[id] ? CHIP_LIFT : SCREWS_OF[id] ? SCREW_LIFT : 0;
  const [dx, , dz] = offsetOf(id, p);
  return {
    min: [part.rect[0] + dx - pad, part.y[0] + dy + root.y - pad - (CHIPS_ON[id] ? air : 0), part.rect[1] + dz - pad],
    max: [part.rect[2] + dx + pad, part.y[1] + dy + root.y + pad + air, part.rect[3] + dz + pad],
  };
};

// ------------------------------------------------------------ camera
export const FOV = 22;
export const VIEWS = {
  three: {name: 'Three-quarter', az: -24, el: 30},
  outside: {name: 'Outside', az: 0, el: 80},
  edge: {name: 'Side', az: 0, el: 6},
  inner: {name: 'Inner', az: 22, el: -40},
  hinge: {name: 'Hinge', az: 16, el: -50, margin: 1.75},
};

/** Target, angles and distance that fit a box in view. Pure, so the tour and the capture agree exactly. */
export const fit = (box, azDeg, elDeg, aspect, margin = 1.12) => {
  const az = azDeg * DEG;
  const el = elDeg * DEG;
  const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  const right = [Math.cos(az), 0, -Math.sin(az)];
  const up = [dir[1] * right[2] - dir[2] * right[1], dir[2] * right[0] - dir[0] * right[2], dir[0] * right[1] - dir[1] * right[0]];
  const target = [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
  const half = [0, 1, 2].map((i) => (box.max[i] - box.min[i]) / 2);
  let w = 0;
  let h = 0;
  let d = 0;
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
    const v = [a * half[0], b * half[1], c * half[2]];
    const dot = (n) => v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
    w = Math.max(w, Math.abs(dot(right)));
    h = Math.max(h, Math.abs(dot(up)));
    d = Math.max(d, dot(dir));
  }
  const t = Math.tan((FOV * DEG) / 2);
  return {target, az: azDeg, el: elDeg, dist: Math.max(w / (t * aspect), h / t) * margin + d};
};

// Close-ups the tour holds on, in flat-open millimetres.
const ZOOMS = {
  back: {min: [-48, -6, -60], max: [0, 2, 16]},
};

export const cameraFor = (view, p, aspect, focus = null) => {
  const v = VIEWS[view];
  if (focus) return fit(partBox(focus, p), v.az, v.el, aspect, v.margin ?? PART[focus].margin ?? 1.45);
  return fit(bounds(p), v.az, v.el, aspect);
};

export const blendCamera = (a, b, k) => ({
  target: a.target.map((v, i) => lerp(v, b.target[i], k)),
  az: lerp(a.az, b.az, k),
  el: lerp(a.el, b.el, k),
  dist: lerp(a.dist, b.dist, k),
});

// ------------------------------------------------------------ what each part looks like at p
/**
 * Isolation dissolves every other part down to faint ink outlines. drawing: 0 is the real part, 1 is outline only.
 * line: how orange its outline is. tint: how orange its fill is, only while it moves, so an isolated part shows its
 * real materials.
 */
export const styleOf = (id, p, focus, iso, was = null, swap = 1) => {
  const moving = accentOf(id, p) * (1 - iso);
  const chosen = id === focus ? iso * swap : id === was ? iso * (1 - swap) : 0;
  // a part that is still in place keeps what it sits in; once it is out it stands alone
  const kept = focus && (id === focus || (partK(focus, p) < 0.5 && PART[focus].keeps?.includes(id)));
  const drawing = focus && !kept ? iso : 0;
  // choosing another part dissolves one into the other, so the rest of the phone doesn't flash back between them
  const swapped = id === focus ? iso * (1 - swap) : id === was ? drawing * swap : drawing;
  return {
    drawing: swapped,
    line: Math.max(moving, chosen * 0.25),
    tint: moving * 0.6,
  };
};

const PICKED = 0.72;
/** A small piece follows its host, goes orange while it moves, and stays orange while it is picked. */
export const pieceStyle = (piece, p, focus, iso, pick, was = null, swap = 1) => {
  const k = pieceK(piece, p);
  return {
    drawing: styleOf(piece.host, p, focus, iso, was, swap).drawing,
    tint: piece.id === pick ? PICKED : 0.7 * Math.sin(Math.PI * k) * (1 - iso),
  };
};

/** Where a leader lands on a small piece. */
export const pieceAnchor = (piece, p) => {
  const [x, y, z] = pieceHome(piece);
  const [ox, oy, oz] = pieceOffset(piece, p);
  const [wx, wy] = toWorld(x + ox, y + oy, rootPose(p));
  return [wx, wy, z + oz];
};

/**
 * Numbered callouts at p. A picked piece gets the only leader. With a focus, that part alone. Otherwise the main parts
 * and the part being worked on: the small ones would crowd the edge. Views that look through other layers keep only the
 * active part, because the rest would point at things the visitor can't see.
 */
export const calloutsAt = (p, focus = null, view = 'three', pick = null) => {
  if (pick) {
    const piece = PIECE[pick];
    return [{id: piece.host, n: piece.kind === 'screw' ? piece.id : piece.tag, name: label(piece), at: pieceAnchor(piece, p), side: onLeft(PART[piece.host]) ? 'left' : 'right', active: true}];
  }
  const active = activeAt(p);
  const all = view === 'three' || view === 'edge';
  const shown = (part) => part === active || (all && part.major);
  const list = focus ? [PART[focus]] : PARTS.filter((part) => part.id !== 'enclosure' && partK(part.id, p) > 0.55 && shown(part));
  return list.map((part) => ({
    id: part.id,
    n: part.n,
    name: part.name,
    at: anchorOf(part.id, p),
    side: onLeft(part) ? 'left' : 'right',
    active: focus ? true : part.id === active.id,
  }));
};

// ------------------------------------------------------------ the walk-through, a pure function of seconds
// The opening is quick: the phone opens as it turns to the fold, then turns back so the first part is seen leaving. After
// that every part takes its turn: it comes out with the whole phone in view, then stands alone for a beat. The walk-through
// keeps moving: a visitor who wants to read presses Pause.
const after = (id) => settledAt(id);
const ISOLATE_TIME = 1.5;
const BEAT = 0.8;

/** Screws and chips each need a moment to be seen leaving. */
const removeTime = ({id}) => Math.min(2.8 + 0.2 * (SCREWS_OF[id]?.length ?? 0) + 0.05 * (CHIPS_ON[id]?.length ?? 0), 5.5);

// a view from above would look at the panels lifted over the part, so the part comes out in the three-quarter view
const WATCH_FROM = {outside: 'three'};

const turnOf = (part) => [
  {p: after(part.id), view: WATCH_FROM[part.view] ?? part.view, move: removeTime(part), hold: 0, label: `${part.name} comes out`},
  {p: after(part.id), view: part.view, focus: part.id, move: ISOLATE_TIME, hold: BEAT, label: part.name},
];

// the parts with more to show than one turn
const TURNS = {
  outerAdhesive: (part) => [
    ...turnOf(part),
    {p: after(part.id), view: 'three', zoom: 'back', move: 2.6, hold: BEAT, label: 'under the glass'},
  ],
  logicBoard: (part) => [
    ...turnOf(part),
    {p: after(part.id), view: 'inner', focus: part.id, pick: 'a20', move: 2.6, hold: BEAT, label: 'logic board back'},
  ],
  hinge: (part) => [
    {p: lerp(...WINDOW.hinge, HINGE_FLEX), view: 'hinge', focus: part.id, move: 7, hold: 0, label: 'hinge flexes'},
    {p: after(part.id), view: 'three', focus: part.id, move: 4, hold: BEAT, label: 'hinge out'},
  ],
};

const STEPS = [
  {p: 0, view: 'three', move: 0, hold: BEAT / 2, label: 'sealed'},
  {p: after('unfold'), view: 'inner', move: 3, hold: 0, label: 'unfolded'},
  {p: after('unfold'), view: 'three', move: 1.5, hold: 0, label: 'back glass up'},
  ...PARTS.flatMap((part) => (TURNS[part.id] ?? turnOf)(part)),
  {p: 1, view: 'three', move: 4, hold: BEAT, label: 'fully exploded'},
  {p: 0, view: 'three', move: 7, hold: 0, label: 'reassembled'},
];

/** The steps on a clock: start moving, arrive at, hold until. */
export const TOUR_KEYS = (() => {
  let clock = 0;
  return STEPS.map((step) => {
    const start = clock;
    const at = start + step.move;
    clock = at + step.hold;
    return {...step, start, at, until: clock};
  });
})();
export const TOUR_DURATION = TOUR_KEYS[TOUR_KEYS.length - 1].until;
const ISO_FADE = 1.2;
const DRIFT_DEG = 3;
const DRIFT_CYCLES = 9;

const tourPhase = (time) => {
  const t = ((time % TOUR_DURATION) + TOUR_DURATION) % TOUR_DURATION;
  const index = TOUR_KEYS.findIndex((key) => t < key.until);
  const i = index < 0 ? TOUR_KEYS.length - 1 : index;
  const key = TOUR_KEYS[i];
  return {
    t,
    index: i,
    key,
    prev: TOUR_KEYS.at(i - 1),
    k: key.move ? ease(within(t, key.start, key.at)) : 1,
    fade: key.move ? ease(within(t, key.start, key.start + ISO_FADE)) : 1,
  };
};

/** Isolation across a step: fades in, fades out, or hands from one part to the next through nothing. */
const isolationAt = (prev, key, k) => {
  if (prev.focus === key.focus) return {focus: key.focus ?? null, iso: key.focus ? 1 : 0};
  if (!prev.focus) return {focus: key.focus, iso: k};
  if (!key.focus) return {focus: k < 1 ? prev.focus : null, iso: 1 - k};
  return k < 0.5 ? {focus: prev.focus, iso: 1 - 2 * k} : {focus: key.focus, iso: 2 * k - 1};
};

/** Everything the tour shows at t. Loops. Never reads a clock or remembers a frame. */
export const tourAt = (time) => {
  const {t, index, key, prev, k, fade} = tourPhase(time);
  const isolation = isolationAt(prev, key, fade);
  // going back together, the panels are about the sealed phone, not each part it passes
  const resting = key.p < prev.p ? SEALED.id : null;
  return {
    t,
    index,
    p: lerp(prev.p, key.p, k),
    view: key.view,
    pick: k > 0.6 ? key.pick ?? null : null,
    selected: isolation.iso > 0.5 ? isolation.focus : resting,
    ...isolation,
  };
};

const framing = (step, p, aspect) => {
  if (!step.zoom) return cameraFor(step.view, p, aspect, step.focus ?? null);
  const {az, el} = VIEWS[step.view];
  return fit(ZOOMS[step.zoom], az, el, aspect, 1.02);
};

/** The tour's camera: each step's view fitted to the current p, blended across the move, with a slow drift on top. */
export const tourCamera = (time, aspect) => {
  const {t, key, prev, k} = tourPhase(time);
  const p = lerp(prev.p, key.p, k);
  const cam = blendCamera(framing(prev, p, aspect), framing(key, p, aspect), k);
  return {...cam, az: cam.az + DRIFT_DEG * Math.sin((2 * Math.PI * DRIFT_CYCLES * t) / TOUR_DURATION)};
};
