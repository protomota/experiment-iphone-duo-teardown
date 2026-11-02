// The studio: a transparent canvas over the page's paper, a soft overhead light for the glass to catch and a pool of
// shadow under the stack. draw(cam) renders one frame from a camera the model has already worked out.
import * as THREE from 'three';
import {FOV, bounds} from './model.js';
import {buildPhone} from './phone.js';

const POOL_DROP = 14;
const POOL_REACH = 1.35;

const softShadow = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  glow.addColorStop(0, 'rgba(40,42,46,0.42)');
  glow.addColorStop(0.55, 'rgba(40,42,46,0.14)');
  glow.addColorStop(1, 'rgba(40,42,46,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
};

const studio = (renderer) => {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#d7d8da');
  const panel = (w, h, position, brightness) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(brightness), side: THREE.DoubleSide}));
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(14, 14, [0, 14, 3], 2);
  panel(3, 14, [-13, 4, 6], 3.2);
  panel(3, 14, [13, 4, -4], 2);
  panel(18, 2, [0, 2, 14], 1.5);
  panel(14, 14, [0, -14, 0], 0.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return texture;
};

export function createStage(canvas, {shadows, keepBuffer = false}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: keepBuffer, powerPreference: 'high-performance'});
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 6000);

  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(-160, 420, 200);
  sun.castShadow = shadows;
  Object.assign(sun.shadow.camera, {left: -240, right: 240, top: 240, bottom: -240, near: 60, far: 900});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#ffffff', '#cfd0d3', 0.55));

  const phone = buildPhone({shadows});
  scene.add(phone.root);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: softShadow(), transparent: true, depthWrite: false, toneMapped: false}));
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = -1;
  scene.add(pool);

  const size = {w: 16, h: 9};
  const resize = (w, h, pixelRatio) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const DEG = Math.PI / 180;
  const aim = ({target: [tx, ty, tz], az, el, dist}) => {
    const a = az * DEG;
    const e = el * DEG;
    camera.position.set(tx + dist * Math.cos(e) * Math.sin(a), ty + dist * Math.sin(e), tz + dist * Math.cos(e) * Math.cos(a));
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();
  };

  // Depth precision falls with the square of the distance and rises with the near plane, so a range that always spans the
  // whole scene leaves layers a tenth of a millimetre apart fighting. Fit it to what is on screen, every frame.
  const DEPTH_PAD = 40;
  const view = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const fitDepth = ({min, max}) => {
    camera.getWorldDirection(view);
    let nearest = Infinity;
    let farthest = 0;
    for (const x of [min[0] * POOL_REACH, max[0] * POOL_REACH]) for (const y of [min[1] - POOL_DROP, max[1]]) for (const z of [min[2] * POOL_REACH, max[2] * POOL_REACH]) {
      const along = corner.set(x, y, z).sub(camera.position).dot(view);
      nearest = Math.min(nearest, along);
      farthest = Math.max(farthest, along);
    }
    camera.near = Math.max(nearest - DEPTH_PAD, 8);
    camera.far = farthest + DEPTH_PAD;
    camera.updateProjectionMatrix();
  };

  const draw = (p, cam, focus = null, iso = 0, pick = null, was = null, swap = 1) => {
    phone.update(p, focus, iso, pick, was, swap);
    const box = bounds(p);
    const {min, max} = box;
    pool.position.set(0, min[1] - POOL_DROP, 0);
    pool.scale.set((max[0] - min[0]) * POOL_REACH, (max[2] - min[2]) * POOL_REACH, 1);
    pool.material.opacity = 1 - iso * 0.8;
    aim(cam);
    fitDepth(box);
    renderer.render(scene, camera);
  };

  const v = new THREE.Vector3();
  const project = ([x, y, z]) => {
    v.set(x, y, z).project(camera);
    return [(v.x * 0.5 + 0.5) * size.w, (-v.y * 0.5 + 0.5) * size.h];
  };

  const setShadows = (on) => {
    if (renderer.shadowMap.enabled === on) return;
    renderer.shadowMap.enabled = on;
    sun.castShadow = on;
    scene.traverse((node) => {
      if (node.isMesh && node.material.isMeshStandardMaterial) {
        node.receiveShadow = on;
        node.material.needsUpdate = true;
      }
    });
  };

  return {renderer, scene, camera, phone, resize, draw, project, setShadows, size};
}
