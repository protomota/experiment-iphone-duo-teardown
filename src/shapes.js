// What every part is made from: shape helpers, materials and the container that merges a part's geometry by material.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const SURFACES = {
  rail: {color: '#5a677a', metalness: 1, roughness: 0.36},
  cover: {color: '#8a93a0', metalness: 0.55, roughness: 0.74},
  backGlass: {color: '#2f3744', metalness: 0.15, roughness: 0.46},
  screen: {color: '#07080a', metalness: 0, roughness: 0.2},
  matte: {color: '#101114', metalness: 0, roughness: 0.62},
  lens: {color: '#04060a', metalness: 0.4, roughness: 0.08},
  frame: {color: '#17181b', metalness: 0.4, roughness: 0.62},
  pouch: {color: '#c6c7ca', metalness: 0.35, roughness: 0.52},
  brushed: {color: '#8f9195', metalness: 0.85, roughness: 0.55},
  can: {color: '#a0a2a6', metalness: 0.8, roughness: 0.48},
  plastic: {color: '#17181b', metalness: 0, roughness: 0.68},
  board: {color: '#1a1c20', metalness: 0.15, roughness: 0.6},
  steel: {color: '#b6b7ba', metalness: 1, roughness: 0.44},
  gold: {color: '#c79f58', metalness: 1, roughness: 0.4},
  copper: {color: '#b9855f', metalness: 0.9, roughness: 0.5},
  plate: {color: '#b3a48f', metalness: 0.6, roughness: 0.52},
  flash: {color: '#efe7c8', metalness: 0, roughness: 0.3},
  cowl: {color: '#6f7277', metalness: 0.8, roughness: 0.5},
  film: {color: '#d4d3cb', metalness: 0, roughness: 0.74},
  nano: {color: '#262a31', metalness: 0, roughness: 0.72},
  ribbon: {color: '#2a2622', metalness: 0.1, roughness: 0.6},
  fastener: {color: '#ffffff', metalness: 0.9, roughness: 0.46},
  component: {color: '#ffffff', metalness: 0.2, roughness: 0.56},
  package: {color: '#ffffff', metalness: 0.1, roughness: 0.5},
  lid: {color: '#ffffff', metalness: 0.85, roughness: 0.46},
  die: {color: '#ffffff', metalness: 0.5, roughness: 0.36},
};

// ------------------------------------------------------------ shape helpers
/** A closed outline through points in the x-z plane, with a corner radius per point. */
export const outline = (points, radius = 0) => {
  const radii = Array.isArray(radius) ? radius : points.map(() => radius);
  const shape = new THREE.Shape();
  const n = points.length;
  points.forEach((point, i) => {
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const r = radii[i];
    const toward = (from, to, d) => {
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const k = Math.min(d, len / 2) / len;
      return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    };
    const a = toward(point, prev, r);
    const b = toward(point, next, r);
    if (i === 0) shape.moveTo(...a);
    else shape.lineTo(...a);
    if (r) shape.quadraticCurveTo(point[0], point[1], ...b);
  });
  shape.closePath();
  return shape;
};
export const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

/** Extrudes a shape between two heights. Shape y becomes world z. */
export const slab = (shape, y0, y1, bevel = 0, curveSegments = 8) => {
  const depth = Math.max(y1 - y0 - 2 * bevel, 0.01);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y1 - bevel, 0);
  return geometry;
};
export const block = (x0, z0, x1, z1, y0, y1, r = 0.3, bevel = 0) => slab(outline(rect(x0, z0, x1, z1), r), y0, y1, bevel, 3);
export const disc = (x, z, r, y0, y1, segments = 28) => {
  const geometry = new THREE.CylinderGeometry(r, r, y1 - y0, segments);
  geometry.translate(x, (y0 + y1) / 2, z);
  return geometry;
};
export const ring = (x, z, r0, r1, y0, y1, segments = 40) => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r0, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = slab(shape, y0, y1, 0, segments / 2);
  geometry.translate(x, 0, z);
  return geometry;
};
/** A coil spring along z: a ribbed bar, cheap and convincing at this size. */
export const spring = (x, y, z0, z1, r) => {
  const turns = Math.round((z1 - z0) / 0.62);
  const profile = [];
  for (let i = 0; i <= turns * 2; i++) profile.push(new THREE.Vector2(r * (i % 2 ? 1 : 0.8), ((z1 - z0) * i) / (turns * 2)));
  const geometry = new THREE.LatheGeometry(profile, 7);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, z0);
  return geometry;
};
/** A spur gear about z, in the x-y plane, centred on the origin. */
export const gear = (r, teeth, length) => {
  const shape = new THREE.Shape();
  const root = r * 0.76;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[root, a], [r, a + step * 0.2], [r, a + step * 0.5], [root, a + step * 0.7]];
    for (const [rr, an] of pts) {
      const x = rr * Math.cos(an);
      const y = rr * Math.sin(an);
      if (i === 0 && rr === root && an === a) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: length, bevelEnabled: false, curveSegments: 1});
  geometry.translate(0, 0, -length / 2);
  return geometry;
};

/** A star of n rounded lobes: the recess of a pentalobe, Torx or trilobe screw. */
export const lobes = (n, inner, outer, samples = n * 6) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const radius = inner + (outer - inner) * (0.5 + 0.5 * Math.cos(n * angle));
    const point = [radius * Math.cos(angle), radius * Math.sin(angle)];
    if (i) shape.lineTo(...point);
    else shape.moveTo(...point);
  }
  shape.closePath();
  return shape;
};

/** Punches a round hole through a shape at each point. */
export const pierced = (shape, holes, radius = 0.8) => {
  for (const [x, z] of holes) {
    const hole = new THREE.Path();
    hole.absarc(x, z, radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
};

/** A flat ribbon along a path in the x-z plane: a flex cable, or a fence on a board. */
export const flexRun = (path, width, y0, y1 = y0 + 0.14) => {
  const left = [];
  const right = [];
  const normal = ([ax, az], [bx, bz]) => {
    const length = Math.hypot(bx - ax, bz - az);
    return [(az - bz) / length, (bx - ax) / length];
  };
  path.forEach((point, i) => {
    const before = normal(path[Math.max(i - 1, 0)], path[Math.max(i, 1)]);
    const after = normal(path[Math.min(i, path.length - 2)], path[Math.min(i + 1, path.length - 1)]);
    const mx = before[0] + after[0];
    const mz = before[1] + after[1];
    const length = Math.hypot(mx, mz);
    const scale = (width / 2 / ((mx * before[0] + mz * before[1]) / length)) / length;
    left.push([point[0] + mx * scale, point[1] + mz * scale]);
    right.push([point[0] - mx * scale, point[1] - mz * scale]);
  });
  return slab(outline([...left, ...right.reverse()], 0.3), y0, y1, 0, 2);
};

export const prepare = (geometry) => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  for (const name of Object.keys(flat.attributes)) if (name !== 'position' && name !== 'normal') flat.deleteAttribute(name);
  return flat;
};

// ------------------------------------------------------------ materials
// Every part owns its uniforms, so isolating one part fades all the others down to faint ink outlines. A fading mesh moves
// to the transparent pass, which runs after the chosen part, so nothing can block it. Custom blending keeps the same
// shader in both passes, so a fade never stalls on a recompile.
const FRAGMENT = `
  {
    float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.961, 0.502, 0.145) * (0.62 + 0.6 * lum), uTint);
    if (uDrawing > 0.995) discard;
    gl_FragColor.a *= 1.0 - uDrawing;
  }
  #include <dithering_fragment>`;

// Two faces on one plane can't be ordered by depth, so they flicker as the camera moves. Each surface gets its own small
// bias, so a tie always resolves the same way. Later in the list wins.
const TIE_ORDER = ['frame', 'board', 'cover', 'rail', 'brushed', 'pouch', 'can', 'plate', 'matte', 'screen', 'nano', 'backGlass', 'plastic', 'ribbon', 'copper', 'component', 'steel', 'cowl', 'gold', 'film', 'lens', 'flash', 'package', 'lid', 'die', 'fastener'];
const BIAS_STEP = 3;
const depthBias = (name) => ({polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 + (TIE_ORDER.length - 1 - TIE_ORDER.indexOf(name)) * BIAS_STEP});

const FADES = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  forceSinglePass: true,
};

export const makeMaterial = (name, style, side = THREE.FrontSide) => {
  const material = new THREE.MeshStandardMaterial({...SURFACES[name], ...FADES, ...depthBias(name), side, envMapIntensity: 0.5});
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = style.uTint;
    shader.uniforms.uDrawing = style.uDrawing;
    shader.fragmentShader = `uniform float uTint;\nuniform float uDrawing;\n${shader.fragmentShader}`.replace('#include <dithering_fragment>', FRAGMENT);
  };
  material.customProgramCacheKey = () => 'duo-part';
  return material;
};

/** Each instance of a small piece carries its own dissolve and tint, because it can move apart from what it came out of. */
export const makePieceMaterial = (name) => {
  const material = new THREE.MeshStandardMaterial({...SURFACES[name], ...FADES, ...depthBias(name), vertexColors: true, envMapIntensity: 0.5});
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute vec2 aStyle;\nvarying vec2 vStyle;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStyle = aStyle;');
    shader.fragmentShader = `varying vec2 vStyle;\n#define uDrawing vStyle.x\n#define uTint vStyle.y\n${shader.fragmentShader}`.replace('#include <dithering_fragment>', FRAGMENT);
  };
  material.customProgramCacheKey = () => 'duo-piece';
  return material;
};

const bare = (geometry) => {
  geometry.deleteAttribute('uv');
  return geometry;
};
const UNIT_BOX = bare(new THREE.BoxGeometry(1, 1, 1));
const UNIT_TOP = bare(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
const UNIT_BOTTOM = bare(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2));

// ------------------------------------------------------------ a part: geometry by material, grouped by what carries it
export const createPart = (id) => {
  const style = {uTint: {value: 0}, uDrawing: {value: 0}};
  const lines = new THREE.LineBasicMaterial({color: '#17191c', transparent: true, opacity: 0.3});
  const bins = new Map();
  const crowds = [];
  const part = {
    id,
    style,
    lines,
    groups: {},
    meshes: [],
    details: [],
    add(surface, geometry, carrier = 'main', outlined = true) {
      const key = `${carrier}/${surface}/${outlined}`;
      if (!bins.has(key)) bins.set(key, {carrier, surface, outlined, list: []});
      bins.get(key).list.push(prepare(geometry));
      return part;
    },
    /** Small detail: drawn, but too busy to carry ink outlines. */
    fine(surface, geometry, carrier = 'main') {
      return part.add(surface, geometry, carrier, false);
    },
    /** Thousands of tiny pieces as one draw call. Each entry is [x, y, z, w, h, d, color]. shape: 'box', 'top' or 'bottom'. */
    crowd(surface, list, shape = 'box', carrier = 'main') {
      crowds.push({surface, list, shape, carrier});
      return part;
    },
    group(carrier = 'main') {
      if (!part.groups[carrier]) part.groups[carrier] = new THREE.Group();
      return part.groups[carrier];
    },
    build(shadows) {
      for (const {carrier, surface, outlined, list} of bins.values()) {
        const geometry = mergeGeometries(list);
        const mesh = new THREE.Mesh(geometry, makeMaterial(surface, style));
        mesh.receiveShadow = shadows;
        part.group(carrier).add(mesh);
        part.meshes.push(mesh);
        if (outlined) {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 42), lines);
          edges.renderOrder = 1; // over a fading surface, not under it
          part.group(carrier).add(edges);
        }
      }
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      const units = {box: UNIT_BOX, top: UNIT_TOP, bottom: UNIT_BOTTOM};
      for (const {surface, list, shape, carrier} of crowds) {
        const mesh = new THREE.InstancedMesh(units[shape], makeMaterial(surface, style), list.length);
        list.forEach(([x, y, z, w, h, d, tone], i) => {
          mesh.setMatrixAt(i, matrix.makeScale(w, h, d).setPosition(x, y, z));
          if (tone) mesh.setColorAt(i, color.set(tone));
        });
        mesh.frustumCulled = false;
        mesh.receiveShadow = shadows;
        part.group(carrier).add(mesh);
        part.details.push(mesh);
      }
    },
  };
  return part;
};
