import { esc, icons } from "/js/site.js";

export default async function contact({ site }) {
  const cp = site.contactPage || {};
  const c = site.contact || {};
  document.querySelector("[data-c-headline]").textContent = cp.headline || "Let's make something.";
  document.querySelector("[data-c-intro]").textContent = cp.intro || "";
  document.querySelector("[data-c-reply]").textContent = cp.replyNote || "";

  const waNumber = (c.whatsapp || "").replace(/\D/g, "");
  document.querySelector("[data-direct]").innerHTML = `
    <div class="direct__card" data-reveal>
      <span class="eyebrow">Email</span>
      <div class="direct__row">
        <a class="link" href="mailto:${esc(c.email)}" style="font-size:var(--step-1);font-weight:700;word-break:break-all">${esc(c.email)}</a>
        <button class="copy-btn" type="button" data-copy="${esc(c.email)}">Copy</button>
      </div>
    </div>
    ${c.whatsapp ? `<a class="direct__card" href="${esc(c.whatsapp)}" target="_blank" rel="noopener" data-reveal="1">
      <span class="eyebrow">WhatsApp</span>
      <div class="direct__row"><span class="display">Chat now</span><span style="width:28px;height:28px;display:inline-flex">${icons.whatsapp}</span></div>
      ${waNumber ? `<span class="sr-only">+${waNumber}</span>` : ""}
    </a>` : ""}`;

  const services = site.services || [];
  const want = (new URLSearchParams(location.search).get("service") || "").toLowerCase();
  document.querySelector("[data-services]").innerHTML = services.map((s, i) => `<label class="choice">
      <input type="checkbox" name="services" value="${esc(s)}"${s.toLowerCase() === want ? " checked" : ""}${i === 0 ? ' id="f-services"' : ""}>
      <span>${esc(s)}</span>
    </label>`).join("");
  const opts = (list, placeholder) => `<option value="">${placeholder}</option>` + (list || []).map((v) => `<option>${esc(v)}</option>`).join("");
  document.querySelector("[data-budgets]").innerHTML = opts(cp.budgets, "Select a range");
  document.querySelector("[data-sources]").innerHTML = opts(cp.sources, "Select one");

  const form = document.querySelector("[data-form]");
  const status = form.querySelector(".form__status");
  const submit = form.querySelector('button[type="submit"]');

  const setError = (input, msg) => {
    const field = input.closest(".field");
    field.classList.toggle("has-error", Boolean(msg));
    const err = field.querySelector(".error");
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
    const picked = form.querySelectorAll('input[name="services"]:checked').length;
    const sErr = document.querySelector("[data-services-error]");
    sErr.textContent = picked ? "" : "Pick at least one service.";
    if (!picked && !first) first = form.querySelector('input[name="services"]');
    return first;
  };

  form.addEventListener("input", (e) => {
    if (e.target.closest(".field.has-error")) setError(e.target, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad) { bad.focus(); status.textContent = "Please check the highlighted fields."; status.classList.add("is-error"); return; }
    const data = Object.fromEntries(new FormData(form));
    data.services = [...form.querySelectorAll('input[name="services"]:checked')].map((i) => i.value);
    data.consent = true;
    data.page = location.href;
    submit.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "Sending...";
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "failed");
      document.querySelector("[data-form-wrap]").innerHTML = `<div class="form-done" tabindex="-1">
          <h2 class="display">Thank you, ${esc(data.name.split(" ")[0])}.</h2>
          <p class="lead">Your request is in. ${esc(cp.replyNote || "I'll reply soon.")}</p>
          <p class="muted">Need me sooner? <a class="link" href="${esc(c.whatsapp)}" target="_blank" rel="noopener">Message me on WhatsApp</a>.</p>
        </div>`;
      document.querySelector(".form-done").focus();
    } catch {
      submit.disabled = false;
      status.classList.add("is-error");
      status.innerHTML = `Something went wrong. Please email me at <a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a>.`;
    }
  });
}
