// Mechanical Spider as a real 3D model (.glb exported from Blender with its head and body turns baked in).
// The file holds the same 21 x 5 grid of poses as the rendered frames; between grid points the bones are blended,
// so the head follows the cursor smoothly while the feet stay planted. Its colours are the Cycles lighting baked into
// one texture, drawn unlit, so it looks like the render and stays light to draw. three.js and the model load from
// jsDelivr quietly after the page has loaded, so they're ready before anyone scrolls down; the first time the spider
// is on screen it fades in close on the face and pulls back, then breathes (deeper while the pointer moves) and looks
// around by itself when nobody steers. The rendered still (a different shot) shows only where the model isn't there
// in time: data saver, a very slow connection, or a browser that can't draw it.
const V = "0.170.0", CDN = `https://cdn.jsdelivr.net/npm/three@${V}`;
const COLS = 21, ROWS = 5, FPS = 24;
// after the grid, frames 106 to 130 hold one breath: the body sinks and rises while the feet stay planted
const BREATH = [106, 130];
const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function mountSpider3D(stage, { model, poster, reduce = false } = {}) {
  // the still and everything after it load only when the section comes near, so the top of the page never waits on it
  const still = new Image();
  still.className = "spider__still"; still.alt = ""; still.decoding = "async";
  stage.prepend(still);
  // the hint waits for the model (see .has-3d in v2.css)
  stage.classList.add("has-3d");
  // data saver, slow connections and low-memory devices keep the still: the page stays fast for them
  const net = navigator.connection || {};
  const light = net.saveData || /(^|-)2g/.test(net.effectiveType || "") || (navigator.deviceMemory || 8) < 4;
  const at = { c: 10, r: 2, tc: 10, tr: 2 };
  let lastMove = 0, visible = false, raf = 0, api = null, speed = 0, px = 0, py = 0;

  function aim(x, y) {
    const r = stage.getBoundingClientRect();
    const dx = clamp((x - (r.left + r.width / 2)) / (innerWidth * 0.45), -1, 1);
    const dy = clamp((y - (r.top + r.height * 0.45)) / (innerHeight * 0.45), -1, 1);
    at.tc = ((dx + 1) / 2) * (COLS - 1); // column 0 looks to the left of the screen
    at.tr = ((dy + 1) / 2) * (ROWS - 1); // row 0 looks up
    lastMove = performance.now();
  }
  addEventListener("pointermove", (e) => {
    if (!visible) return;
    // how fast the pointer travels, so the body can react to it
    speed = Math.min(speed + Math.hypot(e.clientX - px, e.clientY - py) / innerWidth, 1.5);
    px = e.clientX; py = e.clientY;
    aim(e.clientX, e.clientY);
  }, { passive: true });
  stage.addEventListener("pointerdown", (e) => aim(e.clientX, e.clientY));

  async function load() {
    const [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import(`${CDN}/+esm`),
      import(`${CDN}/examples/jsm/loaders/GLTFLoader.js/+esm`),
      import(`${CDN}/examples/jsm/libs/meshopt_decoder.module.js/+esm`),
    ]);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const canvas = renderer.domElement;
    canvas.className = "spider__canvas spider__canvas--3d";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Mechanical spider, a 3D model by Anas, turning its head toward the pointer");

    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(25, 40, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 6; sun.shadow.bias = -0.0008;
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // the same camera as the Blender render: 60 mm lens, 56 units away, 18 degrees above
    const cam = new THREE.PerspectiveCamera(21.2, 1.6, 1, 200);
    let baseFov = 21.2;
    function place(k) {
      // k: 0 = close up on the face at the start, 1 = the resting view
      const dist = lerp(20, 56, k), pitch = THREE.MathUtils.degToRad(lerp(6, 18, k)), yaw = THREE.MathUtils.degToRad(lerp(-24, 0, k));
      const ty = lerp(5.4, 4.2, k);
      cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(0, ty, lerp(1.5, 0, k));
    }

    // the eye glass came out dark in the bake: drawn instead like the render, grey glass catching the studio light
    function glassMap() {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d");
      let r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, "#5e5e5a"); r.addColorStop(0.45, "#7a7a75"); r.addColorStop(0.8, "#55554f"); r.addColorStop(1, "#262624");
      g.fillStyle = r; g.fillRect(0, 0, 256, 256);
      // soft reflection of the light up and to the left, and a small sharp highlight inside it
      r = g.createRadialGradient(96, 90, 0, 96, 90, 64);
      r.addColorStop(0, "rgba(255,255,255,0.3)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.ellipse(88, 80, 9, 6, -0.6, 0, Math.PI * 2); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    function lens(o) {
      // flat UVs across the disc (the baked UVs don't fit a picture of a lens)
      const geo = o.geometry.clone(), pos = geo.attributes.position;
      geo.computeBoundingBox();
      const { min, max } = geo.boundingBox, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) - min.x) / (max.x - min.x);
        uv[i * 2 + 1] = 1 - (pos.getZ(i) - min.z) / (max.z - min.z);
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      o.geometry = geo;
      o.material = new THREE.MeshBasicMaterial({ map: glass ||= glassMap() });
    }
    let glass = null;

    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(model);
    const root = gltf.scene; scene.add(root);
    root.traverse((o) => {
      // the coil springs between the jaw parts don't follow their bones in the export and float in the air: left out
      if (o.isSkinnedMesh) { o.visible = false; return; }
      if (!o.isMesh) return;
      o.castShadow = true; o.frustumCulled = false;
      const map = o.material.map;
      o.material = new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : /Cable/.test(o.material.name) ? 0x8c8c8a : 0x2a2a28 });
      if (/^Plane00[67]$/.test(o.name)) lens(o);
    });
    // two copies of every clip: one plays the row above the pointer, one the row below, blended by weight
    const mixer = new THREE.AnimationMixer(root);
    const rows = [0, 1].map(() => gltf.animations.map((clip) => { const a = mixer.clipAction(clip.clone()); a.play(); a.paused = true; return a; }));
    // the breath plays on top of the pose, looping; it grows when the pointer moves
    const breath = gltf.animations.map((clip) => {
      const part = THREE.AnimationUtils.subclip(clip, clip.name + "-breath", BREATH[0], BREATH[1], FPS);
      THREE.AnimationUtils.makeClipAdditive(part);
      const a = mixer.clipAction(part); a.blendMode = THREE.AdditiveAnimationBlendMode; a.play(); return a;
    });

    function size() {
      const r = stage.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      // keep the whole spider in view on narrow screens
      baseFov = cam.aspect < 1.3 ? 21.2 * (1.3 / cam.aspect) * 0.92 : 21.2;
      cam.fov = baseFov; cam.updateProjectionMatrix();
    }
    stage.prepend(canvas);
    new ResizeObserver(size).observe(stage);
    size();

    // opening: it fades in close on the face and pulls back to the full spider. Skipped when the still is already
    // showing (slow load), so the model takes over from it at the same view instead of jumping
    const intro = !shown;
    place(intro ? 0 : 1);
    let t0 = 0, frame = 0, life = 0, slow = 0, lite = false;
    function draw(dt, t, prime = false) {
      // a slow device draws fewer pixels and fewer shadow updates instead of slowing the page
      slow = dt > 0.034 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 90 && !lite) { lite = true; renderer.setPixelRatio(1); size(); }
      if (intro && !prime) { t0 = t0 || t; place(ease(clamp((t - t0) / 2600, 0, 1))); }
      const r0 = Math.min(Math.floor(at.r), ROWS - 2), fr = at.r - r0;
      // Blender frame 1 sits at time 1/24
      rows.forEach((set, k) => set.forEach((a) => { a.time = ((r0 + k) * COLS + at.c + 1) / FPS; a.setEffectiveWeight(k ? fr : 1 - fr); }));
      // calm breathing at rest, deeper and quicker while the pointer moves
      life = lerp(life, Math.min(speed * 4, 1), 1 - Math.exp(-dt * 3));
      breath.forEach((a) => { a.setEffectiveWeight(0.5 + life * 0.9); a.setEffectiveTimeScale(0.28 + life * 0.5); });
      mixer.update(dt);
      // the floor shadow follows the body every other frame (every fourth on a slow device); the eye doesn't see the difference
      if (frame++ % 2 === 0) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, cam);
    }
    // shaders compile in the background (where the browser allows it) instead of freezing the first frame
    await renderer.compileAsync(scene, cam);
    // the first frame is drawn before the canvas fades in over the still, so nothing jumps
    draw(0, performance.now(), true);
    requestAnimationFrame(() => stage.classList.add("is-3d"));
    return { draw };
  }

  let last = 0;
  function tick(t) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    const dt = Math.min((t - (last || t)) / 1000, 0.1); last = t;
    // nobody steering for a while: it looks around slowly by itself. Kept with reduced motion too (Anas's own
    // machine has Windows animations off and he wants it): it is a slow turn inside its frame, never a page movement
    if (t - lastMove > 2600) {
      const k = t / 1000;
      at.tc = 10 + Math.sin(k * 0.45) * 7 + Math.sin(k * 1.1) * 1.5;
      at.tr = 2 + Math.sin(k * 0.33 + 1) * 1.2;
    }
    const e = 1 - Math.exp(-dt * 6);
    at.c = lerp(at.c, at.tc, e); at.r = lerp(at.r, at.tr, e);
    speed *= Math.exp(-dt * 4);
    api?.draw(dt, t);
  }

  // where the model can't load, the "move your cursor" hint would promise something that never happens:
  // a quiet button takes its place (data saver users load the model only if they ask for it)
  const hint = stage.querySelector("[data-spider-hint]");
  let btn = null;
  function offer() {
    if (btn) return;
    if (hint) hint.hidden = true;
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "spider__load"; btn.textContent = "View in 3D";
    btn.addEventListener("click", () => { btn.disabled = true; btn.textContent = "Loading"; start(); });
    stage.append(btn);
  }
  let shown = false;
  function showStill() {
    if (shown) return;
    shown = true;
    still.src = poster;
    still.decode().then(() => stage.classList.add("is-ready"), () => {});
  }
  let late = 0;
  function start() {
    load().then((a) => {
      clearTimeout(late);
      api = a;
      btn?.remove(); btn = null;
      if (hint) hint.hidden = false;
    }, (err) => {
      console.warn("spider 3D unavailable, keeping the still", err);
      // nothing left to offer: the still stays, without the hint or the button
      showStill();
      btn?.remove(); btn = null;
      if (hint) hint.hidden = true;
    });
  }

  // the model loads quietly once the page has finished loading and the browser is idle, so it is ready by the time
  // anyone scrolls down to it (the top of the page never waits for it). Data saver and the like: the still and a button
  if (light) {
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); showStill(); offer(); } }, { rootMargin: "100% 0px" }).observe(stage);
  } else {
    const go = () => ("requestIdleCallback" in window ? requestIdleCallback(() => start(), { timeout: 3000 }) : setTimeout(start, 1500));
    document.readyState === "complete" ? go() : addEventListener("load", go, { once: true });
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(tick);
    // on screen and still not ready (a slow connection): the still fills in after a moment, and the model takes over
    // from it at the same view when it arrives
    if (visible && !api && !light && !late) late = setTimeout(() => { if (!api) showStill(); }, 700);
  }, { threshold: 0.25 }).observe(stage);
}
