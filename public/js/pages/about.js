import { esc } from "/js/site.js";

export default async function about({ site }) {
  const a = site.about || {};
  document.querySelector("[data-about-lead]").textContent = site.home?.intro || "";
  document.querySelector("[data-about-img]").innerHTML = `<img src="${esc(a.portrait)}" alt="Portrait of ${esc(site.fullName)}" fetchpriority="high">`;
  document.querySelector("[data-bio]").innerHTML = (a.bio || []).map((p, i) => `<p data-reveal="${i}">${esc(p)}</p>`).join("");
  document.querySelector("[data-xp]").innerHTML = (a.experience || []).map((x) => `<li data-reveal>
      <span class="muted">${esc(x.period)}</span>
      <span><span class="role">${esc(x.role)}</span>${x.note ? `<span class="note">${esc(x.note)}</span>` : ""}</span>
      <span>${esc(x.company)}</span>
    </li>`).join("");
  document.querySelector("[data-services]").innerHTML = (site.services || []).filter((s) => s !== "Other").map((s) => `<li>${esc(s)}</li>`).join("");
  document.querySelector("[data-tools]").innerHTML = (a.tools || []).map((t) => `<li>${esc(t)}</li>`).join("");
  const cv = document.querySelector("[data-cv]");
  if (a.cv) cv.href = a.cv; else cv.remove();
}
