// In Production page (stage 5): the short film, its current stage, the story and a production diary.
// Hidden until "Show this page" is ticked in Pages CMS; add ?preview to the address to see it anyway.
import { shell, $, $$, esc } from "/js/shell2.js";

const { site, reveal } = await shell();
const f = site.inProduction || {};
const main = $("[data-production]");
const E = "cubic-bezier(.16,1,.3,1)";
const STAGES = [["development", "Development"], ["pre-production", "Pre-production"], ["production", "Production"], ["post-production", "Post-production"], ["release", "Release"]];
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const preview = new URLSearchParams(location.search).has("preview");

if (!f.show && !preview) {
  main.innerHTML = `<header class="ph wrap"><span class="label">In production</span><h1 class="ph__title up">Coming <span class="acc">soon</span></h1>
    <div class="ph__foot"><p>This page isn't open yet.</p><a class="btn btn--ink" href="/">Back home ${ARROW}</a></div></header>`;
  document.documentElement.classList.remove("intro");
} else render();

function render() {
  if (f.show) $("[data-robots]")?.remove();
  document.title = `${f.title || "Short film"}, in production, Anas Saleh`;
  const current = Math.max(0, STAGES.findIndex(([k]) => k === f.stage));
  const diary = [...(f.diary || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const words = (f.title || "Untitled short film").split(/\s+/);

  main.innerHTML = `
  <section class="pr-hero dark" data-dark>
    ${f.poster ? `<img class="pr-hero__bg" src="${esc(f.poster)}" alt="" fetchpriority="high">` : ""}
    <div class="pr-hero__shade"></div>
    <div class="pr-rec" aria-hidden="true"><i></i>REC <span data-tc>00:00:00:00</span></div>
    <div class="wrap pr-hero__in">
      <span class="label" data-intro>In production</span>
      <h1 class="pr-title up">${words.map((w, i) => `<span class="ln"><span class="w${i === words.length - 1 ? " acc" : ""}">${esc(w)}</span></span>`).join(" ")}</h1>
      <p class="pr-log" data-intro>${esc(f.logline || "")}</p>
    </div>
  </section>

  <section class="pr-stages wrap" aria-labelledby="st-title">
    <span class="label" id="st-title" data-reveal>Where it is now</span>
    <ol class="pr-track" style="--done:${current / (STAGES.length - 1)}" data-reveal>
      ${STAGES.map(([, label], i) => `<li class="${i < current ? "done" : i === current ? "now" : ""}"${i === current ? ' aria-current="step"' : ""}><i></i><span>${label}</span></li>`).join("")}
    </ol>
  </section>

  <section class="pr-about wrap" aria-labelledby="pa-title">
    <span class="label" id="pa-title" data-reveal>About the film</span>
    <p class="pj-lead" data-reveal>${esc(f.about || "")}</p>
  </section>

  <section class="pr-diary wrap" aria-labelledby="pd-title">
    <div class="ab-head"><span class="label" data-reveal>Diary</span><h2 class="up" id="pd-title" data-reveal>Production <span class="acc">diary</span></h2></div>
    ${diary.length ? `<ol class="pr-diary__list">${diary.map((d) => `<li data-reveal>
        <time datetime="${esc(d.date)}">${esc(fmt(d.date))}</time>
        <div><h3 class="up">${esc(d.title)}</h3><p>${esc(d.text || "")}</p>${d.image ? `<img src="${esc(d.image)}" alt="${esc(d.title)}" loading="lazy">` : ""}</div>
      </li>`).join("")}</ol>` : `<p class="pr-empty" data-reveal>The first entry is coming soon.</p>`}
  </section>

  <section class="cta-band dark" data-dark aria-labelledby="pf-title">
    <div class="wrap">
      <span class="label" data-reveal>Follow the film</span>
      <h2 class="up" id="pf-title" data-reveal>Want to be <span class="acc">part of it?</span></h2>
      <div class="contact__actions" data-reveal>
        <a class="btn btn--accent" href="/contact">Get in touch ${ARROW}</a>
        ${site.contact?.instagram ? `<a class="btn btn--line" href="${esc(site.contact.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
      </div>
    </div>
  </section>`;

  $$(".pr-title .w").forEach((w, i) => w.animate([{ transform: "translateY(110%) rotate(4deg)" }, { transform: "none" }], { duration: 1300, delay: 250 + i * 130, easing: E, fill: "backwards" }));
  $$("[data-intro]").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(20px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1100, delay: 650 + i * 160, easing: E, fill: "backwards" }));
  document.documentElement.classList.remove("intro");
  reveal();

  // a running timecode in the corner, like a camera that's recording
  const tc = $("[data-tc]"), t0 = performance.now();
  const p2 = (n) => String(n).padStart(2, "0");
  (function tick() {
    requestAnimationFrame(tick);
    const ms = performance.now() - t0, s = Math.floor(ms / 1000);
    tc.textContent = `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}:${p2(Math.floor((ms % 1000) / 41.67))}`;
  })();
}

function fmt(d) {
  const t = new Date(d);
  return isNaN(t) ? d : t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
