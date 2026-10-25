// About page (stage 4): role title rising in beside the depth portrait, a story whose words light up while you read,
// experience, tools and the CV. Content comes from site.json (about).
import { shell, $, $$, esc, lerp, clamp } from "/js/shell2.js";
import { mountHero } from "/js/hero2.js";
import { toolIcon } from "/js/tool-icons.js";

const { site, reveal } = await shell({ current: "about" });
const a = site.about || {};
const E = "cubic-bezier(.16,1,.3,1)";

if (a.cv) $("[data-cv]").href = a.cv;

// portrait: the same depth portrait as the home page, turning toward the pointer
const stage = $("[data-ab-stage]");
mountHero(stage, { image: a.portrait || site.home?.heroImage || "/images/portrait-v2.webp", depth: site.home?.heroDepth || "/images/portrait-v2-depth.png", alt: `Portrait of ${site.fullName}`, mode: 0, reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, fit: [0.07, 0.1, 0.86, 0.9] })
  .then(() => stage.animate([{ opacity: 0, transform: "scale(1.2)", filter: "blur(18px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1800, delay: 200, easing: E, fill: "backwards" }));

// (the title and intro lines animate from a small script in the page itself, so they don't wait for content)

// story: every word is its own span so it can brighten as the paragraph moves up the screen
const story = $("[data-story]");
story.innerHTML = (a.bio || []).map((para) => `<p>${para.split(/\s+/).map((w) => `<span>${esc(w)}</span>`).join(" ")}</p>`).join("");
const words = $$("span", story);

// experience
$("[data-exp]").innerHTML = (a.experience || []).map((x) => `<li data-reveal>
  <span class="ab-exp__period">${esc(x.period)}</span>
  <span class="ab-exp__role up">${esc(x.role)}</span>
  <span class="ab-exp__co">${esc(x.company)}</span>
  <span class="ab-exp__note">${esc(x.note || "")}</span>
</li>`).join("");

// tools: each tile shows the app's mark in white with its name under it, and tilts toward the pointer
$("[data-tools]").innerHTML = (a.tools || []).map((t) => `<li data-reveal><span class="ab-tool__i">${toolIcon(t)}</span><span class="ab-tool__t">${esc(t)}</span></li>`).join("");
$$(".ab-tools__list li").forEach((li) => {
  li.addEventListener("pointermove", (e) => {
    const r = li.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    li.style.transform = `perspective(600px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateY(-4px)`;
  });
  li.addEventListener("pointerleave", () => (li.style.transform = ""));
});
reveal();

// one loop: story words brighten with the scroll
let lit = -1;
(function loop() {
  requestAnimationFrame(loop);
  const r = story.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  // the reading line sits at 72% of the screen; words above it are lit
  const p = clamp((innerHeight * 0.72 - r.top) / (r.height + innerHeight * 0.1), 0, 1);
  const n = Math.round(lerp(0, words.length, p));
  if (n === lit) return;
  words.forEach((w, i) => w.classList.toggle("on", i < n));
  lit = n;
})();
