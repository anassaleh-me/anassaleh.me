// Portrait with real 3D depth (from a depth map) that turns toward the pointer,
// plus a "reveal" lens under the cursor: either the pencil-sketch version of the portrait
// or contour lines traced from the depth map.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uSketch;
uniform sampler2D uDepth;
uniform vec2 uPointer;   // -1..1 eased, drives the head turn
uniform vec2 uLens;      // lens centre in uv
uniform float uLensR;    // lens radius (0 = off)
uniform float uAspect;   // canvas width / height
uniform float uMode;     // 1 sketch, 2 contours
uniform float uTime;
uniform float uStrength;
uniform vec3 uAccent;
uniform vec2 uTexel;
uniform vec4 uFit;       // where the photo sits in the canvas: offset xy, size zw (leaves room for the glow)
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void main() {
  // Near pixels (bright in the depth map) move toward the pointer, so the face turns to follow it.
  vec2 base = (vUv - uFit.xy) / uFit.zw;
  vec2 p = uPointer * uStrength;
  float d = texture2D(uDepth, base).r;
  vec2 uv = base - p * (d - 0.5);
  d = texture2D(uDepth, uv).r;
  uv = base - p * (d - 0.5);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  vec4 col = texture2D(uImage, uv);


  // relight from the pointer side using the depth gradient
  float dx = texture2D(uDepth, uv + vec2(uTexel.x * 5.0, 0.0)).r - texture2D(uDepth, uv - vec2(uTexel.x * 5.0, 0.0)).r;
  float dy = texture2D(uDepth, uv + vec2(0.0, uTexel.y * 5.0)).r - texture2D(uDepth, uv - vec2(0.0, uTexel.y * 5.0)).r;
  vec3 n = normalize(vec3(-dx * 8.0, dy * 8.0, 1.0));
  vec3 l = normalize(vec3(uPointer.x, -uPointer.y, 1.3));
  col.rgb *= 0.84 + 0.26 * dot(n, l);

  // liquid lens under the cursor
  vec2 q = (vUv - uLens) * vec2(uAspect, 1.0);
  float wob = noise(q * 7.0 + uTime * 0.6) * 0.045;
  float m = 1.0 - smoothstep(uLensR - 0.012, uLensR + 0.012, length(q) + wob);
  if (m > 0.001) {
    vec4 alt;
    if (uMode < 1.5) {
      alt = texture2D(uSketch, uv);
    } else {
      // smooth the 8-bit depth before tracing contours, so the lines stay clean
      vec2 o = uTexel * 3.0;
      float ds = 0.0;
      for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) ds += texture2D(uDepth, uv + vec2(float(i), float(j)) * o).r;
      ds /= 25.0;
      float lines = abs(fract(ds * 24.0) - 0.5);
      float line = 1.0 - smoothstep(0.05, 0.12, lines);
      float g = dot(col.rgb, vec3(0.333));
      vec3 base = mix(vec3(g), uAccent, 0.18) * 0.8;
      alt = vec4(mix(base, uAccent * 1.15, line * step(0.02, ds)), col.a);
    }
    col = mix(col, alt, m);
  }
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}`;

const load = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});

export async function mountHero(stage, opts) {
  const { image, depth, sketch, alt = "", reduceMotion = false } = opts;
  const fallback = () => {
    stage.innerHTML = `<img src="${image}" alt="${alt}">`;
    return { el: stage.firstElementChild, set() {}, pointer: null };
  };
  // Reduced motion only stops the idle drift; the pointer-driven effect stays, since the visitor controls it.
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", alt);
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return fallback();
  let imgs;
  try { imgs = await Promise.all([load(image), load(depth), load(sketch || image)]); } catch { return fallback(); }

  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
  } catch (e) { console.warn(e); return fallback(); }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  imgs.forEach((im, unit) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  });
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform1i(U("uImage"), 0);
  gl.uniform1i(U("uDepth"), 1);
  gl.uniform1i(U("uSketch"), 2);
  gl.uniform2f(U("uTexel"), 1 / imgs[1].width, 1 / imgs[1].height);
  gl.uniform1f(U("uStrength"), 0.05);
  gl.uniform4f(U("uFit"), ...(opts.fit || [0, 0, 1, 1]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const uP = U("uPointer"), uL = U("uLens"), uR = U("uLensR"), uA = U("uAspect"), uM = U("uMode"), uT = U("uTime"), uC = U("uAccent");

  const state = { mode: opts.mode ?? 0, accent: opts.accent || [0.8, 0.6, 0.3], lensSize: opts.lensSize ?? 0.17 };
  stage.innerHTML = "";
  stage.append(canvas);
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    drawn = null;
  };
  let drawn = null;
  resize();
  new ResizeObserver(resize).observe(stage);

  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const lens = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45, r: 0, tr: 0 };
  let last = 0;
  addEventListener("pointermove", (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
    const r = canvas.getBoundingClientRect();
    lens.tx = (e.clientX - r.left) / r.width;
    lens.ty = (e.clientY - r.top) / r.height;
    const inside = lens.tx > 0 && lens.tx < 1 && lens.ty > 0 && lens.ty < 1;
    lens.tr = inside ? state.lensSize : 0;
    last = performance.now();
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(stage);
  const tick = (t) => {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    if (t - last > 1200) {
      // resting pointer: the head turns slowly on its own, a soft look left and right with a little nod
      target.x = Math.sin(t / 2400) * 0.55;
      target.y = Math.sin(t / 3700) * 0.22;
      lens.tr = 0;
    }
    cur.x += (target.x - cur.x) * 0.045;
    cur.y += (target.y - cur.y) * 0.045;
    lens.x += (lens.tx - lens.x) * 0.1;
    lens.y += (lens.ty - lens.y) * 0.1;
    lens.r += ((state.mode ? lens.tr : 0) - lens.r) * 0.07;
    // only redraw when something moved: a still frame costs nothing
    const key = `${cur.x.toFixed(3)},${cur.y.toFixed(3)},${lens.x.toFixed(3)},${lens.y.toFixed(3)},${lens.r.toFixed(3)},${state.mode}`;
    if (key === drawn && !state.mode) return;
    drawn = key;
    gl.uniform2f(uP, cur.x, cur.y);
    gl.uniform2f(uL, lens.x, lens.y);
    gl.uniform1f(uR, lens.r);
    gl.uniform1f(uA, canvas.width / canvas.height);
    gl.uniform1f(uM, state.mode);
    gl.uniform1f(uT, t / 1000);
    gl.uniform3f(uC, ...state.accent);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  requestAnimationFrame(tick);
  return {
    el: canvas,
    pointer: cur,
    set(next) { Object.assign(state, next); },
    // draws the current frame and copies it straight away into a 2D context (used to build the still glow)
    snapshot(ctx, w, h) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6); ctx.drawImage(canvas, 0, 0, w, h); },
  };
}
