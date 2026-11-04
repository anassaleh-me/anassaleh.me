// Portfolio PDF, built in the visitor's browser from what the site shows right now (projects.json without drafts or
// projects switched off for the PDF, site.json for the about text, categories, drawings and contact). It follows
// Anas's hand-made portfolio: cream paper, charcoal, big ghost letters, a marquee band on each category page, a
// project page (text left, one large picture right) and, when he picks pictures in the CMS (pdfImages), a full
// gallery page after it, plus the site's blue. Nothing is picked or cropped at random: the project page shows the
// cover whole, and the gallery keeps his order and fills the page with as little trimming as the shapes allow.
// An index links to every page, every page links back to it, and the buttons open the project on the website.
// Pictures share a byte budget, so the file always stays under 8 MB. pdf-lib loads only when someone asks.
const LIB = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const FONTKIT = "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm";
const SITE = "https://anassaleh.me";
const W = 1280, H = 720, M = 72; // page size in points (16:9) and side margin, as in the hand-made one
const LIMIT = 7.6e6; // the whole file stays under this (Anas: never over 8 MB)
const IMG_BUDGET = LIMIT - 0.6e6; // fonts, grain, text and links fit in the rest
const PX = 1.6; // pixels per point for the pictures, before the budget squeezes them

const hex = (h, k) => k.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const vimeo = (html = "") => (html.match(/player\.vimeo\.com\/video\/(\d+)/) || [])[1];
const youtube = (html = "") => (html.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/) || [])[1];

// Gallery layout: the pictures in their order, split into rows (or columns) so together they fill the box.
// Wide pictures end up in rows, tall ones in columns. `trim` says how far the best split is from filling exactly (1 = exact).
function mosaic(aspects, bw, bh, gap) {
  const splits = (n) => { // every way to cut n pictures into groups of 1 to 4, keeping the order
    if (!n) return [[]];
    const out = [];
    for (let k = 1; k <= Math.min(4, n); k++) for (const rest of splits(n - k)) out.push([k, ...rest]);
    return out;
  };
  let best = null;
  for (const parts of splits(aspects.length)) {
    for (const cols of [false, true]) {
      // the size of each group when it fills the full width (a row) or the full height (a column)
      let i = 0, along = 0;
      const groups = parts.map((k) => {
        const a = aspects.slice(i, i + k); i += k;
        const size = cols ? (bh - gap * (k - 1)) / a.reduce((s, x) => s + 1 / x, 0) : (bw - gap * (k - 1)) / a.reduce((s, x) => s + x, 0);
        along += size;
        return { a, size };
      });
      along += gap * (parts.length - 1);
      const room = cols ? bw : bh;
      const trim = Math.max(room / along, along / room);
      if (!best || trim < best.trim - 0.001) best = { trim, cols, groups, along, room };
    }
  }
  return best;
}

export async function buildPortfolio({ site, projects, onProgress = () => {} }) {
  const k = await import(LIB);
  const { default: fontkit } = await import(FONTKIT);
  const { PDFDocument, PDFName, PDFString, pushGraphicsState, popGraphicsState, moveTo, lineTo, appendBezierCurve, closePath, clip, endPath } = k;
  const C = { cream: hex("#f1ece2", k), ink: hex("#1d1d1b", k), ink2: hex("#2b2b2b", k), soft: hex("#5b5a55", k), ghost: hex("#e7e1d5", k),
    blue: hex("#6f8faf", k), blueT: hex("#4c6c8c", k), line: hex("#d3ccbf", k) };

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // TrueType copies of the site fonts (public/fonts/pdf): a PDF can't hold woff2, and only the letters used are kept
  const font = async (f) => doc.embedFont(await (await fetch(`/fonts/pdf/${f}.ttf`)).arrayBuffer(), { subset: true });
  const F = {
    display: await font("archivo-black-400-latin"), body: await font("barlow-semi-condensed-400-latin"),
    mid: await font("barlow-semi-condensed-600-latin"), bold: await font("barlow-semi-condensed-700-latin"),
  };
  const chars = new Map(Object.values(F).map((f) => [f, new Set(f.getCharacterSet())]));
  // straight quotes, no dashes (the site's writing rules), and nothing the font can't draw
  const clean = (s, f) => String(s ?? "").replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s+/g, " ").trim().split("").filter((c) => chars.get(f).has(c.codePointAt(0))).join("");

  /* ---------- the plan: which pages, in which order ---------- */
  const all = (site.workCategories || []).filter((c) => c.key && c.key !== "all");
  // a category switched off in the CMS (Work > Categories) has no section; its projects move to their next category
  const off = new Set(all.filter((c) => c.show === false).map((c) => c.key));
  const order = all.filter((c) => !off.has(c.key));
  const groups = new Map(order.map((c) => [c.key, []]));
  // each project sits once, under the first category typed on it (its main one) that is switched on
  for (const p of projects.filter((p) => p.inPdf !== false)) {
    const key = (p.categories || []).map(slug).find((k) => k && !off.has(k)) || "more-work";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const drawings = site.drawings?.show !== false && site.drawings?.images?.length ? site.drawings : null;
  const drawKey = [...groups.keys()].find((k) => /traditional|drawing/.test(k)) || "traditional-art";
  const sections = [...groups].filter(([key, list]) => list.length || (drawings && key === drawKey)).map(([key, list]) => ({
    key, name: order.find((c) => c.key === key)?.label || (key === "more-work" ? "More work" : (list[0]?.categories || []).find((c) => slug(c) === key)) || "More work",
    line: order.find((c) => c.key === key)?.description || "", projects: list, drawings: drawings && key === drawKey,
  }));
  if (drawings && !sections.some((s) => s.drawings) && !off.has(drawKey)) sections.push({ key: drawKey, name: "Traditional art", line: "", projects: [], drawings: true });

  /* ---------- pictures: fetched at a sensible size, then re-encoded inside the budget ---------- */
  const poster = (src) => (/\.mp4$/i.test(src) ? src.replace(/\.mp4$/i, "-poster.webp") : src);
  const sized = (src, w) => (/^\/images\/[^?#]+\.(webp|jpe?g|png)$/i.test(src) ? `/img/${w}${src}` : src);
  // every picture (or gallery) with the area it fills, so the budget can be shared by area
  const jobs = [];
  const MAIN = { x: 588, top: 168, w: 620, h: 476 };
  const portrait = { src: site.about?.pdfPortrait || site.about?.portrait || "/images/portrait-v2.webp", w: 446, h: 446, png: true, fetchW: 1080 };
  jobs.push(portrait);
  for (const s of sections) {
    s.items = s.projects.map((p) => {
      const main = { src: p.coverClean || p.cover || `/images/covers/${p.slug}.webp`, w: MAIN.w, h: MAIN.h, fetchW: 1440 };
      jobs.push(main);
      const pics = (p.pdfImages || []).map(poster).filter((s) => s && !/\.(gif|svg)$/i.test(s)).slice(0, 6);
      const gallery = pics.length ? { gallery: pics, w: W, h: H } : null;
      if (gallery) jobs.push(gallery);
      return { p, main, gallery };
    });
    if (s.drawings) { s.drawJob = { gallery: drawings.images.slice(0, 5), w: 700, h: 476, framed: true, fetchW: 720 }; jobs.push(s.drawJob); }
  }

  let spent = 0, left = jobs.reduce((a, j) => a + j.w * j.h, 0), done = 0;
  const bitmap = async (src, w = 1080) => {
    for (const url of [sized(src, w), src]) {
      try { const r = await fetch(url); if (r.ok) return await createImageBitmap(await r.blob()); } catch {}
    }
    return null;
  };
  const toBytes = (canvas, type, q) => new Promise((res) => canvas.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), type, q));
  // draws the part of the picture that shows (sx, sy, sw, sh) at the size it shows (dw x dh points), within its share of bytes
  async function encode(bmp, { sx = 0, sy = 0, sw = bmp.width, sh = bmp.height, dw, dh, share, png = false, px = PX }) {
    let q = 0.84, bytes;
    for (let tries = 0; tries < 7; tries++) {
      const cw = Math.max(1, Math.round(Math.min(dw * px, sw))), ch = Math.max(1, Math.round(cw * (dh / dw)));
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      if (!png) { g.fillStyle = "#e8e2d6"; g.fillRect(0, 0, cw, ch); }
      g.imageSmoothingQuality = "high";
      g.drawImage(bmp, sx, sy, sw, sh, 0, 0, cw, ch);
      bytes = await toBytes(c, png ? "image/png" : "image/jpeg", q);
      if (bytes.length <= share * 1.1) break;
      // over its share: a little less quality first, then fewer pixels (a PNG can only lose pixels)
      if (!png && q > 0.66) q -= 0.08; else px *= 0.82;
    }
    spent += bytes.length;
    return png ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  }
  const takeShare = (j) => { const s = (IMG_BUDGET - spent) * ((j.w * j.h) / left); left -= j.w * j.h; return s; };

  // a gallery: tiles placed by mosaic(), each picture trimmed evenly only on the side the tile can't hold
  async function runGallery(j, share) {
    const bmps = (await Promise.all(j.gallery.map((s) => bitmap(s, j.fetchW || 1440)))).filter(Boolean);
    if (!bmps.length) return;
    const aspects = bmps.map((b) => b.width / b.height);
    let gap = j.framed ? 12 : 6, bw = j.w, bh = j.h, lay = mosaic(aspects, bw, bh, gap);
    // full page: the tiles fill it exactly (a little trimming at most); drawings, or shapes that would need
    // real trimming: nothing trimmed, the group centred on paper with even margins
    const fill = !j.framed && lay.trim <= 1.16;
    j.ox = j.oy = 0;
    if (!fill && !j.framed) { j.ox = 64; j.oy = 84; bw = W - 128; bh = H - 168; gap = 12; lay = mosaic(aspects, bw, bh, gap); }
    const s = fill ? lay.room / lay.along : Math.min(1, lay.room / lay.along);
    const crossBox = lay.cols ? bh : bw;
    const tiles = [];
    let pos = fill ? 0 : (lay.room - lay.along * s) / 2, b = 0;
    for (const gr of lay.groups) {
      const thick = gr.size * s, k = fill ? 1 : s;
      const across = crossBox - gap * (gr.a.length - 1);
      const total = gr.a.reduce((t, x) => t + (lay.cols ? 1 / x : x), 0);
      let at = (crossBox - (across * k + gap * (gr.a.length - 1))) / 2;
      for (const a of gr.a) {
        const len = across * ((lay.cols ? 1 / a : a) / total) * k;
        tiles.push(lay.cols ? { x: pos, top: at, w: thick, h: len, bmp: bmps[b++] } : { x: at, top: pos, w: len, h: thick, bmp: bmps[b++] });
        at += len + gap;
      }
      pos += thick + gap;
    }
    const area = tiles.reduce((t, x) => t + x.w * x.h, 0);
    for (const t of tiles) {
      const iw = t.bmp.width, ih = t.bmp.height, sc = Math.max(t.w / iw, t.h / ih), sw = t.w / sc, sh = t.h / sc;
      t.img = await encode(t.bmp, { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh, dw: t.w, dh: t.h, share: (share * t.w * t.h) / area });
      t.bmp.close?.(); delete t.bmp;
    }
    j.tiles = tiles; j.fill = fill;
  }
  async function run(j) {
    const share = takeShare(j);
    if (j.gallery) await runGallery(j, share);
    else {
      const bmp = await bitmap(j.src, j.fetchW);
      if (bmp) {
        // the whole picture inside its box (never trimmed)
        const s = Math.min(j.w / bmp.width, j.h / bmp.height);
        j.dw = bmp.width * s; j.dh = bmp.height * s;
        j.img = await encode(bmp, { dw: j.dw, dh: j.dh, share, png: j.png, px: j.png ? 1.4 : PX });
        bmp.close?.();
      }
    }
    onProgress(0.05 + 0.85 * (++done / jobs.length));
  }
  // a few at a time: quick, without holding every picture in memory at once
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));

  /* ---------- drawing helpers (y measured from the top of the page) ---------- */
  // paper grain: one small tile drawn across every page (stored once in the file)
  const grain = await (async () => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14 + (Math.random() < 0.004 ? -36 : 0);
      d.data[i] = 241 + n; d.data[i + 1] = 236 + n; d.data[i + 2] = 226 + n; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    return doc.embedJpg(await toBytes(c, "image/jpeg", 0.55));
  })();
  const pages = [];
  function newPage({ paper = true } = {}) {
    const pg = doc.addPage([W, H]);
    if (paper) for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) pg.drawImage(grain, { x, y, width: 256, height: 256 });
    pages.push(pg);
    return pg;
  }
  const T = (pg, s, { x, top, size, f = F.body, color = C.ink }) => {
    s = clean(s, f);
    pg.drawText(s, { x, y: H - top - size * 0.8, size, font: f, color });
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
  function para(pg, s, { x, top, size, f = F.body, color = C.ink, maxW, lh = 1.5, maxLines = 99 }) {
    let lines = wrap(s, f, size, maxW);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:]*\S*$/, "") + "..."; }
    lines.forEach((l, i) => pg.drawText(l, { x, y: H - top - size * 0.8 - i * size * lh, size, font: f, color }));
    return top + lines.length * size * lh;
  }
  const roundPath = (x, top, w, h, r) => {
    const c = 0.5523 * r, b = H - top - h;
    return [moveTo(x + r, b), lineTo(x + w - r, b), appendBezierCurve(x + w - r + c, b, x + w, b + r - c, x + w, b + r), lineTo(x + w, b + h - r),
      appendBezierCurve(x + w, b + h - r + c, x + w - r + c, b + h, x + w - r, b + h), lineTo(x + r, b + h),
      appendBezierCurve(x + r - c, b + h, x, b + h - r + c, x, b + h - r), lineTo(x, b + r), appendBezierCurve(x, b + r - c, x + r - c, b, x + r, b), closePath()];
  };
  function picture(pg, img, x, top, w, h, r = 0) {
    if (!img) { pg.drawRectangle({ x, y: H - top - h, width: w, height: h, color: C.ghost }); return; }
    if (r) pg.pushOperators(pushGraphicsState(), ...roundPath(x, top, w, h, r), clip(), endPath());
    pg.drawImage(img, { x, y: H - top - h, width: w, height: h });
    if (r) pg.pushOperators(popGraphicsState());
  }
  // rounded box (drawSvgPath measures y downward from the given corner)
  const pill = (pg, x, top, w, h, r, o) => pg.drawSvgPath(`M${r},0H${w - r}Q${w},0 ${w},${r}V${h - r}Q${w},${h} ${w - r},${h}H${r}Q0,${h} 0,${h - r}V${r}Q0,0 ${r},0Z`, { x, y: H - top, ...o });
  const links = []; // made at the end, once every page number is known
  const link = (pg, x, top, w, h, to) => links.push({ pg, rect: [x, H - top - h, x + w, H - top], to });
  function button(pg, s, x, top, href, { dark = true } = {}) {
    const size = 12.5, pad = 24, w = width(s.toUpperCase(), F.bold, size) + pad * 2 + 16, h = 46;
    pill(pg, x, top, w, h, 10, dark ? { color: C.ink } : { borderColor: C.ink, borderWidth: 1.2 });
    pg.drawCircle({ x: x + pad + 3, y: H - top - h / 2, size: 3.5, color: C.blue });
    T(pg, s.toUpperCase(), { x: x + pad + 16, top: top + (h - size) / 2 + 1, size, f: F.bold, color: dark ? C.cream : C.ink });
    link(pg, x, top, w, h, href);
    return w;
  }
  // the ghost letters behind a page, like the hand-made portfolio (two letters, stacked, cut by the page edge)
  function ghost(pg, word, { x = W - 500, top = -70, size = 300 } = {}) {
    const letters = clean(word.toUpperCase(), F.display).replace(/[^A-Z0-9&]/g, "").slice(0, 2) || "A";
    for (let i = 0; i < 3; i++) T(pg, letters, { x, top: top + i * size * 0.8, size, f: F.display, color: C.ghost });
  }
  function band(pg, word) {
    pg.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: C.ink2 });
    const s = clean(word.toUpperCase(), F.display).replace(/\s+/g, ""), size = 24, step = width(s, F.display, size) + 22;
    for (let x = -step * 0.4, i = 0; x < W; x += step, i++) T(pg, s, { x, top: 11, size, f: F.display, color: i % 3 === 1 ? C.blue : C.cream });
  }
  // page number bottom left (with a way back to the index), the site bottom right
  function foot(pg, n, { onPicture = false } = {}) {
    if (onPicture) pill(pg, 26, H - 70, 150, 42, 10, { color: C.cream });
    const w = T(pg, "Pg.", { x: 40, top: H - 56, size: 20, f: F.bold });
    T(pg, String(n).padStart(2, "0"), { x: 40 + w + 1, top: H - 56, size: 20, f: F.body, color: C.blueT });
    if (n > 3) { const iw = T(pg, "INDEX", { x: 112, top: H - 51, size: 11, f: F.bold, color: C.blueT }); link(pg, 104, H - 59, iw + 16, 26, "index"); }
    if (onPicture) return;
    const sw = width("anassaleh.me", F.mid, 13);
    T(pg, "anassaleh.me", { x: W - 40 - sw, top: H - 53, size: 13, f: F.mid, color: C.soft });
    link(pg, W - 48 - sw, H - 61, sw + 16, 28, SITE);
  }
  function corner(pg, a, b, { onPicture = false } = {}) { // "3D design/animation" at the top right
    const wb = width(b ? `/${b}` : "", F.body, 14), wa = width(a, F.bold, 14);
    if (onPicture) pill(pg, W - 54 - wa - wb, 20, wa + wb + 28, 36, 10, { color: C.cream });
    T(pg, a, { x: W - 40 - wa - wb, top: 31, size: 14, f: F.bold });
    if (b) T(pg, `/${b}`, { x: W - 40 - wb, top: 31, size: 14, f: F.body, color: C.soft });
  }
  const at = new Map(); // what -> page number

  /* ---------- 1. cover, laid out like the hand-made one ---------- */
  const name = site.fullName || "Anas Al Shikh Saleh";
  {
    const pg = newPage();
    T(pg, "PORTFOLIO", { x: M, top: 284, size: 100, f: F.display });
    T(pg, name, { x: M + 2, top: 392, size: 40, f: F.body });
    T(pg, "Visual artist and art director", { x: M + 3, top: 446, size: 21, f: F.mid, color: C.blueT });
    T(pg, `Selected work ${new Date().getFullYear()}`, { x: M + 2, top: 622, size: 20, f: F.bold });
    const sw = T(pg, "anassaleh.me", { x: M + 2, top: 650, size: 16, f: F.mid, color: C.blueT });
    link(pg, M - 4, 644, sw + 12, 26, SITE);
    // the portrait as it is (its round frame is part of the picture, so the head can break out of it)
    const j = portrait, cx = 1000, cy = 360;
    if (j.img) picture(pg, j.img, cx - j.dw / 2, cy - j.dh / 2, j.dw, j.dh);
  }

  /* ---------- 2. about ---------- */
  {
    const pg = newPage();
    ghost(pg, "ABOUT");
    T(pg, "ABOUT", { x: M, top: 80, size: 14, f: F.bold, color: C.blueT });
    T(pg, "HELLO, I'M ANAS", { x: M, top: 108, size: 56, f: F.display });
    let top = 206;
    for (const b of (site.about?.bio || []).slice(0, 4)) top = para(pg, b, { x: M, top, size: 17, maxW: 600 }) + 16;
    const x2 = 790;
    T(pg, "ALONG THE WAY", { x: x2, top: 206, size: 14, f: F.bold, color: C.blueT });
    let t2 = 238;
    for (const e of (site.about?.experience || []).slice(0, 4)) {
      T(pg, e.company, { x: x2, top: t2, size: 18, f: F.bold });
      T(pg, `${e.role}, ${e.period}`, { x: x2, top: t2 + 24, size: 15, color: C.soft });
      t2 += 62;
    }
    const tools = (site.about?.tools || []).join(", ");
    if (tools) { T(pg, "TOOLS", { x: x2, top: t2 + 12, size: 14, f: F.bold, color: C.blueT }); para(pg, tools, { x: x2, top: t2 + 42, size: 15, maxW: 400, color: C.soft }); }
    foot(pg, 2);
  }

  /* ---------- 3. index (filled in once the page numbers are known) ---------- */
  const indexPage = newPage();

  /* ---------- 4. a section per category ---------- */
  for (const s of sections) {
    {
      const pg = newPage();
      at.set(`s:${s.key}`, pages.length);
      ghost(pg, s.name, { top: 46 }); // starts under the band
      band(pg, s.name);
      // the title in up to three lines, the last word in blue (like the site's titles)
      const lines = []; let line = "";
      for (const w of s.name.toUpperCase().split(" ")) { const t = line ? `${line} ${w}` : w; if (width(t, F.display, 96) > 660 && line) { lines.push(line); line = w; } else line = t; }
      lines.push(line);
      let top = 380 - (lines.length * 96 * 0.98) / 2;
      lines.forEach((l, i) => { T(pg, l, { x: M, top, size: 96, f: F.display, color: i === lines.length - 1 && lines.length > 1 ? C.blueT : C.ink }); top += 96 * 0.98; });
      if (s.line) para(pg, s.line, { x: M + 4, top: top + 26, size: 21, maxW: 560, color: C.soft });
      foot(pg, pages.length);
    }
    for (const { p, main, gallery } of s.items) {
      // project page: title and text left, the cover whole on the right
      const pg = newPage(), n = pages.length;
      at.set(`p:${p.slug}`, n);
      ghost(pg, s.name);
      corner(pg, s.name, p.subtitle || "");
      const href = `${SITE}/work/${p.slug}`, lw = 430;
      let top = 82;
      for (const l of wrap(p.title.toUpperCase(), F.display, 36, lw).slice(0, 3)) { T(pg, l, { x: M, top, size: 36, f: F.display }); top += 39; }
      if (p.subtitle) { top += 2; T(pg, p.subtitle.toUpperCase(), { x: M, top, size: 22, f: F.mid, color: C.blueT }); top += 30; }
      top += 24;
      const btnTop = MAIN.top + MAIN.h - 46; // its bottom lines up with the bottom of the picture
      const factsTop = btnTop - 44;
      const roleLines = p.role ? Math.min(2, wrap(p.role, F.mid, 14, lw).length) : 0;
      const roleTop = factsTop - 10 - roleLines * 19.6;
      top = para(pg, p.description || "", { x: M, top, size: 16, maxW: lw, maxLines: Math.max(3, Math.floor((roleTop - 20 - top) / 24)) });
      if (p.role) para(pg, p.role, { x: M, top: roleTop, size: 14, f: F.mid, color: C.soft, maxW: lw, lh: 1.4, maxLines: 2 });
      const facts = [p.client, p.year].filter(Boolean).join("  ·  ");
      if (facts) T(pg, facts, { x: M, top: factsTop, size: 14, f: F.bold });
      const bw = button(pg, "View the full project", M, btnTop, href);
      const film = vimeo(p.video) ? `https://vimeo.com/${vimeo(p.video)}` : youtube(p.video) ? `https://youtu.be/${youtube(p.video)}` : "";
      if (film) button(pg, "Watch the film", M + bw + 12, btnTop, film, { dark: false });
      const dw = main.img ? main.dw : MAIN.w, dh = main.img ? main.dh : MAIN.h;
      const px = MAIN.x + (MAIN.w - dw) / 2, py = MAIN.top + (MAIN.h - dh) / 2;
      picture(pg, main.img, px, py, dw, dh, 22);
      link(pg, px, py, dw, dh, href);
      foot(pg, n);
      // the gallery page Anas picked in the CMS: the pictures fill the page edge to edge
      if (gallery?.tiles) {
        const gp = newPage({ paper: !gallery.fill });
        if (gallery.fill) gp.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.cream });
        for (const t of gallery.tiles) { picture(gp, t.img, gallery.ox + t.x, gallery.oy + t.top, t.w, t.h, gallery.fill ? 0 : 14); link(gp, gallery.ox + t.x, gallery.oy + t.top, t.w, t.h, href); }
        corner(gp, s.name, p.title, { onPicture: gallery.fill });
        foot(gp, pages.length, { onPicture: gallery.fill });
      }
    }
    if (s.drawings) {
      const pg = newPage(), j = s.drawJob;
      at.set("drawings", pages.length);
      ghost(pg, "DRAW");
      corner(pg, s.name, "pencil and charcoal");
      T(pg, (drawings.title || "I also draw").toUpperCase(), { x: M, top: 82, size: 36, f: F.display });
      para(pg, drawings.text || "", { x: M, top: 150, size: 16, maxW: 400, maxLines: 7 });
      const href = `${SITE}/#drawings`;
      button(pg, "See them on the site", M, MAIN.top + MAIN.h - 46, href);
      const gx = 520, gt = MAIN.top;
      for (const t of j.tiles || []) picture(pg, t.img, gx + t.x, gt + t.top, t.w, t.h, 14);
      link(pg, gx, gt, j.w, j.h, href);
      foot(pg, pages.length);
    }
  }

  /* ---------- 5. thank you ---------- */
  {
    const pg = newPage();
    band(pg, name);
    const c = site.contact || {};
    T(pg, "THANK YOU", { x: (W - width("THANK YOU", F.display, 110)) / 2, top: 246, size: 110, f: F.display });
    const sub = "Let's make something together.";
    T(pg, sub, { x: (W - width(sub, F.mid, 24)) / 2, top: 384, size: 24, f: F.mid, color: C.blueT });
    const items = [[c.email, c.email && `mailto:${c.email}`], ["anassaleh.me", SITE], ["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin], ["WhatsApp", c.whatsapp]].filter(([a, b]) => a && b);
    const size = 15, pad = 20, gap = 10, ws = items.map(([a]) => width(a, F.bold, size) + pad * 2), total = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = (W - total) / 2;
    items.forEach(([a, href], i) => {
      pill(pg, x, 466, ws[i], 44, 10, i ? { borderColor: C.ink, borderWidth: 1.1 } : { color: C.ink });
      T(pg, a, { x: x + pad, top: 466 + 14, size, f: F.bold, color: i ? C.ink : C.cream });
      link(pg, x, 466, ws[i], 44, href);
      x += ws[i] + gap;
    });
    foot(pg, pages.length);
  }

  /* ---------- the index, now that every page has its number ---------- */
  {
    const pg = indexPage;
    ghost(pg, "INDEX");
    T(pg, "CONTENTS", { x: M, top: 80, size: 14, f: F.bold, color: C.blueT });
    T(pg, "INDEX", { x: M, top: 108, size: 56, f: F.display });
    // the list flows down three columns; a category never starts at the very bottom of one
    const cols = [M, M + 390, M + 780], cw = 340, top0 = 206, bottom = 640;
    let col = 0, top = top0;
    const items = [["About", "about", 2, false]];
    for (const s of sections) {
      items.push([s.name, `s:${s.key}`, at.get(`s:${s.key}`), true]);
      for (const p of s.projects) items.push([p.title, `p:${p.slug}`, at.get(`p:${p.slug}`), false]);
      if (s.drawings) items.push([drawings.title || "I also draw", "drawings", at.get("drawings"), false]);
    }
    const step = Math.min(27, ((bottom - top0) * 3) / (items.length + sections.length * 0.6 + 3));
    for (const [s, key, n, head] of items) {
      if (top + (head ? step * 2.4 : step) > bottom && col < 2) { col++; top = top0; }
      if (head && top > top0) top += step * 0.5;
      const f = head ? F.display : F.mid, x = cols[col], num = String(n).padStart(2, "0"), nw = width(num, F.bold, 13);
      let txt = clean(head ? s.toUpperCase() : s, f);
      while (width(txt, f, 14) > cw - nw - 24 && txt.length > 4) txt = txt.slice(0, -2).trimEnd() + "...";
      T(pg, txt, { x, top, size: 14, f });
      T(pg, num, { x: x + cw - nw, top: top + 1, size: 13, f: F.bold, color: C.blueT });
      if (!head) pg.drawLine({ start: { x, y: H - top - 20 }, end: { x: x + cw, y: H - top - 20 }, thickness: 0.6, color: C.line });
      link(pg, x - 4, top - 5, cw + 8, step, key);
      top += step;
    }
    foot(pg, 3);
  }

  /* ---------- links: inside the file (index, pages) and out to the website ---------- */
  for (const { pg, rect, to } of links) {
    const n = to === "index" ? 3 : to === "about" ? 2 : at.get(to);
    const action = n ? { Dest: [pages[n - 1].ref, PDFName.of("XYZ"), null, null, null] } : { A: { Type: "Action", S: "URI", URI: PDFString.of(to) } };
    pg.node.addAnnot(doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], ...action })));
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
