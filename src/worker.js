// Cloudflare Worker in front of the static site.
// - /work/<slug>   serves project.html with that project's title, description and cover in the page head,
//                  so shared links show the right preview (404 for unknown or draft projects)
// - /journal/<slug> serves journal-post.html with that entry's head (404 for unknown entries)
// - /sitemap.xml   built from projects.json and blog.json, so new pages are listed without touching code
// - /api/contact   receives the contact form, stores it (KV), adds it to the Notion database "Project requests"
//                  (NOTION_TOKEN secret + NOTION_DB) and emails it (send_email binding)
// Everything else falls through to the static assets in ./public.
import { EmailMessage } from "cloudflare:email";

const SITE = "https://anassaleh.me";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const attr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function content(env, url, name) {
  const res = await env.ASSETS.fetch(new Request(new URL(`/content/${name}.json`, url)));
  return res.ok ? res.json() : null;
}

async function projects(env, url) {
  const res = await env.ASSETS.fetch(new Request(new URL("/content/projects.json", url)));
  return res.ok ? (await res.json()).filter((p) => !p.draft) : [];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return handleContact(request, env, ctx);
    }

    if (url.pathname === "/sitemap.xml") {
      const [list, site, blog] = await Promise.all([projects(env, url), content(env, url, "site"), content(env, url, "blog")]);
      const journal = site?.journal?.show ? ["/journal", ...(blog || []).filter((p) => !p.draft).map((p) => `/journal/${p.slug}`)] : [];
      const pages = ["/", "/work", "/about", ...(site?.studio?.length ? ["/in-progress"] : []), "/contact", ...journal, ...list.map((p) => `/work/${p.slug}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}\n</urlset>\n`;
      return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }

    const m = url.pathname.match(/^\/work\/([a-z0-9-]+)\/?$/);
    if (m) {
      const [res, list] = await Promise.all([env.ASSETS.fetch(new Request(new URL("/project", url), request)), projects(env, url)]);
      const p = list.find((x) => x.slug === m[1]);
      const out = new Response(res.body, { status: p ? res.status : 404, headers: res.headers });
      if (!p) return out;
      const title = `${p.title}, Anas Saleh`;
      const desc = `${p.subtitle}. ${p.description || ""}`.slice(0, 160);
      // share previews: a JPG copy where there is one (some apps don't show WebP), else the CMS cover
      const c = p.cover || `/images/covers/${p.slug}.webp`;
      const image = SITE + (c.startsWith("/images/covers/") ? c.replace("/images/covers/", "/images/covers/og/").replace(/\.webp$/, ".jpg") : c);
      const set = (content) => ({ element: (el) => el.setAttribute("content", content) });
      return new HTMLRewriter()
        .on("title", { element: (el) => el.setInnerContent(title) })
        .on('meta[name="description"]', set(desc))
        .on('meta[property="og:image"]', set(image))
        .on("head", { element: (el) => el.append(`<link rel="preload" as="image" href="${attr(c)}" fetchpriority="high"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}/work/${p.slug}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${SITE}/work/${p.slug}">`, { html: true }) })
        .transform(out);
    }

    const j = url.pathname.match(/^\/journal\/([a-z0-9-]+)\/?$/);
    if (j) {
      const [res, blog] = await Promise.all([env.ASSETS.fetch(new Request(new URL("/journal-post", url), request)), content(env, url, "blog")]);
      const p = (blog || []).find((x) => x.slug === j[1]);
      const out = new Response(res.body, { status: p ? res.status : 404, headers: res.headers });
      if (!p) return out;
      const title = `${p.title}, Anas Saleh`;
      const desc = (p.excerpt || "").slice(0, 160);
      const set = (value) => ({ element: (el) => el.setAttribute("content", value) });
      return new HTMLRewriter()
        .on("title", { element: (el) => el.setInnerContent(title) })
        .on('meta[name="description"]', set(desc || "A journal entry by Anas Al Shikh Saleh."))
        .on('meta[property="og:image"]', set(p.cover ? SITE + p.cover : `${SITE}/images/og-v2.jpg`))
        .on("head", { element: (el) => el.append(`${p.cover ? `<link rel="preload" as="image" href="${attr(p.cover)}" fetchpriority="high">` : ""}<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}/journal/${p.slug}"><meta name="twitter:card" content="summary_large_image">`, { html: true }) })
        .transform(out);
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
  if (env.NOTION_TOKEN && env.NOTION_DB) {
    try {
      await addToNotion(env, entry);
      stored = true;
    } catch (err) {
      console.error("notion failed", err);
    }
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

// One row in Notion's "Project requests" database (Work > Website), with the brief also written into the page.
async function addToNotion(env, e) {
  const text = (s) => {
    const parts = [];
    for (let i = 0; i < String(s).length; i += 1900) parts.push({ text: { content: String(s).slice(i, i + 1900) } });
    return parts.slice(0, 50);
  };
  const option = (s) => s.replace(/,/g, " ").slice(0, 100);
  const props = {
    Name: { title: text(e.name || "No name") },
    Status: { status: { name: "New" } },
    Services: { multi_select: e.services.map((s) => ({ name: option(s) })) },
    Company: { rich_text: text(e.company) },
    Email: { email: e.email || null },
    Phone: { phone_number: e.phone || null },
    Budget: { rich_text: text(e.budget) },
    Brief: { rich_text: text(e.brief) },
    Links: { rich_text: text(e.links) },
    Country: { rich_text: text(e.country) },
    Received: { date: { start: e.receivedAt } },
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) props.Deadline = { date: { start: e.date } };
  if (e.source) props["Found me via"] = { select: { name: option(e.source) } };
  if (/^https?:\/\//.test(e.page)) props["From page"] = { url: e.page };
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { authorization: `Bearer ${env.NOTION_TOKEN}`, "notion-version": "2022-06-28", "content-type": "application/json" },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DB },
      properties: props,
      children: [
        { object: "block", type: "heading_3", heading_3: { rich_text: text("Brief") } },
        ...e.brief.split(/\n{2,}/).filter(Boolean).slice(0, 40).map((p) => ({ object: "block", type: "paragraph", paragraph: { rich_text: text(p) } })),
      ],
    }),
  });
  if (!res.ok) throw new Error(`notion ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
