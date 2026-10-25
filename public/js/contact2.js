// Contact page (stage 4): email, WhatsApp and socials up front, then the project form (posts to /api/contact).
import { shell, $, $$, esc } from "/js/shell2.js";
import { mountMailMenu } from "/js/mailto.js";

const { site, reveal } = await shell({ current: "contact" });
const cp = site.contactPage || {};
const c = site.contact || {};
const E = "cubic-bezier(.16,1,.3,1)";

if (cp.intro) $("[data-c-intro]").textContent = cp.intro;
$("[data-c-reply]").textContent = cp.replyNote || "";


/* ---------- direct ---------- */
$("[data-mail]").href = `mailto:${c.email}`;
$("[data-mail]").textContent = c.email;
mountMailMenu($("[data-mailto]"), c.email);
$("[data-copy]").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(c.email); b.textContent = "Copied"; } catch { b.textContent = "Ctrl+C"; }
  setTimeout(() => (b.textContent = "Copy"), 1600);
});
const wa = $("[data-wa]");
if (c.whatsapp) wa.href = c.whatsapp; else wa.remove();
$("[data-socials]").innerHTML = [["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin]]
  .filter(([, u]) => u).map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener"><span>${n}</span><i aria-hidden="true">&#8599;</i></a></li>`).join("");

/* ---------- form ---------- */
const want = (new URLSearchParams(location.search).get("service") || "").toLowerCase();
$("[data-services]").innerHTML = (site.services || []).map((s, i) => `<label class="ff__choice">
    <input type="checkbox" name="services" value="${esc(s)}"${s.toLowerCase() === want ? " checked" : ""}${i === 0 ? ' id="f-services"' : ""}>
    <span>${esc(s)}</span>
  </label>`).join("");
const opts = (list, placeholder) => `<option value="">${placeholder}</option>` + (list || []).map((v) => `<option>${esc(v)}</option>`).join("");
$("[data-budgets]").innerHTML = opts(cp.budgets, "Select a range");
$("[data-sources]").innerHTML = opts(cp.sources, "Select one");
reveal();

const form = $("[data-form]");
const status = $(".ff__status", form);
const submit = $('button[type="submit"]', form);
const setError = (input, msg) => {
  const field = input.closest(".field");
  field.classList.toggle("has-error", Boolean(msg));
  const err = $(".error", field);
  if (err) err.textContent = msg || "";
  input.setAttribute("aria-invalid", msg ? "true" : "false");
};
const validate = () => {
  let first = null;
  const fail = (el, msg) => { setError(el, msg); if (msg && !first) first = el; };
  const v = (n) => form.elements[n].value.trim();
  fail(form.elements.name, v("name") ? "" : "Please add your name.");
  fail(form.elements.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email")) ? "" : "Please add a valid email.");
  fail(form.elements.phone, v("phone").replace(/\D/g, "").length >= 7 ? "" : "Please add a phone number with the country code.");
  fail(form.elements.brief, v("brief").length >= 20 ? "" : "A few more words, please. What are we making?");
  fail(form.elements.consent, form.elements.consent.checked ? "" : "Please tick this box so I can reply.");
  const picked = $$('input[name="services"]:checked', form).length;
  const sErr = $("[data-services-error]");
  sErr.textContent = picked ? "" : "Pick at least one.";
  sErr.closest(".field").classList.toggle("has-error", !picked);
  if (!picked && !first) first = $('input[name="services"]', form);
  return first;
};
form.addEventListener("input", (e) => {
  if (e.target.name === "services") { $("[data-services-error]").textContent = ""; e.target.closest(".field").classList.remove("has-error"); }
  else if (e.target.closest(".field.has-error")) setError(e.target, "");
});
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const bad = validate();
  if (bad) { bad.focus(); status.textContent = "Please check the highlighted fields."; status.classList.add("is-error"); return; }
  const data = Object.fromEntries(new FormData(form));
  data.services = $$('input[name="services"]:checked', form).map((i) => i.value);
  data.consent = true;
  data.page = location.href;
  submit.disabled = true;
  status.classList.remove("is-error");
  status.textContent = "Sending...";
  try {
    const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "failed");
    const wrap = $("[data-form-wrap]");
    wrap.innerHTML = `<div class="ff__done" tabindex="-1">
        <span class="ff__tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
        <h3 class="up">Thank you, <span class="acc">${esc(data.name.split(" ")[0])}</span></h3>
        <p>Your request is in. ${esc(cp.replyNote || "I'll reply soon.")}</p>
        ${c.whatsapp ? `<p class="ff__soon">Need me sooner? <a href="${esc(c.whatsapp)}" target="_blank" rel="noopener">Message me on WhatsApp</a>.</p>` : ""}
      </div>`;
    const done = $(".ff__done");
    done.animate([{ opacity: 0, transform: "translateY(30px)", filter: "blur(10px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 900, easing: E });
    done.focus();
  } catch {
    submit.disabled = false;
    status.classList.add("is-error");
    status.innerHTML = `Something went wrong. Please email me at <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>.`;
  }
});
