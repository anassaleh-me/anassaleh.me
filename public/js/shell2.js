// Shared shell for v2 inner pages: content, glass nav, ring cursor, smooth scroll, blur-to-focus reveals, footer.
import { mountPillNav } from "/js/nav.js";
import { mountRingCursor } from "/js/cursors.js";
import { getJSON, prefetchOnHover } from "/js/data.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const accent = (s = "") => esc(s).replace(/\[([^\]]+)\]/g, '<span class="acc">$1</span>');
export const pad = (n) => String(n).padStart(2, "0");
// categories are names typed on each project; "Art direction" -> "art-direction" is the key used to match them
export const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// names as set on the Work page (Work page > Categories) win over the spelling typed on a project
export const CAT = {};
export const cats = (p) => (p.categories || []).map((c) => CAT[slug(c)] || c).join(" · ");
export const inCategory = (p, key) => (p.categories || []).some((c) => slug(c) === key);
// the menu links, in order, for the pages that are switched on
export const navLinks = (site) => [
  ["work", "/work", "Work"], ["about", "/about", "About"], ["progress", "/in-progress", "In progress"], ["journal", "/journal", "Journal"],
].filter(([k]) => site.pages?.[k] !== false).map(([key, href, label]) => ({ key, href, label }));
export const ctaLink = (site) => (site.pages?.contact !== false ? { href: "/contact", label: "Let's talk" } : { href: `mailto:${site.contact?.email || ""}`, label: "Email me" });
// the cover set in Pages CMS; covers in /images/covers/ also have a small copy for hover previews
export const cover = (p) => p.cover || `/images/covers/${p.slug}.webp`;
export const thumb = (p) => (cover(p).startsWith("/images/covers/") ? cover(p).replace("/images/covers/", "/images/covers/thumb/") : cover(p));

export const LOGO = `<svg viewBox="0 0 226.08 342.55" aria-hidden="true"><defs><mask id="LMS"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#LMS)"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;

/* ---------- layout rows (projects and journal) ---------- */
// A row: optional text, then 1 to 8 images or .mp4 loops side by side (same height, never cropped), optional caption.
// `rich` rows carry formatted text from the CMS editor (journal); it is cleaned before it goes on the page.
export function rowsHTML(rows = [], title = "", { rich = false } = {}) {
  let count = 0;
  const media = (src) => {
    count++;
    if (/\.(mp4|webm)$/i.test(src)) {
      const poster = src.replace(/\.(mp4|webm)$/i, "-poster.webp");
      // the poster sits underneath as a plain image and gives the piece its shape, so a loop is never cropped even
      // before (or without) the video loading; the video plays on top of it
      return `<img class="pj-still" src="${esc(poster)}" alt="" loading="lazy" decoding="async"><video src="${esc(src)}" poster="${esc(poster)}" muted loop playsinline preload="none" aria-label="${esc(title)}, animation ${count}"></video>`;
    }
    return `<img src="${esc(src)}" alt="${esc(title)}, image ${count}" loading="lazy" decoding="async">`;
  };
  return rows.filter((r) => r.images?.length || r.text).map((r) => `<div class="pj-row${rich ? " pj-row--rich" : ""}" data-n="${r.images?.length || 0}" data-reveal>
      ${r.text ? (rich ? `<div class="pj-row__rich">${cleanHTML(r.text)}</div>` : `<p class="pj-row__text">${esc(r.text)}</p>`) : ""}
      ${r.images?.length ? `<div class="pj-row__items">${r.images.map((src) => `<figure>${media(src)}</figure>`).join("")}</div>` : ""}
      ${r.caption ? `<p class="pj-row__cap">${esc(r.caption)}</p>` : ""}
    </div>`).join("");
}

// newest first: by "Date" (YYYY-MM) when it is set, otherwise by the last year in "Year" ("2024 to 2026" counts as
// 2026); projects with the same date keep their Pages CMS order
const when = (p) => (/^\d{4}-\d{2}/.test(p.date || "") ? p.date.slice(0, 7) : `${(String(p.year || "").match(/\d{4}/g) || ["0000"]).pop()}-00`);
export const byDate = (list) => list.slice().sort((a, b) => when(b).localeCompare(when(a)));

// phones and tablets: no hover, so pictures that follow the pointer stay off
export const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

// every row fills the full width, and each piece takes width in proportion to its shape, so a row lines up at one
// height; loops play only while on screen
export function fitRows(root = document) {
  $$(".pj-row figure", root).forEach((f) => {
    // a loop is measured by its poster image underneath
    const el = f.querySelector("img");
    const fit = (w, h) => {
      if (!w || !h) return;
      // (scaled up: if the shares add up to less than 1, a flex row leaves part of its width empty)
      f.style.flex = `${(w / h) * 100} 1 0`;
    };
    // Safari reports a lazy image that hasn't loaded yet as complete with no size, so also wait for it to load
    if (el.complete && el.naturalWidth) fit(el.naturalWidth, el.naturalHeight);
    el.addEventListener("load", () => fit(el.naturalWidth, el.naturalHeight));
  });
  // loops start when they come on screen; iPhones only start a video by themselves when it is muted (set here as well
  // as in the markup), and not at all in Low Power Mode, so then a play mark shows and a tap starts it
  const start = (v) => v.play().then(() => v.parentElement.classList.remove("is-paused")).catch(() => v.parentElement.classList.add("is-paused"));
  const loopIO = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { v.muted = v.defaultMuted = true; v.preload = "auto"; start(v); } else v.pause();
  }), { rootMargin: "200px 0px" });
  $$(".pj-row video", root).forEach((v) => {
    v.muted = v.defaultMuted = true;
    loopIO.observe(v);
    v.parentElement.addEventListener("click", () => { if (v.paused) start(v); });
  });
}

// formatted text from the CMS: keep simple tags and safe links only
const KEEP = new Set(["P", "H2", "H3", "STRONG", "B", "EM", "I", "A", "UL", "OL", "LI", "BLOCKQUOTE", "BR", "HR"]);
export function cleanHTML(html = "") {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType !== 1) return;
    walk(n);
    if (!KEEP.has(n.tagName)) { n.replaceWith(...n.childNodes); return; }
    [...n.attributes].forEach((a) => { if (!(n.tagName === "A" && a.name === "href")) n.removeAttribute(a.name); });
    if (n.tagName === "A") {
      if (!/^(https?:|mailto:|\/)/i.test(n.getAttribute("href") || "")) n.removeAttribute("href");
      else if (/^https?:/i.test(n.getAttribute("href"))) { n.target = "_blank"; n.rel = "noopener"; }
    }
  });
  const root = doc.body.firstElementChild;
  walk(root);
  return root.innerHTML;
}

export async function shell({ current = "" } = {}) {
  const [site, all] = await Promise.all([
    getJSON("/content/site.json"),
    getJSON("/content/projects.json"),
  ]);
  const projects = byDate(all.filter((p) => !p.draft));
  (site.workCategories || []).forEach((c) => { if (c.key && c.label && c.key !== "all") CAT[c.key] = c.label; });

  mountPillNav({
    logo: LOGO,
    name: site.name,
    current,
    links: navLinks(site),
    cta: ctaLink(site),
  });
  mountRingCursor({ accent: "#6f8faf" });
  prefetchOnHover();
  const lenis = window.Lenis ? new Lenis({ lerp: 0.11, wheelMultiplier: 1 }) : null;
  window.__lenis = lenis;
  const tick = (t) => { lenis?.raf(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);

  const foot = $("footer[data-footer]");
  if (foot) foot.outerHTML = footerHTML(site);

  return { site, projects, lenis, reveal };
}

const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  const el = e.target;
  const siblings = [...el.parentElement.querySelectorAll(":scope > [data-reveal]")];
  el.style.transitionDelay = `${Math.min(6, Math.max(0, siblings.indexOf(el))) * 70}ms`;
  el.classList.add("in");
  revealIO.unobserve(el);
}), { threshold: 0.12, rootMargin: "0px 0px 4% 0px" });
export function reveal(root = document) { $$("[data-reveal]:not(.in)", root).forEach((el) => revealIO.observe(el)); }

function footerHTML(site) {
  const c = site.contact || {};
  const socials = [["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin], ["WhatsApp", c.whatsapp]].filter(([, u]) => u);
  return `<footer class="foot dark" data-dark>
    <div class="wrap">
      <div class="foot__top">
        <div><span class="foot__logo">${LOGO}</span><p>Visual artist and art director in Dubai. Art direction, design, 3D, motion, film and drawing.</p></div>
        <div><h3>Pages</h3><ul><li><a href="/">Home</a></li>${navLinks(site).map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}${site.pages?.contact !== false ? '<li><a href="/contact">Contact</a></li>' : ""}</ul></div>
        <div><h3>Follow</h3><ul>${socials.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${n}</a></li>`).join("")}</ul></div>
        <div><h3>Say hi</h3><ul><li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li><li><a href="${esc(site.about?.cv || "/Anas_Al_Shikh_Saleh_CV.pdf")}" target="_blank" rel="noopener">Download CV</a></li></ul></div>
      </div>
      <p class="foot__big up" aria-hidden="true">Anas <span class="acc">Saleh</span></p>
      <div class="foot__bottom"><span>&copy; ${new Date().getFullYear()} ${esc(site.fullName)}</span><span>anassaleh.me</span></div>
    </div>
  </footer>`;
}
