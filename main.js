// main.js
// Three.js + PLYLoader + OrbitControls + GSAP ScrollTrigger + TextGeometry（浏览器原生 ES Module + CDN URL）

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/PLYLoader.js';
import { FontLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://unpkg.com/three@0.160.0/examples/jsm/geometries/TextGeometry.js';

// GSAP / ScrollTrigger 通过全局对象提供
// eslint-disable-next-line no-undef
gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------
// 基础场景设置
// ---------------------------------------------------------
const scene = new THREE.Scene();
const bgColor = new THREE.Color(0x050510);
scene.background = bgColor;

// 雾效，营造宇宙深度
scene.fog = new THREE.Fog(bgColor, 10, 140);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1, 5); // 初始位置

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// 柔和环境光 + 轻微主光源
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
mainLight.position.set(5, 10, 8);
scene.add(mainLight);

// OrbitControls（用于调试，如不需要可注释）
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;

// ---------------------------------------------------------
// 加载 PLY 点云模型为粒子世界（使用书房.ply）
// ---------------------------------------------------------
let points = null;

const loader = new PLYLoader();
loader.load(
  './书房.ply',
  (geometry) => {
    geometry.computeBoundingBox?.();
    geometry.center?.();

    const material = new THREE.PointsMaterial({
      size: 0.01,
      color: new THREE.Color('#b780cf'), // 紫色偏梦幻
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
  },
  undefined,
  (error) => {
    console.error('加载 书房.ply 模型失败:', error);
  }
);

// ---------------------------------------------------------
// 漂浮文字（使用 TextGeometry）
// ---------------------------------------------------------
const textConfigs = [
  { text: 'WELCOME',   position: new THREE.Vector3(0, 0.5, -10) },
  { text: 'IDEAS',     position: new THREE.Vector3(-0.6, 0.3, -30) },
  { text: 'DESIGN',    position: new THREE.Vector3(0.8, 0.4, -50) },
  { text: 'PORTFOLIO', position: new THREE.Vector3(0, 0.2, -70) }
];

const textMeshes = [];

const fontLoader = new FontLoader();
fontLoader.load(
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json',
  (font) => {
    textConfigs.forEach((cfg) => {
      const geo = new TextGeometry(cfg.text, {
        font,
        size: 0.7,
        height: 0.02,
        curveSegments: 8
      });
      geo.computeBoundingBox();
      geo.center();

      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0 // 先隐藏，接近时再显现
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(cfg.position);
      scene.add(mesh);
      textMeshes.push(mesh);
    });
  },
  undefined,
  (err) => {
    console.error('加载字体失败:', err);
  }
);

// ---------------------------------------------------------
// GSAP ScrollTrigger：滚动驱动相机从 z=5 → z=-80
// ---------------------------------------------------------
const scrollDistance = 5000; // 对应 500vh 的视觉感觉

// eslint-disable-next-line no-undef
gsap.to(camera.position, {
  z: -80,
  ease: 'none',
  scrollTrigger: {
    trigger: '.scroll-wrapper',
    start: 'top top',
    end: `+=${scrollDistance}`,
    scrub: true
  }
});

// 轻微改变 x/y，制造“漂浮感”
// eslint-disable-next-line no-undef
gsap.to(camera.position, {
  x: 0.4,
  y: 1.2,
  ease: 'none',
  scrollTrigger: {
    trigger: '.scroll-wrapper',
    start: 'top top',
    end: `+=${scrollDistance}`,
    scrub: true
  }
});

// ---------------------------------------------------------
// 动画循环：粒子轻微旋转 / 呼吸，文字随距离淡入
// ---------------------------------------------------------
const clock = new THREE.Clock();

function updateFloatingText() {
  const camZ = camera.position.z;

  textMeshes.forEach((mesh, idx) => {
    const targetZ = textConfigs[idx].position.z;
    const dist = Math.abs(camZ - targetZ);

    // 距离越近，透明度越高（在 8～25 范围内渐变）
    const visibleRangeNear = 8;
    const visibleRangeFar = 25;

    let opacity = 0;
    if (dist < visibleRangeFar) {
      const k = 1 - (dist - visibleRangeNear) / (visibleRangeFar - visibleRangeNear);
      opacity = THREE.MathUtils.clamp(k, 0, 1);
    }

    const mat = mesh.material;
    if (mat) {
      mat.opacity = opacity;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // 粒子自转 + 呼吸
  if (points) {
    points.rotation.y += 0.0005; // 缓慢自转

    // 呼吸：整体 scale 在 0.98 ~ 1.02 之间轻微变化
    const s = 1 + Math.sin(elapsed * 0.6) * 0.02;
    points.scale.set(s, s, s);
  }

  controls.update();
  updateFloatingText();

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------
// 自适应窗口大小
// ---------------------------------------------------------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

