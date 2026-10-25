// Shared shell for v2 inner pages: content, glass nav, ring cursor, smooth scroll, blur-to-focus reveals, footer.
import { mountPillNav } from "/js/nav.js";
import { mountRingCursor } from "/js/cursors.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const accent = (s = "") => esc(s).replace(/\[([^\]]+)\]/g, '<span class="acc">$1</span>');
export const pad = (n) => String(n).padStart(2, "0");
export const CAT = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };
export const cats = (p) => (p.categories || []).map((c) => CAT[c]).join(" · ");
// the cover set in Pages CMS; covers in /images/covers/ also have a small copy for hover previews
export const cover = (p) => p.cover || `/images/covers/${p.slug}.webp`;
export const thumb = (p) => (cover(p).startsWith("/images/covers/") ? cover(p).replace("/images/covers/", "/images/covers/thumb/") : cover(p));

export const LOGO = `<svg viewBox="0 0 226.08 342.55" aria-hidden="true"><defs><mask id="LMS"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#LMS)"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;

export async function shell({ current = "" } = {}) {
  const [site, all] = await Promise.all([
    fetch("/content/site.json").then((r) => r.json()),
    fetch("/content/projects.json").then((r) => r.json()),
  ]);
  const projects = all.filter((p) => !p.draft);

  mountPillNav({
    logo: LOGO,
    name: site.name,
    current,
    links: [{ href: "/work", label: "Work", key: "work" }, { href: "/about", label: "About", key: "about" }, { href: "/#studio", label: "Studio", key: "studio" }],
    cta: { href: "/contact", label: "Let's talk" },
  });
  mountRingCursor({ accent: "#6f8faf" });
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
        <div><h3>Pages</h3><ul><li><a href="/">Home</a></li><li><a href="/work">Work</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li></ul></div>
        <div><h3>Follow</h3><ul>${socials.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${n}</a></li>`).join("")}</ul></div>
        <div><h3>Say hi</h3><ul><li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li><li><a href="${esc(site.about?.cv || "/Anas_Al_Shikh_Saleh_CV.pdf")}" target="_blank" rel="noopener">Download CV</a></li></ul></div>
      </div>
      <p class="foot__big up" aria-hidden="true">Anas <span class="acc">Saleh</span></p>
      <div class="foot__bottom"><span>&copy; ${new Date().getFullYear()} ${esc(site.fullName)}</span><span>anassaleh.me</span></div>
    </div>
  </footer>`;
}
