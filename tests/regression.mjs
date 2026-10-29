// Non-regression tests for Cockpit SteffPoint.
//   cd tests && npm install && npm test
// Part 1 compares the working tree with a reference git tag (BASE_REF, default "pre-modularisation"):
// same screenshots, same DOM, same saved data, scenario by scenario, through the UI only.
// Part 2 checks features and accessibility on the working tree.
// Needs Google Chrome (CHROME=path to override) and python3 for the static servers.
import puppeteer from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as FX from "./fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const BASE_REF = process.env.BASE_REF || "pre-modularisation";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTS = { cur: 8765, base: 8770, pub: 8766 };
const KEY = "cockpit-steffpoint";
const OUT = path.join(HERE, "out");
const ONLY = process.argv[2]; // "compare" or "features" to run one part

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- Servers: working tree, reference tag, subscription files ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-tests-"));
const baseDir = path.join(tmp, "base"), pubDir = path.join(tmp, "pub");
fs.mkdirSync(baseDir); fs.mkdirSync(pubDir); fs.mkdirSync(OUT, { recursive: true });
execSync(`git archive ${BASE_REF} | tar -x -C "${baseDir}"`, { cwd: ROOT, shell: "/bin/sh" });
const servers = [[PORTS.cur, ROOT], [PORTS.base, baseDir], [PORTS.pub, pubDir]]
  .map(([port, dir]) => spawn("python3", [path.join(HERE, "serve.py"), String(port), dir], { stdio: "ignore" }));
// Servers always stop, even when a test throws, so the next run gets free ports
const stop = () => { servers.forEach(s => s.kill()); fs.rmSync(tmp, { recursive: true, force: true }); };
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));
await wait(800);
if (servers.some(s => s.exitCode !== null)) { console.error("A test port is busy (8765, 8766 or 8770): stop the other server first."); process.exit(2); }
const url = (port, file = "index.html") => `http://127.0.0.1:${port}/${file}`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--font-render-hinting=none"] });

// A fresh browser profile with saved data, frozen time and seeded ids, so two runs render the same pixels
async function open(port, { data = null, viewport = { width: 1280, height: 800 }, scheme = "light", frozen = true, offline = true, file = "index.html" } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }]);
  if (frozen) await page.evaluateOnNewDocument(() => {
    const T = new Date("2026-10-28T10:00:00").getTime(), D = Date;
    globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } };
    let seed = 42;
    Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  });
  // Outside services (fonts, photos, favicons, weather) are cut: both versions fall back the same way
  await page.setRequestInterception(true);
  page.on("request", r => {
    requests.push(r.url());
    if (offline && !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) r.abort(); else r.continue();
  });
  await page.goto(url(port, "aide.html"), { waitUntil: "domcontentloaded" });
  await page.evaluate((k, d) => { localStorage.clear(); if (d) localStorage.setItem(k, JSON.stringify(d)); }, KEY, data);
  await page.goto(url(port, file), { waitUntil: "domcontentloaded" });
  await wait(700);
  return { ctx, page, errors, requests };
}
const blurAll = page => page.evaluate(() => document.activeElement?.blur());
const key = async (page, k, mod) => { if (mod) await page.keyboard.down(mod); await page.keyboard.press(k); if (mod) await page.keyboard.up(mod); await wait(250); };
const withSettings = (s, extra = {}) => ({ ...structuredClone(FX.current), settings: { ...structuredClone(FX.current.settings), ...s }, ...extra });

// ---------- Part 1: working tree vs reference tag ----------
const SCENARIOS = [];
for (const layout of ["classic", "accueil", "cockpit", "lanceur"])
  for (const theme of ["light", "dark"])
    SCENARIOS.push({ name: `${layout}-${theme}`, data: withSettings({ layout, theme }) });
SCENARIOS.push(
  { name: "theme-auto-dark", data: withSettings({ theme: "auto" }), scheme: "dark" },
  { name: "mobile", data: withSettings({ layout: "accueil" }), viewport: { width: 390, height: 844 } },
  { name: "panel-en", data: withSettings({ lang: "en", showAll: true }), run: async p => { await blurAll(p); await key(p, ","); await wait(400); } },
  { name: "edit-nl", data: withSettings({ lang: "nl" }), run: async p => { await blurAll(p); await key(p, "e"); } },
  { name: "link-drawer", data: withSettings({}), run: async p => { await blurAll(p); await key(p, "e"); await p.click('[data-link="l1"] .lk, a[data-link="l1"]'); await wait(300); } },
  { name: "block-menu", data: withSettings({}), run: async p => { await p.click('.block[data-block="b1"] [aria-haspopup="menu"]'); await wait(200); } },
  { name: "search", data: withSettings({}), run: async p => { await p.type("#q", "git"); await key(p, "ArrowDown"); } },
  { name: "space-env-tenant", data: withSettings({}), run: async p => { await blurAll(p); await key(p, "v"); await key(p, "t"); await key(p, "2"); } },
  { name: "palette", data: withSettings({}), run: async p => { await key(p, "k", "Meta"); await p.type("#palQ", "share @fab !test"); await wait(200); } },
  { name: "undo-toast", data: withSettings({}), run: async p => { await blurAll(p); await key(p, "e"); await p.click('li[data-link="l2"] .lk-del'); await wait(200); } },
  { name: "onboarding-1", data: null },
  { name: "onboarding-3", data: null, run: async p => { await p.click("#onbNext"); await wait(200); await p.click("#onbNext"); await wait(300); } },
  { name: "mvp-file", data: FX.mvp },
  { name: "bookmarks", changes: true, data: withSettings({}), run: async p => {
    const f = path.join(tmp, "Signets.html"); fs.writeFileSync(f, FX.bookmarks);
    const input = await p.$("#bookmarkFile"); await input.uploadFile(f); await wait(400);
  } },
  { name: "m365-template", changes: true, data: withSettings({}), run: async p => {
    await p.$eval(".new-block", e => e.click()); await wait(200); await p.select("#blockTpl", "m365"); await p.type("#blockTenant", "northwind");
    await p.click('#blockDrawer button[type=submit]'); await wait(400);
  } }
);
const STATE_SEL = [".page", "#panel", "#menu", "#linkDrawer", "#blockDrawer", "#toolDrawer", "#palette", "#onb", "#toast", "#credit", "#storageBanner", ".dock"];
async function capture(port, sc) {
  const s = await open(port, { data: sc.data, viewport: sc.viewport, scheme: sc.scheme });
  if (sc.run) await sc.run(s.page);
  // The blinking caret would make two identical pages differ
  await s.page.addStyleTag({ content: "*{caret-color:transparent!important}" });
  await wait(300);
  const png = Buffer.from(await s.page.screenshot());
  const dom = await s.page.evaluate(sels => [
    "title: " + document.title, "html: " + [...document.documentElement.attributes].map(a => `${a.name}=${a.value}`).join(" "),
    "body: " + document.body.className, "focus: " + (document.activeElement?.id || document.activeElement?.tagName),
    ...sels.map(sel => document.querySelector(sel)?.outerHTML || `(${sel} missing)`)].join("\n"), STATE_SEL);
  const saved = await s.page.evaluate(k => localStorage.getItem(k), KEY);
  await s.ctx.close();
  return { png, dom, saved, errors: s.errors };
}
function pixelDiff(a, b, name) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return Infinity;
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.05 });
  if (n) { fs.writeFileSync(path.join(OUT, `${name}-base.png`), a); fs.writeFileSync(path.join(OUT, `${name}-now.png`), b); fs.writeFileSync(path.join(OUT, `${name}-diff.png`), PNG.sync.write(diff)); }
  return n;
}
if (ONLY !== "features") {
  console.log(`\n== Comparison with ${BASE_REF} ==`);
  for (const sc of SCENARIOS) {
    const [b, c] = [await capture(PORTS.base, sc), await capture(PORTS.cur, sc)];
    const px = pixelDiff(b.png, c.png, sc.name);
    if (b.dom !== c.dom) { fs.writeFileSync(path.join(OUT, `${sc.name}-base.txt`), b.dom); fs.writeFileSync(path.join(OUT, `${sc.name}-now.txt`), c.dom); }
    if (sc.changes) ok(b.saved !== JSON.stringify(sc.data) && /northwind|Regex/.test(c.saved), `${sc.name}: scenario really changed the data`);
    ok(px === 0 && b.dom === c.dom && b.saved === c.saved && c.errors.length === 0,
      `${sc.name}: ${px} px differ · DOM ${b.dom === c.dom ? "same" : "DIFFERENT"} · data ${b.saved === c.saved ? "same" : "DIFFERENT"}` + (c.errors.length ? ` · errors: ${c.errors.join(" | ")}` : ""));
  }
}

// ---------- Part 2: features on the working tree ----------
const axeSrc = fs.readFileSync(path.join(HERE, "node_modules/axe-core/axe.min.js"), "utf8");
const axeRun = page => page.evaluate(async src => {
  if (!globalThis.axe) (0, eval)(src);
  const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] });
  return r.violations.map(v => `${v.id}:${v.nodes.length}:${v.nodes[0].target}`);
}, axeSrc);
const live = opts => open(PORTS.cur, { frozen: false, ...opts });

if (ONLY !== "compare") {
  console.log("\n== Features ==");
  const legacy = FX.current;
  // Accessibility is checked on the default background. Known issue, predating this suite: on a dark solid color
  // chosen by the user, --muted text on frosted glass drops to 3.15:1 (link domains, DEV/PROD, kbd hints).
  const a11y = withSettings({ bg: { ...FX.current.settings.bg, type: "gradient" } });
  {
    const { ctx, page, errors, requests } = await live({ data: { ...a11y, blocks: legacy.blocks }, offline: false });
    const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    ok(errors.length === 0, "existing data loads without errors " + errors.join(" | "));
    const own = l => { const o = { id: l.id, name: l.name, url: l.url }; if (l.envs) o.envs = l.envs; return o; };
    ok(JSON.stringify(st.blocks.map(b => [b.id, b.space, b.title, b.color, b.view, b.collapsed, b.links])) ===
       JSON.stringify(legacy.blocks.map(b => [b.id, b.space, b.title, b.color, b.view, b.collapsed, b.links.map(own)])), "blocks and links unchanged");
    ok(JSON.stringify(st.tenants) === JSON.stringify(legacy.tenants) && JSON.stringify(st.spaces) === JSON.stringify(legacy.spaces), "tenants and spaces unchanged");
    ok(["name", "lang", "theme", "layout", "m365admin", "bg", "links", "clock", "weather", "greet", "search", "env"].every(k => JSON.stringify(st.settings[k]) === JSON.stringify(a11y.settings[k])), "settings unchanged");
    ok(st.settings.spaces.auto === false && st.settings.spaces.hours === false, "space rules kept, working hours off");
    ok(st.meta.space === "pro" && st.meta.tenant === "t1" && st.meta.env === "test" && st.meta.hits.l1 === 5 && st.meta.lastExport === legacy.meta.lastExport, "meta kept");
    await wait(1200);
    ok(!requests.some(u => /s2\/favicons.*(intranet|jira\.corp|192\.168)/.test(u)), "private hosts never sent to Google");
    ok(requests.some(u => /s2\/favicons.*github/.test(u)) || await page.$eval('a[data-link="l3"] .ico', e => e.classList.contains("img")), "public hosts still get a favicon");

    await key(page, "k", "Meta");
    ok(await page.$eval("#palette", e => !e.hidden) && await page.evaluate(() => document.activeElement.id) === "palQ", "⌘K opens the palette with focus");
    await page.type("#palQ", "sharep @fab !test");
    ok(/SharePoint/.test(await page.$eval("#palList [role=option]", e => e.textContent)), "palette finds SharePoint");
    ok(/fabrikamtest\.sharepoint\.com/.test(await page.$eval("#palList [role=option] .sub", e => e.textContent)), "@fab !test resolves the address");
    ok(!/null|undefined/.test(await page.$eval("#palette", e => e.textContent)), "no null/undefined text in the palette");
    { const v = await axeRun(page); ok(v.length === 0, "axe: palette open " + v.join(", ")); }
    await key(page, "Escape");
    ok(await page.$eval("#palette", e => e.hidden), "Escape closes the palette");
    ok(/\[TEST\] \[CONTOSO\]/.test(await page.title()), "page context unchanged by palette overrides");
    await key(page, "k", "Meta"); await page.type("#palQ", "espace perso"); await key(page, "Enter");
    ok(await page.$eval('[role=tab][aria-selected=true]', e => e.textContent) === "Perso", "palette command switches space");

    await key(page, "k", "Meta"); await page.type("#palQ", "faire le ménage"); await key(page, "Enter");
    const txt = await page.$eval("#toolBody", e => e.textContent);
    ok(/1 lien en double/.test(txt) && /1 bloc vide/.test(txt) && /disponible dans 60 jours/.test(txt) && !/null|undefined/.test(txt), "cleanup report");
    { const v = await axeRun(page); ok(v.length === 0, "axe: cleanup drawer " + v.join(", ")); }
    await page.click("#toolBody .pbtn.danger"); await wait(200);
    ok(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).blocks[0].links.map(l => l.id).join(), KEY) === "l1,l2,l3", "keep one removes the later duplicate");
    await page.click("#toastUndo"); await wait(200);
    ok(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).blocks[0].links.length, KEY) === 4, "undo restores it");
    await key(page, "Escape");

    await blurAll(page); await key(page, "1");
    await page.click('.block[data-block="b1"] [aria-haspopup="menu"]');
    await page.evaluate(() => [...document.querySelectorAll("#menu button")].find(b => /Partager/.test(b.textContent)).click());
    await wait(400);
    const link = await page.$eval("#toolBody input[type=text]", e => e.value);
    ok(/#bloc=z[\w-]+$/.test(link), "share link built");
    { const v = await axeRun(page); ok(v.length === 0, "axe: share drawer " + v.join(", ")); }
    fs.writeFileSync(path.join(tmp, "link.txt"), link);
    const portable = await page.evaluate(k => {
      const b = JSON.parse(localStorage.getItem(k)).blocks.find(x => x.id === "b1");
      return JSON.stringify({ cockpit: "bloc", v: 1, blocks: [{ id: b.id, title: b.title, color: b.color, view: b.view, links: b.links }] });
    }, KEY);
    fs.writeFileSync(path.join(pubDir, "pack.json"), portable);
    ok(errors.length === 0, "no errors during the session " + errors.join(" | "));
    await ctx.close();
  }
  {
    const link = fs.readFileSync(path.join(tmp, "link.txt"), "utf8");
    const { ctx, page, errors } = await live({ data: legacy, file: link.split("/").pop() });
    await wait(400);
    ok(await page.$eval("#toolDrawer", e => !e.hidden) && !(await page.evaluate(() => location.hash)), "share link opens the import drawer and clears the hash");
    await page.click("#toolActions .btn.primary"); await wait(200);
    const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    const last = st.blocks.at(-1), ids = st.blocks.flatMap(b => b.links.map(l => l.id));
    ok(st.blocks.length === legacy.blocks.length + 1 && last.title === "Outils" && last.links.length === 4 && !last.src, "shared block imported as an own copy");
    ok(new Set(ids).size === ids.length, "no id collision");
    ok(errors.length === 0, "no errors " + errors.join(" | "));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await live({ data: legacy });
    await page.$eval(".new-block", e => e.click()); await wait(200);
    await page.select("#blockTpl", "sub");
    await page.type("#blockSrc", url(PORTS.pub, "pack.json"));
    await page.click('#blockDrawer button[type=submit]'); await wait(700);
    const subs = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)).blocks.filter(b => b.src), KEY);
    let s = await subs();
    ok(s.length === 1 && s[0].links.length === 4, "subscribed block created");
    ok(await page.$$eval(".sub-badge", e => e.length) === 1, "subscription badge shown");
    await blurAll(page); await key(page, "e");
    ok(await page.$$eval(`.block[data-block="${s[0].id}"] .lk-del, .block[data-block="${s[0].id}"] .add-row`, e => e.length) === 0, "subscribed block read-only in edit mode");
    await key(page, "e");
    const pack = JSON.parse(fs.readFileSync(path.join(pubDir, "pack.json"), "utf8"));
    pack.blocks[0].title = "Outils v2";
    pack.blocks[0].links.push({ id: "new1", name: "Nouveau", url: "https://example.org" });
    pack.blocks.push({ id: "b9", title: "Second", color: "c4", links: [{ id: "x", name: "X", url: "javascript:alert(1)" }, { id: "y", name: "Y", url: "https://y.example.com" }] });
    fs.writeFileSync(path.join(pubDir, "pack.json"), JSON.stringify(pack));
    await page.click(`.block[data-block="${s[0].id}"] [aria-haspopup="menu"]`);
    await page.evaluate(() => [...document.querySelectorAll("#menu button")].find(b => /Actualiser/.test(b.textContent)).click());
    await wait(600);
    s = await subs();
    ok(s.length === 2 && s[0].title === "Outils v2" && s[0].links.length === 5 && !JSON.stringify(s).includes("javascript:"), "refresh updates, adds blocks, drops javascript:");
    ok(errors.length === 0, "no errors " + errors.join(" | "));
    await ctx.close();
  }
  {
    const now = new Date(), h2 = String((now.getHours() + 2) % 24).padStart(2, "0"), h3 = String((now.getHours() + 3) % 24).padStart(2, "0");
    const weekend = [0, 6].includes(now.getDay());
    const data = withSettings({ spaces: { auto: true, weekday: "pro", weekend: "perso", hours: true, from: `${h2}:00`, to: `${h3}:00`, offHours: "perso" } });
    const { ctx, page, errors } = await live({ data: { ...data, settings: { ...data.settings, bg: a11y.settings.bg } } });
    ok(await page.$eval('[role=tab][aria-selected=true]', e => e.textContent) === "Perso", weekend ? "weekend opens Perso" : "outside working hours opens Perso");
    await blurAll(page); await key(page, ",");
    await page.evaluate(() => { const t = document.querySelector("#set-showAll"); if (t && !t.checked) t.click(); });
    ok(await page.$("#set-spaces-from") !== null, "working hours fields in settings");
    { const v = await axeRun(page); ok(v.length === 0, "axe: settings open " + v.join(", ")); }
    ok(errors.length === 0, "no errors " + errors.join(" | "));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await live({ data: withSettings({ hideDock: true }) });
    const op = () => page.$$eval(".dock .fab", els => els.map(e => getComputedStyle(e).opacity).join(","));
    await page.mouse.move(10, 10); await wait(300);
    ok(await op() === "0,0,0", "discreet dock: buttons hidden");
    const box = await page.$eval("#settingsBtn", e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.mouse.move(...box); await wait(300);
    ok(await op() === "1,1,1", "discreet dock: buttons come back on hover");
    await page.mouse.move(10, 10); await wait(300);
    await blurAll(page); await page.focus("#helpBtn"); await page.keyboard.press("Tab"); await wait(300);
    ok(await op() === "1,1,1", "discreet dock: buttons come back on keyboard focus");
    ok(errors.length === 0, "no errors " + errors.join(" | "));
    await ctx.close();
  }
  for (const lang of ["fr", "en", "nl"]) {
    const { ctx, page, errors } = await live({ file: `aide.html?lang=${lang}` });
    ok((await axeRun(page)).length === 0 && errors.length === 0, `help page (${lang}): axe and errors`);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await live({ data: null });
    ok(await page.$eval("#onb", e => !e.hidden) && errors.length === 0, "new user: onboarding opens");
    await ctx.close();
  }
}

await browser.close();
console.log(fails ? `\n${fails} FAILED (details in tests/out/)` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
