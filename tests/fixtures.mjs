// Saved dashboards as they exist in people's browsers. Kept in .js: the repo ignores every .json file.

// Current format, before the palette / sharing / working hours release
export const current = {
  version: 1,
  settings: { name: "Olivier", lang: "fr", theme: "light", layout: "classic", showAll: false, hideDock: false, keys: true, m365admin: true,
    bg: { type: "color", freq: "hour", blur: 12, bright: 85, veil: 35, color: "#123456", url: "", photo: null, at: 0 },
    links: { on: true, style: "glass", cols: "auto", radius: 12, newTab: false, icons: "favicon", max: 8 },
    clock: { on: true, h24: true, seconds: false, size: 100, date: "long" },
    weather: { on: false, city: "Bruxelles", lat: 50.85, lon: 4.35, unit: "c", display: "full" },
    greet: { on: true, custom: "" }, search: { on: true, engine: "bing" },
    spaces: { auto: false, weekday: "pro", weekend: "perso" }, env: { def: "prod", remember: true } },
  meta: { lastExport: "2026-10-20T10:00:00.000Z", since: 1760000000000, snooze: 0, onboarded: 1760000000000, space: "pro", tenant: "t1", env: "test", hits: { l1: 5, l3: 2 } },
  spaces: [{ id: "pro", name: "Pro" }, { id: "perso", name: "Perso" }],
  tenants: [{ id: "t1", name: "Contoso", slug: "contoso", domain: "contoso.com", color: "c2" }, { id: "t2", name: "Fabrikam", slug: "fabrikam", domain: "", color: "c5" }],
  blocks: [
    { id: "b1", space: "pro", title: "Outils", color: "c1", view: "list", collapsed: false, links: [
      { id: "l1", name: "SharePoint", url: "https://{tenant}.sharepoint.com", envs: { dev: "", test: "https://{tenant}test.sharepoint.com" } },
      { id: "l2", name: "Intranet", url: "http://intranet/home" },
      { id: "l3", name: "GitHub", url: "https://github.com" },
      { id: "l4", name: "GitHub bis", url: "https://www.github.com/" }] },
    { id: "b4", space: "pro", title: "Équipe", color: "c4", view: "grid", collapsed: false, links: [
      { id: "l6", name: "Wiki", url: "https://wiki.example.com" }, { id: "l7", name: "Jira", url: "http://jira.corp/" },
      { id: "l8", name: "Mail", url: "mailto:equipe@example.com" }] },
    { id: "b2", space: "perso", title: "Vide", color: "c3", view: "grid", collapsed: true, links: [] },
    { id: "b3", space: "perso", title: "Perso", color: "c6", view: "grid", collapsed: false, links: [{ id: "l5", name: "NAS", url: "http://192.168.1.10:5000" }] }
  ]
};

// First public version: settings stored flat (clock24, engine, newTab, icons)
export const mvp = {
  settings: { clock24: false, seconds: true, engine: "duckduckgo", newTab: true, icons: "initials", theme: "dark" },
  blocks: [{ id: "m1", title: "Anciens", color: "c2", links: [{ id: "a", name: "Exemple", url: "https://example.com" }, { id: "b", name: "Piège", url: "javascript:alert(1)" }] }]
};

// Safari bookmarks export (Netscape HTML)
export const bookmarks = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Barre de favoris</H3>
<DL><p>
<DT><A HREF="https://github.com">GitHub</A>
<DT><H3>Outils</H3>
<DL><p><DT><A HREF="https://regex101.com">Regex</A><DT><A HREF="javascript:void(0)">Bad</A></DL><p>
</DL><p>
<DT><H3 id="com.apple.ReadingList">Liste de lecture</H3>
<DL><p><DT><A HREF="https://read.example.com">À lire</A></DL><p>
</DL>`;
