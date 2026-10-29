"use strict";
const KEY = "cockpit-steffpoint";
const COLORS = ["c1","c2","c3","c4","c5","c6"];
const COLOR_NAMES = { c1: "Turquoise", c2: "Bleu", c3: "Ardoise", c4: "Violet", c5: "Orange", c6: "Vert" };
const ENGINES = {
  bing: ["Bing", "https://www.bing.com/search?q="],
  google: ["Google", "https://www.google.com/search?q="],
  duckduckgo: ["DuckDuckGo", "https://duckduckgo.com/?q="],
  ecosia: ["Ecosia", "https://www.ecosia.org/search?q="]
};
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = s => document.querySelector(s);

const DEFAULT_SETTINGS = {
  name: "", lang: "auto", theme: "auto", layout: "classic", showAll: false, hideDock: false, keys: true, m365admin: false,
  bg: { type: "photo", freq: "hour", blur: 12, bright: 85, veil: 35, color: "#0e7490", url: "", photo: null, at: 0 },
  links: { on: true, style: "glass", cols: "auto", radius: 12, newTab: false, icons: "favicon", max: 8 },
  clock: { on: true, h24: true, seconds: false, size: 100, date: "long" },
  weather: { on: true, city: "Bruxelles", lat: 50.85, lon: 4.35, unit: "c", display: "full" },
  greet: { on: true, custom: "" },
  search: { on: true, engine: "bing" },
  spaces: { auto: true, weekday: "pro", weekend: "perso", hours: false, from: "08:00", to: "18:00", offHours: "perso" },
  env: { def: "prod", remember: true }
};
const DEFAULT_SPACES = () => [{ id: "pro", name: tr("Pro") }, { id: "perso", name: tr("Perso") }];

function defaults() {
  const L = (name, url) => ({ id: uid(), name, url });
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    meta: { lastExport: null, since: Date.now(), snooze: 0, space: "pro", tenant: null },
    spaces: DEFAULT_SPACES(),
    tenants: [],
    blocks: [
      { id: uid(), space: "perso", title: tr("Perso"), color: "c6", view: "grid", collapsed: false, links: [
        L("YouTube", "https://www.youtube.com"), L(tr("Wikipédia"), `https://${lang}.wikipedia.org`),
        L(tr("Actualités"), "https://news.google.com"), L(tr("Musique"), "https://music.youtube.com")] },
      { id: uid(), title: tr("Quotidien"), color: "c4", view: "grid", collapsed: false, links: [
        L(tr("Messagerie"), "https://mail.google.com"), L(tr("Agenda"), "https://calendar.google.com"),
        L(tr("Documents"), "https://drive.google.com"), L(tr("Traduction"), "https://www.deepl.com/translator"),
        L(tr("Cartes"), "https://maps.google.com")] },
      { id: uid(), title: tr("Développement"), color: "c3", view: "list", collapsed: false, links: [
        L("GitHub", "https://github.com"), L("Stack Overflow", "https://stackoverflow.com"),
        L("MDN Web Docs", "https://developer.mozilla.org/fr/"), L("Can I use", "https://caniuse.com"),
        L("Regex101", "https://regex101.com")] },
      { id: uid(), title: tr("Exemple · environnements"), color: "c1", view: "list", collapsed: false, links: [
        { id: uid(), name: "Application", url: "https://app.example.com",
          envs: { dev: "https://dev-app.example.com", test: "https://test-app.example.com" } },
        { id: uid(), name: "Console", url: "https://console.example.com",
          envs: { dev: "https://console-dev.example.com", test: "" } },
        L(tr("Documentation"), "https://docs.example.com")] }
    ]
  };
}

/* ---------- Languages (strings in js/i18n-strings.js) ---------- */
const LANG_IDS = ["fr", "en", "nl"];
const LANGS = [["auto", "Automatique (navigateur)"], ["fr", "Français"], ["en", "English"], ["nl", "Nederlands"]];
// Browser language first; English when the browser speaks none of the three
function pickLang(want = "auto") {
  if (LANG_IDS.includes(want)) return want;
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language || ""]) {
    const base = String(l).slice(0, 2).toLowerCase();
    if (LANG_IDS.includes(base)) return base;
  }
  return "en";
}
let lang = pickLang();
const LOCALE = () => ({ fr: "fr-BE", en: "en-GB", nl: "nl-BE" })[lang];
// tr("Bloc « {name} » supprimé", { name }) — unknown text comes back unchanged, {keys} without a value stay as typed.
// "Annuler|toast": the |context part tells apart one French word with two translations (Cancel / Undo), French drops it
function tr(s, vars) {
  if (typeof s !== "string") return s;
  let out = lang === "fr" ? s.replace(/\|\w+$/, "") : I18N[s]?.[LANG_IDS.indexOf(lang) - 1] ?? s.replace(/\|\w+$/, "");
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
  return out;
}
const plural = (n, one, other, vars) => tr(new Intl.PluralRules(LOCALE()).select(n) === "one" ? one : other, { n, ...vars });
// The page's own markup is French: remember each text and label once, before any render, to translate it again on a language change
const staticText = [];
{
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) if (n.nodeValue.trim() && !n.parentElement.closest("script")) staticText.push([n, n.nodeValue]);
  for (const el of document.body.querySelectorAll("[placeholder],[title],[aria-label]"))
    for (const a of ["placeholder", "title", "aria-label"]) if (el.hasAttribute(a)) staticText.push([el, el.getAttribute(a), a]);
}
function applyLang() {
  lang = pickLang(S().lang);
  document.documentElement.lang = lang;
  for (const [node, src, attr] of staticText) {
    const key = src.trim(), out = src.replace(key, () => tr(key));
    if (attr) node.setAttribute(attr, out); else node.nodeValue = out;
  }
}

/* ---------- Storage ---------- */
let storageOk = true;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch { storageOk = false; }
  try { localStorage.setItem(KEY + "-probe", "1"); localStorage.removeItem(KEY + "-probe"); } catch { storageOk = false; }
  // normalize() also files the example blocks without a space under the first one (Pro)
  return normalize(data) || normalize(defaults());
}
// Keeps only known keys with the expected type, so old or hand-edited files load safely
function merge(base, over) {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    const o = over?.[k];
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = merge(v, o);
    else if (v === null) out[k] = o ?? null;
    else out[k] = typeof o === typeof v ? o : v;
  }
  return out;
}
function migrateSettings(s = {}) {
  // MVP stored these flat; move them into their groups
  const m = structuredClone(s);
  if ("clock24" in s) m.clock = { ...(m.clock || {}), h24: s.clock24 };
  if ("seconds" in s) m.clock = { ...(m.clock || {}), seconds: s.seconds };
  if ("engine" in s) m.search = { ...(m.search || {}), engine: s.engine };
  if ("newTab" in s) m.links = { ...(m.links || {}), newTab: s.newTab };
  if ("icons" in s) m.links = { ...(m.links || {}), icons: s.icons };
  return m;
}
function normalize(d) {
  if (!d || !Array.isArray(d.blocks)) return null;
  let spaces = (Array.isArray(d.spaces) ? d.spaces : []).filter(s => s && s.id).map(s => ({ id: String(s.id), name: String(s.name || tr("Espace")) }));
  if (!spaces.length) spaces = DEFAULT_SPACES();
  const spaceIds = new Set(spaces.map(s => s.id));
  const tenants = (Array.isArray(d.tenants) ? d.tenants : []).filter(t => t && t.slug)
    .map((t, i) => ({ id: String(t.id || uid()), name: String(t.name || t.slug), slug: String(t.slug).trim(), domain: String(t.domain || ""),
      color: COLORS.includes(t.color) ? t.color : COLORS[i % COLORS.length] }));
  const m = d.meta || {};
  const settings = merge(DEFAULT_SETTINGS, migrateSettings(d.settings));
  for (const k of ["from", "to"]) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.spaces[k])) settings.spaces[k] = DEFAULT_SETTINGS.spaces[k];
  // Files from before the Microsoft 365 switch: whoever already has tenants keeps the admin template
  if (d.settings && !("m365admin" in d.settings) && tenants.length) settings.m365admin = true;
  return {
    version: 1,
    settings,
    meta: {
      lastExport: m.lastExport || null, since: +m.since || Date.now(), snooze: +m.snooze || 0,
      onboarded: +m.onboarded || 0,
      space: spaceIds.has(m.space) ? m.space : spaces[0].id,
      tenant: tenants.some(t => t.id === m.tenant) ? m.tenant : tenants[0]?.id || null,
      env: ["dev", "test", "prod"].includes(m.env) ? m.env : null,
      hits: Object.fromEntries(Object.entries(m.hits && typeof m.hits === "object" ? m.hits : {}).filter(([, n]) => +n > 0).map(([id, n]) => [id, +n])),
      last: Object.fromEntries(Object.entries(m.last && typeof m.last === "object" ? m.last : {}).filter(([, t]) => +t > 0).map(([id, t]) => [id, +t])),
      // Usage stats start counting the day this version first ran, so older links are never flagged as unused too early
      statsSince: +m.statsSince || Date.now()
    },
    spaces, tenants,
    blocks: d.blocks.map(b => ({
      id: String(b.id || uid()), space: spaceIds.has(b.space) ? b.space : spaces[0].id,
      // Subscribed blocks follow a published file and stay read-only
      ...(/^https?:\/\//i.test(b.src) ? { src: String(b.src).trim(), srcId: String(b.srcId ?? ""), synced: +b.synced || 0, syncErr: !!b.syncErr } : {}),
      title: String(b.title || tr("Sans titre")), color: COLORS.includes(b.color) ? b.color : "c1",
      view: b.view === "grid" ? "grid" : "list", collapsed: !!b.collapsed,
      // Imported files may come from someone else: drop javascript: and other unsafe schemes
      links: (Array.isArray(b.links) ? b.links : []).filter(l => l && safeScheme(l.url)).map(l => {
        const link = { id: String(l.id || uid()), name: String(l.name || guessName(l.url)), url: String(l.url).trim() };
        const env = v => safeScheme(v) ? String(v).trim() : "";
        const envs = { dev: env(l.envs?.dev), test: env(l.envs?.test) };
        if (envs.dev || envs.test) link.envs = envs;
        if (safeScheme(l.icon) || /^data:image\//.test(l.icon)) link.icon = String(l.icon);
        return link;
      })
    }))
  };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOk = false; }
  $("#storageBanner").hidden = storageOk;
}
const HAD_DATA = (() => { try { return !!localStorage.getItem(KEY); } catch { return true; } })();
let state = load();
// People who already use the page never see the first-run assistant
if (HAD_DATA && !state.meta.onboarded) state.meta.onboarded = state.meta.since;
const S = () => state.settings;
lang = pickLang(S().lang);

/* ---------- Helpers ---------- */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const svg = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
const ICON = {
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  grip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>'
};
// Allow-list, so tricks like "java\tscript:" or a leading space never pass
function safeScheme(u) { return typeof u === "string" && /^(https?|file|mailto|ftp):/i.test(u.trim()); }
function normalizeUrl(raw) {
  let s = String(raw || "").trim();
  if (!s || /\s/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  try { const u = new URL(s); return /^(https?|file|mailto|ftp):$/.test(u.protocol) ? u.href : null; } catch { return null; }
}
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// Intranet names never go to Google's favicon service: single-label hosts, internal suffixes, private and loopback addresses
const isPrivateHost = host => !host.includes(".") || host === "localhost" ||
  /\.(local|localdomain|lan|internal|intranet|corp|home|private|test|invalid)$/i.test(host) ||
  /^(10|127)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^\[?(::1|f[cd][0-9a-f]{0,2}:|fe80:)/i.test(host);
function guessName(url) {
  const host = hostOf(url);
  if (!host) return url;
  const parts = host.split(".");
  const core = parts.length > 2 && parts[0].length > 3 ? parts[0] : parts[parts.length - 2] || parts[0];
  return core.charAt(0).toUpperCase() + core.slice(1);
}
const initials = n => (n.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();
const findBlock = id => state.blocks.find(b => b.id === id);
function findLink(id) {
  for (const b of state.blocks) { const i = b.links.findIndex(l => l.id === id); if (i > -1) return { block: b, index: i, link: b.links[i] }; }
  return null;
}
const looksUrl = s => /^(https?:\/\/|www\.)\S+$/i.test(s.trim()) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s.trim());

/* ---------- Tenants: {tenant} / {domain} link templates ---------- */
const TPL = /\{(tenant|domain)\}/;
const fillTpl = (url, slug, domain) => url.replaceAll("{tenant}", slug).replaceAll("{domain}", domain || slug);
const usesTpl = l => TPL.test(l.url) || TPL.test(l.envs?.dev || "") || TPL.test(l.envs?.test || "");
const tenantsInUse = () => state.blocks.some(b => b.space === currentSpace && b.links.some(usesTpl));
const tenantsAnywhere = () => state.tenants.length > 0 || state.blocks.some(b => b.links.some(usesTpl));
const currentTenant = () => state.tenants.find(t => t.id === state.meta.tenant) || state.tenants[0] || null;
// Returns the real address, or null when the link needs a tenant and none exists
function resolveUrl(url) {
  if (!TPL.test(url)) return url;
  const t = currentTenant();
  return t ? fillTpl(url, t.slug, t.domain) : null;
}
function normalizeLinkUrl(raw) {
  const s = String(raw || "").trim();
  if (!TPL.test(s)) return normalizeUrl(s);
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
  return normalizeUrl(fillTpl(withScheme, "tenant", "")) ? withScheme : null;
}
function cycleTenant() {
  if (!tenantsInUse() || state.tenants.length < 2) return;
  const i = state.tenants.indexOf(currentTenant());
  state.meta.tenant = state.tenants[(i + 1) % state.tenants.length].id;
  save(); render();
  toast(tr("Tenant : {name}", { name: currentTenant().name }));
}

/* ---------- Environments: optional DEV / TEST address per link, main address = PROD ---------- */
const ENVS = [["dev", "DEV"], ["test", "TEST"], ["prod", "PROD"]];
let activeEnv = S().env.remember && state.meta.env ? state.meta.env : S().env.def;
const hasEnvLinks = () => state.blocks.some(b => b.links.some(l => l.envs));
// Address for the active environment, falling back to the main one
const envUrl = (l, env = activeEnv) => (env !== "prod" && l.envs?.[env]) || l.url;
const usesEnvUrl = l => activeEnv !== "prod" && !!l.envs?.[activeEnv];
// The palette can open a link for another tenant or environment without changing the page's context
function hrefFor(l, env = activeEnv, t = currentTenant()) {
  const raw = envUrl(l, env);
  const u = TPL.test(raw) ? (t ? fillTpl(raw, t.slug, t.domain) : null) : raw;
  return safeScheme(u) ? u.trim() : null;
}
const linkHref = l => hrefFor(l);
function setEnv(env) {
  activeEnv = env; state.meta.env = env;
  save(); render();
}

/* ---------- Spaces ---------- */
const isWeekend = () => [0, 6].includes(new Date().getDay());
const minutesOf = hhmm => { const [hr, mn] = String(hhmm).split(":").map(Number); return hr * 60 + (mn || 0); };
// Weekdays inside the working hours (or always, without the hours rule); the window may cross midnight
function inWorkHours(d = new Date()) {
  const s = S().spaces;
  if (!s.hours) return true;
  const now = d.getHours() * 60 + d.getMinutes(), from = minutesOf(s.from), to = minutesOf(s.to);
  return from <= to ? now >= from && now < to : now >= from || now < to;
}
// The space the automatic rules want right now, or null when they're off
function autoSpace() {
  const s = S().spaces;
  if (!s.auto) return null;
  const want = isWeekend() ? s.weekend : inWorkHours() ? s.weekday : s.offHours;
  return state.spaces.some(x => x.id === want) ? want : null;
}
function pickSpace() {
  const ids = state.spaces.map(x => x.id);
  return autoSpace() || (ids.includes(state.meta.space) ? state.meta.space : ids[0]);
}
let currentSpace = pickSpace();
const spaceName = id => state.spaces.find(s => s.id === id)?.name || "";
function setSpace(id) {
  currentSpace = id; state.meta.space = id;
  save(); expanded.clear(); render();
}

/* ---------- Undo + toast ---------- */
let toastTimer;
function commit(mutate, message) {
  const before = JSON.stringify(state);
  mutate();
  save(); render();
  if (message) toast(message, () => {
    state = JSON.parse(before);
    save(); applySettings(); render();
    if (panel.classList.contains("open")) buildPanel();
    toast(tr("Modification annulée"));
  });
}
function toast(msg, undo) {
  $("#toastMsg").textContent = msg;
  const btn = $("#toastUndo");
  btn.hidden = !undo;
  btn.textContent = tr("Annuler|toast");
  btn.onclick = () => { $("#toast").hidden = true; undo && undo(); };
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 7000 : 2500);
}
// The toast stays while the pointer or focus is on it, so "Annuler" never vanishes mid-read
function hideToast() {
  const el = $("#toast");
  if (el.matches(":hover, :focus-within")) { toastTimer = setTimeout(hideToast, 1500); return; }
  el.hidden = true;
}

/* ---------- Favorites render ---------- */
let editing = false, term = "", sel = 0, hits = [];
const expanded = new Set(); // blocks opened with "Afficher plus" during this visit
function iconFor(link, color, href) {
  const box = h("span", { class: "ico", style: `background:var(--${color})` }, initials(link.name));
  const host = href ? hostOf(href) : "";
  // Custom icon first, then the site's own favicon (reachable on intranets), then Google for public sites only
  const srcs = link.icon ? [link.icon] : [];
  const google = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  if (S().links.icons === "favicon" && host) {
    if (/^https?:/.test(href)) srcs.push(new URL(href).origin + "/favicon.ico");
    if (!isPrivateHost(host)) srcs.push(google);
  }
  const next = () => {
    const src = srcs.shift();
    if (!src) return;
    // No loading="lazy": Chrome never loads a lazy image that isn't in the page yet
    const img = h("img", { alt: "", referrerpolicy: "no-referrer", src });
    // Google answers unknown domains with a 16 px globe: keep the initials instead
    img.onload = () => { if (img.naturalWidth > (src === google ? 16 : 1)) { box.textContent = ""; box.append(img); box.classList.add("img"); } else next(); };
    img.onerror = next;
  };
  next();
  return box;
}
function render() {
  const root = $("#blocks");
  root.replaceChildren();
  const t = term.toLowerCase();
  const newTab = S().links.newTab;
  hits = [];
  if (!state.spaces.some(s => s.id === currentSpace)) currentSpace = pickSpace();
  // Search looks through every space
  const visible = t ? state.blocks : state.blocks.filter(b => b.space === currentSpace);
  for (const b of visible) {
    const ro = !!b.src;
    // Lanceur shows every block as a row of tiles
    const list = h("ul", { class: "links" + (b.view === "grid" || S().layout === "lanceur" ? " grid" : ""), "data-block": b.id });
    let blockHit = false;
    // Search and edit mode always show every link
    const max = S().links.max;
    const capped = !t && !editing && max > 0 && b.links.length > max;
    const shown = capped && !expanded.has(b.id) ? b.links.slice(0, max) : b.links;
    // When every link shares one host, show it once in the header instead of on each line
    const hosts = new Set(b.links.map(l => hostOf(linkHref(l) || "")));
    const commonHost = b.links.length > 1 && hosts.size === 1 ? [...hosts][0] : "";
    for (const l of shown) {
      const match = !!t && (l.name.toLowerCase().includes(t) || envUrl(l).toLowerCase().includes(t));
      const href = linkHref(l);
      const envTag = usesEnvUrl(l) ? h("span", { class: "env-tag", "data-env": activeEnv }, activeEnv.toUpperCase()) : null;
      const a = h("a", {
        class: "lk" + (match ? " hit" : "") + (href ? "" : " tpl-missing"), href: href || "#", "data-link": l.id,
        title: href || tr("Ajoute un tenant pour ouvrir ce lien"),
        target: newTab && href ? "_blank" : null, rel: newTab && href ? "noopener" : null,
        onclick: e => {
          if (editing && ro) { e.preventDefault(); toast(tr("Bloc abonné : ses liens se modifient à la source.")); }
          else if (editing) { e.preventDefault(); openLinkDrawer(b.id, l.id); }
          else if (!href) { e.preventDefault(); openPanelAt("tenants"); }
          else countHit(l.id);
        }
      }, h("span", { class: "grip", "aria-hidden": "true" }, svg(ICON.grip)), iconFor(l, b.color, href), h("span", { class: "nm" }, l.name), envTag,
        commonHost ? null : h("span", { class: "dm" }, href ? hostOf(href) : "{tenant}"));
      if (match) { hits.push(a); blockHit = true; }
      const del = editing && !ro ? h("button", { class: "lk-del", type: "button", title: tr("Supprimer"), "aria-label": tr("Supprimer {name}", { name: l.name }), onclick: () => deleteLink(l.id) }, "✕") : null;
      list.append(h("li", { "data-link": l.id, draggable: editing && !ro ? "true" : null }, a, del));
    }
    if (capped) {
      const open = expanded.has(b.id);
      list.append(h("li", { class: "more-row" }, h("button", {
        class: "more-btn", type: "button", "aria-expanded": String(open),
        onclick: () => { open ? expanded.delete(b.id) : expanded.add(b.id); render(); }
      }, open ? tr("Afficher moins") : tr("Afficher plus ({n})", { n: b.links.length - max }), svg(ICON.chev))));
    }
    if (!b.links.length) list.append(h("li", { class: "empty" }, tr(ro ? "Ce bloc abonné est vide pour l'instant." : "Glisse un lien ici, colle une URL, ou passe en mode édition.")));
    if (!ro) list.append(h("li", { class: "add-row" }, h("button", { class: "dashed-btn", type: "button", onclick: () => openLinkDrawer(b.id) }, tr("+ Ajouter un lien"))));

    const header = h("div", { class: "block-h", draggable: editing ? "true" : null },
      h("span", { class: "grip", "aria-hidden": "true" }, svg(ICON.grip)),
      h("span", { class: "sw", style: `background:var(--${b.color})` }),
      h("h2", {}, b.title),
      ro ? h("span", { class: "sub-badge" + (b.syncErr ? " err" : ""), title: subTitle(b) }, tr(b.syncErr ? "Hors ligne" : "Abonné")) : null,
      commonHost ? h("span", { class: "count host", title: commonHost }, commonHost) : null,
      h("button", { class: "icon-btn chev", type: "button", "aria-label": tr(b.collapsed ? "Déplier {name}" : "Replier {name}", { name: b.title }), "aria-expanded": String(!b.collapsed),
        onclick: () => { b.collapsed = !b.collapsed; save(); render(); } }, svg(ICON.chev)),
      h("button", { class: "icon-btn", type: "button", "aria-label": tr("Options du bloc {name}", { name: b.title }), "aria-haspopup": "menu", onclick: e => openMenu(e.currentTarget, b.id) }, svg(ICON.more))
    );
    root.append(h("section", { class: "block" + (b.collapsed ? " collapsed" : "") + (blockHit ? " has-hit" : ""), "data-block": b.id, "aria-label": b.title }, header, list));
  }
  if (!t && !visible.length) {
    const name = spaceName(currentSpace);
    const auto = currentSpace === autoSpace();
    const others = state.spaces.filter(s => s.id !== currentSpace);
    root.append(h("div", { class: "empty-space" },
      h("p", {}, tr("Aucun bloc dans « {name} » pour l'instant.", { name }),
        auto ? " " + tr(isWeekend() ? "Cet espace s'ouvre automatiquement le week-end." : S().spaces.hours && !inWorkHours() ? "Cet espace s'ouvre automatiquement en dehors des heures de travail." : "Cet espace s'ouvre automatiquement en semaine.") : ""),
      h("div", { class: "acts" },
        h("button", { class: "btn primary", type: "button", onclick: () => openBlockDrawer() }, tr("+ Nouveau bloc")),
        others.length ? h("button", { class: "btn", type: "button", onclick: () => setSpace(others[0].id) }, tr("Voir {name}", { name: others[0].name })) : null)));
  }
  root.append(h("button", { class: "new-block", type: "button", onclick: () => openBlockDrawer() }, tr("+ Nouveau bloc")));
  renderSpacebar();
  renderReminder();
  renderFreq();

  document.body.classList.toggle("searching", !!t);
  document.body.classList.toggle("editing", editing);
  $("#noHit").hidden = !t || hits.length > 0;
  sel = Math.min(sel, Math.max(hits.length - 1, 0));
  hits.forEach((a, i) => a.classList.toggle("sel", i === sel));
  updateHint();
}
function updateHint() {
  const eng = ENGINES[S().search.engine][0];
  $("#engineBtn").textContent = term && hits.length ? tr("Ouvrir") : eng;
  $("#hint").textContent = !term ? "" :
    hits.length ? plural(hits.length, "{n} favori · ↑↓ pour choisir · Entrée ouvre · ⌘ Entrée nouvel onglet · Maj Entrée cherche sur {eng}",
                                      "{n} favoris · ↑↓ pour choisir · Entrée ouvre · ⌘ Entrée nouvel onglet · Maj Entrée cherche sur {eng}", { eng })
                : tr("Entrée cherche « {term} » sur {eng}", { term, eng });
}

const blockCount = id => plural(state.blocks.filter(b => b.space === id).length, "{n} bloc", "{n} blocs");
function renderSpacebar() {
  const bar = $("#spacebar");
  bar.replaceChildren();
  bar.append(state.spaces.length > 1
    ? h("div", { class: "tabs", role: "tablist", "aria-label": tr("Espaces") }, state.spaces.map((sp, i) =>
        h("button", { type: "button", role: "tab", "aria-selected": String(sp.id === currentSpace && !term), title: `${tr("Touche {k}", { k: i + 1 })} · ${blockCount(sp.id)}`, onclick: () => setSpace(sp.id) }, sp.name)))
    : h("span"));
  // One "where do my links point" capsule: tenant picker + environment switch
  const ctx = h("div", { class: "context", "data-env": activeEnv });
  // The tenant picker only shows where it matters: spaces holding {tenant} / {domain} links
  const showTenant = tenantsInUse();
  if (!showTenant) {
    // nothing to pick
  } else if (state.tenants.length) {
    const cur = currentTenant();
    ctx.append(h("select", { id: "tenantSel", class: "pill tenant-pill", style: `--tc:var(--${cur.color})`, title: tr("Tenant (touche T)"), "aria-label": tr("Tenant"),
      onchange: e => { state.meta.tenant = e.target.value; save(); render(); toast(tr("Tenant : {name}", { name: currentTenant().name })); } },
      state.tenants.map(t => h("option", { value: t.id, selected: t.id === cur.id }, t.name))));
  } else {
    ctx.append(h("button", { class: "pbtn", type: "button", onclick: () => openPanelAt("tenants") }, tr("+ Ajouter un tenant")));
  }
  const showEnv = hasEnvLinks();
  if (showEnv) {
    if (ctx.childNodes.length) ctx.append(h("span", { class: "ctx-sep", "aria-hidden": "true" }));
    ctx.append(h("div", { class: "env", role: "group", "aria-label": tr("Environnement (touche V)") }, ENVS.map(([id, label]) =>
      h("button", { type: "button", "data-env": id, "aria-pressed": String(activeEnv === id), title: tr("Ouvrir les favoris en {env} (touche V)", { env: label }), onclick: () => setEnv(id) }, label))));
  }
  ctx.classList.toggle("off-prod", showEnv && activeEnv !== "prod");
  // Cockpit keeps tenant + environment in the left column
  const side = $("#sideCtx");
  side.replaceChildren();
  if (ctx.childNodes.length) {
    if (S().layout === "cockpit") side.append(h("div", { class: "side-h" }, tr("Contexte")), ctx);
    else bar.append(ctx);
  }
  // Safari tab title warns when links don't point to PROD, and names the active tenant
  const tenantTag = showTenant && currentTenant() ? `[${currentTenant().name.toUpperCase()}] ` : "";
  document.title = (showEnv && activeEnv !== "prod" ? `[${activeEnv.toUpperCase()}] ` : "") + tenantTag + "Cockpit SteffPoint";
}
function cycleEnv() {
  if (!hasEnvLinks()) return;
  const ids = ENVS.map(([id]) => id);
  setEnv(ids[(ids.indexOf(activeEnv) + 1) % ids.length]);
  toast(tr("Environnement : {env}", { env: activeEnv.toUpperCase() }));
}
/* ---------- Frequent links (click counts stay in this browser) ---------- */
const FREQ_MAX = 6;
function countHit(id) {
  state.meta.hits[id] = (state.meta.hits[id] || 0) + 1;
  state.meta.last[id] = Date.now();
  save();
}
function topLinks() {
  return Object.entries(state.meta.hits).sort((a, b) => b[1] - a[1])
    .map(([id]) => findLink(id)).filter(Boolean).slice(0, FREQ_MAX);
}
function openLink(l) {
  const href = linkHref(l);
  if (!href) return;
  countHit(l.id);
  if (S().links.newTab) window.open(href, "_blank", "noopener"); else location.href = href;
}
function renderFreq() {
  const nav = $("#freq");
  nav.replaceChildren();
  if (!["accueil", "cockpit"].includes(S().layout) || !S().links.on) return;
  const top = topLinks();
  if (!top.length) return;
  const newTab = S().links.newTab;
  nav.append(h("div", { class: "side-h" }, tr("Fréquents")), ...top.map(({ link: l, block: b }, i) => {
    const href = linkHref(l);
    return h("a", { class: "fq", href: href || "#", title: `${l.name} (⌥${i + 1})`,
      target: newTab && href ? "_blank" : null, rel: newTab && href ? "noopener" : null,
      onclick: e => { if (!href) { e.preventDefault(); openPanelAt("tenants"); } else countHit(l.id); } },
      iconFor(l, b.color, href), h("span", { class: "nm" }, l.name), h("kbd", {}, `⌥${i + 1}`));
  }));
}

function renderReminder() {
  const m = state.meta, el = $("#reminder");
  const days = Math.floor((Date.now() - (m.lastExport ? new Date(m.lastExport).getTime() : m.since)) / 864e5);
  el.hidden = days < 14 || Date.now() < m.snooze;
  if (el.hidden) return;
  el.replaceChildren(
    h("span", { class: "sp" }, m.lastExport ? tr("Dernière sauvegarde il y a {n} jours.", { n: days }) : tr("Tes favoris n'ont encore jamais été exportés."),
      " " + tr("Un export les protège si Safari efface ses données.")),
    h("button", { class: "pbtn", type: "button", onclick: exportData }, tr("Exporter")),
    h("button", { class: "pbtn", type: "button", onclick: () => { m.snooze = Date.now() + 7 * 864e5; save(); renderReminder(); } }, tr("Dans 7 jours")));
}

/* ---------- Clock + greeting ---------- */
// "Good morning" can't stand in for an all-day "Bonjour", so every greeting follows the hour
const autoGreet = (hr = new Date().getHours()) => tr(hr < 5 ? "Bonne nuit" : hr < 12 ? "Bonjour" : hr < 18 ? "Bon après-midi" : "Bonsoir");
function tick() {
  const c = S().clock, d = new Date();
  $("#clock").textContent = d.toLocaleTimeString(LOCALE(), { hour: "2-digit", minute: "2-digit", second: c.seconds ? "2-digit" : undefined, hour12: !c.h24 });
  $("#date").textContent = c.date === "short" ? d.toLocaleDateString(LOCALE()) : d.toLocaleDateString(LOCALE(), { weekday: "long", day: "numeric", month: "long" });
  const g = S().greet.custom.trim() || autoGreet(d.getHours());
  $("#greet").textContent = S().name ? `${g}, ${S().name}` : g;
  renderMetaLine();
}
// Accueil and Lanceur fold time, date and weather into one line
let weatherLine = "";
function renderMetaLine() {
  const c = S().clock, parts = [];
  if (c.on) {
    parts.push($("#clock").textContent);
    const date = $("#date").textContent;
    if (c.date !== "none") parts.push(date.charAt(0).toUpperCase() + date.slice(1));
  }
  if (S().weather.on && weatherLine) parts.push(weatherLine);
  $("#metaLine").textContent = parts.join(" · ");
}
let clockTimer;
function startClock() { clearInterval(clockTimer); tick(); clockTimer = setInterval(tick, S().clock.seconds ? 1000 : 10000); }

/* ---------- Weather (Open-Meteo, free, no key) ---------- */
const WMO = [
  [[0], "Ciel dégagé", "sun"], [[1], "Plutôt dégagé", "sun"], [[2], "Partiellement nuageux", "part"], [[3], "Couvert", "cloud"],
  [[45, 48], "Brouillard", "fog"], [[51, 53, 55, 56, 57], "Bruine", "rain"], [[61, 63, 65, 66, 67], "Pluie", "rain"],
  [[71, 73, 75, 77], "Neige", "snow"], [[80, 81, 82], "Averses", "rain"], [[85, 86], "Averses de neige", "snow"], [[95, 96, 99], "Orage", "storm"]
];
const WICON = {
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  part: '<path d="M8 3v1.5M3.5 8H2M4.6 4.6l1 1M12.4 4.6l-1 1"/><path d="M5.3 10.6A4 4 0 1 1 12 6.6"/><path d="M17 20H8a4 4 0 1 1 1-7.9A5 5 0 0 1 18.5 13 3.5 3.5 0 0 1 17 20Z"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.6 11 4 4 0 0 1 17.5 19Z"/>',
  fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
  rain: '<path d="M17.5 15H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.6 7 4 4 0 0 1 17.5 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow: '<path d="M17.5 14H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.6 6 4 4 0 0 1 17.5 14Z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 22h.01M14 22h.01"/>',
  storm: '<path d="M17.5 14H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.6 6 4 4 0 0 1 17.5 14Z"/><path d="m12 14-2 4h4l-2 4"/>'
};
const wsvg = (k, size = 34) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${WICON[k]}</svg>`;
async function loadWeather(force) {
  const w = S().weather;
  if (!w.on) { $("#weather").hidden = true; return; }
  const sig = `${w.lat},${w.lon},${w.unit}`;
  let cache = store.get(KEY + "-weather");
  if (force || !cache || cache.sig !== sig || Date.now() - cache.ts > 30 * 60e3) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${w.lat}&longitude=${w.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto${w.unit === "f" ? "&temperature_unit=fahrenheit" : ""}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      cache = { sig, ts: Date.now(), data: await r.json() };
      store.set(KEY + "-weather", cache);
    } catch { if (!cache || cache.sig !== sig) { $("#weather").hidden = true; return; } }
  }
  const c = cache.data.current, dl = cache.data.daily;
  const [, desc0, icon0] = WMO.find(([codes]) => codes.includes(c.weather_code)) || [0, "Temps variable", "cloud"];
  const desc = tr(desc0);
  const icon = icon0 === "sun" && !c.is_day ? "moon" : icon0;
  const t = Math.round(c.temperature_2m);
  $("#wDesc").textContent = desc;
  $("#wDesc").hidden = w.display !== "full";
  $("#wIcon").innerHTML = wsvg(icon);
  $("#wTemp").textContent = `${t}°`;
  $("#wRange").textContent = w.display === "full" ? `max ${Math.round(dl.temperature_2m_max[0])}° · min ${Math.round(dl.temperature_2m_min[0])}°` : "";
  $("#weather").hidden = false;
  weatherLine = `${desc} ${t}°` + (w.display === "full" ? ` ${Math.round(dl.temperature_2m_max[0])}°/${Math.round(dl.temperature_2m_min[0])}°` : "");
  renderMetaLine();
}
async function geocodeCity(name) {
  const note = $("#note-city");
  if (!name.trim()) return;
  note.className = "note"; note.textContent = tr("Recherche…");
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=${lang}`);
    const res = (await r.json()).results?.[0];
    if (!res) { note.className = "note err"; note.textContent = tr("Aucune ville trouvée pour « {name} ».", { name }); return; }
    Object.assign(S().weather, { city: res.name, lat: +res.latitude.toFixed(3), lon: +res.longitude.toFixed(3) });
    save(); syncPanel();
    note.className = "note ok"; note.textContent = `${res.name}${res.country ? ", " + res.country : ""}`;
    loadWeather(true);
  } catch { note.className = "note err"; note.textContent = tr("Recherche impossible : pas de connexion ?"); }
}
function useMyPosition() {
  const note = $("#note-city");
  if (!navigator.geolocation) { note.className = "note err"; note.textContent = tr("Géolocalisation indisponible dans ce navigateur."); return; }
  note.className = "note"; note.textContent = tr("Localisation…");
  navigator.geolocation.getCurrentPosition(p => {
    Object.assign(S().weather, { city: tr("Ma position"), lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) });
    save(); syncPanel(); loadWeather(true);
    note.className = "note ok"; note.textContent = tr("Position utilisée pour la météo.");
  }, () => { note.className = "note err"; note.textContent = tr("Safari a refusé la position. Saisis plutôt une ville."); }, { timeout: 10000 });
}

/* ---------- Background ---------- */
const bgImg = $("#bgImg");
let bgToken = 0;
function setBgImage(src, credit) {
  const token = ++bgToken;
  const im = new Image();
  im.onload = () => {
    if (token !== bgToken) return;
    bgImg.classList.remove("ready");
    setTimeout(() => {
      bgImg.style.background = `url("${src.replace(/"/g, "%22")}") center/cover no-repeat`;
      bgImg.classList.add("ready");
    }, bgImg.classList.contains("ready") ? 250 : 0);
    showCredit(credit);
  };
  im.onerror = () => { if (token === bgToken) { setFlat(); toast(tr("Image de fond introuvable, retour au dégradé")); } };
  im.src = src;
}
function setFlat(color) {
  ++bgToken;
  document.body.classList.add("bg-flat");
  bgImg.style.background = color || "";
  bgImg.classList.add("ready");
  showCredit(null);
}
function showCredit(c) {
  const el = $("#credit");
  el.replaceChildren();
  el.hidden = !c;
  if (c) el.append(tr("Photo : "), h("a", { href: c.link, target: "_blank", rel: "noopener" }, c.author));
}
async function photoList() {
  let cache = store.get(KEY + "-photos");
  if (cache && Date.now() - cache.ts < 7 * 864e5) return cache.list;
  const page = 1 + Math.floor(Math.random() * 8);
  const r = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=100`);
  const list = (await r.json()).filter(p => p.width >= p.height).map(p => ({ id: p.id, author: p.author, link: p.url }));
  store.set(KEY + "-photos", { ts: Date.now(), list });
  return list;
}
function photoIsStale(b) {
  if (!b.photo) return true;
  const then = new Date(b.at), now = new Date();
  if (b.freq === "tab") return true;
  if (b.freq === "hour") return now - then > 36e5 || then.getHours() !== now.getHours();
  if (b.freq === "day") return then.toDateString() !== now.toDateString();
  return false;
}
async function applyBackground(forceNew) {
  const b = S().bg;
  document.body.classList.toggle("bg-flat", b.type === "gradient" || b.type === "color");
  if (b.type === "gradient") return setFlat();
  if (b.type === "color") return setFlat(b.color);
  document.body.classList.remove("bg-flat");
  if (b.type === "url") {
    const u = normalizeUrl(b.url);
    return u ? setBgImage(u, null) : setFlat();
  }
  if (b.type === "upload") {
    let data = null;
    try { data = localStorage.getItem(KEY + "-bgimg"); } catch {}
    return data ? setBgImage(data, null) : setFlat();
  }
  // photo
  try {
    if (forceNew || photoIsStale(b)) {
      const list = await photoList();
      const choices = list.filter(p => p.id !== b.photo?.id);
      b.photo = choices[Math.floor(Math.random() * choices.length)];
      b.at = Date.now();
      save();
    }
    const w = Math.min(2560, Math.round(innerWidth * (devicePixelRatio || 1) / 2) * 2 || 1920);
    setBgImage(`https://picsum.photos/id/${b.photo.id}/${w}/${Math.round(w * .625)}`, b.photo);
  } catch { setFlat(); }
}
function uploadBg(file) {
  const note = $("#note-upload");
  const reader = new FileReader();
  reader.onload = () => {
    const im = new Image();
    im.onload = () => {
      // Downscale so the image fits in localStorage (~5 MB in Safari)
      const scale = Math.min(1, 2400 / im.width);
      const cv = h("canvas", { width: Math.round(im.width * scale), height: Math.round(im.height * scale) });
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      const data = cv.toDataURL("image/jpeg", .82);
      try { localStorage.setItem(KEY + "-bgimg", data); }
      catch { note.className = "note err"; note.textContent = tr("Image trop lourde pour le stockage de Safari. Essaie une image plus petite."); return; }
      note.className = "note ok"; note.textContent = tr("{name} enregistrée.", { name: file.name });
      applyBackground();
    };
    im.onerror = () => { note.className = "note err"; note.textContent = tr("Ce fichier n'est pas une image lisible."); };
    im.src = reader.result;
  };
  reader.readAsDataURL(file);
}
$("#bgFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) uploadBg(f); });

/* ---------- Apply settings ---------- */
function applySettings() {
  const s = S(), root = document.documentElement, body = document.body;
  applyLang();
  if (s.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", s.theme);
  root.style.setProperty("--blur", s.bg.blur + "px");
  root.style.setProperty("--bright", s.bg.bright / 100);
  // Photos keep a minimum veil so the white hero text stays readable on light images
  root.style.setProperty("--veil", (bgIsImage(s) ? Math.max(s.bg.veil, 20) : s.bg.veil) / 100);
  root.style.setProperty("--clock-scale", s.clock.size / 100);
  root.style.setProperty("--radius", s.links.radius + "px");
  if (s.links.cols === "auto") root.style.removeProperty("--cols");
  else root.style.setProperty("--cols", `repeat(${s.links.cols}, minmax(0, 1fr))`);
  body.classList.toggle("cards-solid", s.links.style === "solid");
  body.classList.toggle("hide-dock", s.hideDock);
  body.classList.toggle("no-links", !s.links.on);
  body.classList.toggle("no-clock", !s.clock.on);
  body.classList.toggle("no-date", s.clock.date === "none");
  body.classList.toggle("no-greet", !s.greet.on);
  body.classList.toggle("no-weather", !s.weather.on);
  body.classList.toggle("no-search", !s.search.on);
  for (const l of LAYOUTS) body.classList.toggle("l-" + l[0], s.layout === l[0]);
  // Cockpit puts the search next to the space tabs; the others keep it in the hero.
  // Moving a node drops its focus: keep the cursor in the search (autofocus may already have run)
  const focused = $("#searchWrap").contains(document.activeElement) ? document.activeElement : null;
  if (s.layout === "cockpit") $("#topline").prepend($("#searchWrap"));
  else $(".hero").insertBefore($("#searchWrap"), $("#freq"));
  focused?.focus({ preventScroll: true });
  startClock();
}

/* ---------- Settings panel (schema-driven) ---------- */
const bgIsImage = s => ["photo", "url", "upload"].includes(s.bg.type);
const LAYOUTS = [["classic", "Classique"], ["accueil", "Accueil"], ["cockpit", "Cockpit"], ["lanceur", "Lanceur"]];
const SCHEMA = [
  { title: "Général", rows: [
    { type: "toggle", path: "showAll", label: "Afficher tous les réglages" },
    { type: "select", path: "lang", label: "Langue", options: LANGS,
      after: () => { render(); buildPanel(); loadWeather(); $("#set-lang")?.focus(); } },
    { type: "select", path: "theme", label: "Mode sombre", options: [["auto", "Système"], ["light", "Clair"], ["dark", "Sombre"]] },
    { type: "select", path: "layout", label: "Disposition", options: LAYOUTS, after: render,
      note: "Accueil : grande salutation et fréquents. Cockpit : colonne d'infos à gauche, tout tient à l'écran. Lanceur : grande recherche et tuiles d'icônes." },
    { type: "buttons", label: "Assistant", buttons: [["Relancer l'assistant", () => { togglePanel(false); openOnboarding({ rerun: true }); }]],
      note: "Ajoute des espaces et des blocs sans toucher à l'existant." },
    { type: "toggle", path: "keys", label: "Raccourcis à une touche",
      note: "/ E T V ? , et 1 à 9. Désactive-les si tu dictes ou utilises une aide technique : une lettre ne déclenchera plus rien. Les boutons restent disponibles." },
    { type: "toggle", path: "hideDock", label: "Discrétiser les boutons flottants", adv: true, note: "Ils réapparaissent au survol. Raccourcis : , pour les réglages, E pour éditer." }
  ]},
  { title: "Arrière-plan", rows: [
    { type: "select", path: "bg.type", label: "Type d'arrière-plan", after: () => applyBackground(),
      options: [["photo", "Photos"], ["gradient", "Dégradé SteffPoint"], ["color", "Couleur unie"], ["upload", "Ma photo"], ["url", "Image (URL)"]] },
    { type: "select", path: "bg.freq", label: "Fréquence", when: s => s.bg.type === "photo",
      options: [["tab", "Chaque onglet"], ["hour", "Chaque heure"], ["day", "Chaque jour"], ["pause", "En pause"]],
      extra: () => h("button", { class: "pbtn sq", type: "button", title: tr("Nouvelle photo"), "aria-label": tr("Nouvelle photo"), onclick: () => applyBackground(true) }, svg(ICON.refresh)),
      note: "Photos libres de droits fournies par Picsum (Unsplash)." },
    { type: "text", path: "bg.url", label: "Adresse de l'image", placeholder: "https://…/image.jpg", when: s => s.bg.type === "url", after: () => applyBackground() },
    { type: "buttons", label: "Image", when: s => s.bg.type === "upload", noteId: "note-upload",
      buttons: [["Choisir…", () => $("#bgFile").click()]], note: "Reste sur ce Mac, n'est pas incluse dans l'export." },
    { type: "color", path: "bg.color", label: "Couleur", when: s => s.bg.type === "color", after: () => applyBackground() },
    { type: "range", path: "bg.blur", label: "Intensité du flou", min: 0, max: 40, unit: "px", when: bgIsImage },
    { type: "range", path: "bg.bright", label: "Luminosité", min: 30, max: 100, unit: "%", when: bgIsImage },
    { type: "range", path: "bg.veil", label: "Voile de couleur", min: 0, max: 80, unit: "%", when: bgIsImage }
  ]},
  { title: "Favoris", rows: [
    { type: "toggle", path: "links.on", label: "Afficher les favoris" },
    { type: "select", path: "links.style", label: "Style des blocs", options: [["glass", "Verre dépoli"], ["solid", "Opaque"]], when: s => s.links.on },
    { type: "toggle", path: "links.newTab", label: "Ouvrir dans un nouvel onglet", when: s => s.links.on, after: render },
    { type: "select", path: "links.max", label: "Liens visibles par bloc", num: true, when: s => s.links.on, after: render,
      options: [["4", "4"], ["6", "6"], ["8", "8"], ["10", "10"], ["12", "12"], ["16", "16"], ["0", "Tous"]],
      note: "Au-delà, un bouton « Afficher plus » ouvre le reste. La recherche trouve toujours tous les liens." },
    { type: "select", path: "links.cols", label: "Colonnes", options: [["auto", "Automatique"], ["2", "2"], ["3", "3"], ["4", "4"]], adv: true, when: s => s.links.on },
    { type: "range", path: "links.radius", label: "Arrondi", min: 4, max: 24, unit: "px", adv: true, when: s => s.links.on },
    { type: "select", path: "links.icons", label: "Icônes", options: [["favicon", "Favicons"], ["initials", "Initiales"]], adv: true, when: s => s.links.on, after: render,
      note: "Le favicon est d'abord demandé au site lui-même, puis à Google, qui reçoit alors le domaine du lien. Les adresses internes (intranet, .local, .corp, IP privées) ne sont jamais envoyées à Google. « Initiales » reste 100 % local (sauf icônes perso)." },
    { type: "buttons", label: "Blocs", when: s => s.links.on, buttons: [["+ Nouveau bloc", () => openBlockDrawer()], ["Éditer", () => toggleEdit(true)]] },
    { type: "buttons", label: "Ménage", when: s => s.links.on, buttons: [["Faire le ménage…", () => { togglePanel(false); openCleanup(); }]],
      note: "Doublons, blocs vides et liens que tu n'ouvres plus. Calculé dans ce navigateur, rien n'est envoyé." },
    { type: "buttons", label: "Fréquents", adv: true, when: s => s.links.on && ["accueil", "cockpit"].includes(s.layout),
      buttons: [["Remettre à zéro", () => commit(() => { state.meta.hits = {}; }, tr("Fréquents remis à zéro"))]],
      note: "Les dispositions Accueil et Cockpit montrent tes 6 liens les plus ouverts (⌥1 à ⌥6). Le compte reste dans ce navigateur." }
  ]},
  { title: "Espaces", rows: [
    { type: "toggle", path: "spaces.auto", label: "Bascule automatique le week-end", after: () => { currentSpace = pickSpace(); render(); },
      note: "Du lundi au vendredi, l'espace de semaine s'ouvre. Le samedi et le dimanche, celui du week-end. Tu peux toujours changer d'onglet à la main." },
    { type: "select", path: "spaces.weekday", label: "En semaine", options: () => state.spaces.map(s => [s.id, s.name]), when: s => s.spaces.auto, after: () => { currentSpace = pickSpace(); render(); } },
    { type: "select", path: "spaces.weekend", label: "Le week-end", options: () => state.spaces.map(s => [s.id, s.name]), when: s => s.spaces.auto, after: () => { currentSpace = pickSpace(); render(); } },
    { type: "toggle", path: "spaces.hours", label: "Heures de travail", when: s => s.spaces.auto, after: () => { currentSpace = pickSpace(); render(); },
      note: "En semaine, l'espace de semaine ne s'ouvre qu'entre ces heures. Le soir et la nuit, l'espace choisi ci-dessous prend le relais." },
    { type: "time", path: "spaces.from", label: "De", when: s => s.spaces.auto && s.spaces.hours, after: () => { currentSpace = pickSpace(); render(); } },
    { type: "time", path: "spaces.to", label: "À", when: s => s.spaces.auto && s.spaces.hours, after: () => { currentSpace = pickSpace(); render(); } },
    { type: "select", path: "spaces.offHours", label: "En dehors des heures", options: () => state.spaces.map(s => [s.id, s.name]), when: s => s.spaces.auto && s.spaces.hours, after: () => { currentSpace = pickSpace(); render(); } },
    { type: "custom", label: "Mes espaces", build: buildSpaceEditor, note: "Touches 1 à 9 pour changer d'espace. Pour déplacer un bloc : menu ⋯ du bloc." }
  ]},
  { title: "Environnements", rows: [
    { type: "select", path: "env.def", label: "Environnement par défaut", options: ENVS.map(([id, label]) => [id, label]),
      after: () => { if (!S().env.remember) { activeEnv = S().env.def; render(); } } },
    { type: "toggle", path: "env.remember", label: "Mémoriser le dernier choisi", after: () => { activeEnv = S().env.remember && state.meta.env ? state.meta.env : S().env.def; render(); },
      note: "Un favori peut avoir une adresse DEV et TEST en plus de son adresse principale (PROD), via « Environnements » quand tu modifies le lien. Le sélecteur DEV | TEST | PROD apparaît dès qu'un favori en a une." }
  ]},
  { title: "Administration Microsoft 365", rows: [
    { type: "toggle", path: "m365admin", label: "Activer", after: () => { if (S().m365admin) addM365Space(); },
      note: "Pour les administrateurs d'un tenant. Ajoute un espace « Admin O365 » avec un bloc par domaine (centre d'admin, collaboration, Power Platform, sécurité, appareils…) et le modèle « Admin Microsoft 365 » dans « Nouveau bloc »." }
  ]},
  // Only shown once tenants exist, a link uses {tenant} or the Microsoft 365 admin is on
  { title: "Tenants", id: "tenants", when: s => tenantsAnywhere() || s.m365admin, rows: [
    { type: "custom", build: buildTenantEditor,
      note: "Dans l'adresse d'un lien, {tenant} est remplacé par l'identifiant du tenant choisi (client-a → https://client-a.example.com) et {domain} par son domaine (l'identifiant si vide). Touche T pour passer au tenant suivant." }
  ]},
  { title: "Date & heure", rows: [
    { type: "toggle", path: "clock.on", label: "Activer" },
    { type: "toggle", path: "clock.h24", label: "Format 24 h", when: s => s.clock.on },
    { type: "toggle", path: "clock.seconds", label: "Afficher les secondes", adv: true, when: s => s.clock.on },
    { type: "range", path: "clock.size", label: "Taille de l'horloge", min: 60, max: 150, unit: "%", adv: true, when: s => s.clock.on },
    { type: "select", path: "clock.date", label: "Format de date", options: [["long", "Dimanche 25 octobre"], ["short", "25/10/2026"], ["none", "Masquer"]], when: s => s.clock.on }
  ]},
  { title: "Météo & bienvenue", rows: [
    { type: "toggle", path: "weather.on", label: "Météo", after: () => loadWeather() },
    { type: "text", path: "weather.city", label: "Ville", placeholder: "ex. Bruxelles", when: s => s.weather.on, noteId: "note-city", commitOnly: true, after: () => geocodeCity(S().weather.city) },
    { type: "buttons", label: "Géolocalisation", adv: true, when: s => s.weather.on, buttons: [["Utiliser ma position", useMyPosition]] },
    { type: "select", path: "weather.unit", label: "Unité de température", options: [["c", "Celsius"], ["f", "Fahrenheit"]], when: s => s.weather.on, after: () => loadWeather(true) },
    { type: "select", path: "weather.display", label: "Affichage", options: [["full", "Description et icône"], ["simple", "Icône et température"]], when: s => s.weather.on, after: () => loadWeather() },
    { type: "toggle", path: "greet.on", label: "Bienvenue" },
    { type: "text", path: "name", label: "Nom de bienvenue", placeholder: "Nom", when: s => s.greet.on, after: tick },
    { type: "text", path: "greet.custom", label: "Message personnalisé", placeholder: "Bonjour / Bonsoir auto", adv: true, when: s => s.greet.on, after: tick }
  ]},
  { title: "Recherche", rows: [
    { type: "toggle", path: "search.on", label: "Barre de recherche" },
    { type: "select", path: "search.engine", label: "Moteur web", options: Object.entries(ENGINES).map(([k, v]) => [k, v[0]]), when: s => s.search.on, after: updateHint }
  ]},
  { title: "Sauvegarde", rows: [
    { type: "buttons", label: "Données", noteId: "note-backup", buttons: [["Exporter", () => exportData()], ["Importer…", () => $("#importFile").click()]] },
    { type: "buttons", label: "Signets Safari", noteId: "note-bookmarks", buttons: [["Importer…", () => $("#bookmarkFile").click()]],
      note: "Dans Safari : Fichier → Exporter → Signets…, puis choisis ce fichier. Chaque dossier devient un bloc dans l'espace affiché." },
    { type: "buttons", label: "Réinitialiser", adv: true, buttons: [["Revenir aux exemples", () => resetAll(), "danger"]], note: "Remplace tes blocs par les exemples. Annulable quelques secondes." }
  ]},
  { title: "Raccourcis", adv: true, html: () => h("div", { class: "keys" },
      ["⌘K / Ctrl K  palette : liens et actions, @tenant, !dev !test !prod", "/  rechercher", "↑ ↓  choisir un résultat · Entrée ouvrir", "⌥1–⌥6  ouvrir un fréquent (Accueil, Cockpit)", "E  éditer les favoris", "?  aide", "1–9  changer d'espace", "T  tenant suivant", "V  environnement suivant (DEV → TEST → PROD)", ",  réglages", "Échap  fermer / vider", "Coller une URL  l'ajoute au bloc survolé"].map(k => h("div", {}, tr(k)))) }
];
const getP = p => p.split(".").reduce((o, k) => o?.[k], S());
const setP = (p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((o, k) => o[k], S())[last] = v; };
const rows = [];
function buildPanel() {
  const body = $("#panelBody");
  body.replaceChildren();
  rows.length = 0;
  for (const g of SCHEMA) {
    const groupT = h("div", { class: "group-t", id: g.id ? "grp-" + g.id : null }, tr(g.title));
    const group = h("div", { class: "group" });
    if (g.adv) rows.push({ el: groupT, def: { adv: true } }, { el: group, def: { adv: true } });
    if (g.when) rows.push({ el: groupT, def: { when: g.when } }, { el: group, def: { when: g.when } });
    body.append(groupT, group);
    if (g.html) { group.append(g.html()); continue; }
    for (const def of g.rows) {
      const id = "set-" + (def.path || def.label || "custom").replace(/\W+/g, "-");
      const el = h("div", { class: "row" });
      const ctl = h("div", { class: "ctl" });
      let input;
      const commitVal = v => {
        setP(def.path, v);
        save(); applySettings(); def.after?.(); updateRows();
      };
      if (def.type === "toggle") {
        input = h("input", { type: "checkbox", role: "switch", id });
        input.addEventListener("change", () => commitVal(input.checked));
        ctl.append(h("label", { class: "switch" }, input, h("span")));
      } else if (def.type === "select") {
        // Static choices are UI text; a function lists user data (space names) that stays as typed
        const dyn = typeof def.options === "function", opts = dyn ? def.options() : def.options;
        input = h("select", { class: "pill", id }, opts.map(([v, l]) => h("option", { value: v }, dyn ? l : tr(l))));
        input.addEventListener("change", () => commitVal(def.num ? +input.value : input.value));
        ctl.append(input);
      } else if (def.type === "range") {
        input = h("input", { type: "range", min: def.min, max: def.max, step: 1, id });
        const out = h("span", { class: "val" });
        input._out = out;
        input.addEventListener("input", () => { out.textContent = input.value + def.unit; commitVal(+input.value); });
        ctl.append(input, out);
      } else if (def.type === "text") {
        input = h("input", { type: "text", class: "pill-input", id, placeholder: tr(def.placeholder), autocomplete: "off", spellcheck: "false" });
        if (def.commitOnly) input.addEventListener("change", () => commitVal(input.value.trim()));
        else input.addEventListener("input", () => commitVal(input.value.trim()));
        input.addEventListener("keydown", e => { if (e.key === "Enter") input.blur(); });
        ctl.append(input);
      } else if (def.type === "time") {
        input = h("input", { type: "time", class: "pill-input time-input", id, required: true });
        input.addEventListener("change", () => { if (input.value) commitVal(input.value); });
        ctl.append(input);
      } else if (def.type === "color") {
        input = h("input", { type: "color", id });
        input.addEventListener("input", () => commitVal(input.value));
        ctl.append(input);
      } else if (def.type === "buttons") {
        def.buttons.forEach(([label, fn, cls]) => ctl.append(h("button", { class: "pbtn" + (cls ? " " + cls : ""), type: "button", onclick: fn }, tr(label))));
      }
      if (def.extra) ctl.append(def.extra());
      if (def.type === "custom") {
        if (def.label) el.append(h("span", { class: "lbl" }, tr(def.label)));
        el.append(def.build());
      } else el.append(input ? h("label", { for: id }, tr(def.label)) : h("span", { class: "lbl" }, tr(def.label)), ctl);
      if (def.note || def.noteId) el.append(h("p", { class: "note", id: def.noteId || null }, tr(def.note) || ""));
      group.append(el);
      rows.push({ el, def, input });
    }
  }
  syncPanel();
}
function syncPanel() {
  for (const { def, input } of rows) {
    if (!input || !def.path) continue;
    const v = getP(def.path);
    if (def.type === "toggle") input.checked = !!v;
    else if (document.activeElement !== input) input.value = v;
    if (input._out) input._out.textContent = v + def.unit;
  }
  const last = state.meta.lastExport;
  const days = last ? Math.floor((Date.now() - new Date(last)) / 864e5) : null;
  const note = $("#note-backup");
  if (note) {
    note.className = "note" + (days == null || days > 30 ? " err" : "");
    note.textContent = tr(storageOk ? "Enregistré dans Safari sur ce Mac." : "Safari ne conserve pas les données : exporte avant de fermer.") + " " +
      (days == null ? tr("Jamais exporté.") : days === 0 ? tr("Dernier export : aujourd'hui.") : tr("Dernier export : il y a {n} j.", { n: days }));
  }
  updateRows();
}
function updateRows() {
  const s = S();
  for (const { el, def } of rows) el.hidden = (def.adv && !s.showAll) || (def.when ? !def.when(s) : false);
  // first visible row in each group has no separator
  document.querySelectorAll("#panelBody .group").forEach(g => {
    let first = true;
    g.querySelectorAll(":scope > .row").forEach(r => { r.classList.toggle("first", first && !r.hidden); if (!r.hidden) first = false; });
  });
}
const panel = $("#panel");
function togglePanel(open = !panel.classList.contains("open")) {
  closeMenu();
  panel.classList.toggle("open", open);
  panel.inert = !open;
  panel.setAttribute("aria-hidden", String(!open));
  $("#settingsBtn").setAttribute("aria-expanded", String(open));
  if (open) { buildPanel(); setTimeout(() => panel.querySelector("input,select,button")?.focus({ preventScroll: true }), 50); }
}
function openPanelAt(groupId) {
  if (!panel.classList.contains("open")) togglePanel(true);
  setTimeout(() => $("#grp-" + groupId)?.scrollIntoView({ block: "start", behavior: "smooth" }), 120);
}

function buildSpaceEditor() {
  const wrap = h("div", { class: "list-edit" });
  state.spaces.forEach((sp, i) => {
    wrap.append(h("div", { class: "le-row" },
      h("span", { class: "n" }, String(i + 1)),
      h("input", { class: "pill-input", type: "text", value: sp.name, "aria-label": tr("Nom de l'espace {n}", { n: i + 1 }),
        onchange: e => { const v = e.target.value.trim(); if (!v) { e.target.value = sp.name; return; } sp.name = v; save(); render(); } }),
      h("button", { class: "pbtn sq danger", type: "button", title: tr("Supprimer l'espace"), "aria-label": tr("Supprimer {name}", { name: sp.name }),
        disabled: state.spaces.length < 2, onclick: () => deleteSpace(sp.id) }, "✕")));
  });
  wrap.append(h("div", {}, h("button", { class: "pbtn", type: "button", onclick: () => {
    const id = uid(), name = tr("Nouvel espace");
    state.spaces.push({ id, name });
    save(); buildPanel(); setSpace(id);
    setTimeout(() => [...document.querySelectorAll("#panelBody .list-edit .pill-input")].find(i => i.value === name)?.select(), 50);
  } }, tr("+ Ajouter un espace"))));
  return wrap;
}
function deleteSpace(id) {
  const sp = state.spaces.find(s => s.id === id);
  const others = state.spaces.filter(s => s.id !== id);
  commit(() => {
    state.spaces = others;
    state.blocks.forEach(b => { if (b.space === id) b.space = others[0].id; });
  }, tr("Espace « {name} » supprimé, ses blocs sont dans « {other} »", { name: sp.name, other: others[0].name }));
  buildPanel();
}
function buildTenantEditor() {
  const wrap = h("div", { class: "list-edit" });
  if (!state.tenants.length) wrap.append(h("p", { class: "tip" }, tr("Aucun tenant. Ajoutes-en un pour ouvrir les liens modèles.")));
  for (const t of state.tenants) {
    const field = (key, ph, label) => h("input", { class: "pill-input", type: "text", value: t[key], placeholder: ph, "aria-label": tr(label), spellcheck: "false", autocomplete: "off",
      onchange: e => {
        let v = e.target.value.trim();
        // Accept a pasted address and keep only its first label as the tenant id
        if (key === "slug") v = v.toLowerCase().replace(/^https?:\/\//, "").split(/[./]/)[0];
        if (key !== "domain" && !v) { e.target.value = t[key]; return; }
        t[key] = v; e.target.value = v;
        save(); render();
      } });
    wrap.append(h("div", { class: "tenant-card" },
      h("div", { class: "le-row" }, field("name", tr("Nom affiché"), "Nom du tenant"),
        h("button", { class: "pbtn sq danger", type: "button", title: tr("Supprimer le tenant"), "aria-label": tr("Supprimer {name}", { name: t.name }), onclick: () => deleteTenant(t.id) }, "✕")),
      h("div", { class: "le-row" }, h("span", { class: "k" }, "{tenant}"), field("slug", "client-a", "Identifiant du tenant")),
      h("div", { class: "le-row" }, h("span", { class: "k" }, "{domain}"), field("domain", tr("{slug} (par défaut)", { slug: t.slug }), "Domaine")),
      h("div", { class: "le-row" }, h("span", { class: "k" }, tr("Couleur")), h("div", { class: "mini-swatches", role: "radiogroup", "aria-label": tr("Couleur de {name}", { name: t.name }) },
        COLORS.map(c => h("button", { type: "button", role: "radio", "aria-checked": String(t.color === c), "aria-label": tr(COLOR_NAMES[c]), title: tr(COLOR_NAMES[c]), style: `background:var(--${c})`,
          onclick: () => { t.color = c; save(); buildPanel(); render(); } }))))));
  }
  wrap.append(h("div", {}, h("button", { class: "pbtn", type: "button", onclick: () => {
    const t = { id: uid(), name: tr("Nouveau tenant"), slug: "nouveau", domain: "", color: COLORS[state.tenants.length % COLORS.length] };
    state.tenants.push(t);
    state.meta.tenant = t.id;
    save(); buildPanel(); render();
    setTimeout(() => [...document.querySelectorAll("#panelBody .tenant-card")].pop()?.querySelector("input")?.select(), 50);
  } }, tr("+ Ajouter un tenant"))));
  return wrap;
}
function deleteTenant(id) {
  const t = state.tenants.find(x => x.id === id);
  commit(() => {
    state.tenants = state.tenants.filter(x => x.id !== id);
    if (state.meta.tenant === id) state.meta.tenant = state.tenants[0]?.id || null;
  }, tr("Tenant « {name} » supprimé", { name: t.name }));
  buildPanel();
}
$("#settingsBtn").addEventListener("click", () => togglePanel());
$("#panelClose").addEventListener("click", () => togglePanel(false));

/* ---------- Search ---------- */
const q = $("#q");
q.addEventListener("input", () => { term = q.value.trim(); sel = 0; render(); });
q.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" && hits.length) { e.preventDefault(); sel = (sel + 1) % hits.length; render(); hits[sel]?.scrollIntoView({ block: "nearest" }); }
  else if (e.key === "ArrowUp" && hits.length) { e.preventDefault(); sel = (sel - 1 + hits.length) % hits.length; render(); hits[sel]?.scrollIntoView({ block: "nearest" }); }
  else if (e.key === "Escape") { q.value = ""; term = ""; render(); }
  else if (e.key === "Enter") { e.preventDefault(); go(e.metaKey || e.ctrlKey, e.shiftKey); }
});
$("#searchForm").addEventListener("submit", e => { e.preventDefault(); go(false, false); });
function go(newTab, forceWeb) {
  if (!term) return;
  if (!forceWeb && hits[sel]?.classList.contains("tpl-missing")) { openPanelAt("tenants"); return; }
  const url = !forceWeb && hits[sel] ? hits[sel].href : ENGINES[S().search.engine][1] + encodeURIComponent(term);
  if (!forceWeb && hits[sel]) countHit(hits[sel].dataset.link);
  if (newTab || (S().links.newTab && !forceWeb && hits[sel])) window.open(url, "_blank", "noopener");
  else location.href = url;
}

/* ---------- Block menu ---------- */
const menu = $("#menu");
function openMenu(anchor, blockId) {
  const b = findBlock(blockId);
  const item = (label, fn, cls) => h("button", { type: "button", role: "menuitem", class: cls, onclick: () => { closeMenu(); fn(); } }, label);
  const openable = b.links.filter(linkHref).length;
  menu.replaceChildren(...[
    openable > 1 ? item(tr("Ouvrir les {n} liens", { n: openable }), () => openAll(b)) : null,
    b.src ? null : item(tr("Ajouter un lien"), () => openLinkDrawer(b.id)),
    item(tr("Partager…"), () => openShareDrawer(b)),
    b.src ? item(tr("Actualiser"), () => syncSource(b.src, true)) : null,
    b.src ? item(tr("Se désabonner (garder une copie)"), () => unsubscribe(b)) : null,
    item(tr("Modifier le bloc…"), () => openBlockDrawer(b.id)),
    item(tr(b.view === "grid" ? "Afficher en liste" : "Afficher en grille d'icônes"), () => { b.view = b.view === "grid" ? "list" : "grid"; save(); render(); }),
    // Pointer-free alternative to dragging blocks (WCAG 2.5.7)
    blockNeighbor(b, -1) ? item(tr("Placer avant"), () => moveBlock(b, -1)) : null,
    blockNeighbor(b, 1) ? item(tr("Placer après"), () => moveBlock(b, 1)) : null,
    ...state.spaces.filter(sp => sp.id !== b.space).map(sp => item(tr("Déplacer vers {name}", { name: sp.name }), () => {
      commit(() => { b.space = sp.id; }, tr("« {name} » déplacé vers {space}", { name: b.title, space: sp.name }));
    })),
    h("hr"),
    item(tr("Supprimer le bloc"), () => deleteBlock(b.id), "danger")
  ].filter(Boolean));
  menu.hidden = false;
  const r = anchor.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8)) + "px";
  menu.style.top = (r.bottom + mh + 8 > innerHeight ? r.top - mh - 4 : r.bottom + 4) + "px";
  menu.querySelector("button").focus();
}
function closeMenu() { menu.hidden = true; }
const blockNeighbor = (b, dir) => { const same = state.blocks.filter(x => x.space === b.space); return same[same.indexOf(b) + dir]; };
function moveBlock(b, dir) {
  const other = blockNeighbor(b, dir);
  commit(() => {
    const i = state.blocks.indexOf(b), j = state.blocks.indexOf(other);
    [state.blocks[i], state.blocks[j]] = [other, b];
  });
  document.querySelector(`.block[data-block="${b.id}"] .block-h button[aria-haspopup]`)?.focus();
}
function openAll(b) {
  const urls = b.links.map(linkHref).filter(Boolean);
  b.links.forEach(l => { if (linkHref(l)) countHit(l.id); });
  let blocked = 0;
  for (const u of urls) {
    const w = window.open(u, "_blank");
    if (w) w.opener = null; else blocked++;
  }
  if (blocked) toast(plural(blocked, "Safari a bloqué {n} onglet. Autorise les fenêtres pop-up pour cette page dans Safari → Réglages → Sites web.",
    "Safari a bloqué {n} onglets. Autorise les fenêtres pop-up pour cette page dans Safari → Réglages → Sites web."));
}
document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest("[aria-haspopup]")) closeMenu(); });
function deleteBlock(id) {
  const b = findBlock(id);
  commit(() => { state.blocks = state.blocks.filter(x => x.id !== id); }, tr("Bloc « {name} » supprimé", { name: b.title }));
}

/* ---------- Drawers ---------- */
let openDrawer = null, lastFocus = null;
function showDrawer(el) {
  closeMenu();
  lastFocus = document.activeElement;
  openDrawer = el; el.hidden = false; $("#scrim").hidden = false;
  setTimeout(() => el.querySelector("input,select,button")?.focus(), 0);
}
function closeDrawer() {
  if (!openDrawer) return;
  openDrawer.hidden = true; $("#scrim").hidden = true; openDrawer = null;
  lastFocus?.focus?.();
}
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeDrawer));
$("#scrim").addEventListener("click", closeDrawer);

let editLinkId = null;
function openLinkDrawer(blockId, linkId, presetUrl) {
  editLinkId = linkId || null;
  const found = linkId ? findLink(linkId) : null;
  $("#linkTitle").textContent = tr(found ? "Modifier le lien" : "Ajouter un lien");
  $("#linkUrl").value = found ? found.link.url : (presetUrl || "");
  $("#linkName").value = found ? found.link.name : "";
  $("#linkIcon").value = found?.link.icon || "";
  $("#linkTplTip").hidden = !tenantsAnywhere();
  $("#linkDev").value = found?.link.envs?.dev || "";
  $("#linkTest").value = found?.link.envs?.test || "";
  $("#envFields").open = !!found?.link.envs;
  $("#linkBlock").replaceChildren(...state.blocks.filter(b => !b.src).map(b => h("option", { value: b.id, selected: b.id === (found ? found.block.id : blockId) }, b.title)));
  fillLinkPos(found ? found.index : null);
  $("#linkDelete").hidden = !found;
  $("#linkErr").hidden = true;
  showDrawer($("#linkDrawer"));
}
// Pointer-free alternative to drag-and-drop (WCAG 2.5.7): pick the slot from a list
function fillLinkPos(current) {
  const b = findBlock($("#linkBlock").value);
  if (!b) { $("#linkPos").replaceChildren(); return; }
  const others = b.links.filter(l => l.id !== editLinkId);
  const at = current ?? others.length;
  $("#linkPos").replaceChildren(...others.map((l, i) => h("option", { value: i, selected: i === at }, tr("Avant « {name} »", { name: l.name }))),
    h("option", { value: others.length, selected: at >= others.length }, tr(others.length ? "À la fin" : "Premier lien")));
}
$("#linkBlock").addEventListener("change", () => fillLinkPos(null));
$("#linkUrl").addEventListener("blur", () => {
  const u = normalizeLinkUrl($("#linkUrl").value);
  if (u && !$("#linkName").value.trim()) $("#linkName").placeholder = guessName(fillTpl(u, "tenant", ""));
});
$("#linkForm").addEventListener("submit", e => {
  e.preventDefault();
  const url = normalizeLinkUrl($("#linkUrl").value);
  const envs = {};
  for (const [key, label, id] of [["dev", "DEV", "#linkDev"], ["test", "TEST", "#linkTest"]]) {
    const raw = $(id).value.trim();
    if (!raw) continue;
    envs[key] = normalizeLinkUrl(raw);
    if (!envs[key]) { $("#envFields").open = true; $("#linkErr").textContent = tr("L'adresse {env} n'est pas valide.", { env: label }); $("#linkErr").hidden = false; return; }
  }
  const linkEnvs = envs.dev || envs.test ? { dev: envs.dev || "", test: envs.test || "" } : undefined;
  if (!url) { $("#linkErr").textContent = tr("Cette adresse n'est pas valide. Exemple : https://github.com ou https://{tenant}.example.com"); $("#linkErr").hidden = false; return; }
  const rawIcon = $("#linkIcon").value.trim();
  const icon = /^data:image\//.test(rawIcon) ? rawIcon : rawIcon && normalizeUrl(rawIcon);
  if (rawIcon && !icon) { $("#linkErr").textContent = tr("L'adresse de l'icône n'est pas valide."); $("#linkErr").hidden = false; return; }
  if (!state.blocks.some(b => !b.src)) { $("#linkErr").textContent = tr("Crée d'abord un bloc pour y ranger ce lien."); $("#linkErr").hidden = false; return; }
  const name = $("#linkName").value.trim() || guessName(fillTpl(url, "tenant", ""));
  const target = findBlock($("#linkBlock").value) || state.blocks.find(b => !b.src);
  const pos = +$("#linkPos").value;
  const wasEdit = !!editLinkId;
  commit(() => {
    if (editLinkId) {
      const f = findLink(editLinkId);
      Object.assign(f.link, { name, url });
      if (linkEnvs) f.link.envs = linkEnvs; else delete f.link.envs;
      if (icon) f.link.icon = icon; else delete f.link.icon;
      f.block.links.splice(f.index, 1);
      target.links.splice(pos, 0, f.link);
    } else {
      const link = { id: uid(), name, url };
      if (linkEnvs) link.envs = linkEnvs;
      if (icon) link.icon = icon;
      target.links.splice(pos, 0, link);
      target.collapsed = false;
    }
  });
  closeDrawer();
  toast(wasEdit ? tr("Lien mis à jour") : tr("Lien ajouté à « {name} »", { name: target.title }));
});
function deleteLink(id) {
  const f = findLink(id);
  commit(() => f.block.links.splice(f.index, 1), tr("« {name} » supprimé", { name: f.link.name }));
}
$("#linkDelete").addEventListener("click", () => { const id = editLinkId; closeDrawer(); deleteLink(id); });

let editBlockId = null;
$("#swatches").append(...COLORS.map(c => h("label", { title: COLOR_NAMES[c] }, h("input", { type: "radio", name: "blockColor", value: c, "aria-label": COLOR_NAMES[c] }), h("span", { style: `background:var(--${c})` }))));
function openBlockDrawer(id) {
  editBlockId = id || null;
  const b = id ? findBlock(id) : null;
  $("#blockTitle").textContent = tr(b ? "Modifier le bloc" : "Nouveau bloc");
  $("#swatches").querySelectorAll("label").forEach((el, i) => { el.title = tr(COLOR_NAMES[COLORS[i]]); el.querySelector("input").setAttribute("aria-label", el.title); });
  $("#blockName").value = b ? b.title : "";
  // A subscribed block takes its title from the source
  $("#blockName").disabled = !!b?.src;
  const sp = b ? b.space : currentSpace;
  $("#blockSpace").replaceChildren(...state.spaces.map(s => h("option", { value: s.id, selected: s.id === sp }, s.name)));
  const color = b ? b.color : COLORS[state.blocks.length % COLORS.length];
  document.querySelector(`input[name=blockColor][value=${color}]`).checked = true;
  document.querySelector(`input[name=blockView][value=${b ? b.view : "list"}]`).checked = true;
  $("#blockDelete").hidden = !b;
  $("#blockErr").hidden = true;
  $("#blockTplField").hidden = !!b;
  $("#blockTpl").querySelector("option[value=m365]").hidden = !S().m365admin;
  $("#blockTpl").value = "";
  $("#blockSrcField").hidden = true;
  $("#blockSrc").value = "";
  $("#blockTenant").value = state.tenants.length ? currentTenant().slug : "";
  $("#blockTenantField").hidden = true;
  $("#blockCatsField").hidden = true;
  $("#blockNameField").hidden = false;
  $("#swatches").closest(".field").hidden = false;
  showDrawer($("#blockDrawer"));
}
// One block per category. Links with {tenant} follow the chosen tenant; the admin centers open the signed-in account's tenant
const M365_CATS = [
  { id: "core", title: "Administration principale", color: "c6", desc: "Centre d'admin, Entra, Azure, santé du service", links: [
    ["Admin Microsoft 365", "https://admin.microsoft.com"],
    ["Entra ID", "https://entra.microsoft.com"],
    ["Portail Azure", "https://portal.azure.com/#@{tenant}.onmicrosoft.com"],
    ["Admin Microsoft 365 Apps", "https://config.office.com"],
    ["Utilisateurs actifs", "https://admin.microsoft.com/#/users"],
    ["Licences", "https://admin.microsoft.com/#/licenses"],
    ["Centre de messages", "https://admin.microsoft.com/#/MessageCenter"],
    ["Santé du service", "https://admin.microsoft.com/#/servicehealth"]] },
  { id: "collab", title: "Collaboration", color: "c2", desc: "SharePoint, OneDrive, Teams, Exchange", links: [
    ["Admin SharePoint", "https://{tenant}-admin.sharepoint.com"],
    ["Accueil SharePoint", "https://{tenant}.sharepoint.com"],
    ["OneDrive", "https://{tenant}-my.sharepoint.com"],
    ["Admin Teams", "https://admin.teams.microsoft.com"],
    ["Admin Exchange", "https://admin.exchange.microsoft.com"],
    ["Suivi des messages", "https://admin.exchange.microsoft.com/#/messagetrace"]] },
  { id: "pp", title: "Power Platform", color: "c5", desc: "Centre d'admin, Apps, Automate, Fabric, Copilot Studio", links: [
    ["Admin Power Platform", "https://admin.powerplatform.microsoft.com"],
    ["Power Automate", "https://make.powerautomate.com"],
    ["Power Apps", "https://make.powerapps.com"],
    ["Power Pages", "https://make.powerpages.microsoft.com"],
    ["Power BI / Fabric", "https://app.fabric.microsoft.com"],
    ["Copilot Studio", "https://copilotstudio.microsoft.com"]] },
  { id: "sec", title: "Sécurité et conformité", color: "c1", desc: "Defender, Secure Score, Purview, accès conditionnel", links: [
    ["Microsoft Defender", "https://security.microsoft.com"],
    ["Secure Score", "https://security.microsoft.com/securescore"],
    ["Incidents", "https://security.microsoft.com/incidents"],
    ["Microsoft Purview", "https://purview.microsoft.com"],
    ["Accès conditionnel", "https://entra.microsoft.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies"],
    ["Journaux de connexion", "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/SignInEventsV3Blade"]] },
  { id: "dev", title: "Appareils", color: "c3", desc: "Intune, Windows 365, appareils Defender", links: [
    ["Admin Intune", "https://intune.microsoft.com"],
    ["Tous les appareils", "https://intune.microsoft.com/#view/Microsoft_Intune_DeviceSettings/DevicesMenu/~/allDevices"],
    ["Windows 365", "https://windows365.microsoft.com"],
    ["Inventaire Defender", "https://security.microsoft.com/machines"]] },
  { id: "copilot", title: "Copilot et IA", color: "c4", desc: "Admin Copilot, Copilot Chat, agents", links: [
    ["Admin Copilot", "https://admin.microsoft.com/#/copilot"],
    ["Microsoft 365 Copilot", "https://m365.cloud.microsoft/chat"],
    ["Copilot Studio", "https://copilotstudio.microsoft.com"],
    ["Azure AI Foundry", "https://ai.azure.com"]] },
  { id: "me", title: "Mon compte", color: "c4", desc: "Profil, applis, connexions, accès, groupes", links: [
    ["Mon compte", "https://myaccount.microsoft.com"],
    ["Mes applications", "https://myapps.microsoft.com"],
    ["Mes connexions", "https://mysignins.microsoft.com"],
    ["Mes accès", "https://myaccess.microsoft.com"],
    ["Mes groupes", "https://mygroups.microsoft.com"]] },
  { id: "tools", title: "Outils et diagnostic", color: "c3", desc: "Graph Explorer, état du service, feuille de route", links: [
    ["Graph Explorer", "https://developer.microsoft.com/graph/graph-explorer"],
    ["État des services Microsoft", "https://status.cloud.microsoft"],
    ["Feuille de route Microsoft 365", "https://www.microsoft.com/microsoft-365/roadmap"],
    ["Analyseur de connectivité", "https://testconnectivity.microsoft.com"],
    ["Analyseur d'en-têtes", "https://mha.azurewebsites.net"],
    ["Docs admin Microsoft 365", "https://learn.microsoft.com/microsoft-365/admin/"]] }
];
// Unchecked by default: personal pages and tools are less "admin"
const M365_DEFAULT_OFF = new Set(["copilot", "tools"]);
const M365_SPACE = "admin-o365";
const m365AdminBlocks = space => M365_CATS.filter(c => !M365_DEFAULT_OFF.has(c.id)).map(c => ({
  id: uid(), space, title: tr(c.title), color: c.color, view: "list", collapsed: false,
  links: c.links.map(([name, url]) => ({ id: uid(), name: tr(name), url })) }));
// Turning the switch on in an existing dashboard: add the Admin O365 tab once, never touch the other spaces
function addM365Space() {
  if (state.spaces.some(x => x.id === M365_SPACE)) return;
  const blocks = m365AdminBlocks(M365_SPACE);
  commit(() => {
    state.spaces.push({ id: M365_SPACE, name: tr("Admin O365") });
    state.blocks.push(...blocks);
    setSpace(M365_SPACE);
  }, tr(state.tenants.length ? "Espace « {space} » ajouté avec {n} blocs" : "Espace « {space} » ajouté avec {n} blocs. Ajoute ton tenant pour SharePoint et OneDrive.",
    { space: tr("Admin O365"), n: blocks.length }));
  buildPanel();
}
function renderTplCats() {
  $("#blockCats").replaceChildren(...M365_CATS.map(c => h("label", {},
    h("input", { type: "checkbox", value: c.id, checked: !M365_DEFAULT_OFF.has(c.id) }),
    h("i", { style: `background:var(--${c.color})` }),
    h("span", {}, tr(c.title), h("small", {}, `${tr(c.desc)} · ${plural(c.links.length, "{n} lien", "{n} liens")}`)))));
}
$("#blockTpl").addEventListener("change", e => {
  const m365 = e.target.value === "m365", sub = e.target.value === "sub";
  $("#blockTenantField").hidden = !m365;
  $("#blockCatsField").hidden = !m365;
  $("#blockSrcField").hidden = !sub;
  // Each category block takes its own title and color, a subscribed block takes the source's title
  $("#blockNameField").hidden = m365 || sub;
  $("#swatches").closest(".field").hidden = m365;
  if (m365) { renderTplCats(); $("#blockTenant").focus(); }
  if (sub) $("#blockSrc").focus();
});
$("#blockForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!editBlockId && $("#blockTpl").value === "sub") return submitSubscription();
  const m365 = !editBlockId && $("#blockTpl").value === "m365";
  const title = $("#blockName").value.trim();
  if (!title && !m365 && !findBlock(editBlockId)?.src) { $("#blockErr").textContent = tr("Donne un titre au bloc."); $("#blockErr").hidden = false; return; }
  const color = document.querySelector("input[name=blockColor]:checked").value;
  const view = document.querySelector("input[name=blockView]:checked").value;
  const space = $("#blockSpace").value;
  const slug = tenantSlug($("#blockTenant").value);
  const cats = m365 ? M365_CATS.filter(c => $("#blockCats").querySelector(`input[value=${c.id}]`)?.checked) : [];
  if (m365 && !slug) { $("#blockErr").textContent = tr("Indique le nom du tenant, par exemple contoso."); $("#blockErr").hidden = false; return; }
  if (m365 && !cats.length) { $("#blockErr").textContent = tr("Coche au moins une catégorie."); $("#blockErr").hidden = false; return; }
  commit(() => {
    if (editBlockId) { const eb = findBlock(editBlockId); Object.assign(eb, { title: eb.src ? eb.title : title, color, view, space }); }
    else if (m365) {
      let t = state.tenants.find(x => x.slug === slug);
      if (!t) {
        t = { id: uid(), name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, domain: "", color: COLORS[state.tenants.length % COLORS.length] };
        state.tenants.push(t);
      }
      state.meta.tenant = t.id;
      for (const c of cats)
        state.blocks.push({ id: uid(), space, title: tr(c.title), color: c.color, view, collapsed: false, links: c.links.map(([name, url]) => ({ id: uid(), name: tr(name), url })) });
    }
    else state.blocks.push({ id: uid(), space, title, color, view, collapsed: false, links: [] });
  });
  closeDrawer();
  if (m365) toast(plural(cats.length, "{n} bloc Microsoft 365 créé pour « {name} »", "{n} blocs Microsoft 365 créés pour « {name} »", { name: currentTenant().name }));
});
$("#blockDelete").addEventListener("click", () => { const id = editBlockId; closeDrawer(); deleteBlock(id); });

/* ---------- Export / import / reset ---------- */
function exportData() {
  state.meta.lastExport = new Date().toISOString();
  save();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `cockpit-steffpoint-${state.meta.lastExport.slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  syncPanel();
  toast(tr("Export téléchargé"));
}
$("#importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let data;
  try { data = normalize(JSON.parse(await file.text())); } catch { data = null; }
  const note = $("#note-backup");
  if (!data) { note.className = "note err"; note.textContent = tr("Ce fichier n'est pas un export de Cockpit SteffPoint (il manque la liste des blocs)."); return; }
  store.set(KEY + "-backup", state);
  commit(() => { state = data; }, plural(data.blocks.length, "Import terminé : {n} bloc", "Import terminé : {n} blocs"));
  currentSpace = pickSpace();
  applySettings(); buildPanel(); render(); applyBackground(); loadWeather();
});

// Safari bookmarks export (Netscape HTML): each folder becomes a block in the current space
function parseBookmarks(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const groups = new Map();
  for (const a of doc.querySelectorAll("a[href]")) {
    const url = normalizeUrl(a.getAttribute("href"));
    if (!url || !/^https?:/.test(url)) continue;
    const path = [];
    let readingList = false;
    for (let dl = a.closest("dl"); dl; dl = dl.parentElement?.closest("dl")) {
      const h3 = dl.previousElementSibling?.tagName === "H3" ? dl.previousElementSibling : dl.parentElement?.querySelector(":scope > h3");
      if (!h3) continue;
      if (/readinglist/i.test(h3.id) || /^(liste de lecture|reading list)$/i.test(h3.textContent.trim())) readingList = true;
      path.unshift(h3.textContent.trim());
    }
    if (readingList) continue;
    const key = path.join(" / ") || tr("Signets Safari");
    if (!groups.has(key)) groups.set(key, { path, links: [] });
    groups.get(key).links.push({ id: uid(), name: a.textContent.trim() || guessName(url), url });
  }
  const lastNames = [...groups.values()].map(g => g.path.at(-1));
  return [...groups.entries()].map(([key, g]) => {
    const last = g.path.at(-1) || key;
    return { title: lastNames.filter(n => n === last).length > 1 ? key : last, links: g.links };
  });
}
$("#bookmarkFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const note = $("#note-bookmarks");
  let groups = [];
  try { groups = parseBookmarks(await file.text()); } catch {}
  if (!groups.length) { note.className = "note err"; note.textContent = tr("Aucun signet trouvé. Choisis le fichier « Signets.html » exporté par Safari."); return; }
  const total = groups.reduce((n, g) => n + g.links.length, 0);
  commit(() => {
    groups.forEach((g, i) => state.blocks.push({
      id: uid(), space: currentSpace, title: g.title, color: COLORS[(state.blocks.length + i) % COLORS.length],
      view: "list", collapsed: g.links.length > 12, links: g.links
    }));
  }, tr("{blocks} blocs et {links} liens importés dans {space}", { blocks: groups.length, links: total, space: spaceName(currentSpace) }));
  note.className = "note ok"; note.textContent = tr("{n} blocs importés. Range-les ou supprime ceux en trop en mode édition.", { n: groups.length });
});
function resetAll() {
  const { settings, tenants, meta } = state;
  commit(() => {
    state = normalize(defaults());
    Object.assign(state, { settings, tenants });
    Object.assign(state.meta, { lastExport: meta.lastExport, since: meta.since, tenant: meta.tenant });
  }, tr("Exemples restaurés"));
  currentSpace = pickSpace();
  buildPanel(); render();
}

/* ---------- Drag & drop ---------- */
let drag = null;
const blocksEl = $("#blocks");
function clearDropMarks() { document.querySelectorAll(".drop-before,.drop-target,.drop-end").forEach(el => el.classList.remove("drop-before", "drop-target", "drop-end")); }
blocksEl.addEventListener("dragstart", e => {
  if (!editing) return;
  const li = e.target.closest?.("li[data-link]");
  const head = e.target.closest?.(".block-h");
  if (li) drag = { type: "link", id: li.dataset.link, el: li };
  else if (head) drag = { type: "block", id: head.parentElement.dataset.block, el: head.parentElement };
  else return;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", drag.id);
  requestAnimationFrame(() => drag?.el.classList.add("dragging"));
});
blocksEl.addEventListener("dragend", () => { drag?.el.classList.remove("dragging"); drag = null; clearDropMarks(); });
const isExternalUrlDrag = e => !drag && [...e.dataTransfer.types].some(t => t === "text/uri-list" || t === "text/plain");
blocksEl.addEventListener("dragover", e => {
  const block = e.target.closest(".block");
  if (!block) return;
  if (drag?.type === "block") {
    e.preventDefault(); clearDropMarks();
    if (block !== drag.el) block.classList.add("drop-target");
  } else if ((drag?.type === "link" || isExternalUrlDrag(e)) && !findBlock(block.dataset.block)?.src) {
    e.preventDefault(); clearDropMarks();
    e.dataTransfer.dropEffect = drag ? "move" : "copy";
    const li = e.target.closest("li[data-link]");
    if (li && li !== drag?.el) li.classList.add("drop-before");
    else if (!li) block.querySelector(".links").classList.add("drop-end");
    if (!drag) block.classList.add("drop-target");
  }
});
blocksEl.addEventListener("dragleave", e => { if (!blocksEl.contains(e.relatedTarget)) clearDropMarks(); });
blocksEl.addEventListener("drop", e => {
  const block = e.target.closest(".block");
  clearDropMarks();
  if (!block) return;
  e.preventDefault();
  const targetBlock = findBlock(block.dataset.block);
  if (drag?.type !== "block" && targetBlock.src) return;
  if (drag?.type === "block") {
    if (block === drag.el) return;
    const moving = findBlock(drag.id);
    commit(() => {
      state.blocks = state.blocks.filter(b => b !== moving);
      state.blocks.splice(state.blocks.indexOf(targetBlock), 0, moving);
    });
  } else if (drag?.type === "link") {
    const beforeId = e.target.closest("li[data-link]")?.dataset.link;
    if (beforeId === drag.id) return;
    const src = findLink(drag.id);
    commit(() => {
      src.block.links.splice(src.index, 1);
      const i = beforeId ? targetBlock.links.findIndex(l => l.id === beforeId) : -1;
      targetBlock.links.splice(i > -1 ? i : targetBlock.links.length, 0, src.link);
    });
  } else {
    const raw = (e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")).split("\n").find(s => s && !s.startsWith("#"));
    addUrlTo(targetBlock, raw);
  }
});
function addUrlTo(block, raw) {
  const url = normalizeUrl(raw);
  if (!url || !block || block.src) return false;
  commit(() => { block.links.push({ id: uid(), name: guessName(url), url }); block.collapsed = false; }, tr("Lien ajouté à « {name} »", { name: block.title }));
  return true;
}

/* ---------- Paste anywhere ---------- */
let hoverBlockId = null;
blocksEl.addEventListener("mouseover", e => { hoverBlockId = e.target.closest(".block")?.dataset.block || hoverBlockId; });
document.addEventListener("paste", e => {
  if (e.target.closest?.("input,textarea,select") || openDrawer) return;
  const text = e.clipboardData.getData("text").trim();
  if (!looksUrl(text)) return;
  e.preventDefault();
  const hovered = findBlock(hoverBlockId);
  const target = hovered?.space === currentSpace && !hovered.src ? hovered : state.blocks.find(b => b.space === currentSpace && !b.src);
  if (!target) { openBlockDrawer(); return; }
  addUrlTo(target, text);
});

/* ---------- Keyboard ---------- */
document.addEventListener("keydown", e => {
  // The onboarding dialog handles its own keys
  if (!$("#onb").hidden) return;
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return; }
  if (!palette.hidden) return;
  if (e.key === "Escape") {
    if (!menu.hidden) closeMenu();
    else if (openDrawer) closeDrawer();
    else if (panel.classList.contains("open")) togglePanel(false);
    else if (editing) toggleEdit(false);
    return;
  }
  // ⌥1–6 opens the frequent links shown by Accueil and Cockpit
  if (!openDrawer && e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-9]$/.test(e.code) && $("#freq").childNodes.length) {
    const f = topLinks()[+e.code.slice(5) - 1];
    if (f) { e.preventDefault(); openLink(f.link); }
    return;
  }
  if (openDrawer || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea,select")) return;
  // WCAG 2.1.4: single-character shortcuts can be turned off
  if (!S().keys) return;
  if (e.key === "/") { e.preventDefault(); q.focus(); q.select(); }
  else if (e.key === "e" || e.key === "E") toggleEdit();
  else if (e.key === ",") togglePanel();
  else if (e.key === "?") location.href = "aide.html";
  else if (e.key === "t" || e.key === "T") cycleTenant();
  else if (e.key === "v" || e.key === "V") cycleEnv();
  else if (/^[1-9]$/.test(e.key) && state.spaces[e.key - 1]) setSpace(state.spaces[e.key - 1].id);
});
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 60), { passive: true });
function toggleEdit(on = !editing) {
  editing = on;
  $("#editBtn").setAttribute("aria-pressed", String(on));
  render();
}
$("#editBtn").addEventListener("click", () => toggleEdit());

/* ---------- Onboarding ---------- */
const ONB_STEPS = ["Bienvenue", "Espaces", "Favoris", "Style", "Infos", "Récap"];
const ONB_TIPS = [
  "Ton prénom sert seulement à la salutation. Rien ne quitte ton navigateur.",
  "Commence avec 2 ou 3 espaces. Tu en ajouteras quand le besoin viendra.",
  "Les blocs SharePoint et OneDrive utilisent ton tenant pour construire les bons liens.",
  "Tu pourras changer de disposition à tout moment dans les réglages.",
  "La météo vient d'Open-Meteo. Ni compte ni clé API à fournir.",
  "Pense à exporter ta configuration (.json) pour la retrouver sur un autre poste."
];
const ONB_LAYOUTS = [
  ["classic", "Classique", "Grande horloge, la vue d'origine"],
  ["accueil", "Accueil", "Grande salutation, fréquents en avant"],
  ["cockpit", "Cockpit", "Colonne d'infos, tout visible d'un coup"],
  ["lanceur", "Lanceur", "Recherche au centre, tuiles d'icônes"]
];
const ONB_BGS = [["photo", "Photo floutée"], ["gradient", "Dégradé"], ["color", "Uni"]];
// Links with {tenant} are resolved by resolveUrl() for the active tenant
const PRESETS = [
  { id: "m365", title: "Microsoft 365", color: "c4", mono: "M", desc: "Accueil, Outlook, Calendrier, Teams, OneDrive, Copilot", links: [
    ["Accueil Microsoft 365", "https://m365.cloud.microsoft"], ["Outlook", "https://outlook.office.com/mail/"],
    ["Calendrier", "https://outlook.office.com/calendar/"], ["Teams", "https://teams.microsoft.com"],
    ["OneDrive", "https://{tenant}-my.sharepoint.com"], ["Microsoft 365 Copilot", "https://m365.cloud.microsoft/chat"]] },
  { id: "office", title: "Office", color: "c1", mono: "O", desc: "Word, Excel, PowerPoint, OneNote, Forms, Loop", links: [
    ["Word", "https://www.office.com/launch/word"], ["Excel", "https://www.office.com/launch/excel"],
    ["PowerPoint", "https://www.office.com/launch/powerpoint"], ["OneNote", "https://www.onenote.com/notebooks"],
    ["Forms", "https://forms.office.com"], ["Loop", "https://loop.cloud.microsoft"]] },
  { id: "sp", title: "SharePoint", color: "c2", mono: "SP", desc: "Accueil du tenant, sites suivis, Viva Engage", links: [
    ["Accueil SharePoint", "https://{tenant}.sharepoint.com"],
    ["Mes sites", "https://{tenant}.sharepoint.com/_layouts/15/sharepoint.aspx"],
    ["Viva Engage", "https://engage.cloud.microsoft"]] },
  { id: "tasks", title: "Tâches", color: "c6", mono: "T", desc: "Planner, To Do, Bookings", links: [
    ["Planner", "https://planner.cloud.microsoft"], ["To Do", "https://to-do.office.com"],
    ["Bookings", "https://outlook.office.com/bookings/"]] },
  { id: "pp", title: "Power Platform", color: "c5", mono: "PP", desc: "Power Apps, Automate, BI, Copilot Studio", links: [
    ["Power Apps", "https://make.powerapps.com"], ["Power Automate", "https://make.powerautomate.com"],
    ["Power BI", "https://app.powerbi.com"], ["Copilot Studio", "https://copilotstudio.microsoft.com"]] },
  { id: "gh", title: "GitHub", color: "c3", mono: "GH", desc: "Tableau de bord, PR, issues, notifications", links: [
    ["Tableau de bord", "https://github.com"], ["Pull requests", "https://github.com/pulls"],
    ["Issues", "https://github.com/issues"], ["Notifications", "https://github.com/notifications"]] }
];
const presetNeedsTenant = p => p.links.some(([, url]) => TPL.test(url));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slugify = n => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
// Same cleanup as the tenant editor: "https://contoso-admin.sharepoint.com" or "contoso.onmicrosoft.com" → "contoso"
const tenantSlug = v => v.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[./]/)[0].replace(/-(admin|my)$/, "");
let W = null; // wizard draft, nothing is written until the last step

function openOnboarding({ rerun = false } = {}) {
  const s = S(), t = currentTenant();
  W = {
    rerun, step: 0, note: "",
    name: s.name,
    spaces: rerun ? state.spaces.map(x => ({ name: x.name, on: true, locked: true }))
                  : [{ id: "pro", name: tr("Pro"), on: true }, { id: "perso", name: tr("Perso"), on: true }, { id: "admin", name: tr("Administration"), on: false }],
    newSpace: "",
    tenant: rerun && t ? t.slug : "",
    presets: new Set(),
    m365: rerun && S().m365admin,
    imported: [],
    layout: s.layout, bg: ["photo", "gradient", "color"].includes(s.bg.type) ? s.bg.type : "photo",
    weather: s.weather.on, city: s.weather.city, lat: s.weather.lat, lon: s.weather.lon, cityOk: true,
    engine: s.search.engine
  };
  $("#onb").hidden = false;
  // Real modal: the page behind can't be reached with Tab or a screen reader
  for (const el of document.body.children) if (el.id !== "onb" && el.tagName !== "SCRIPT") el.inert = true;
  document.body.style.overflow = "hidden";
  onbRender();
}
function onbClose() {
  $("#onb").hidden = true;
  for (const el of document.body.children) if (el.id !== "panel") el.inert = false;
  document.body.style.overflow = "";
  W = null;
  q.focus({ preventScroll: true });
  checkShareHash();
}

function onbStepHtml() {
  const firstSpace = W.spaces.find(x => x.on)?.name || tr("Pro");
  const needTenant = W.m365 || PRESETS.some(p => W.presets.has(p.id) && presetNeedsTenant(p));
  switch (W.step) {
    case 0: return `
      <h1 class="onb-h1" id="onbTitle">${tr(W.rerun ? "On reprend la configuration" : "Bienvenue sur ton cockpit")}</h1>
      <p class="onb-lead">${tr("Quelques questions pour préparer ta page. Ça prend une minute, et tout reste modifiable ensuite dans les réglages.")}</p>
      <label class="onb-field"><span>${tr("Comment veux-tu qu'on t'appelle ?")}</span>
        <input class="onb-input" data-field="name" value="${esc(W.name)}" placeholder="${tr("Ton prénom")}" autocomplete="given-name"></label>
      ${W.rerun ? "" : `<div class="onb-callout"><span>${tr("Tu as déjà une configuration ?")}</span>
        <button class="onb-btn soft" type="button" data-act="json">${tr("Importer un .json")}</button></div>`}
      <p class="onb-note ${W.noteCls || ""}">${esc(W.note)}</p>`;
    case 1: return `
      <div><h2 class="onb-h2" id="onbTitle">${tr("Tes espaces")}</h2>
        <p class="onb-lead">${tr("Chaque espace est un onglet avec ses propres favoris. Les touches 1 à 9 permettent de passer de l'un à l'autre.")}</p></div>
      <div class="onb-chips" role="group" aria-label="${tr("Espaces")}">
        ${W.spaces.map((x, i) => `<button class="onb-chip" type="button" data-act="space" data-i="${i}" aria-pressed="${x.on}" ${x.locked ? "disabled" : ""}>
          <span class="onb-check" aria-hidden="true"></span>${esc(x.name)}</button>`).join("")}
        <div class="onb-add"><input data-field="newSpace" value="${esc(W.newSpace)}" placeholder="${tr("Autre espace…")}" aria-label="${tr("Nouvel espace")}">
          <button type="button" data-act="addSpace">${tr("Ajouter")}</button></div>
      </div>`;
    case 2: return `
      <div><h2 class="onb-h2" id="onbTitle">${tr("De quoi partir ?")}</h2>
        <p class="onb-lead">${tr("Choisis des blocs prêts à l'emploi. Ils arrivent dans l'espace <b>{space}</b>.", { space: esc(firstSpace) })}</p></div>
      <div class="onb-grid" role="group" aria-label="${tr("Blocs prêts à l'emploi")}">
        ${PRESETS.map(p => `<button class="onb-card-opt" type="button" data-act="preset" data-id="${p.id}" aria-pressed="${W.presets.has(p.id)}">
          <span class="hd"><span class="mono" style="background:var(--${p.color})" aria-hidden="true">${p.mono}</span><span class="t">${tr(p.title)}</span><span class="onb-check" aria-hidden="true"></span></span>
          <span class="d">${tr(p.desc)}</span></button>`).join("")}
      </div>
      <div class="onb-field"><button class="onb-switch" type="button" role="switch" data-act="m365" aria-checked="${W.m365}" aria-describedby="onbM365Note"><i aria-hidden="true"></i>${tr("J'administre un tenant Microsoft 365")}</button>
        <p class="onb-note" id="onbM365Note">${tr("Ajoute un espace « {space} » avec un bloc par domaine : centre d'admin, collaboration, Power Platform, sécurité, appareils, mon compte.", { space: tr("Admin O365") })}</p></div>
      ${needTenant ? `<div class="onb-field"><label for="onbTenant"><span>${tr("Ton tenant Microsoft 365")}</span></label>
        <div class="onb-affix"><input class="onb-input" id="onbTenant" data-field="tenant" value="${esc(W.tenant)}" placeholder="${tr("monentreprise")}" autocapitalize="off" spellcheck="false" aria-describedby="onbTenantNote"><span aria-hidden="true">.sharepoint.com</span></div>
        <p class="onb-note" id="onbTenantNote">${tr("Facultatif. Sert à construire les liens SharePoint et OneDrive. Tu pourras en ajouter d'autres ensuite.")}</p></div>` : ""}
      <button class="onb-drop" type="button" data-act="bookmarks"><span class="i" aria-hidden="true">↥</span>
        <span><b>${tr("Importer les favoris du navigateur")}</b><small>${W.imported.length
          ? tr("{folders} dossiers, {links} liens prêts à importer", { folders: W.imported.length, links: W.imported.reduce((n, g) => n + g.links.length, 0) })
          : tr("Fichier .html exporté depuis Safari, Chrome, Edge ou Firefox")}</small></span></button>
      <p class="onb-note ${W.noteCls || ""}">${esc(W.note)}</p>`;
    case 3: return `
      <div><h2 class="onb-h2" id="onbTitle">${tr("Ton style")}</h2>
        <p class="onb-lead">${tr("La disposition change l'organisation de la page. L'aperçu se met à jour.")}</p></div>
      <div class="onb-grid layouts" role="group" aria-label="${tr("Disposition")}">
        ${ONB_LAYOUTS.map(([id, n, d]) => `<button class="onb-card-opt" type="button" data-act="layout" data-id="${id}" aria-pressed="${W.layout === id}">
          <span class="onb-wf ${id}" aria-hidden="true">${id === "cockpit" ? '<span class="side"></span>' : ""}<span class="col"><span class="hd"></span><span class="sr"></span><span class="bk"><i></i><i></i><i></i></span></span></span>
          <span class="t">${tr(n)}</span><span class="d">${tr(d)}</span></button>`).join("")}
      </div>
      <div class="onb-field"><span id="onbBgLabel">${tr("Fond d'écran")}</span>
        <div class="onb-seg" role="group" aria-labelledby="onbBgLabel">${ONB_BGS.map(([id, n]) => `<button type="button" data-act="bg" data-id="${id}" aria-pressed="${W.bg === id}">${tr(n)}</button>`).join("")}</div>
        <p class="onb-note">${tr(W.bg === "photo" ? "Une nouvelle photo chaque heure. Ta propre image, le flou et la luminosité se règlent ensuite."
          : W.bg === "gradient" ? "Un dégradé basé sur la couleur d'accent." : "Un fond sobre, sans distraction.")}</p></div>`;
    case 4: return `
      <div><h2 class="onb-h2" id="onbTitle">${tr("Météo et recherche")}</h2>
        <p class="onb-lead">${tr("Pour la ligne d'infos sous la salutation.")}</p></div>
      <div class="onb-field"><label for="onbCity"><span>${tr("Ville")}</span></label>
        <div class="onb-row"><input class="onb-input" id="onbCity" data-field="city" value="${esc(W.city)}" placeholder="${tr("Bruxelles")}">
          <button class="onb-btn soft" type="button" data-act="geo">◎ ${tr("Ma position")}</button></div>
        <p class="onb-note ${W.noteCls || ""}">${esc(W.note)}</p>
        <button class="onb-switch" type="button" role="switch" data-act="weather" aria-checked="${W.weather}"><i aria-hidden="true"></i>${tr("Afficher la météo")}</button></div>
      <div class="onb-field"><span id="onbEngineLabel">${tr("Moteur de recherche par défaut")}</span>
        <div class="onb-seg" role="group" aria-labelledby="onbEngineLabel">${Object.entries(ENGINES).map(([id, [n]]) => `<button type="button" data-act="engine" data-id="${id}" aria-pressed="${W.engine === id}">${n}</button>`).join("")}</div></div>`;
    case 5: {
      const nm = W.name.trim(), sp = W.spaces.filter(x => x.on).map(x => x.name);
      const blocks = [...PRESETS.filter(p => W.presets.has(p.id)).map(p => tr(p.title)), ...(W.m365 ? [tr("Admin O365")] : []), ...(W.imported.length ? [tr("{n} dossiers importés", { n: W.imported.length })] : [])];
      const rows = [
        [tr("Prénom"), nm || "—", 0], [tr("Espaces"), sp.join(", ") || "—", 1],
        ...(needTenant || W.tenant ? [[tr("Tenant"), tenantSlug(W.tenant) ? tenantSlug(W.tenant) + ".sharepoint.com" : "—", 2]] : []),
        [tr("Blocs"), blocks.join(", ") || tr("Aucun"), 2],
        [tr("Style"), tr(ONB_LAYOUTS.find(l => l[0] === W.layout)[1]) + " · " + tr(ONB_BGS.find(b => b[0] === W.bg)[1]), 3],
        [tr("Infos"), (W.weather ? W.city || "—" : tr("Météo masquée")) + " · " + ENGINES[W.engine][0], 4]
      ];
      return `
      <div><div class="onb-done" aria-hidden="true">✓</div></div>
      <div><h1 class="onb-h1" id="onbTitle">${nm ? tr("C'est prêt, {name}.", { name: esc(nm) }) : tr("C'est prêt.")}</h1>
        <p class="onb-lead">${tr("Voici ce qui a été configuré. Tout reste modifiable via ⚙ en bas à droite.")}</p></div>
      <div class="onb-recap">${rows.map(([k, v, st]) => `<div><span class="k">${k}</span><span class="v">${esc(v)}</span>
        <button type="button" data-act="goto" data-step="${st}" aria-label="${tr("Modifier : {k}", { k })}">${tr("Modifier")}</button></div>`).join("")}</div>
      ${S().keys ? `<div class="onb-keys"><span><kbd>/</kbd> ${tr("rechercher")}</span><span><kbd>1–9</kbd> ${tr("changer d'espace")}</span><span><kbd>E</kbd> ${tr("mode édition")}</span></div>` : ""}`;
    }
  }
}

function onbPreview() {
  const nm = W.name.trim(), greet = nm ? `${autoGreet()}, ${esc(nm)}` : autoGreet();
  const tabs = [...W.spaces.filter(x => x.on).map(x => x.name), ...(W.m365 ? [tr("Admin O365")] : [])].map(n => `<span>${esc(n)}</span>`).join("");
  const bks = [...PRESETS.filter(p => W.presets.has(p.id)).map(p => [tr(p.title), `var(--${p.color})`]),
               ...W.imported.slice(0, 4).map((g, i) => [g.title, `var(--${COLORS[i % COLORS.length]})`])];
  const time = new Date().toLocaleTimeString(LOCALE(), { hour: "2-digit", minute: "2-digit" });
  const meta = [time, W.weather && W.city ? W.city : ""].filter(Boolean).join(" · ");
  const pv = $("#onbPv");
  pv.className = `onb-pv ${W.layout} ${W.bg}`;
  pv.innerHTML = `
    ${W.layout === "cockpit" ? `<div class="side">${greet}<s></s></div>` : ""}
    <div class="col">
      ${W.layout === "classic" ? `<div><div class="greet">${time}</div><div class="meta">${greet}</div></div>` : ""}
      ${W.layout === "accueil" || W.layout === "lanceur" ? `<div><div class="greet">${greet}</div><div class="meta">${esc(meta)}</div></div>` : ""}
      <div class="sr">${tr("Rechercher avec {engine}", { engine: ENGINES[W.engine][0] })}</div>
      <div class="tabs">${tabs}</div>
      ${bks.length ? `<div class="bks">${bks.map(([t, c]) => `<div class="bk"><b><i style="background:${c}"></i>${esc(t)}</b><s></s><s></s><s></s></div>`).join("")}</div>`
                   : `<div class="empty">${tr("Aucun bloc pour l'instant")}</div>`}
    </div>`;
}

// Selector that finds the same control again after a re-render (keeps keyboard focus in place)
function onbFocusKey(el) {
  if (!el || !$("#onb").contains(el)) return null;
  const d = el.dataset;
  if (d.field) return `[data-field="${d.field}"]`;
  if (d.act) return `[data-act="${d.act}"]` + (d.id ? `[data-id="${d.id}"]` : "") + (d.i ? `[data-i="${d.i}"]` : "") + (d.step ? `[data-step="${d.step}"]` : "");
  return el.id ? "#" + el.id : null;
}
function onbRender(focus = true) {
  const st = W.step, last = ONB_STEPS.length - 1;
  const keep = focus ? null : onbFocusKey(document.activeElement);
  $("#onbBars").innerHTML = ONB_STEPS.map((_, i) => `<i class="${i <= st ? "on" : ""}"></i>`).join("");
  $("#onbStep").textContent = tr("Étape {n} sur {total} · {name}", { n: st + 1, total: ONB_STEPS.length, name: tr(ONB_STEPS[st]) });
  $("#onbSkipAll").hidden = st === last;
  $("#onbBack").hidden = st === 0;
  $("#onbLater").hidden = st === 0 || st === last;
  const nm = W.name.trim();
  $("#onbNext").textContent = st === 0 ? (nm ? tr("Commencer, {name} →", { name: nm }) : tr("Commencer →")) : tr(st === last ? "Ouvrir mon tableau de bord" : "Continuer →");
  $("#onbBody").innerHTML = onbStepHtml();
  $("#onbTip").textContent = tr(ONB_TIPS[st]);
  onbPreview();
  if (focus) ($("#onbBody input") || $("#onbTitle") || $("#onbNext")).focus({ preventScroll: true });
  else if (keep) $("#onb").querySelector(keep)?.focus({ preventScroll: true });
}

const onbNote = (msg, cls = "") => { W.note = msg; W.noteCls = cls; $("#onbLive").textContent = msg; onbRender(false); };
function onbGo(step) { W.step = step; W.note = ""; onbRender(); }

async function onbNext() {
  if (W.step === 4 && W.weather && !W.cityOk && W.city.trim()) {
    const ok = await onbGeocode();
    if (!ok) return;
  }
  if (W.step === ONB_STEPS.length - 1) return onbFinish(false);
  onbGo(W.step + 1);
}

async function onbGeocode() {
  onbNote(tr("Recherche de la ville…"));
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(W.city)}&count=1&language=${lang}`);
    const res = (await r.json()).results?.[0];
    if (!res) { onbNote(tr("Aucune ville trouvée pour « {name} ».", { name: W.city }), "err"); return false; }
    Object.assign(W, { city: res.name, lat: +res.latitude.toFixed(3), lon: +res.longitude.toFixed(3), cityOk: true });
    onbNote(`${res.name}${res.country ? ", " + res.country : ""}`, "ok");
    return true;
  } catch { onbNote(tr("Recherche impossible : pas de connexion ?"), "err"); return false; }
}

function onbAddSpace() {
  const n = W.newSpace.trim();
  if (!n || W.spaces.some(x => x.name.toLowerCase() === n.toLowerCase())) return;
  W.spaces.push({ name: n, on: true });
  W.newSpace = "";
  onbRender(false);
  $('[data-field="newSpace"]').focus();
  $("#onbLive").textContent = tr("Espace « {name} » ajouté", { name: n });
}

function onbFinish(skip) {
  if (!skip) {
    const s = S();
    // Spaces
    const used = new Set(), spaces = [];
    for (const x of W.spaces.filter(x => x.on)) {
      const existing = state.spaces.find(e => e.name === x.name);
      // Default spaces keep their fixed ids so the weekday / weekend switch still finds them once translated
      let id = existing?.id || x.id || slugify(x.name);
      while (used.has(id)) id += "-2";
      used.add(id); spaces.push({ id, name: x.name });
    }
    if (!spaces.length) spaces.push({ id: "pro", name: tr("Pro") });
    // Microsoft 365 admin: its own space, filled once with the default category blocks
    const adminFresh = W.m365 && !spaces.some(x => x.id === M365_SPACE);
    if (adminFresh) spaces.push({ id: M365_SPACE, name: tr("Admin O365") });
    const ids = spaces.map(x => x.id), first = ids[0];
    // Tenant, only when a block needs one or one was typed
    const slug = tenantSlug(W.tenant);
    let tenants = W.rerun ? state.tenants : [];
    if (slug && !tenants.some(t => t.slug === slug))
      tenants = [...tenants, { id: "t-" + slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, domain: "", color: COLORS[tenants.length % COLORS.length] }];
    // Blocks
    const fresh = [
      ...PRESETS.filter(p => W.presets.has(p.id)).map(p => ({
        id: uid(), space: first, title: tr(p.title), color: p.color, view: "list", collapsed: false,
        links: p.links.map(([name, url]) => ({ id: uid(), name: tr(name), url })) })),
      ...W.imported.map((g, i) => ({
        id: uid(), space: first, title: g.title, color: COLORS[i % COLORS.length], view: "list",
        collapsed: g.links.length > 12, links: g.links })),
      ...(adminFresh ? m365AdminBlocks(M365_SPACE) : [])
    ];
    // Write everything at once
    s.name = W.name.trim();
    s.m365admin = W.m365;
    s.layout = W.layout;
    s.bg.type = W.bg;
    Object.assign(s.weather, { on: W.weather, city: W.city, lat: W.lat, lon: W.lon });
    s.search.engine = W.engine;
    s.spaces.weekday = ids.includes("pro") ? "pro" : first;
    s.spaces.weekend = ids.includes("perso") ? "perso" : first;
    state.spaces = spaces;
    state.tenants = tenants;
    state.meta.tenant = tenants.find(t => t.slug === slug)?.id || tenants[0]?.id || null;
    state.meta.space = first;
    state.blocks = W.rerun ? [...state.blocks.filter(b => ids.includes(b.space)), ...fresh] : fresh;
  }
  state.meta.onboarded = Date.now();
  save();
  currentSpace = pickSpace();
  onbClose();
  applySettings(); render(); buildPanel(); applyBackground(); loadWeather(true);
  if (!skip) toast(tr("Tableau de bord prêt"));
}

$("#onb").addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b || !W || b.disabled) return;
  const { act, id, i, step } = b.dataset;
  switch (act) {
    case "space": W.spaces[i].on = !W.spaces[i].on; break;
    case "addSpace": return onbAddSpace();
    case "preset": W.presets.has(id) ? W.presets.delete(id) : W.presets.add(id); break;
    case "layout": W.layout = id; break;
    case "bg": W.bg = id; break;
    case "engine": W.engine = id; break;
    case "weather": W.weather = !W.weather; break;
    case "m365": W.m365 = !W.m365; break;
    case "goto": return onbGo(+step);
    case "json": return $("#onbJson").click();
    case "bookmarks": return $("#onbBookmarks").click();
    case "geo":
      if (!navigator.geolocation) return onbNote(tr("Géolocalisation indisponible dans ce navigateur."), "err");
      onbNote(tr("Localisation…"));
      return navigator.geolocation.getCurrentPosition(
        p => { Object.assign(W, { city: tr("Ma position"), lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), cityOk: true }); onbNote(tr("Position utilisée pour la météo."), "ok"); },
        () => onbNote(tr("Position refusée. Saisis plutôt une ville."), "err"), { timeout: 10000 });
    default: return;
  }
  onbRender(false);
});
$("#onb").addEventListener("input", e => {
  const f = e.target.dataset.field;
  if (!f || !W) return;
  W[f] = f === "tenant" ? e.target.value.replace(/\s|\.sharepoint\.com.*$/gi, "") : e.target.value;
  if (f === "city") W.cityOk = false;
  if (f === "name") { const nm = W.name.trim(); $("#onbNext").textContent = nm ? tr("Commencer, {name} →", { name: nm }) : tr("Commencer →"); }
  onbPreview();
});
$("#onb").addEventListener("keydown", e => {
  if (!W) return;
  if (e.key === "Escape") { e.preventDefault(); return onbFinish(true); }
  if (e.key === "Enter" && !e.isComposing) {
    if (e.target.dataset.field === "newSpace") { e.preventDefault(); return onbAddSpace(); }
    if (e.target.tagName === "INPUT") { e.preventDefault(); onbNext(); }
  }
});
$("#onbNext").addEventListener("click", onbNext);
$("#onbLater").addEventListener("click", () => onbGo(W.step + 1));
$("#onbBack").addEventListener("click", () => onbGo(W.step - 1));
$("#onbSkipAll").addEventListener("click", () => W.step === 0 && !W.rerun ? onbFinish(true) : onbGo(ONB_STEPS.length - 1));

$("#onbJson").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  let data = null;
  try { data = normalize(JSON.parse(await file.text())); } catch {}
  if (!data) return onbNote(tr("Ce fichier n'est pas un export de Cockpit SteffPoint."), "err");
  data.meta.onboarded = Date.now();
  state = data; save();
  location.reload();
});
$("#onbBookmarks").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  let groups = [];
  try { groups = parseBookmarks(await file.text()); } catch {}
  if (!groups.length) return onbNote(tr("Aucun signet trouvé dans ce fichier."), "err");
  W.imported = groups;
  onbNote(tr("{n} dossiers trouvés. Ils seront ajoutés à la fin.", { n: groups.length }), "ok");
});

/* ---------- Tool drawer: share, import, cleanup ---------- */
function openTool(title, body, actions = []) {
  $("#toolTitle").textContent = title;
  $("#toolBody").replaceChildren(...body.flat().filter(Boolean));
  // "Annuler" only when there is something to confirm, otherwise the drawer just closes
  const confirm = actions.some(a => /\b(primary|danger)\b/.test(a.className));
  $("#toolActions").replaceChildren(h("div", { class: "right" }, ...actions,
    h("button", { class: "btn" + (actions.length ? "" : " primary"), type: "button", onclick: closeDrawer }, tr(confirm ? "Annuler" : "Fermer"))));
  if (openDrawer !== $("#toolDrawer")) showDrawer($("#toolDrawer"));
}
const PUBLIC_URL = "https://ostefnn.github.io/cockpit-steffpoint/";
// A share link or a subscription file carries the block's content only: no click counts, no local ids of spaces
const portableBlock = b => ({ id: b.id, title: b.title, color: b.color, view: b.view, links: b.links.map(l => {
  const o = { id: l.id, name: l.name, url: l.url };
  if (l.envs) o.envs = l.envs;
  if (l.icon && !/^data:/.test(l.icon)) o.icon = l.icon;
  return o;
}) });
const b64url = bytes => { let s = ""; for (const x of bytes) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64url = str => Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const pipe = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(b => new Uint8Array(b));
async function packShare(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  return typeof CompressionStream === "function" ? "z" + b64url(await pipe(raw, new CompressionStream("deflate"))) : "j" + b64url(raw);
}
async function unpackShare(str) {
  const bytes = unb64url(str.slice(1));
  const raw = str[0] === "z" ? await pipe(bytes, new DecompressionStream("deflate")) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}
async function openShareDrawer(b) {
  let all = false;
  const spaceBlocks = state.blocks.filter(x => x.space === b.space);
  const link = h("input", { type: "text", readonly: true, "aria-label": tr("Lien de partage"), onfocus: e => e.target.select() });
  const copy = h("button", { class: "btn", type: "button", onclick: async () => {
    try { await navigator.clipboard.writeText(link.value); toast(tr("Lien de partage copié")); }
    catch { link.focus(); link.select(); toast(tr("Copie impossible : sélectionne le lien et copie-le avec ⌘C.")); }
  } }, tr("Copier"));
  const picked = () => all ? spaceBlocks : [b];
  const refresh = async () => {
    const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : PUBLIC_URL;
    link.value = base + "#bloc=" + await packShare({ v: 1, blocks: picked().map(portableBlock) });
  };
  const fileName = () => slugify(all ? spaceName(b.space) : b.title) + ".json";
  const download = () => {
    const blob = new Blob([JSON.stringify({ cockpit: "bloc", v: 1, blocks: picked().map(portableBlock) }, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: fileName() });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(tr("Fichier d'abonnement téléchargé"));
  };
  const usesTenant = b.links.some(usesTpl);
  openTool(tr("Partager « {name} »", { name: b.title }), [
    spaceBlocks.length > 1 ? h("label", { class: "tool-check" }, h("input", { type: "checkbox", onchange: async e => { all = e.target.checked; await refresh(); } }),
      tr("Partager tout l'espace « {name} » ({n} blocs)", { name: spaceName(b.space), n: spaceBlocks.length })) : null,
    h("div", {}, h("h4", {}, tr("Lien à envoyer")),
      h("div", { class: "tool-row" }, link, copy),
      h("p", { class: "tip", style: "margin-top:6px" }, tr("Ton collègue ouvre le lien et choisit où ranger le bloc. Les adresses voyagent dans le lien lui-même (après le #) : aucun serveur ne les reçoit, mais toute personne qui a le lien les voit."))),
    usesTenant ? h("p", { class: "tip" }, tr("Les liens modèles restent des modèles : chacun les ouvre avec son propre tenant.")) : null,
    h("div", {}, h("h4", {}, tr("Fichier d'abonnement")),
      h("p", { class: "tip" }, tr("Pour une équipe : publie ce fichier à une adresse publique (GitHub Pages, Gist « Raw »…). Chacun s'y abonne via + Nouveau bloc → S'abonner à une adresse, et reçoit tes mises à jour quand tu remplaces le fichier.")),
      h("div", { class: "tool-row", style: "margin-top:8px" }, h("button", { class: "btn", type: "button", onclick: download }, tr("Télécharger le fichier"))))
  ], navigator.share ? [h("button", { class: "btn", type: "button", onclick: () => navigator.share({ title: b.title, url: link.value }).catch(() => {}) }, tr("Envoyer…"))] : []);
  await refresh();
}
// Blocks from someone else: same sanitizing as a JSON import, fresh ids so a block shared back never collides
function freshBlocks(raw) {
  const data = normalize({ blocks: Array.isArray(raw?.blocks) ? raw.blocks.filter(b => b && typeof b === "object").slice(0, 50) : [] });
  if (!data?.blocks.length) return null;
  // A shared link never creates a subscription
  return data.blocks.map(({ src, srcId, synced, syncErr, ...b }) => ({ ...b, id: uid(), collapsed: false, links: b.links.slice(0, 500).map(l => ({ ...l, id: uid() })) }));
}
function openImportDrawer(blocks) {
  const sel = h("select", { id: "importSpace" }, state.spaces.map(sp => h("option", { value: sp.id, selected: sp.id === currentSpace }, sp.name)));
  const total = blocks.reduce((n, b) => n + b.links.length, 0);
  openTool(tr("Importer un partage"), [
    h("p", {}, plural(blocks.length, "{n} bloc reçu, {links} liens en tout.", "{n} blocs reçus, {links} liens en tout.", { links: total })),
    h("ul", { class: "tool-list" }, blocks.map(b => h("li", {}, h("span", { class: "sw", style: `background:var(--${b.color})` }),
      h("span", { class: "nm" }, b.title, h("span", { class: "sub" }, [...new Set(b.links.map(l => hostOf(l.url) || l.url))].slice(0, 4).join(" · ") || tr("Aucun lien")))))),
    h("p", { class: "tip" }, tr("Ce partage vient de quelqu'un d'autre : vérifie les adresses avant de les ouvrir.")),
    h("div", { class: "field" }, h("label", { for: "importSpace" }, tr("Ranger dans l'espace")), sel)
  ], [h("button", { class: "btn primary", type: "button", onclick: () => {
    const space = sel.value;
    closeDrawer();
    commit(() => state.blocks.push(...blocks.map(b => ({ ...b, space }))), plural(blocks.length, "{n} bloc importé", "{n} blocs importés"));
    setSpace(space);
  } }, tr("Importer"))]);
}
async function checkShareHash() {
  const m = /^#bloc=([zj][\w-]+)$/.exec(location.hash);
  if (!m || !$("#onb").hidden) return;
  history.replaceState(null, "", location.pathname + location.search);
  let blocks = null;
  try { blocks = freshBlocks(await unpackShare(m[1])); } catch {}
  if (!blocks) { toast(tr("Ce lien de partage est illisible ou incomplet.")); return; }
  openImportDrawer(blocks);
}
addEventListener("hashchange", checkShareHash);

/* ---------- Subscriptions: blocks that follow a published JSON file ---------- */
const SYNC_EVERY = 6 * 3600e3;
const subTitle = b => tr(b.syncErr ? "Abonné à {host} · dernière mise à jour impossible, contenu conservé" : "Abonné à {host} · lecture seule",
  { host: hostOf(b.src) || b.src }) + (b.synced ? " · " + new Date(b.synced).toLocaleString(LOCALE(), { dateStyle: "short", timeStyle: "short" }) : "");
async function fetchSource(url) {
  const r = await fetch(url, { cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("http");
  let raw;
  try { raw = await r.json(); } catch { throw new Error("format"); }
  // The ids of the source keep the click counts and the order stable from one update to the next
  const src = Array.isArray(raw?.blocks) ? raw.blocks.filter(b => b && typeof b === "object").slice(0, 50) : [];
  const data = src.length ? normalize({ blocks: src }) : null;
  if (!data) throw new Error("format");
  return data.blocks.map((b, i) => ({ srcId: String(src[i].id ?? i), block: b }));
}
const subLinks = (localId, links) => links.slice(0, 500).map((l, i) => ({ ...l, id: localId + "-" + (String(l.id).replace(/[^\w-]/g, "").slice(0, 40) || i) }));
async function syncSource(url, manual) {
  let remote;
  try { remote = await fetchSource(url); }
  catch {
    state.blocks.forEach(b => { if (b.src === url) { b.syncErr = true; b.synced = Date.now(); } });
    save(); render();
    if (manual) toast(tr("Impossible de lire {host}. Le contenu actuel est gardé.", { host: hostOf(url) || url }));
    return;
  }
  const locals = state.blocks.filter(b => b.src === url);
  const space = locals[0]?.space || currentSpace;
  let at = locals.length ? state.blocks.indexOf(locals.at(-1)) + 1 : state.blocks.length;
  const keep = new Set();
  for (const { srcId, block: rb } of remote) {
    let b = locals.find(x => x.srcId === srcId);
    if (!b) {
      b = { id: uid(), space, color: rb.color, view: rb.view, collapsed: false, src: url, srcId };
      state.blocks.splice(at++, 0, b);
    }
    Object.assign(b, { title: rb.title, links: subLinks(b.id, rb.links), synced: Date.now(), syncErr: false });
    keep.add(b);
  }
  state.blocks = state.blocks.filter(b => b.src !== url || keep.has(b));
  save(); render();
  if (manual) toast(tr("« {host} » mis à jour", { host: hostOf(url) || url }));
}
function syncStale() {
  const due = new Set(state.blocks.filter(b => b.src && Date.now() - b.synced > SYNC_EVERY).map(b => b.src));
  due.forEach(url => syncSource(url));
}
async function submitSubscription() {
  const err = msg => { $("#blockErr").textContent = msg; $("#blockErr").hidden = false; };
  const url = normalizeUrl($("#blockSrc").value);
  if (!url || !/^https?:/.test(url)) return err(tr("Indique l'adresse complète du fichier, en https://."));
  if (state.blocks.some(b => b.src === url)) return err(tr("Tu es déjà abonné à cette adresse."));
  $("#blockErr").hidden = true;
  let remote;
  try { remote = await fetchSource(url); }
  catch (e) {
    return err(e.message === "format" ? tr("Ce fichier n'est pas un bloc Cockpit SteffPoint.")
      : tr("Impossible de lire cette adresse. Elle doit être publique et autoriser la lecture depuis une autre page (CORS), comme GitHub Pages ou un Gist « Raw »."));
  }
  const space = $("#blockSpace").value, view = document.querySelector("input[name=blockView]:checked").value;
  closeDrawer();
  commit(() => {
    for (const { srcId, block: rb } of remote) {
      const id = uid();
      state.blocks.push({ id, space, title: rb.title, color: rb.color, view, collapsed: false, links: subLinks(id, rb.links), src: url, srcId, synced: Date.now(), syncErr: false });
    }
  }, plural(remote.length, "Abonné : {n} bloc ajouté", "Abonné : {n} blocs ajoutés"));
}
function unsubscribe(b) {
  commit(() => { delete b.src; delete b.srcId; delete b.synced; delete b.syncErr; },
    tr("« {name} » n'est plus abonné : c'est maintenant ta copie, modifiable.", { name: b.title }));
}

/* ---------- Cleanup report (computed here, nothing leaves the browser) ---------- */
const UNUSED_AFTER = 60 * 864e5;
const urlKey = u => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/#?]+$/, "");
function cleanupReport() {
  const own = state.blocks.filter(b => !b.src);
  const byUrl = new Map();
  for (const b of own) for (const l of b.links) {
    const k = urlKey(l.url);
    if (!byUrl.has(k)) byUrl.set(k, []);
    byUrl.get(k).push({ block: b, link: l });
  }
  const dupes = [...byUrl.values()].filter(g => g.length > 1);
  const empty = own.filter(b => !b.links.length);
  // Only once the counts have run long enough to mean something
  const tracking = Date.now() - state.meta.statsSince >= UNUSED_AFTER;
  const unused = tracking ? own.flatMap(b => b.links.filter(l => {
    const last = state.meta.last[l.id];
    return last ? Date.now() - last > UNUSED_AFTER * 3 : !state.meta.hits[l.id];
  }).map(l => ({ block: b, link: l }))) : [];
  return { dupes, empty, unused, tracking };
}
function removeLinks(ids, message) {
  commit(() => { for (const b of state.blocks) if (!b.src) b.links = b.links.filter(l => !ids.has(l.id)); }, message);
  openCleanup();
}
function openCleanup() {
  const { dupes, empty, unused, tracking } = cleanupReport();
  const del = (label, fn, aria) => h("button", { class: "pbtn danger", type: "button", "aria-label": aria, onclick: fn }, label);
  const days = Math.ceil((UNUSED_AFTER - (Date.now() - state.meta.statsSince)) / 864e5);
  const where = ({ block: b, link: l }) => `${b.title} · ${spaceName(b.space)} · ${hostOf(l.url) || l.url}`;
  openTool(tr("Faire le ménage"), [
    !dupes.length && !empty.length && !unused.length ? h("p", { class: "ok-note" }, tr("Rien à ranger : pas de doublon ni de bloc vide.")) : null,
    dupes.length ? h("div", {}, h("h4", {}, plural(dupes.length, "{n} lien en double", "{n} liens en double")),
      h("p", { class: "tip" }, tr("Même adresse dans plusieurs blocs. « Garder un seul » conserve le premier.")),
      h("ul", { class: "tool-list" }, dupes.map(g => h("li", {},
        h("span", { class: "nm" }, g[0].link.name, h("span", { class: "sub" }, g.map(x => x.block.title).join(" · "))),
        del(tr("Garder un seul"), () => removeLinks(new Set(g.slice(1).map(x => x.link.id)), tr("Doublons de « {name} » supprimés", { name: g[0].link.name })),
          tr("Garder un seul « {name} »", { name: g[0].link.name })))))) : null,
    empty.length ? h("div", {}, h("h4", {}, plural(empty.length, "{n} bloc vide", "{n} blocs vides")),
      h("ul", { class: "tool-list" }, empty.map(b => h("li", {}, h("span", { class: "nm" }, b.title, h("span", { class: "sub" }, spaceName(b.space))),
        del(tr("Supprimer"), () => { deleteBlock(b.id); openCleanup(); }, tr("Supprimer {name}", { name: b.title })))))) : null,
    h("div", {}, h("h4", {}, tr("Liens jamais ou plus ouverts")),
      !tracking ? h("p", { class: "tip" }, plural(days, "Le suivi des ouvertures a commencé récemment. Ce tri sera disponible dans {n} jour.", "Le suivi des ouvertures a commencé récemment. Ce tri sera disponible dans {n} jours."))
      : !unused.length ? h("p", { class: "ok-note" }, tr("Tous tes liens servent."))
      : [h("p", { class: "tip" }, tr("Jamais ouverts depuis 2 mois, ou plus depuis 6 mois. Compté dans ce navigateur seulement : un lien ouvert ailleurs peut apparaître ici.")),
        h("ul", { class: "tool-list" }, unused.slice(0, 60).map(x => h("li", {},
          h("span", { class: "nm" }, x.link.name, h("span", { class: "sub" }, where(x))),
          del(tr("Supprimer"), () => removeLinks(new Set([x.link.id]), tr("« {name} » supprimé", { name: x.link.name })), tr("Supprimer {name}", { name: x.link.name })))))]),
    h("p", { class: "tip" }, tr("Les blocs abonnés ne sont pas concernés : ils suivent leur source. Chaque suppression s'annule depuis la notification."))
  ], unused.length > 1 ? [h("button", { class: "btn danger", type: "button",
    onclick: () => removeLinks(new Set(unused.map(x => x.link.id)), plural(unused.length, "{n} lien inutilisé supprimé", "{n} liens inutilisés supprimés")) },
    plural(unused.length, "Supprimer le lien inutilisé", "Supprimer les {n} liens inutilisés"))] : []);
}

/* ---------- Command palette (⌘K / Ctrl K) ---------- */
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
$("#palKbd").textContent = IS_MAC ? "⌘K" : "Ctrl K";
const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const palette = $("#palette"), palQ = $("#palQ"), palList = $("#palList");
let palItems = [], palSel = 0, palReturn = null;
function paletteCommands() {
  const cmds = [];
  const cmd = (label, run, extra = "") => cmds.push({ kind: "cmd", label, run, text: fold(label + " " + extra) });
  state.spaces.forEach(sp => cmd(tr("Espace : {name}", { name: sp.name }), () => setSpace(sp.id), "space ruimte"));
  if (tenantsAnywhere()) state.tenants.forEach(t => cmd(tr("Tenant : {name}", { name: t.name }), () => { state.meta.tenant = t.id; save(); render(); }, t.slug));
  if (hasEnvLinks()) ENVS.forEach(([id, label]) => cmd(tr("Environnement : {env}", { env: label }), () => setEnv(id), "env"));
  cmd(tr("+ Nouveau bloc"), () => openBlockDrawer(), "new block nieuw blok");
  cmd(tr("+ Ajouter un lien"), () => openLinkDrawer(state.blocks.find(b => b.space === currentSpace && !b.src)?.id), "add link link toevoegen");
  cmd(tr("S'abonner à une adresse"), () => { openBlockDrawer(); $("#blockTpl").value = "sub"; $("#blockTpl").dispatchEvent(new Event("change")); }, "subscribe abonneren");
  cmd(tr(editing ? "Quitter le mode édition" : "Éditer les favoris"), () => toggleEdit(), "edit bewerken");
  cmd(tr("Faire le ménage"), openCleanup, "doublons duplicates cleanup opruimen");
  cmd(tr("Réglages"), () => togglePanel(true), "settings instellingen");
  cmd(tr("Exporter"), exportData, "export backup sauvegarde");
  LAYOUTS.forEach(([id, label]) => cmd(tr("Disposition : {name}", { name: tr(label) }), () => { S().layout = id; save(); applySettings(); render(); }, "layout"));
  [["auto", "Système"], ["light", "Clair"], ["dark", "Sombre"]].forEach(([id, label]) =>
    cmd(tr("Thème : {name}", { name: tr(label) }), () => { S().theme = id; save(); applySettings(); }, "theme dark light"));
  if (S().bg.type === "photo") cmd(tr("Nouvelle photo"), () => applyBackground(true), "photo background");
  cmd(tr("Relancer l'assistant"), () => openOnboarding({ rerun: true }), "onboarding wizard");
  cmd(tr("Aide"), () => { location.href = "aide.html"; }, "help hulp");
  return cmds;
}
// "@contoso" picks a tenant and "!test" an environment for this one opening, without touching the page's context
function parsePalette(raw) {
  let env = null, tenant = null, unknown = "";
  const words = [];
  for (const w of raw.trim().split(/\s+/).filter(Boolean)) {
    const e = /^!(dev|test|prod)$/i.exec(w);
    if (e) { env = e[1].toLowerCase(); continue; }
    if (w[0] === "@" && w.length > 1) {
      const k = fold(w.slice(1));
      const t = state.tenants.find(x => fold(x.slug).startsWith(k) || fold(x.name).startsWith(k));
      if (t) tenant = t; else unknown = w;
      continue;
    }
    words.push(fold(w));
  }
  return { env, tenant, unknown, words };
}
function wordScore(label, text, w) {
  const i = label.indexOf(w);
  if (i === 0) return 100;
  if (i > 0) return /[\s\-·:/.]/.test(label[i - 1]) ? 80 : 50;
  if (text.includes(w)) return 30;
  // Letters in order ("shrpt" → SharePoint) catch quick typing
  let k = 0;
  for (const c of label) if (c === w[k]) k++;
  return k === w.length && w.length > 2 ? 10 : 0;
}
function renderPalette() {
  const p = parsePalette(palQ.value);
  const links = state.blocks.flatMap(b => b.links.map(l => ({ kind: "link", link: l, block: b, label: l.name,
    text: fold(`${l.name} ${b.title} ${spaceName(b.space)} ${l.url}`), boost: Math.min(state.meta.hits[l.id] || 0, 20) })));
  const cmds = paletteCommands();
  let list;
  if (!p.words.length) {
    const top = topLinks().map(({ link, block }) => links.find(x => x.link === link && x.block === block)).filter(Boolean);
    list = [...(top.length ? top : links.filter(x => x.block.space === currentSpace).slice(0, 6)), ...((p.env || p.tenant) ? [] : cmds)];
  } else {
    list = [...links, ...cmds].map(it => {
      const label = fold(it.label);
      let score = 0;
      for (const w of p.words) { const s = wordScore(label, it.text, w); if (!s) return null; score += s; }
      return { it, score: score + (it.boost || 0) + (it.kind === "link" ? 1 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 40).map(x => x.it);
  }
  // With @tenant or !env, only links make sense
  if (p.env || p.tenant) list = list.filter(it => it.kind === "link");
  palItems = list;
  palSel = Math.min(palSel, Math.max(list.length - 1, 0));
  const env = p.env || activeEnv, tenant = p.tenant || currentTenant();
  palList.replaceChildren(...(list.length ? list.map((it, i) => {
    const href = it.kind === "link" ? hrefFor(it.link, env, tenant) : null;
    const tag = it.kind === "link" && env !== "prod" && it.link.envs?.[env] ? h("span", { class: "env-tag", "data-env": env }, env.toUpperCase()) : null;
    return h("li", { id: "pal-" + i, role: "option", "aria-selected": String(i === palSel),
      onclick: e => runPalette(i, e.metaKey || e.ctrlKey), onmousemove: () => { if (palSel !== i) { palSel = i; markPalette(); } } },
      it.kind === "link" ? iconFor(it.link, it.block.color, href) : h("span", { class: "pal-ic", "aria-hidden": "true" }, "›"),
      h("span", { class: "nm" }, it.label), tag,
      h("span", { class: "sub" }, it.kind === "link" ? `${it.block.title} · ${href ? hostOf(href) : "{tenant}"}` : tr("Action")));
  }) : [h("li", { class: "pal-empty", role: "presentation" }, tr("Rien ne correspond."))]));
  markPalette();
  const foot = $("#palFoot");
  foot.replaceChildren(...[
    p.tenant || p.env ? h("span", { class: "ctx-on" }, tr("Ouvre en"), " ", p.env ? h("span", { class: "env-tag", "data-env": p.env }, p.env.toUpperCase()) : null, " ", p.tenant ? p.tenant.name : "") : null,
    p.unknown ? h("span", {}, tr("Tenant inconnu : {name}", { name: p.unknown })) : null,
    h("span", {}, tr("↑↓ choisir · Entrée ouvrir · {mod} Entrée nouvel onglet", { mod: IS_MAC ? "⌘" : "Ctrl" })),
    state.tenants.length || hasEnvLinks() ? h("span", {}, tr("@tenant · !dev !test !prod pour un seul lien")) : null].filter(Boolean));
  $("#palLive").textContent = list.length ? plural(list.length, "{n} résultat", "{n} résultats") : tr("Rien ne correspond.");
}
function markPalette() {
  palList.querySelectorAll("[role=option]").forEach((li, i) => li.setAttribute("aria-selected", String(i === palSel)));
  const cur = $("#pal-" + palSel);
  if (cur) { palQ.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); } else palQ.removeAttribute("aria-activedescendant");
}
function runPalette(i, newTab) {
  const it = palItems[i];
  if (!it) return;
  const p = parsePalette(palQ.value);
  closePalette(false);
  if (it.kind === "cmd") { it.run(); return; }
  const href = hrefFor(it.link, p.env || activeEnv, p.tenant || currentTenant());
  if (!href) { openPanelAt("tenants"); return; }
  countHit(it.link.id);
  if (newTab || S().links.newTab) window.open(href, "_blank", "noopener"); else location.href = href;
}
function openPalette() {
  if (!$("#onb").hidden) return;
  closeMenu();
  if (openDrawer) closeDrawer();
  palReturn = document.activeElement;
  palette.hidden = false;
  palQ.value = ""; palSel = 0;
  renderPalette();
  palQ.focus();
}
function closePalette(restore = true) {
  if (palette.hidden) return;
  palette.hidden = true;
  if (restore) palReturn?.focus?.({ preventScroll: true });
}
palQ.addEventListener("input", () => { palSel = 0; renderPalette(); });
palQ.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" && palItems.length) { e.preventDefault(); palSel = (palSel + 1) % palItems.length; markPalette(); }
  else if (e.key === "ArrowUp" && palItems.length) { e.preventDefault(); palSel = (palSel - 1 + palItems.length) % palItems.length; markPalette(); }
  else if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); runPalette(palSel, e.metaKey || e.ctrlKey); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePalette(); }
  else if (e.key === "Tab") e.preventDefault();
});
palette.addEventListener("mousedown", e => { if (e.target === palette) closePalette(); });
$("#palBtn").addEventListener("click", openPalette);

/* ---------- Boot ---------- */
applySettings();
save();
render();
buildPanel();
applyBackground();
loadWeather();
if (!state.meta.onboarded) openOnboarding();
checkShareHash();
syncStale();
setInterval(() => { if (S().bg.type === "photo" && photoIsStale(S().bg) && S().bg.freq !== "tab") applyBackground(); loadWeather(); syncStale(); }, 10 * 60e3);
// A page left open follows the space rules when they flip (18:00, Saturday…), but never overrides a manual pick in between
let lastAuto = autoSpace();
function followAutoSpace() {
  const want = autoSpace();
  if (want && want !== lastAuto && !term && !openDrawer && !editing) setSpace(want);
  lastAuto = want;
}
setInterval(followAutoSpace, 60e3);
document.addEventListener("visibilitychange", () => { if (!document.hidden) followAutoSpace(); });
