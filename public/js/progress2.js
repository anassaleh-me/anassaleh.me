// In progress page: everything Anas is making right now (site.json `studio`), one large row per piece,
// with its status, a short line, an optional longer note, optional extra images and an optional link.
import { shell, $, $$, esc, pad } from "/js/shell2.js";

const { site, reveal } = await shell({ current: "progress" });
const E = "cubic-bezier(.16,1,.3,1)";
const STATUS = { "in-production": ["In production", true], "coming-soon": ["Coming soon", false], idea: ["Idea", false] };
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ig = $("[data-ig]");
if (site.contact?.instagram) ig.href = site.contact.instagram; else ig.remove();

$("[data-progress]").innerHTML = (site.studio || []).map((s, i) => {
  const [label, live] = STATUS[s.status] || ["In progress", true];
  return `<article class="ip-item" id="${slug(s.title)}">
    <div class="ip-item__media" data-reveal>
      ${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.title)}" loading="${i ? "lazy" : "eager"}">` : ""}
      <span class="sc__status${live ? " live" : ""}"><i></i>${label}</span>
    </div>
    <div class="ip-item__body">
      <span class="ip-item__n" data-reveal>${pad(i + 1)}</span>
      <h2 class="up" data-reveal>${esc(s.title)}</h2>
      <p class="ip-item__text" data-reveal>${esc(s.text || "")}</p>
      ${s.details ? `<p class="ip-item__details" data-reveal>${esc(s.details)}</p>` : ""}
      ${(s.gallery || []).length ? `<div class="ip-item__gallery" data-reveal>${s.gallery.map((g) => `<img src="${esc(g)}" alt="" loading="lazy">`).join("")}</div>` : ""}
      ${s.link ? `<a class="arrow" href="${esc(s.link)}" data-reveal>Follow it</a>` : ""}
    </div>
  </article>`;
}).join("") || `<p class="pr-empty">Nothing to show right now. Check back soon.</p>`;

$$(".ph__title .w").forEach((w, i) => w.animate([{ transform: "translateY(110%) rotate(3deg)" }, { transform: "none" }], { duration: 1300, delay: 150 + i * 140, easing: E, fill: "backwards" }));
document.documentElement.classList.remove("intro");
reveal();

// the pictures drift a little inside their frames as you scroll
const imgs = $$(".ip-item__media img");
(function loop() {
  requestAnimationFrame(loop);
  imgs.forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    img.style.transform = `translateY(${k * -6}%) scale(1.1)`;
  });
})();
