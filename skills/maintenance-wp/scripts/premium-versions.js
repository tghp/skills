#!/usr/bin/env bun
// Premium plugin version check: for commercial plugins that are NOT in the
// Wordfence feed (so plugin-security.js cannot scan them), query each vendor's
// own update API with a license key and report installed-vs-latest per repo.
//
// This catches "a newer version is available" — it does NOT know about CVEs.
// Use it alongside plugin-security.js, which handles everything with a public
// vuln feed (including most premium plugins via its SLUG_MAP).
//
// Prereqs:
//   - ~/.tghp/maintenance-wp/config.json    (repos — same as the other scripts)
//   - ~/.tghp/maintenance-wp/licenses.json  (vendor endpoints + license keys)
//   - env GITHUB_PERSONAL_ACCESS_TOKEN       (to read each repo's composer.lock)
//
// Usage:
//   ./scripts/premium-versions.js --init   # write a licenses.json template (chmod 600), then edit it
//   ./scripts/premium-versions.js          # check every configured plugin across all repos

import { homedir } from "os";
import { join, dirname } from "path";
import { readFileSync, existsSync, writeFileSync, chmodSync, mkdirSync } from "fs";

const CFG = join(homedir(), ".tghp/maintenance-wp/config.json");
const LIC = join(homedir(), ".tghp/maintenance-wp/licenses.json");

function die(msg) { console.error(msg); process.exit(1); }

// --- version compare (same semantics as plugin-security.js) ---
function parse(v) {
  if (v == null || v === "*" || v === "") return [0];
  return String(v).replace(/^v/i, "").split(/[.+-]/).map(n => parseInt(n, 10) || 0);
}
function cmp(a, b) {
  const A = parse(a), B = parse(b);
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const x = A[i] ?? 0, y = B[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// --- template written by --init: pre-seeded with the genuinely-unfeeded plugins ---
// Fill in `license` (and item_id / endpoints) from each vendor account. Delete
// any plugin you don't want checked. `repos` lets you override the license key
// or activated site URL per repo when each site has its own license.
const TEMPLATE = {
  _comment: "License keys live here only. This file is chmod 600 and must never be committed. Run `premium-versions.js` to use it.",
  plugins: {
    "tghp/pdf-embedder-premium": {
      strategy: "edd",
      store_url: "https://wp-pdf.com",
      item_id: 0,                      // TODO: numeric download ID from the vendor (or use item_name)
      item_name: "PDF Embedder Premium",
      license: "",                     // TODO
      repos: { "your-org/your-site": { license: "", url: "" } }
    },
    "richplugins/business-reviews-bundle": {
      strategy: "edd",
      store_url: "https://admin.richplugins.com", // the plugin's EDD_SL_Plugin_Updater endpoint, not the marketing site
      path: "plugins/update-check",
      item_id: 0,                      // not needed — the endpoint identifies the product by license
      item_name: "Business Reviews Bundle",
      license: "",                     // TODO
      repos: { "your-org/your-site": { license: "", url: "" } }
    },
    // YayCommerce's EDD store answers get_version without a license (it adds a
    // "No license key has been provided." msg but still returns new_version).
    "yaycommerce/yaycurrency-pro": {
      strategy: "edd",
      store_url: "https://yaycommerce.com",
      item_id: 7761,                   // CorePlugin.php `download_id`
      license: ""                      // optional
    },
    // Rank Math Pro's own updater (includes/plugin-update) checks a public
    // versionCheck endpoint — no license needed for the latest version.
    "tghp/rank-math-pro": {
      strategy: "generic",
      versionUrl: "https://rankmath.com/wp-json/rankmath/v1/versionCheck/?product_slug=seo-by-rank-math-pro",
      versionField: "new_version"
    },
    "tghp/meta-box-aio": {
      strategy: "metabox",
      api_url: "https://metabox.io/wp-json/buse2/updater/",
      api_key: "",                     // your Meta Box license key (its settings call this "API Key")
      product: "meta-box-aio"
    }
  }
};

// config.json template. JSON has no comments, so the example lives under
// `_example` (ignored by the scripts, which only read `repos`). Replace the
// entries in `repos` with your own and delete `_example` when done.
const CONFIG_TEMPLATE = {
  _comment: "Repos to scan. Each entry: { \"repo\": \"owner/name\" }. Add \"composerDir\" when a repo's composer.lock lives in a subfolder. Edit `repos` below; `_example` is illustrative and ignored.",
  _example: [
    { "repo": "your-org/your-site" },
    { "repo": "your-org/site-in-subfolder", "composerDir": "wordpress" },
  ],
  repos: [],
};

function writeTemplate() {
  let wrote = 0, skipped = 0;

  mkdirSync(dirname(CFG), { recursive: true }); // first run: ~/.tghp/maintenance-wp may not exist yet

  // config.json — repos to scan (no secrets, default perms).
  if (existsSync(CFG)) {
    console.log(`• ${CFG} already exists — not overwriting.`);
    skipped++;
  } else {
    writeFileSync(CFG, JSON.stringify(CONFIG_TEMPLATE, null, 2));
    console.log(`• Wrote config template to ${CFG} — edit \`repos\` to list your sites.`);
    wrote++;
  }

  // licenses.json — vendor keys (chmod 600).
  if (existsSync(LIC)) {
    console.log(`• ${LIC} already exists — not overwriting.`);
    skipped++;
  } else {
    writeFileSync(LIC, JSON.stringify(TEMPLATE, null, 2));
    chmodSync(LIC, 0o600);
    console.log(`• Wrote licenses template to ${LIC} (chmod 600) — fill in keys / item ids.`);
    wrote++;
  }

  console.log(`\nDone (${wrote} written, ${skipped} left untouched). Run without --init once configured.`);
}

// --- composer.lock loader (same as the other scripts) ---
async function ghComposerLock(repo, composerDir) {
  const tok = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const path = (composerDir ? composerDir.replace(/\/$/, "") + "/" : "") + "composer.lock";
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${tok}`, Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) return null;
  return JSON.parse(await res.text());
}
function installedVersion(lock, name) {
  const pkgs = [...(lock.packages || []), ...(lock["packages-dev"] || [])];
  const p = pkgs.find(x => x.name === name);
  return p ? String(p.version).replace(/^v/i, "") : null;
}

// --- vendor strategies: each returns { latest } or { error } ---
// EDD Software Licensing: edd_action=get_version, read `new_version`.
// Most stores accept a POST to the store root; some serve the updater from a
// path (e.g. RichPlugins' admin.richplugins.com/plugins/update-check) or want a
// GET instead. Configure with `method` ("GET"|"POST", default POST) and `path`
// (appended to store_url).
// The license is optional: some stores (e.g. YayCommerce) return the latest
// version without one; those that don't come back as "no version in response".
async function checkEdd(cfg, override = {}) {
  const license = override.license || cfg.license || "";
  if (!cfg.store_url) return { error: "missing store_url" };
  const params = new URLSearchParams({ edd_action: "get_version", license, url: override.url || "" });
  if (cfg.item_id) params.set("item_id", String(cfg.item_id));
  if (cfg.item_name) params.set("item_name", cfg.item_name);
  const base = cfg.store_url.replace(/\/+$/, "") + "/" + (cfg.path ? cfg.path.replace(/^\/+/, "") : "");
  const res = (cfg.method || "POST").toUpperCase() === "GET"
    ? await fetch(`${base}${base.includes("?") ? "&" : "?"}${params}`)
    : await fetch(base, { method: "POST", body: params });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  let data; try { data = JSON.parse(await res.text()); } catch { return { error: "non-JSON response" }; }
  const latest = data.new_version || data.stable_version;
  return latest ? { latest } : { error: `no version in response${license ? "" : " (no license key set)"}` };
}

// Generic JSON endpoint: fetch a URL, read a dotted field path for the version.
async function checkGeneric(cfg) {
  if (!cfg.versionUrl) return { error: "missing versionUrl" };
  const res = await fetch(cfg.versionUrl, cfg.license ? { headers: { Authorization: `Bearer ${cfg.license}` } } : undefined);
  if (!res.ok) return { error: `HTTP ${res.status}` };
  let data; try { data = JSON.parse(await res.text()); } catch { return { error: "non-JSON response" }; }
  const latest = (cfg.versionField || "version").split(".").reduce((o, k) => o?.[k], data);
  return latest ? { latest: String(latest) } : { error: "version field not found" };
}

// Meta Box: implemented against the plugin's own updater (vendor/meta-box/
// meta-box/src/Updater/Checker.php). Hits the public wp-json updater endpoint
// with the license key (Meta Box's settings UI labels it "API Key" — same
// string; there is no separate key). Returns the bundle's latest `new_version`.
async function checkMetabox(cfg, override = {}) {
  const key = override.license || override.api_key || cfg.api_key || cfg.license;
  if (!key) return { error: "missing license key (api_key)" };
  const base = (cfg.api_url || "https://metabox.io/wp-json/buse2/updater/").replace(/\/+$/, "");
  const product = cfg.product || "meta-box-aio";
  // The singular `plugin` endpoint returns one clean object for the bundle;
  // the plural `plugins` endpoint returns a noisy slug-keyed object of every
  // extension. Use the singular one and read its `new_version`.
  const qs = new URLSearchParams({ key, product, url: override.url || "", force: "true" });
  const res = await fetch(`${base}/plugin?${qs}`);
  if (!res.ok) return { error: `HTTP ${res.status}` };
  let data; try { data = JSON.parse(await res.text()); } catch { return { error: "non-JSON response" }; }
  const entry = data?.data || {};
  const latest = entry.new_version || entry.version;
  if (!latest) return { error: `no version returned (license status: ${data?.status || "unknown"})` };
  return { latest: String(latest), note: data?.status };
}

const STRATEGIES = { edd: checkEdd, generic: checkGeneric, metabox: checkMetabox };

async function main() {
  if (process.argv.includes("--init")) return writeTemplate();
  if (!existsSync(CFG)) die(`No config at ${CFG}`);
  if (!existsSync(LIC)) die(`No licenses file at ${LIC}. Run with --init to create a template.`);
  if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) die("GITHUB_PERSONAL_ACCESS_TOKEN not set.");

  const config = JSON.parse(readFileSync(CFG, "utf8"));
  const licenses = JSON.parse(readFileSync(LIC, "utf8"));
  const wanted = licenses.plugins || {};

  // installed[repo][composerName] = version
  const installed = {};
  for (const entry of config.repos) {
    const lock = await ghComposerLock(entry.repo, entry.composerDir);
    if (!lock) { console.log(`## ${entry.repo}\n  (composer.lock not found)`); continue; }
    installed[entry.repo] = {};
    for (const name of Object.keys(wanted)) {
      const v = installedVersion(lock, name);
      if (v) installed[entry.repo][name] = v;
    }
  }

  // cache vendor lookups by (name + license + url) so we hit each endpoint once
  const cache = new Map();
  let rows = 0;
  for (const entry of config.repos) {
    const found = installed[entry.repo];
    if (!found) continue;
    const lines = [];
    for (const [name, version] of Object.entries(found)) {
      const cfg = wanted[name];
      const override = (cfg.repos && cfg.repos[entry.repo]) || {};
      const checker = STRATEGIES[cfg.strategy];
      let result;
      if (!checker) {
        result = { error: `unknown strategy '${cfg.strategy}'` };
      } else {
        const key = `${name}|${override.license || cfg.license || ""}|${override.url || ""}`;
        if (!cache.has(key)) cache.set(key, await checker(cfg, override));
        result = cache.get(key);
      }
      if (result.error) {
        lines.push(`  ⚪ ${name} ${version} — could not check (${result.error})`);
      } else {
        const note = result.note && result.note !== "active" ? ` [license: ${result.note}]` : "";
        lines.push(cmp(version, result.latest) < 0
          ? `  🔴 ${name} ${version} — update available → ${result.latest}${note}`
          : `  🟢 ${name} ${version} — up to date (${result.latest})${note}`);
      }
      rows++;
    }
    if (lines.length) {
      console.log(`\n## ${entry.repo}`);
      for (const l of lines) console.log(l);
    }
  }
  if (rows === 0) console.log("No configured premium plugins were found installed in any repo.");
}

main();
