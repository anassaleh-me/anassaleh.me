// Portrait with 3D depth: a WebGL shader shifts each pixel by its depth as the pointer moves,
// and relights the face from the pointer direction. Falls back to a plain image.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uPointer;   // -1..1, smoothed
uniform float uStrength;
uniform float uLight;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec2 p = uPointer * uStrength;
  // Two-step parallax: sample depth, shift, refine.
  float d = texture2D(uDepth, vUv).r;
  vec2 uv = vUv + p * (d - 0.45);
  d = texture2D(uDepth, uv).r;
  uv = vUv + p * (d - 0.45);
  vec4 col = texture2D(uImage, uv);

  // Normal from the depth gradient, lit from the pointer side.
  float dx = texture2D(uDepth, uv + vec2(uTexel.x * 6.0, 0.0)).r - texture2D(uDepth, uv - vec2(uTexel.x * 6.0, 0.0)).r;
  float dy = texture2D(uDepth, uv + vec2(0.0, uTexel.y * 6.0)).r - texture2D(uDepth, uv - vec2(0.0, uTexel.y * 6.0)).r;
  vec3 n = normalize(vec3(-dx * 7.0, dy * 7.0, 1.0));
  vec3 l = normalize(vec3(uPointer.x, -uPointer.y, 1.2));
  float shade = dot(n, l);
  col.rgb *= mix(1.0, 0.82 + 0.3 * shade, uLight);
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}`;

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function mountDepthPortrait(stage, { image, depth, alt, reduceMotion }) {
  const fallback = () => {
    stage.innerHTML = `<img src="${image}" alt="${alt}" fetchpriority="high">`;
    return { el: stage.firstElementChild, destroy() {} };
  };
  if (reduceMotion || !depth) return fallback();

  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", alt);
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return fallback();

  let img, dep;
  try {
    [img, dep] = await Promise.all([loadImage(image), loadImage(depth)]);
  } catch {
    return fallback();
  }

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch {
    return fallback();
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit, source) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  texture(0, img);
  texture(1, dep);
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform1i(U("uImage"), 0);
  gl.uniform1i(U("uDepth"), 1);
  gl.uniform1f(U("uStrength"), 0.038);
  gl.uniform2f(U("uTexel"), 1 / dep.width, 1 / dep.height);
  const uPointer = U("uPointer");
  const uLight = U("uLight");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  stage.innerHTML = "";
  stage.append(canvas);

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // Pointer, eased. With no pointer (touch), drift slowly.
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let lastMove = 0;
  let light = 0;
  const onMove = (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
    lastMove = performance.now();
  };
  addEventListener("pointermove", onMove, { passive: true });

  let visible = true;
  const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
  io.observe(stage);

  let raf = 0;
  const tick = (t) => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    if (t - lastMove > 2500) {
      target.x = Math.sin(t / 2600) * 0.55;
      target.y = Math.cos(t / 3400) * 0.25;
    }
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    light += (1 - light) * 0.03;
    gl.uniform2f(uPointer, cur.x, cur.y);
    gl.uniform1f(uLight, light);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  raf = requestAnimationFrame(tick);

  return {
    el: canvas,
    pointer: cur,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onMove);
    },
  };
}
