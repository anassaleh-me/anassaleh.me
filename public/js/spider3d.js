// Mechanical Spider as a real 3D model (.glb exported from Blender with its head and body turns baked in).
// The file holds the same 21 x 5 grid of poses as the rendered frames; between grid points the bones are blended,
// so the head follows the cursor smoothly while the feet stay planted. Its colours are the Cycles lighting baked into
// one texture, drawn unlit, so it looks like the render and stays light to draw. three.js loads from jsDelivr only
// when the section comes near; until the model is ready the stage shows the rendered centre frame.
const V = "0.170.0", CDN = `https://cdn.jsdelivr.net/npm/three@${V}`;
const COLS = 21, ROWS = 5, FPS = 24;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function mountSpider3D(stage, { model, poster, reduce = false } = {}) {
  const still = new Image();
  still.className = "spider__still"; still.alt = ""; still.src = poster;
  stage.prepend(still);
  still.decode().then(() => stage.classList.add("is-ready"), () => {});
  const at = { c: 10, r: 2, tc: 10, tr: 2 };
  let lastMove = 0, visible = false, raf = 0, api = null;

  function aim(x, y) {
    const r = stage.getBoundingClientRect();
    const dx = clamp((x - (r.left + r.width / 2)) / (innerWidth * 0.45), -1, 1);
    const dy = clamp((y - (r.top + r.height * 0.45)) / (innerHeight * 0.45), -1, 1);
    at.tc = ((dx + 1) / 2) * (COLS - 1); // column 0 looks to the left of the screen
    at.tr = ((dy + 1) / 2) * (ROWS - 1); // row 0 looks up
    lastMove = performance.now();
  }
  addEventListener("pointermove", (e) => { if (visible) aim(e.clientX, e.clientY); }, { passive: true });
  stage.addEventListener("pointerdown", (e) => aim(e.clientX, e.clientY));

  async function load() {
    const [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import(`${CDN}/+esm`),
      import(`${CDN}/examples/jsm/loaders/GLTFLoader.js/+esm`),
      import(`${CDN}/examples/jsm/libs/meshopt_decoder.module.js/+esm`),
    ]);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    // the floor shadow is drawn once (the feet never move), not on every frame
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; renderer.shadowMap.autoUpdate = false;
    const canvas = renderer.domElement;
    canvas.className = "spider__canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Mechanical spider, a 3D model by Anas, turning its head toward the pointer");

    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(25, 40, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 10; sun.shadow.blurSamples = 16; sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // the same camera as the Blender render: 60 mm lens, 56 units away, 18 degrees above
    const cam = new THREE.PerspectiveCamera(21.2, 1.6, 1, 200);
    const pitch = THREE.MathUtils.degToRad(18);
    cam.position.set(0, 4.2 + Math.sin(pitch) * 56, Math.cos(pitch) * 56); cam.lookAt(0, 4.2, 0);

    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(model);
    const root = gltf.scene; scene.add(root);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.frustumCulled = false;
      const map = o.material.map;
      o.material = new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : 0x2a2a28 });
    });
    // two copies of every clip: one plays the row above the pointer, one the row below, blended by weight
    const mixer = new THREE.AnimationMixer(root);
    const rows = [0, 1].map(() => gltf.animations.map((clip) => { const a = mixer.clipAction(clip.clone()); a.play(); a.paused = true; return a; }));

    function size() {
      const r = stage.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      // keep the whole spider in view on narrow screens
      cam.fov = cam.aspect < 1.3 ? 21.2 * (1.3 / cam.aspect) * 0.92 : 21.2;
      cam.updateProjectionMatrix();
      drawn = "";
    }
    let drawn = "";
    function pose(c, r) {
      const r0 = Math.min(Math.floor(r), ROWS - 2), fr = r - r0;
      // Blender frame 1 sits at time 1/24
      rows.forEach((set, k) => set.forEach((a) => { a.time = ((r0 + k) * COLS + c + 1) / FPS; a.setEffectiveWeight(k ? fr : 1 - fr); }));
      mixer.update(0);
      renderer.render(scene, cam);
    }
    stage.prepend(canvas);
    new ResizeObserver(size).observe(stage);
    size(); renderer.shadowMap.needsUpdate = true; pose(at.c, at.r);
    stage.classList.add("is-3d");
    return { draw: () => { const key = `${at.c.toFixed(3)} ${at.r.toFixed(3)}`; if (key !== drawn) { pose(at.c, at.r); drawn = key; } } };
  }

  let last = 0;
  function tick(t) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    const dt = Math.min((t - (last || t)) / 1000, 0.1); last = t;
    // nobody steering for a while: it looks around slowly by itself (not when the system asks for less motion)
    if (!reduce && t - lastMove > 2600) {
      const k = t / 1000;
      at.tc = 10 + Math.sin(k * 0.45) * 7 + Math.sin(k * 1.1) * 1.5;
      at.tr = 2 + Math.sin(k * 0.33 + 1) * 1.2;
    }
    const e = 1 - Math.exp(-dt * 6);
    at.c = lerp(at.c, at.tc, e); at.r = lerp(at.r, at.tr, e);
    api?.draw();
  }

  let started = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || started) return;
    started = true;
    load().then((a) => (api = a), (err) => console.warn("spider 3D unavailable, keeping the still", err));
  }, { rootMargin: "100% 0px" }).observe(stage);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(tick);
  }).observe(stage);
}
