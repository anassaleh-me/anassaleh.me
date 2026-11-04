// Portfolio PDF, built in the visitor's browser from what the site shows right now (projects.json without drafts,
// site.json for the about text, categories, drawings and contact). Same look as Anas's hand-made portfolio: cream
// paper, charcoal, Archivo Black titles with big ghost letters, a marquee band on each category page, plus the site's
// blue. An index links to every page, every page links back to it, and the buttons open the project on the website.
// Pictures are re-encoded to a shared byte budget, so the file always stays under 8 MB however many projects there are.
// pdf-lib loads from jsDelivr only when someone asks for the PDF; nothing here runs on page load.
const LIB = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const FONTKIT = "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm";
const SITE = "https://anassaleh.me";
const W = 1280, H = 720, M = 70; // page size in points (16:9) and side margin
const LIMIT = 7.6e6; // the whole file stays under this (Anas: never over 8 MB)
const IMG_BUDGET = LIMIT - 0.7e6; // fonts, grain, text and links fit in the rest
const PX = 1.6; // pixels per point for the pictures, before the budget squeezes them

const hex = (h, k) => k.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const vimeo = (html = "") => (html.match(/player\.vimeo\.com\/video\/(\d+)/) || [])[1];
const youtube = (html = "") => (html.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/) || [])[1];

export async function buildPortfolio({ site, projects, onProgress = () => {} }) {
  const k = await import(LIB);
  const { default: fontkit } = await import(FONTKIT);
  const { PDFDocument, PDFName, PDFString } = k;
  const C = { cream: hex("#f1ece2", k), ink: hex("#1d1d1b", k), soft: hex("#5b5a55", k), ghost: hex("#e6dfd2", k), blue: hex("#6f8faf", k),
    blueT: hex("#4c6c8c", k), line: hex("#cfc8ba", k), creamSoft: hex("#bdb8ad", k) };

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // TrueType copies of the site fonts (public/fonts/pdf): a PDF can't hold woff2, and only the letters used are kept
  const font = async (f) => doc.embedFont(await (await fetch(`/fonts/pdf/${f}.ttf`)).arrayBuffer(), { subset: true });
  const F = {
    display: await font("archivo-black-400-latin"), body: await font("barlow-semi-condensed-400-latin"),
    mid: await font("barlow-semi-condensed-600-latin"), bold: await font("barlow-semi-condensed-700-latin"),
  };
  const chars = new Map(Object.entries(F).map(([n, f]) => [f, new Set(f.getCharacterSet())]));
  // straight quotes, no dashes (the site's writing rules), and nothing the font can't draw
  const clean = (s, f) => String(s ?? "").replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s+/g, " ").trim().split("").filter((c) => chars.get(f).has(c.codePointAt(0))).join("");

  /* ---------- the plan: which pages, in which order ---------- */
  const order = (site.workCategories || []).filter((c) => c.key && c.key !== "all");
  const label = (key) => order.find((c) => c.key === key)?.label;
  const groups = new Map(order.map((c) => [c.key, []]));
  // each project sits once, under the first category typed on it (its main one)
  for (const p of projects) {
    const key = slug((p.categories || [])[0]) || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const drawings = site.drawings?.show !== false && site.drawings?.images?.length ? site.drawings : null;
  const drawKey = [...groups.keys()].find((k) => /traditional|drawing/.test(k)) || "traditional-art";
  const sections = [...groups].filter(([key, list]) => list.length || (drawings && key === drawKey)).map(([key, list]) => ({
    key, name: label(key) || (list[0]?.categories || [])[0] || "Other",
    line: order.find((c) => c.key === key)?.description || "", projects: list, drawings: drawings && key === drawKey,
  }));
  if (drawings && !sections.some((s) => s.drawings)) sections.push({ key: drawKey, name: "Traditional art", line: "", projects: [], drawings: true });

  /* ---------- pictures: fetched at a sensible size, then re-encoded inside the budget ---------- */
  const poster = (src) => (/\.mp4$/i.test(src) ? src.replace(/\.mp4$/i, "-poster.webp") : src);
  const sized = (src, w) => (/^\/images\/[^?#]+\.(webp|jpe?g|png)$/i.test(src) ? `/img/${w}${src}` : src);
  const gallery = (p) => {
    const cov = p.coverClean || p.cover || `/images/covers/${p.slug}.webp`;
    let all = (p.blocks || []).flatMap((b) => b.images || []).map(poster).filter((s) => s && s !== cov && !/\.(gif|svg)$/i.test(s));
    // the last picture of a Behance project is usually its "thanks" slide
    if (all.length > 4) all = all.slice(0, -1);
    // three pictures spread through the project (start, middle, end), so the strip shows its range
    const pick = all.length <= 3 ? all : [all[0], all[Math.floor(all.length / 2)], all[all.length - 1]];
    return { cov, pick };
  };
  const THUMB = { w: 138, h: 104 }, MAIN = { w: 664, h: 500 };
  const jobs = []; // every picture with the box it fills, so the budget can be shared by area
  const job = (src, w, h, fit, px = PX, fetchW = 1080) => { const j = { src, w, h, fit, px, fetchW }; jobs.push(j); return j; };
  const portrait = site.about?.portrait || "/images/portrait-v2.webp";
  const covJob = job(portrait, 400, 400, "portrait", 1.4, 1080);
  for (const s of sections) {
    s.jobs = s.projects.map((p) => { const g = gallery(p); return { main: job(g.cov, MAIN.w, MAIN.h, "contain", PX, 1440), thumbs: g.pick.map((src) => job(src, THUMB.w, THUMB.h, "cover", 2, 360)) }; });
    if (s.drawings) s.drawJobs = drawings.images.slice(0, 5).map((src, i) => job(src, i ? 180 : 320, i ? 229 : 470, "cover", 1.8, 720));
  }

  const area = jobs.reduce((a, j) => a + j.w * j.h, 0);
  let spent = 0, left = area, done = 0;
  const bitmap = async (src, w) => {
    for (const url of [sized(src, w), src]) {
      try { const r = await fetch(url); if (r.ok) return await createImageBitmap(await r.blob()); } catch {}
    }
    return null;
  };
  const toJpeg = (canvas, q) => new Promise((res) => canvas.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), "image/jpeg", q));
  async function encode(j) {
    const bmp = await bitmap(j.src, j.fetchW);
    const share = (IMG_BUDGET - spent) * ((j.w * j.h) / left);
    left -= j.w * j.h;
    if (!bmp) return;
    const iw = bmp.width, ih = bmp.height;
    // the part of the picture that shows, and the size it shows at
    let sx = 0, sy = 0, sw = iw, sh = ih, dw = j.w, dh = j.h;
    if (j.fit === "contain") { const s = Math.min(j.w / iw, j.h / ih); dw = iw * s; dh = ih * s; }
    else if (j.fit === "cover") { const s = Math.max(j.w / iw, j.h / ih); sw = j.w / s; sh = j.h / s; sx = (iw - sw) / 2; sy = (ih - sh) / 2; }
    else { const s = Math.min(j.w * 0.98 / iw, j.h * 1.06 / ih); dw = iw * s; dh = ih * s; } // portrait: fills the circle, cut at the bottom
    let px = j.px, q = 0.82, bytes;
    for (let tries = 0; tries < 6; tries++) {
      const cw = Math.max(1, Math.round(Math.min(dw * px, sw))), ch = Math.max(1, Math.round(cw * (dh / dw)));
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      g.fillStyle = j.fit === "portrait" ? "#1d1d1b" : "#e8e2d6"; g.fillRect(0, 0, cw, ch);
      g.imageSmoothingQuality = "high";
      g.drawImage(bmp, sx, sy, sw, sh, 0, 0, cw, ch);
      bytes = await toJpeg(c, q);
      if (bytes.length <= share * 1.1) break;
      // over its share: a little less quality first, then fewer pixels
      if (q > 0.66) q -= 0.08; else px *= 0.82;
    }
    bmp.close?.();
    spent += bytes.length;
    j.img = await doc.embedJpg(bytes); j.dw = dw; j.dh = dh;
    onProgress(0.05 + 0.85 * (++done / jobs.length));
  }
  // a few at a time: quick, without holding every picture in memory at once
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await encode(queue.shift()); }));

  /* ---------- drawing helpers (y measured from the top of the page) ---------- */
  const { pushGraphicsState, popGraphicsState, moveTo, lineTo, appendBezierCurve, closePath, clip, endPath } = k;
  // paper grain: one small tile drawn across every page (stored once in the file)
  const grain = await (async () => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16 + (Math.random() < 0.004 ? -40 : 0);
      d.data[i] = 241 + n; d.data[i + 1] = 236 + n; d.data[i + 2] = 226 + n; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    return doc.embedJpg(await toJpeg(c, 0.55));
  })();
  const pages = [];
  function newPage() {
    const pg = doc.addPage([W, H]);
    for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) pg.drawImage(grain, { x, y, width: 256, height: 256 });
    pages.push(pg);
    return pg;
  }
  const T = (pg, s, { x, top, size, f = F.body, color = C.ink, opacity }) => {
    s = clean(s, f);
    pg.drawText(s, { x, y: H - top - size * 0.8, size, font: f, color, opacity });
    return f.widthOfTextAtSize(s, size);
  };
  const width = (s, f, size) => f.widthOfTextAtSize(clean(s, f), size);
  function wrap(s, f, size, maxW) {
    const out = []; let line = "";
    for (const w of clean(s, f).split(" ")) {
      const t = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  // a block of text; returns where it ends. maxLines cuts long text with an ellipsis
  function para(pg, s, { x, top, size, f = F.body, color = C.ink, maxW, lh = 1.45, maxLines = 99 }) {
    let lines = wrap(s, f, size, maxW);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:]*\S*$/, "") + "..."; }
    lines.forEach((l, i) => pg.drawText(l, { x, y: H - top - size * 0.8 - i * size * lh, size, font: f, color }));
    return top + lines.length * size * lh;
  }
  const roundPath = (x, y, w, h, r) => {
    const c = 0.5523 * r, b = H - y - h;
    return [moveTo(x + r, b), lineTo(x + w - r, b), appendBezierCurve(x + w - r + c, b, x + w, b + r - c, x + w, b + r), lineTo(x + w, b + h - r),
      appendBezierCurve(x + w, b + h - r + c, x + w - r + c, b + h, x + w - r, b + h), lineTo(x + r, b + h),
      appendBezierCurve(x + r - c, b + h, x, b + h - r + c, x, b + h - r), lineTo(x, b + r), appendBezierCurve(x, b + r - c, x + r - c, b, x + r, b), closePath()];
  };
  function picture(pg, j, x, top, w, h, r = 14) {
    if (!j.img) { pg.drawRectangle({ x, y: H - top - h, width: w, height: h, color: C.ghost }); return; }
    pg.pushOperators(pushGraphicsState(), ...roundPath(x, top, w, h, r), clip(), endPath());
    pg.drawImage(j.img, { x, y: H - top - h, width: w, height: h });
    pg.pushOperators(popGraphicsState());
  }
  const links = []; // drawn at the end, once every page number is known
  const link = (pg, x, top, w, h, to) => links.push({ pg, rect: [x, H - top - h, x + w, H - top], to });
  // rounded box (drawSvgPath measures y downward from the given corner)
  const pill = (pg, x, top, w, h, r, o) => pg.drawSvgPath(`M${r},0H${w - r}Q${w},0 ${w},${r}V${h - r}Q${w},${h} ${w - r},${h}H${r}Q0,${h} 0,${h - r}V${r}Q0,0 ${r},0Z`, { x, y: H - top, ...o });
  function button(pg, s, x, top, href, { dark = true } = {}) {
    const size = 12, pad = 22, w = width(s.toUpperCase(), F.bold, size) + pad * 2 + 16, h = 42;
    pill(pg, x, top, w, h, 9, dark ? { color: C.ink } : { borderColor: C.ink, borderWidth: 1.2 });
    pg.drawCircle({ x: x + pad + 3, y: H - top - h / 2, size: 3.5, color: C.blue });
    T(pg, s.toUpperCase(), { x: x + pad + 16, top: top + (h - size) / 2 + 1, size, f: F.bold, color: dark ? C.cream : C.ink });
    link(pg, x, top, w, h, href);
    return w;
  }
  // the ghost letters behind a page, like the hand-made portfolio (clipped by the page edge)
  function ghost(pg, word, { x = W - 520, top = -40, size = 300 } = {}) {
    const letters = clean(word.toUpperCase(), F.display).replace(/[^A-Z0-9&]/g, "").slice(0, 2) || "A";
    for (let i = 0; i < 3; i++) T(pg, letters, { x, top: top + i * size * 0.78, size, f: F.display, color: C.ghost });
  }
  function band(pg, word) {
    pg.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: C.ink });
    const s = clean(word.toUpperCase(), F.display).replace(/\s+/g, ""), size = 24, step = width(s, F.display, size) + 22;
    for (let x = -step * 0.4, i = 0; x < W; x += step, i++) T(pg, s, { x, top: 11, size, f: F.display, color: i % 3 === 1 ? C.blue : C.cream });
  }
  let indexPage = null;
  function foot(pg, n, { dark = false } = {}) {
    const col = dark ? C.cream : C.ink;
    const w = T(pg, "Pg.", { x: 40, top: H - 46, size: 18, f: F.bold, color: col });
    T(pg, String(n).padStart(2, "0"), { x: 40 + w + 1, top: H - 46, size: 18, f: F.body, color: C.blueT });
    if (n > 3) { const iw = T(pg, "INDEX", { x: 120, top: H - 42, size: 11, f: F.bold, color: C.blueT }); link(pg, 112, H - 50, iw + 16, 26, "index"); }
    const site = "anassaleh.me", sw = width(site, F.mid, 13);
    T(pg, site, { x: W - 40 - sw, top: H - 44, size: 13, f: F.mid, color: dark ? C.creamSoft : C.soft });
    link(pg, W - 48 - sw, H - 52, sw + 16, 28, SITE);
  }
  function corner(pg, a, b) { // "3D design/animation" at the top right
    const wb = width(b ? `/${b}` : "", F.body, 13), wa = width(a, F.bold, 13);
    T(pg, a, { x: W - 40 - wa - wb, top: 34, size: 13, f: F.bold });
    if (b) T(pg, `/${b}`, { x: W - 40 - wb, top: 34, size: 13, f: F.body, color: C.soft });
  }

  /* ---------- 1. cover ---------- */
  const name = site.fullName || "Anas Al Shikh Saleh";
  const year = new Date().getFullYear();
  {
    const pg = newPage();
    T(pg, "PORTFOLIO", { x: M, top: 250, size: 88, f: F.display });
    T(pg, name, { x: M + 4, top: 354, size: 40, f: F.mid, color: C.soft });
    const w = T(pg, "VISUAL ARTIST AND", { x: M + 4, top: 414, size: 20, f: F.display }) + width("A A", F.display, 20) - width("AA", F.display, 20);
    T(pg, "ART DIRECTOR", { x: M + 4 + w, top: 414, size: 20, f: F.display, color: C.blueT });
    T(pg, `Selected work ${year}`, { x: M + 4, top: 628, size: 18, f: F.bold });
    const sw = T(pg, "anassaleh.me", { x: M + 4, top: 654, size: 16, f: F.mid, color: C.blueT });
    link(pg, M, 648, sw + 10, 26, SITE);
    // portrait in a charcoal circle, with a thin blue ring around it like the site's gallery frame
    const cx = 1010, cy = 360, r = 200;
    pg.drawCircle({ x: cx, y: H - cy, size: r + 16, borderColor: C.blue, borderWidth: 1.2 });
    pg.drawCircle({ x: cx, y: H - cy, size: r, color: C.ink });
    if (covJob.img) {
      const c = 0.5523 * r, by = H - cy;
      pg.pushOperators(pushGraphicsState(), moveTo(cx + r, by), appendBezierCurve(cx + r, by + c, cx + c, by + r, cx, by + r),
        appendBezierCurve(cx - c, by + r, cx - r, by + c, cx - r, by), appendBezierCurve(cx - r, by - c, cx - c, by - r, cx, by - r),
        appendBezierCurve(cx + c, by - r, cx + r, by - c, cx + r, by), closePath(), clip(), endPath());
      pg.drawImage(covJob.img, { x: cx - covJob.dw / 2, y: H - cy - r, width: covJob.dw, height: covJob.dh });
      pg.pushOperators(popGraphicsState());
    }
  }

  /* ---------- 2. about ---------- */
  {
    const pg = newPage();
    ghost(pg, "ABOUT");
    T(pg, "ABOUT", { x: M, top: 96, size: 13, f: F.bold, color: C.blueT });
    T(pg, "HELLO, I'M ANAS", { x: M, top: 124, size: 54, f: F.display });
    let top = 214;
    for (const b of (site.about?.bio || []).slice(0, 4)) top = para(pg, b, { x: M, top, size: 16, maxW: 600, lh: 1.5 }) + 14;
    const x2 = 790;
    T(pg, "ALONG THE WAY", { x: x2, top: 214, size: 13, f: F.bold, color: C.blueT });
    let t2 = 244;
    for (const e of (site.about?.experience || []).slice(0, 4)) {
      T(pg, e.company, { x: x2, top: t2, size: 17, f: F.bold });
      T(pg, `${e.role}, ${e.period}`, { x: x2, top: t2 + 22, size: 14, color: C.soft });
      t2 += 58;
    }
    const tools = (site.about?.tools || []).join(", ");
    if (tools) { T(pg, "TOOLS", { x: x2, top: t2 + 10, size: 13, f: F.bold, color: C.blueT }); para(pg, tools, { x: x2, top: t2 + 38, size: 14, maxW: 400, color: C.soft }); }
    foot(pg, 2);
  }

  /* ---------- 3. index (filled in once the page numbers are known) ---------- */
  indexPage = newPage();
  const at = new Map(); // what -> page number

  /* ---------- 4. a section per category ---------- */
  for (const s of sections) {
    {
      const pg = newPage();
      at.set(`s:${s.key}`, pages.length);
      band(pg, s.name);
      ghost(pg, s.name, { top: 30 });
      const words = s.name.toUpperCase().split(" ");
      // the title in up to three lines, the last word in blue (like the site's titles)
      const lines = []; let line = "";
      for (const w of words) { const t = line ? `${line} ${w}` : w; if (width(t, F.display, 92) > 640 && line) { lines.push(line); line = w; } else line = t; }
      lines.push(line);
      let top = 360 - (lines.length * 92 * 0.98) / 2;
      lines.forEach((l, i) => { T(pg, l, { x: M, top, size: 92, f: F.display, color: i === lines.length - 1 && lines.length > 1 ? C.blueT : C.ink }); top += 92 * 0.98; });
      if (s.line) para(pg, s.line, { x: M + 4, top: top + 24, size: 20, maxW: 560, color: C.soft });
      foot(pg, pages.length);
    }
    s.projects.forEach((p, i) => {
      const pg = newPage(), n = pages.length, jb = s.jobs[i];
      at.set(`p:${p.slug}`, n);
      ghost(pg, s.name, { top: -60 });
      corner(pg, s.name, p.subtitle || "");
      const href = `${SITE}/work/${p.slug}`;
      // left column: title, subtitle, facts, text, three pictures, buttons
      const lx = M, lw = 440;
      let top = 96;
      for (const l of wrap(p.title.toUpperCase(), F.display, 34, lw).slice(0, 3)) { T(pg, l, { x: lx, top, size: 34, f: F.display }); top += 37; }
      if (p.subtitle) { top += 4; T(pg, p.subtitle.toUpperCase(), { x: lx, top, size: 17, f: F.mid, color: C.blueT }); top += 24; }
      const facts = [p.client, p.year, p.role].filter(Boolean).join("  ·  ");
      if (facts) { top += 6; top = para(pg, facts, { x: lx, top, size: 12.5, f: F.mid, color: C.soft, maxW: lw, lh: 1.4, maxLines: 2 }); }
      top += 16;
      top = para(pg, p.description || "", { x: lx, top, size: 15, maxW: lw, lh: 1.5, maxLines: Math.max(3, Math.floor(((jb.thumbs.length ? 418 : 540) - top) / 22.5)) });
      const btnTop = 568; // its bottom lines up with the bottom of the picture frame
      if (jb.thumbs.length) {
        const gap = 12, tw = (lw - gap * 2) / 3, th = THUMB.h, tt = btnTop - th - 26;
        jb.thumbs.forEach((j, t) => { picture(pg, j, lx + t * (tw + gap), tt, tw, th, 10); link(pg, lx + t * (tw + gap), tt, tw, th, href); });
      }
      const bw = button(pg, "View the full project", lx, btnTop, href);
      const film = vimeo(p.video) ? `https://vimeo.com/${vimeo(p.video)}` : youtube(p.video) ? `https://youtu.be/${youtube(p.video)}` : "";
      if (film) button(pg, "Watch the film", lx + bw + 12, btnTop, film, { dark: false });
      // right: the cover, whole, in a rounded frame
      const m = jb.main, bx = 560, by = 110;
      const dw = m.img ? m.dw : MAIN.w, dh = m.img ? m.dh : MAIN.h;
      const px = bx + (MAIN.w - dw) / 2, py = by + (MAIN.h - dh) / 2;
      picture(pg, m, px, py, dw, dh, 18);
      link(pg, px, py, dw, dh, href);
      foot(pg, n);
    });
    if (s.drawings) {
      const pg = newPage();
      at.set("drawings", pages.length);
      ghost(pg, "DRAW", { top: -60 });
      corner(pg, s.name, "pencil and charcoal");
      T(pg, (drawings.title || "I also draw").toUpperCase(), { x: M, top: 96, size: 34, f: F.display });
      para(pg, drawings.text || "", { x: M, top: 146, size: 15, maxW: 420, lh: 1.5, maxLines: 6 });
      const href = `${SITE}/#drawings`;
      button(pg, "See them on the site", M, 538, href);
      // the first drawing tall on the left, the others in a two by two grid
      const [first, ...rest] = s.drawJobs, gx = 520, gt = 110;
      if (first) picture(pg, first, gx, gt, 320, 470, 14);
      rest.forEach((j, i) => picture(pg, j, gx + 332 + (i % 2) * 192, gt + Math.floor(i / 2) * 241, 180, 229, 14));
      link(pg, gx, gt, 704, 470, href);
      foot(pg, pages.length);
    }
  }

  /* ---------- 5. thank you ---------- */
  {
    const pg = newPage();
    band(pg, "Anas Al Shikh Saleh");
    const c = site.contact || {};
    T(pg, "THANK YOU", { x: (W - width("THANK YOU", F.display, 110)) / 2, top: 250, size: 110, f: F.display });
    const sub = "Let's make something together.";
    T(pg, sub, { x: (W - width(sub, F.mid, 24)) / 2, top: 386, size: 24, f: F.mid, color: C.blueT });
    const items = [[c.email, `mailto:${c.email}`], ["anassaleh.me", SITE], ["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin], ["WhatsApp", c.whatsapp]].filter(([a, b]) => a && b && !/undefined/.test(b));
    const size = 15, pad = 18, gap = 10, ws = items.map(([a]) => width(a, F.bold, size) + pad * 2), total = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = (W - total) / 2;
    items.forEach(([a, href], i) => {
      pill(pg, x, 470, ws[i], 40, 9, i ? { borderColor: C.ink, borderWidth: 1.1 } : { color: C.ink });
      T(pg, a, { x: x + pad, top: 470 + 12, size, f: F.bold, color: i ? C.ink : C.cream });
      link(pg, x, 470, ws[i], 40, href);
      x += ws[i] + gap;
    });
    foot(pg, pages.length);
  }

  /* ---------- the index, now that every page has its number ---------- */
  {
    const pg = indexPage;
    ghost(pg, "INDEX");
    T(pg, "CONTENTS", { x: M, top: 96, size: 13, f: F.bold, color: C.blueT });
    T(pg, "INDEX", { x: M, top: 124, size: 54, f: F.display });
    // the list flows down three columns; a category never starts at the very bottom of one
    const cols = [M, M + 390, M + 780], cw = 340, top0 = 218, bottom = 640;
    let col = 0, top = top0;
    const row = (s, n, to, { head = false } = {}) => {
      const size = head ? 14 : 14, f = head ? F.display : F.mid, x = cols[col];
      const num = String(n).padStart(2, "0"), nw = width(num, F.bold, 13);
      let txt = clean(head ? s.toUpperCase() : s, f);
      while (width(txt, f, size) > cw - nw - 24 && txt.length > 4) txt = txt.slice(0, -2).trimEnd() + "...";
      T(pg, txt, { x, top, size, f, color: C.ink });
      T(pg, num, { x: x + cw - nw, top: top + 1, size: 13, f: F.bold, color: C.blueT });
      if (!head) pg.drawLine({ start: { x, y: H - top - 22 }, end: { x: x + cw, y: H - top - 22 }, thickness: 0.6, color: C.line });
      link(pg, x - 4, top - 5, cw + 8, 26, to);
    };
    const items = [["About", "about", 2, false]];
    for (const s of sections) {
      items.push([s.name, `s:${s.key}`, at.get(`s:${s.key}`), true]);
      for (const p of s.projects) items.push([p.title, `p:${p.slug}`, at.get(`p:${p.slug}`), false]);
      if (s.drawings) items.push([drawings.title || "I also draw", "drawings", at.get("drawings"), false]);
    }
    const step = Math.min(27, ((bottom - top0) * 3) / (items.length + sections.length * 0.6 + 3));
    items.forEach(([s, key, n, head], i) => {
      const need = head ? step * 2.4 : step;
      if (top + need > bottom && col < 2) { col++; top = top0; }
      if (head && top > top0) top += step * 0.5;
      row(s, n, key, { head });
      top += step;
    });
    foot(pg, 3);
  }

  /* ---------- links: inside the file (index, pages) and out to the website ---------- */
  for (const { pg, rect, to } of links) {
    const n = to === "index" ? 3 : to === "about" ? 2 : at.get(to);
    const action = n ? { Dest: [pages[n - 1].ref, PDFName.of("XYZ"), null, null, null] }
      : { A: { Type: "Action", S: "URI", URI: PDFString.of(to) } };
    const annot = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], ...action });
    pg.node.addAnnot(doc.context.register(annot));
  }

  doc.setTitle(`${name}, portfolio`);
  doc.setAuthor(name);
  doc.setSubject("Visual artist and art director in Dubai. Art direction, design, 3D, motion, film and drawing.");
  doc.setCreator("anassaleh.me");
  doc.setProducer("anassaleh.me");
  onProgress(0.97);
  const bytes = await doc.save({ useObjectStreams: true });
  onProgress(1);
  return new Blob([bytes], { type: "application/pdf" });
}
