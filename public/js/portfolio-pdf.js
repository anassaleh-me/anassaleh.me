// Portfolio PDF, built in the visitor's browser from what the site shows right now (projects.json without drafts or
// projects switched off for the PDF, site.json for the about text, categories, drawings and contact). It follows
// Anas's hand-made portfolio: cream paper, charcoal, big ghost letters, a marquee band on each category page, a
// project page (text left, one large picture right) and, when he picks pictures in the CMS (pdfImages), a full
// gallery page after it, plus the site's blue. Nothing is picked or cropped at random.
// Every page sits on one grid (GRID below): the same margins, the first line of text and the picture start on the
// same line, the button ends where the picture ends, and the page furniture (category top right, page number and
// site at the bottom) sits on the same lines on every page. Text is placed by its baseline and cap height, so
// "aligned" means the letters line up, not their boxes.
// An index links to every page, every page links back to it, and the buttons open the project on the website.
// Pictures share a byte budget, so the file always stays under 8 MB. pdf-lib loads only when someone asks.
const LIB = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const FONTKIT = "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm";
const SITE = "https://anassaleh.me";
const W = 1280, H = 720; // page size in points (16:9)
const GRID = {
  L: 72, R: 1208, // left and right margins: text, pictures and furniture start and end here
  TOP: 100, BOT: 608, // first cap line and picture top / picture bottom and button bottom
  TEXT_W: 432, PIC_X: 560, // text column (72 to 504), picture column (560 to 1208), a 56 point gutter between
  HEAD: 52, FOOT: 668, // baselines of the top-right label and of the page number line
};
GRID.PIC_W = GRID.R - GRID.PIC_X; GRID.PIC_H = GRID.BOT - GRID.TOP;
const CAP = { display: 0.688, body: 0.7 }; // cap heights of Archivo Black and Barlow Semi Condensed (from the fonts)
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
      // tiles of very different sizes (one huge picture beside tiny ones) count against a split
      const areas = groups.flatMap((g) => g.a.map((x) => (cols ? g.size * g.size / x : g.size * g.size * x)));
      const score = trim + 0.12 * Math.log(Math.max(...areas) / Math.min(...areas));
      if (!best || score < best.score - 0.001) best = { trim, score, cols, groups, along, room };
    }
  }
  return best;
}
// tiles for a mosaic in a box: `fill` makes them meet the box edges exactly (each picture trimmed a little on the
// side its tile can't hold); otherwise nothing is trimmed and the group is centred in the box
function tilesFor(lay, box, gap, fill) {
  const s = fill ? lay.room / lay.along : Math.min(1, lay.room / lay.along);
  const cross = lay.cols ? box.h : box.w, out = [];
  let pos = fill ? 0 : (lay.room - lay.along * s) / 2, i = 0;
  for (const gr of lay.groups) {
    const thick = gr.size * s, k = fill ? 1 : s;
    const across = cross - gap * (gr.a.length - 1);
    const total = gr.a.reduce((t, x) => t + (lay.cols ? 1 / x : x), 0);
    let at = (cross - (across * k + gap * (gr.a.length - 1))) / 2;
    for (const a of gr.a) {
      const len = across * ((lay.cols ? 1 / a : a) / total) * k;
      out.push(lay.cols ? { i: i++, x: box.x + pos, top: box.top + at, w: thick, h: len } : { i: i++, x: box.x + at, top: box.top + pos, w: len, h: thick });
      at += len + gap;
    }
    pos += thick + gap;
  }
  return out;
}

export async function buildPortfolio({ site, projects, onProgress = () => {} }) {
  const k = await import(LIB);
  const { default: fontkit } = await import(FONTKIT);
  const { PDFDocument, PDFName, PDFString, pushGraphicsState, popGraphicsState, moveTo, lineTo, appendBezierCurve, closePath, clip, endPath } = k;
  const C = { cream: hex("#f1ece2", k), ink: hex("#1d1d1b", k), ink2: hex("#2b2b2b", k), soft: hex("#5b5a55", k), ghost: hex("#e7e1d5", k),
    panel: hex("#e6e0d4", k), blue: hex("#6f8faf", k), blueT: hex("#4c6c8c", k), line: hex("#d3ccbf", k) };
  const { L, R, TOP, BOT, TEXT_W, PIC_X, PIC_W, PIC_H, HEAD, FOOT } = GRID;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // TrueType copies of the site fonts (public/fonts/pdf): a PDF can't hold woff2, and only the letters used are kept
  const font = async (f) => doc.embedFont(await (await fetch(`/fonts/pdf/${f}.ttf`)).arrayBuffer(), { subset: true });
  const F = {
    display: await font("archivo-black-400-latin"), body: await font("barlow-semi-condensed-400-latin"),
    mid: await font("barlow-semi-condensed-600-latin"), bold: await font("barlow-semi-condensed-700-latin"),
  };
  const cap = (f, size) => (f === F.display ? CAP.display : CAP.body) * size;
  const chars = new Map(Object.values(F).map((f) => [f, new Set(f.getCharacterSet())]));
  // straight quotes, no dashes (the site's writing rules), and nothing the font can't draw
  const clean = (s, f) => String(s ?? "").replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s+/g, " ").trim().split("").filter((c) => chars.get(f).has(c.codePointAt(0))).join("");
  // the blank space a font leaves before a word's first letter: big titles are moved left by it, so the letter itself
  // (not its box) sits on the margin
  const bearing = (s, f, size) => {
    try { const g = f.embedder.font.glyphForCodePoint(s.codePointAt(0)); return ((g.bbox?.minX || 0) / f.embedder.font.unitsPerEm) * size; } catch { return 0; }
  };

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
  const PIC = { x: PIC_X, top: TOP, w: PIC_W, h: PIC_H }; // the picture frame of a project page
  const MARGINS = { x: L, top: TOP, w: R - L, h: PIC_H }; // a gallery that can't fill the page sits here
  // every picture (or gallery) with the area it fills, so the budget can be shared by area
  const jobs = [];
  const portrait = { src: site.about?.pdfPortrait || site.about?.portrait || "/images/portrait-v2.webp", w: 446, h: 446, png: true, fetchW: 1080 };
  jobs.push(portrait);
  for (const s of sections) {
    s.items = s.projects.map((p) => {
      const main = { src: p.coverClean || p.cover || `/images/covers/${p.slug}.webp`, w: PIC.w, h: PIC.h, frame: true, fetchW: 1440 };
      jobs.push(main);
      const pics = (p.pdfImages || []).map(poster).filter((s) => s && !/\.(gif|svg)$/i.test(s)).slice(0, 6);
      const gallery = pics.length ? { gallery: pics, w: W, h: H, box: { x: 0, top: 0, w: W, h: H }, gap: 6, limit: 1.16, fallback: MARGINS } : null;
      if (gallery) jobs.push(gallery);
      return { p, main, gallery };
    });
    if (s.drawings) { s.drawJob = { gallery: drawings.images.slice(0, 5), w: PIC.w, h: PIC.h, box: PIC, gap: 12, limit: 1.2, fallback: PIC, fetchW: 720 }; jobs.push(s.drawJob); }
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
  // the part of a picture that covers a w x h box, trimmed evenly on the long side
  const coverCrop = (bmp, w, h) => { const sc = Math.max(w / bmp.width, h / bmp.height), sw = w / sc, sh = h / sc; return { sx: (bmp.width - sw) / 2, sy: (bmp.height - sh) / 2, sw, sh }; };
  const takeShare = (j) => { const s = (IMG_BUDGET - spent) * ((j.w * j.h) / left); left -= j.w * j.h; return s; };

  async function runGallery(j, share) {
    const bmps = (await Promise.all(j.gallery.map((s) => bitmap(s, j.fetchW || 1440)))).filter(Boolean);
    if (!bmps.length) return;
    const order = bmps.map((_, i) => i);
    const aspects = order.map((i) => bmps[i].width / bmps[i].height);
    let lay = mosaic(aspects, j.box.w, j.box.h, j.gap), box = j.box, gap = j.gap;
    j.fill = lay.trim <= j.limit;
    if (!j.fill) { box = j.fallback; gap = 12; lay = mosaic(aspects, box.w, box.h, gap); }
    const tiles = tilesFor(lay, box, gap, j.fill);
    const area = tiles.reduce((t, x) => t + x.w * x.h, 0);
    for (const t of tiles) {
      const bmp = bmps[order[t.i]];
      t.img = await encode(bmp, { ...coverCrop(bmp, t.w, t.h), dw: t.w, dh: t.h, share: (share * t.w * t.h) / area });
      bmp.close?.();
    }
    j.tiles = tiles;
  }
  async function run(j) {
    const share = takeShare(j);
    if (j.gallery) await runGallery(j, share);
    else {
      const bmp = await bitmap(j.src, j.fetchW);
      if (bmp) {
        const a = bmp.width / bmp.height, fa = j.w / j.h;
        if (j.frame && Math.abs(a - fa) / fa <= 0.06) {
          // the cover is (almost exactly) the frame's shape: it fills the frame, so its edges are the grid lines
          j.fit = "fill"; j.dw = j.w; j.dh = j.h;
          j.img = await encode(bmp, { ...coverCrop(bmp, j.w, j.h), dw: j.w, dh: j.h, share });
        } else {
          // any other shape: whole, centred on a panel that fills the frame (the panel keeps the grid)
          const s = Math.min(j.w / bmp.width, j.h / bmp.height);
          j.fit = "contain"; j.dw = bmp.width * s; j.dh = bmp.height * s;
          j.img = await encode(bmp, { dw: j.dw, dh: j.dh, share, png: j.png, px: j.png ? 1.4 : PX });
        }
        bmp.close?.();
      }
    }
    onProgress(0.05 + 0.85 * (++done / jobs.length));
  }
  // a few at a time: quick, without holding every picture in memory at once
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));

  /* ---------- drawing helpers: y is measured from the top of the page, text is placed by its baseline ---------- */
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
  const width = (s, f, size) => f.widthOfTextAtSize(clean(s, f), size);
  // one line of text on a baseline; align left (x is where the first letter starts), right (x is where the last ends) or centre
  function text(pg, s, { x, base, size, f = F.body, color = C.ink, align = "left", optical = false }) {
    s = clean(s, f);
    const w = f.widthOfTextAtSize(s, size);
    let at = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    if (optical && align === "left") at -= bearing(s, f, size);
    pg.drawText(s, { x: at, y: H - base, size, font: f, color });
    return w;
  }
  function wrap(s, f, size, maxW) {
    const out = []; let line = "";
    for (const w of clean(s, f).split(" ")) {
      const t = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  // a block of lines from a first baseline; returns the last baseline. maxLines cuts long text with an ellipsis
  function para(pg, s, { x, base, size, f = F.body, color = C.ink, maxW, lead = size * 1.55, maxLines = 99, optical = false }) {
    let lines = wrap(s, f, size, maxW);
    if (!lines.length) return base - lead;
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:]*\S*$/, "") + "..."; }
    lines.forEach((l, i) => text(pg, l, { x, base: base + i * lead, size, f, color, optical }));
    return base + (lines.length - 1) * lead;
  }
  const roundPath = (x, top, w, h, r) => {
    const c = 0.5523 * r, b = H - top - h;
    return [moveTo(x + r, b), lineTo(x + w - r, b), appendBezierCurve(x + w - r + c, b, x + w, b + r - c, x + w, b + r), lineTo(x + w, b + h - r),
      appendBezierCurve(x + w, b + h - r + c, x + w - r + c, b + h, x + w - r, b + h), lineTo(x + r, b + h),
      appendBezierCurve(x + r - c, b + h, x, b + h - r + c, x, b + h - r), lineTo(x, b + r), appendBezierCurve(x, b + r - c, x + r - c, b, x + r, b), closePath()];
  };
  function picture(pg, img, x, top, w, h, r = 0) {
    if (!img) { pg.drawRectangle({ x, y: H - top - h, width: w, height: h, color: C.panel }); return; }
    if (r) pg.pushOperators(pushGraphicsState(), ...roundPath(x, top, w, h, r), clip(), endPath());
    pg.drawImage(img, { x, y: H - top - h, width: w, height: h });
    if (r) pg.pushOperators(popGraphicsState());
  }
  // rounded box (drawSvgPath measures y downward from the given corner)
  const pill = (pg, x, top, w, h, r, o) => pg.drawSvgPath(`M${r},0H${w - r}Q${w},0 ${w},${r}V${h - r}Q${w},${h} ${w - r},${h}H${r}Q0,${h} 0,${h - r}V${r}Q0,0 ${r},0Z`, { x, y: H - top, ...o });
  const links = []; // made at the end, once every page number is known
  const link = (pg, x, top, w, h, to) => links.push({ pg, rect: [x, H - top - h, x + w, H - top], to });
  // a button whose bottom edge sits on `bottom`; its label is centred on its cap height
  const BTN_H = 46;
  function button(pg, s, x, bottom, href, { dark = true } = {}) {
    const size = 12.5, pad = 22, label = s.toUpperCase(), w = width(label, F.bold, size) + pad * 2 + 16, top = bottom - BTN_H;
    pill(pg, x, top, w, BTN_H, 10, dark ? { color: C.ink } : { borderColor: C.ink, borderWidth: 1.2 });
    pg.drawCircle({ x: x + pad + 3.5, y: H - top - BTN_H / 2, size: 3.5, color: C.blue });
    text(pg, label, { x: x + pad + 16, base: top + BTN_H / 2 + cap(F.bold, size) / 2, size, f: F.bold, color: dark ? C.cream : C.ink });
    link(pg, x, top, w, BTN_H, href);
    return w;
  }
  // the ghost letters behind a page, like the hand-made portfolio: two letters, stacked, running off the right edge.
  // Only behind pictures or open paper, never behind running text (so not on About or the index)
  function ghost(pg, word, { from = 0 } = {}) {
    const letters = clean(word.toUpperCase(), F.display).replace(/[^A-Z0-9&]/g, "").slice(0, 2) || "A";
    const size = 300, w = width(letters, F.display, size);
    for (let i = 0; i < 3; i++) text(pg, letters, { x: W + 40 - w, base: from + cap(F.display, size) + 10 + i * size * 0.8, size, f: F.display, color: C.ghost });
  }
  // the marquee band at the top of a category page and of the last page
  function band(pg, word) {
    pg.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: C.ink2 });
    const s = clean(word.toUpperCase(), F.display).replace(/\s+/g, ""), size = 24, step = width(s, F.display, size) + 22;
    for (let x = -step * 0.4, i = 0; x < W; x += step, i++) text(pg, s, { x, base: 23 + cap(F.display, size) / 2, size, f: F.display, color: i % 3 === 1 ? C.blue : C.cream });
  }
  // page number bottom left (with a way back to the index), the site bottom right, both on the FOOT baseline
  function foot(pg, n, { onPicture = false } = {}) {
    if (onPicture) pill(pg, L - 14, FOOT - 30, 156, 44, 10, { color: C.cream });
    const w = text(pg, "Pg.", { x: L, base: FOOT, size: 20, f: F.bold });
    text(pg, String(n).padStart(2, "0"), { x: L + w + 1, base: FOOT, size: 20, f: F.body, color: C.blueT });
    if (n > 3) { const iw = text(pg, "INDEX", { x: L + 52, base: FOOT, size: 11, f: F.bold, color: C.blueT }); link(pg, L + 44, FOOT - 18, iw + 16, 26, "index"); }
    if (onPicture) return;
    const sw = text(pg, "anassaleh.me", { x: R, base: FOOT, size: 13, f: F.mid, color: C.soft, align: "right" });
    link(pg, R - sw - 8, FOOT - 18, sw + 16, 26, SITE);
  }
  // "Branding & graphic design/Brand identity" on the HEAD baseline, ending on the right margin
  function corner(pg, a, b, { onPicture = false } = {}) {
    const wb = b ? width(`/${b}`, F.body, 14) : 0, wa = width(a, F.bold, 14);
    if (onPicture) pill(pg, R - wa - wb - 14, HEAD - 23, wa + wb + 28, 34, 10, { color: C.cream });
    text(pg, a, { x: R - wb, base: HEAD, size: 14, f: F.bold, align: "right" });
    if (b) text(pg, `/${b}`, { x: R, base: HEAD, size: 14, f: F.body, color: C.soft, align: "right" });
  }
  // small blue label above a page title; its cap line is TOP
  const eyebrow = (pg, s) => text(pg, s.toUpperCase(), { x: L, base: TOP + cap(F.bold, 14), size: 14, f: F.bold, color: C.blueT });
  const at = new Map(); // what -> page number

  /* ---------- 1. cover, laid out like the hand-made one ---------- */
  const name = site.fullName || "Anas Al Shikh Saleh";
  {
    const pg = newPage();
    // the block sits on the page's middle line: PORTFOLIO's baseline a little above it, the name and role below
    text(pg, "PORTFOLIO", { x: L, base: 352, size: 100, f: F.display, optical: true });
    text(pg, name, { x: L, base: 410, size: 40, f: F.body, optical: true });
    text(pg, "Visual artist and art director", { x: L, base: 450, size: 21, f: F.mid, color: C.blueT, optical: true });
    text(pg, `Selected work ${new Date().getFullYear()}`, { x: L, base: FOOT - 30, size: 20, f: F.bold });
    const sw = text(pg, "anassaleh.me", { x: L, base: FOOT, size: 16, f: F.mid, color: C.blueT });
    link(pg, L - 6, FOOT - 18, sw + 12, 26, SITE);
    // the portrait as it is (its round frame is part of the picture, so the head can break out of it). The ring's
    // right edge sits on the right margin and its centre on the page's middle line
    const j = portrait;
    if (j.img) { const ringRight = 0.967, ringMid = 0.5; picture(pg, j.img, R - j.dw * ringRight, H / 2 - j.dh * ringMid, j.dw, j.dh); }
  }

  /* ---------- 2. about ---------- */
  const titleBase = TOP + 30 + cap(F.display, 56); // page titles under an eyebrow
  const bodyTop = 236; // first cap line of the content under a page title
  {
    const pg = newPage();
    eyebrow(pg, "About");
    text(pg, "HELLO, I'M ANAS", { x: L, base: titleBase, size: 56, f: F.display, optical: true });
    let base = bodyTop + cap(F.body, 17);
    for (const b of (site.about?.bio || []).slice(0, 4)) base = para(pg, b, { x: L, base, size: 17, maxW: 560, lead: 26 }) + 26 + 14;
    // right column: starts on the picture column line, its first cap line level with the story's
    const x2 = PIC_X + 120;
    text(pg, "ALONG THE WAY", { x: x2, base: bodyTop + cap(F.bold, 14), size: 14, f: F.bold, color: C.blueT });
    let b2 = bodyTop + 44;
    for (const e of (site.about?.experience || []).slice(0, 4)) {
      text(pg, e.company, { x: x2, base: b2, size: 18, f: F.bold });
      text(pg, `${e.role}, ${e.period}`, { x: x2, base: b2 + 24, size: 15, color: C.soft });
      b2 += 64;
    }
    const tools = (site.about?.tools || []).join(", ");
    if (tools) {
      text(pg, "TOOLS", { x: x2, base: b2 + 16, size: 14, f: F.bold, color: C.blueT });
      para(pg, tools, { x: x2, base: b2 + 48, size: 15, maxW: R - x2, color: C.soft, lead: 23 });
    }
    foot(pg, 2);
  }

  /* ---------- 3. index (filled in once the page numbers are known) ---------- */
  const indexPage = newPage();

  /* ---------- 4. a section per category ---------- */
  for (const s of sections) {
    {
      const pg = newPage();
      at.set(`s:${s.key}`, pages.length);
      ghost(pg, s.name, { from: 46 }); // starts under the band
      band(pg, s.name);
      // the title in up to three lines, the last word in blue (like the site's titles), centred on the page's middle
      const size = 96, lead = 94, lines = []; let line = "";
      for (const w of s.name.toUpperCase().split(" ")) { const t = line ? `${line} ${w}` : w; if (width(t, F.display, size) > 660 && line) { lines.push(line); line = w; } else line = t; }
      lines.push(line);
      const block = (lines.length - 1) * lead + cap(F.display, size);
      let base = H / 2 - block / 2 + cap(F.display, size) - 20;
      lines.forEach((l, i) => { text(pg, l, { x: L, base, size, f: F.display, optical: true, color: i === lines.length - 1 && lines.length > 1 ? C.blueT : C.ink }); base += lead; });
      if (s.line) para(pg, s.line, { x: L, base: base - lead + 52, size: 21, maxW: 560, color: C.soft, optical: true });
      foot(pg, pages.length);
    }
    for (const { p, main, gallery } of s.items) projectPage(s, p, main, gallery);
    if (s.drawings) drawingsPage(s);
  }

  // project page: title and text in the text column, the cover in the picture frame. The title's cap line is the
  // frame's top edge; the button's bottom is the frame's bottom edge; the facts sit just above the button
  function projectPage(s, p, main, gallery) {
    const pg = newPage(), n = pages.length;
    at.set(`p:${p.slug}`, n);
    ghost(pg, s.name);
    corner(pg, s.name, p.subtitle || "");
    const href = `${SITE}/work/${p.slug}`;
    let base = TOP + cap(F.display, 36);
    const title = wrap(p.title.toUpperCase(), F.display, 36, TEXT_W).slice(0, 3);
    title.forEach((l, i) => text(pg, l, { x: L, base: base + i * 40, size: 36, f: F.display, optical: true }));
    base += (title.length - 1) * 40;
    if (p.subtitle) { base += 32; text(pg, p.subtitle.toUpperCase(), { x: L, base, size: 20, f: F.mid, color: C.blueT }); }
    // from the bottom up: button, then client and year, then the role
    const factsBase = BOT - BTN_H - 24;
    const role = p.role ? wrap(p.role, F.mid, 14, TEXT_W).slice(0, 2) : [];
    const roleBase = factsBase - 24 - (role.length - 1) * 20;
    const textEnd = (role.length ? roleBase - cap(F.mid, 14) : factsBase - cap(F.bold, 14)) - 30; // lowest the story may reach
    const first = base + 44, maxLines = Math.max(2, Math.floor((textEnd - first) / 25) + 1);
    para(pg, p.description || "", { x: L, base: first, size: 16, maxW: TEXT_W, lead: 25, maxLines });
    role.forEach((l, i) => text(pg, l, { x: L, base: roleBase + i * 20, size: 14, f: F.mid, color: C.soft }));
    const facts = [p.client, p.year].filter(Boolean).join("  ·  ");
    if (facts) text(pg, facts, { x: L, base: factsBase, size: 14, f: F.bold });
    const bw = button(pg, "View the full project", L, BOT, href);
    const film = vimeo(p.video) ? `https://vimeo.com/${vimeo(p.video)}` : youtube(p.video) ? `https://youtu.be/${youtube(p.video)}` : "";
    if (film) button(pg, "Watch the film", L + bw + 12, BOT, film, { dark: false });
    // the frame: the cover fills it, or sits whole on a panel that fills it
    if (main.fit === "fill" || !main.img) picture(pg, main.img, PIC.x, PIC.top, PIC.w, PIC.h, 20);
    else {
      pill(pg, PIC.x, PIC.top, PIC.w, PIC.h, 20, { color: C.panel });
      picture(pg, main.img, PIC.x + (PIC.w - main.dw) / 2, PIC.top + (PIC.h - main.dh) / 2, main.dw, main.dh, 12);
    }
    link(pg, PIC.x, PIC.top, PIC.w, PIC.h, href);
    foot(pg, n);
    // the gallery page Anas picked in the CMS: edge to edge, or on the page margins when the shapes can't fill it
    if (gallery?.tiles) {
      const gp = newPage({ paper: !gallery.fill });
      if (gallery.fill) gp.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.cream });
      for (const t of gallery.tiles) { picture(gp, t.img, t.x, t.top, t.w, t.h, gallery.fill ? 0 : 14); link(gp, t.x, t.top, t.w, t.h, href); }
      corner(gp, s.name, p.title, { onPicture: gallery.fill });
      foot(gp, pages.length, { onPicture: gallery.fill });
    }
  }
  // the drawings: same grid as a project page, the drawings filling the picture frame
  function drawingsPage(s) {
    const pg = newPage(), j = s.drawJob;
    at.set("drawings", pages.length);
    ghost(pg, "DRAW");
    corner(pg, s.name, "pencil and charcoal");
    const base = TOP + cap(F.display, 36);
    text(pg, (drawings.title || "I also draw").toUpperCase(), { x: L, base, size: 36, f: F.display, optical: true });
    para(pg, drawings.text || "", { x: L, base: base + 44, size: 16, maxW: TEXT_W, lead: 25, maxLines: 8 });
    const href = `${SITE}/#drawings`;
    button(pg, "See them on the site", L, BOT, href);
    for (const t of j.tiles || []) picture(pg, t.img, t.x, t.top, t.w, t.h, 14);
    link(pg, PIC.x, PIC.top, PIC.w, PIC.h, href);
    foot(pg, pages.length);
  }

  /* ---------- 5. thank you ---------- */
  {
    const pg = newPage();
    band(pg, name);
    const c = site.contact || {};
    text(pg, "THANK YOU", { x: W / 2, base: 320, size: 110, f: F.display, align: "center" });
    text(pg, "Let's make something together.", { x: W / 2, base: 386, size: 24, f: F.mid, color: C.blueT, align: "center" });
    // the email Anas set for the PDF (the one on his CV), or the site's
    const email = (c.pdfEmail || c.email || "").trim();
    const items = [[email, email && `mailto:${email}`], ["anassaleh.me", SITE], ["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin], ["WhatsApp", c.whatsapp]].filter(([a, b]) => a && b);
    const size = 15, pad = 20, gap = 10, ph = 44, top = 440, ws = items.map(([a]) => width(a, F.bold, size) + pad * 2), total = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = (W - total) / 2;
    items.forEach(([a, href], i) => {
      pill(pg, x, top, ws[i], ph, 10, i ? { borderColor: C.ink, borderWidth: 1.1 } : { color: C.ink });
      text(pg, a, { x: x + ws[i] / 2, base: top + ph / 2 + cap(F.bold, size) / 2, size, f: F.bold, color: i ? C.ink : C.cream, align: "center" });
      link(pg, x, top, ws[i], ph, href);
      x += ws[i] + gap;
    });
    foot(pg, pages.length);
  }

  /* ---------- the index, now that every page has its number ---------- */
  {
    const pg = indexPage;
    eyebrow(pg, "Contents");
    text(pg, "INDEX", { x: L, base: titleBase, size: 56, f: F.display, optical: true });
    // three columns across the margins; the list flows down them, and a category never starts at the foot of one
    const gutter = 48, cw = (R - L - gutter * 2) / 3, cols = [0, 1, 2].map((i) => L + i * (cw + gutter));
    const first = bodyTop + cap(F.mid, 14), last = BOT;
    const items = [["About", "about", 2, false]];
    for (const s of sections) {
      items.push([s.name, `s:${s.key}`, at.get(`s:${s.key}`), true]);
      for (const p of s.projects) items.push([p.title, `p:${p.slug}`, at.get(`p:${p.slug}`), false]);
      if (s.drawings) items.push([drawings.title || "I also draw", "drawings", at.get("drawings"), false]);
    }
    const step = Math.min(27, ((last - first) * 3) / (items.length + sections.length * 0.6 + 3));
    let col = 0, base = first;
    for (const [s, key, n, head] of items) {
      if (base + (head ? step * 1.4 : 0) > last && col < 2) { col++; base = first; }
      if (head && base > first) base += step * 0.5;
      const f = head ? F.display : F.mid, x = cols[col], num = String(n).padStart(2, "0"), nw = width(num, F.bold, 13);
      let t = clean(head ? s.toUpperCase() : s, f);
      while (width(t, f, 14) > cw - nw - 24 && t.length > 4) t = t.slice(0, -2).trimEnd() + "...";
      text(pg, t, { x, base, size: 14, f });
      text(pg, num, { x: x + cw, base, size: 13, f: F.bold, color: C.blueT, align: "right" });
      if (!head) pg.drawLine({ start: { x, y: H - base - 8 }, end: { x: x + cw, y: H - base - 8 }, thickness: 0.6, color: C.line });
      link(pg, x - 4, base - 16, cw + 8, step, key);
      base += step;
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
