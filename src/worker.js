// Cloudflare Worker in front of the static site.
// - /work/<slug>   serves project.html (the page reads the slug from the URL)
// - /api/contact   receives the contact form, stores it (KV) and emails it (send_email binding)
// Everything else falls through to the static assets in ./public.
import { EmailMessage } from "cloudflare:email";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return handleContact(request, env, ctx);
    }

    const m = url.pathname.match(/^\/work\/([a-z0-9-]+)\/?$/);
    if (m) {
      const res = await env.ASSETS.fetch(new Request(new URL("/project", url), request));
      return new Response(res.body, { status: res.status, headers: res.headers });
    }

    return env.ASSETS.fetch(request);
  },
};

const clean = (v, max = 500) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

async function handleContact(request, env, ctx) {
  const origin = request.headers.get("origin");
  if (origin && !/^https:\/\/(www\.)?anassaleh\.me$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|\.workers\.dev$/.test(origin)) {
    return json({ ok: false, error: "origin" }, 403);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }
  // Honeypot: bots fill the hidden field. Pretend it worked.
  if (clean(body.website)) return json({ ok: true });

  const entry = {
    name: clean(body.name, 120),
    company: clean(body.company, 120),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    services: (Array.isArray(body.services) ? body.services : []).map((s) => clean(s, 60)).filter(Boolean).slice(0, 10),
    brief: clean(body.brief, 5000),
    budget: clean(body.budget, 80),
    date: clean(body.date, 20),
    source: clean(body.source, 80),
    links: clean(body.links, 500),
    consent: body.consent === true,
    page: clean(body.page, 300),
    receivedAt: new Date().toISOString(),
    country: request.cf?.country || "",
  };
  const missing = [];
  if (!entry.name) missing.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) missing.push("email");
  if (entry.phone.replace(/\D/g, "").length < 7) missing.push("phone");
  if (!entry.services.length) missing.push("services");
  if (entry.brief.length < 20) missing.push("brief");
  if (!entry.consent) missing.push("consent");
  if (missing.length) return json({ ok: false, error: "missing", fields: missing }, 422);

  let stored = false;
  let mailed = false;
  if (env.SUBMISSIONS) {
    const key = `${entry.receivedAt}_${crypto.randomUUID().slice(0, 8)}`;
    await env.SUBMISSIONS.put(key, JSON.stringify(entry), { metadata: { name: entry.name, email: entry.email, services: entry.services.join(", ") } });
    stored = true;
  }
  if (env.MAILER && env.MAIL_FROM && env.MAIL_TO) {
    try {
      await sendMail(env, entry);
      mailed = true;
    } catch (err) {
      console.error("mail failed", err);
    }
  }
  if (!stored && !mailed) return json({ ok: false, error: "unavailable" }, 503);
  return json({ ok: true });
}

function encodeHeader(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;
}

async function sendMail(env, e) {
  const lines = [
    "New project request from anassaleh.me",
    "",
    `Name: ${e.name}`,
    e.company ? `Company: ${e.company}` : null,
    `Email: ${e.email}`,
    `Phone / WhatsApp: ${e.phone}`,
    `Services: ${e.services.join(", ")}`,
    e.budget ? `Budget: ${e.budget}` : null,
    e.date ? `Deadline / date: ${e.date}` : null,
    e.source ? `Found me via: ${e.source}` : null,
    e.links ? `Links: ${e.links}` : null,
    "",
    "Brief:",
    e.brief,
    "",
    `Received: ${e.receivedAt}${e.country ? ` (${e.country})` : ""}`,
    `Reply to this email to answer ${e.name} directly.`,
  ];
  const text = lines.filter((l) => l !== null).join("\r\n");
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/.{76}/g, "$&\r\n");
  const raw = [
    `From: anassaleh.me <${env.MAIL_FROM}>`,
    `To: ${env.MAIL_TO}`,
    `Reply-To: ${encodeHeader(e.name.replace(/[<>"\r\n]/g, ""))} <${e.email.replace(/[<>\r\n\s]/g, "")}>`,
    `Subject: ${encodeHeader(`New request: ${e.services.join(", ")} from ${e.name}`.replace(/[\r\n]/g, " "))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@anassaleh.me>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    b64,
  ].join("\r\n");
  await env.MAILER.send(new EmailMessage(env.MAIL_FROM, env.MAIL_TO, raw));
}
