// Mechanical Spider: 105 frames rendered in Blender on a 21 x 5 grid (head and body turned left to right, up to down).
// The stage shows the frame that matches where the pointer is, so the spider turns its head toward the cursor.
// Each frame is rendered on the stage colour (soft shadows stay smooth). Frames load only when the section comes near, centre first, then a coarse grid, then the rest.
const COLS = 21, ROWS = 5, CENTRE = 1 + 2 * COLS + 10;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function mountSpider(stage, { base = "/images/spider", reduce = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "spider__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Mechanical spider, a 3D model by Anas, turning its head toward the pointer");
  stage.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const size = innerWidth < 700 ? 640 : 1000;
  const frames = new Array(COLS * ROWS + 1);
  // a point that moves smoothly toward the target, in grid units (col 0..20, row 0..4)
  const at = { c: 10, r: 2, tc: 10, tr: 2 };
  let shown = 0, lastMove = 0, visible = false, started = false, raf = 0;

  // order: centre, then every other column on rows 0, 2, 4, then everything left
  const order = [CENTRE];
  for (const r of [2, 0, 4]) for (let c = 0; c < COLS; c += 2) order.push(1 + r * COLS + c);
  for (let i = 1; i <= COLS * ROWS; i++) order.push(i);

  function load() {
    started = true;
    const queue = [...new Set(order)];
    const next = () => {
      const i = queue.shift();
      if (!i) return;
      const img = new Image();
      img.src = `${base}/${size}/${String(i).padStart(3, "0")}.webp`;
      img.decode().then(() => {
        frames[i] = img;
        if (i === CENTRE) { resize(); stage.classList.add("is-ready"); }
        shown = 0; // redraw with a nearer frame if one just arrived
      }, () => {}).finally(next);
    };
    for (let k = 0; k < 4; k++) next();
  }

  // the loaded frame nearest to a grid point
  function nearest(c, r) {
    const ci = Math.round(c), ri = Math.round(r);
    let best = 0, bd = 1e9;
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const i = 1 + rr * COLS + cc;
      if (!frames[i]) continue;
      const d = (cc - ci) ** 2 + ((rr - ri) * 2.5) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function resize() {
    const r = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    shown = 0;
  }

  function draw(i) {
    const img = frames[i];
    if (!img) return;
    const W = canvas.width, H = canvas.height;
    // fit the whole frame inside the stage, sitting slightly low like it stands on the floor
    const s = Math.min(W / img.width, H / img.height) * (W < H * 1.1 ? 1.16 : 1.08);
    const w = img.width * s, h = img.height * s;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) * 0.62, w, h);
    shown = i;
  }

  // the pointer anywhere on the screen counts; the spider watches it from the middle of its stage
  function aim(x, y) {
    const r = stage.getBoundingClientRect();
    const dx = clamp((x - (r.left + r.width / 2)) / (innerWidth * 0.45), -1, 1);
    const dy = clamp((y - (r.top + r.height * 0.45)) / (innerHeight * 0.45), -1, 1);
    at.tc = (1 - (dx + 1) / 2) * (COLS - 1); // column 0 looks to the right of the screen
    at.tr = ((dy + 1) / 2) * (ROWS - 1);     // row 0 looks up
    lastMove = performance.now();
  }
  addEventListener("pointermove", (e) => { if (visible) aim(e.clientX, e.clientY); }, { passive: true });
  // on touch screens a finger dragged across the stage steers it
  stage.addEventListener("pointerdown", (e) => aim(e.clientX, e.clientY));

  function tick(t) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    // nobody steering for a while: it looks around slowly by itself (not when the system asks for less motion)
    if (!reduce && t - lastMove > 2600) {
      const k = t / 1000;
      at.tc = 10 + Math.sin(k * 0.45) * 7 + Math.sin(k * 1.1) * 1.5;
      at.tr = 2 + Math.sin(k * 0.33 + 1) * 1.2;
    }
    at.c = lerp(at.c, at.tc, 0.09); at.r = lerp(at.r, at.tr, 0.09);
    const i = nearest(at.c, at.r);
    if (i && i !== shown) draw(i);
  }

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !started) load();
  }, { rootMargin: "150% 0px" }).observe(stage);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(tick);
  }).observe(stage);
  new ResizeObserver(() => { if (frames[CENTRE]) resize(); }).observe(stage);
}
