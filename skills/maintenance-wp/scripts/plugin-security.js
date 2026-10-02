#!/usr/bin/env bun
// Plugin security audit: reads each repo's composer.lock, extracts public
// wpackagist plugins + versions, and matches them against a cached Wordfence
// Intelligence v3 vulnerability feed.
//
// Prereqs:
//   - ~/.tghp/maintenance-wp/config.json        (same config as watch-versions.js)
//   - ~/.tghp/maintenance-wp/wordfence-feed.json (cached v3 feed; see --download)
//   - env GITHUB_PERSONAL_ACCESS_TOKEN
//   - env WORDFENCE_API_TOKEN (only needed for --download)
//
// Usage:
//   ./scripts/plugin-security.js            # audit using cached feed
//   ./scripts/plugin-security.js --download # (re)download the feed, then audit
//   ./scripts/plugin-security.js --json <path>  # also write matched vulns as JSON
//                                               # (input for maintenance-notify)

import { homedir } from "os";
import { join } from "path";
import { readFileSync, existsSync, writeFileSync, statSync } from "fs";

const CFG = join(homedir(), ".tghp/maintenance-wp/config.json");
const FEED = join(homedir(), ".tghp/maintenance-wp/wordfence-feed.json");
const FEED_URL = "https://www.wordfence.com/api/intelligence/v3/vulnerabilities/production";

// Premium / non-wpackagist composer package -> Wordfence plugin slug, for
// packages whose name doesn't match their Wordfence slug. Anything not listed
// here is looked up by its package basename (e.g. tghp/foo-pro -> foo-pro).
// Only map to a slug whose version line matches the package — premium plugins
// with their own versioning get their own Wordfence slug (seo-by-rank-math-pro,
// meta-box-aio), never the free plugin's, or range comparisons are bogus.
const SLUG_MAP = {
  "tghp/rank-math-pro": "seo-by-rank-math-pro",
  // No Pro slug in Wordfence; Pro shares the free plugin's code and version line.
  "yaycommerce/yaycurrency-pro": "yaycurrency",
  "relevanssi/relevanssi-premium": "relevanssi-premium",
  "soflyy/wp-all-export-pro": "wp-all-export-pro",
  "tghp/wp-all-export-pro": "wp-all-export-pro",
  "yoast/wordpress-seo": "wordpress-seo",
  "yoast/wordpress-seo-premium": "wordpress-seo-premium",
  "tghp/search-filter-pro": "search-filter-pro",
  "tghp/miniorange-oauth-oidc-single-sign-on": "miniorange-oauth-oidc-single-sign-on",
  "ninja-forms/ninja-forms-uploads": "ninja-forms-uploads",
  "ninja-forms/ninja-forms-style": "ninja-forms-style",
  "ninja-forms/ninja-forms-salesforce-crm": "ninja-forms-salesforce-crm",
};

// First-party plugins have no public vuln data (code review / SAST only), and
// looking them up by basename could collide with an unrelated public plugin.
function isFirstParty(name) {
  return /^tghp\/.+-site(-plugin)?$/.test(name) ||
    /^(tghp\/(wp-misc-scripts|tghp-mb-contact|cookiefirst-plugin|wp-gatsby-tghp|wp-graphql-mb-tghp|wp-graphql-gutenberg)|wpapi\/basic-auth)$/.test(name);
}

// Version strings like dev-main can't be range-compared (they parse as 0.0.0
// and would match every "<= x" advisory).
const isNumericVersion = v => /^\d+(\.\d+)*/.test(String(v || ""));

function die(msg) { console.error(msg); process.exit(1); }

// --- normalise + compare dotted versions (strip leading v, ignore suffixes) ---
function parse(v) {
  if (v == null || v === "*" || v === "") return null;
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
// is installed version within a Wordfence affected range?
function inRange(version, r) {
  const from = r.from_version, to = r.to_version;
  if (from && from !== "*") {
    const c = cmp(version, from);
    if (c < 0 || (c === 0 && !r.from_inclusive)) return false;
  }
  if (to && to !== "*") {
    const c = cmp(version, to);
    if (c > 0 || (c === 0 && !r.to_inclusive)) return false;
  }
  return true;
}

async function downloadFeed() {
  const tok = process.env.WORDFENCE_API_TOKEN;
  if (!tok) die("WORDFENCE_API_TOKEN not set — cannot download feed.");
  process.stderr.write("Downloading Wordfence v3 feed (~123MB, rate-limited)...\n");
  const res = await fetch(FEED_URL, { headers: { Authorization: `Bearer ${tok}` } });
  if (!res.ok) die(`Feed download failed: HTTP ${res.status} ${await res.text()}`);
  const body = await res.text();
  writeFileSync(FEED, body);
  process.stderr.write(`Saved feed (${body.length} bytes).\n`);
}

async function ghComposerLock(repo, composerDir) {
  return ghRawFile(repo, (composerDir ? composerDir.replace(/\/$/, "") + "/" : "") + "composer.lock")
    .then(t => (t ? JSON.parse(t) : null));
}

async function ghRawFile(repo, path) {
  const tok = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${tok}`, Accept: "application/vnd.github.raw" },
  });
  return res.ok ? res.text() : null;
}

// Meta Box AIO has its own versioning and its own `meta-box-aio` slug in the
// feed, so we scan it there. It also ships Meta Box *core* verbatim under
// vendor/, and core carries separate CVEs (e.g. arbitrary file deletion
// ≤ 5.11.1), so we also read the bundled core's version from the repo and scan
// that against the public `meta-box` slug.
function bundlePath(composerDir, distUrl, file) {
  const rel = String(distUrl || "").replace(/^\.?\/+/, "").replace(/\/+$/, ""); // e.g. src/plugins/meta-box-aio
  if (!rel) return null;
  const dir = composerDir ? composerDir.replace(/\/+$/, "") + "/" : "";
  return `${dir}${rel}/${file}`;
}
function pluginHeaderVersion(php) {
  const m = php && php.match(/^[\s*]*Version:\s*([0-9][0-9.]*)/im);
  return m ? m[1] : null;
}

// pull plugin slugs + versions from a composer.lock.
// Every plugin is looked up in the feed except first-party ones: wpackagist
// plugins by their slug, others via SLUG_MAP or, failing that, their package
// basename (`guessed`, so a miss can be reported rather than read as clean).
// Returns { scan } to match, { unscanned } for the rest (so first-party
// plugins stay visible rather than being silently dropped), and { bundles }.
function extractPlugins(lock) {
  const pkgs = [...(lock.packages || []), ...(lock["packages-dev"] || [])];
  const scan = [];      // { slug, version, composer, guessed? }
  const unscanned = []; // { name, version, reason }
  const bundles = [];   // { composer, version, distType, distUrl } — resolved async in main
  for (const p of pkgs) {
    const version = String(p.version).replace(/^v/i, "");
    if (/^wpackagist-plugin\//.test(p.name)) {
      scan.push({ slug: p.name.split("/")[1], version, composer: p.name });
      continue;
    }
    if (p.type !== "wordpress-plugin") continue; // libraries, themes, mu-plugins, etc.
    if (/meta-?box-aio/.test(p.name)) {
      bundles.push({ composer: p.name, version, distType: p.dist?.type, distUrl: p.dist?.url });
    } else if (isFirstParty(p.name)) {
      unscanned.push({ name: p.name, version, reason: "first-party (code review only)" });
    } else if (SLUG_MAP[p.name]) {
      scan.push({ slug: SLUG_MAP[p.name], version, composer: p.name });
    } else {
      scan.push({ slug: p.name.split("/")[1], version, composer: p.name, guessed: true });
    }
  }
  return { scan, unscanned, bundles };
}

// build slug -> [vuln records] index from the feed (plugins only)
function indexFeed(feed) {
  const idx = {};
  for (const id of Object.keys(feed)) {
    const v = feed[id];
    for (const sw of v.software || []) {
      if (sw.type !== "plugin" || !sw.slug) continue;
      (idx[sw.slug] ??= []).push({
        id: v.id || id,
        title: v.title,
        cve: v.cve || (v.cwe ? "" : ""),
        severity: v.cvss?.rating || "Unknown",
        score: v.cvss?.score ?? "",
        affected: Object.values(sw.affected_versions || {}),
        patched: sw.patched,
        patched_versions: sw.patched_versions || [],
        remediation: sw.remediation || "",
        description: v.description || "",
        published: v.published || "",
        references: v.references || [],
        vector: v.cvss?.vector || "",
        cwe: v.cwe?.name || "",
      });
    }
  }
  return idx;
}

// Wordfence timestamps are "YYYY-MM-DD HH:MM:SS" (UTC); keep the date part.
const feedDate = s => (String(s || "").match(/^\d{4}-\d{2}-\d{2}/) || [""])[0];

async function main() {
  const jsonIdx = process.argv.indexOf("--json");
  const jsonPath = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : null;
  if (jsonIdx >= 0 && (!jsonPath || jsonPath.startsWith("--"))) die("--json needs an output path.");
  if (process.argv.includes("--download")) await downloadFeed();
  if (!existsSync(CFG)) die(`No config at ${CFG}`);
  if (!existsSync(FEED)) die(`No cached feed at ${FEED}. Run with --download first.`);
  if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) die("GITHUB_PERSONAL_ACCESS_TOKEN not set.");

  const config = JSON.parse(readFileSync(CFG, "utf8"));
  const feed = JSON.parse(readFileSync(FEED, "utf8"));
  const idx = indexFeed(feed);
  const findings = []; // structured copy of every [VULN] line, for --json
  const scanErrors = []; // repos that couldn't be scanned — their CVEs would go unseen

  for (const entry of config.repos) {
    const lock = await ghComposerLock(entry.repo, entry.composerDir);
    if (!lock) {
      console.log(`\n## ${entry.repo}\n  (composer.lock not found)`);
      scanErrors.push({ repo: entry.repo, error: "composer.lock not found or unreadable" });
      continue;
    }
    const { scan, unscanned, bundles } = extractPlugins(lock);

    // Resolve meta-box-aio bundles: scan the AIO version as `meta-box-aio`, and
    // the bundled core version as `meta-box`. Both versions are read from the
    // plugin headers in the repo — path-type dist only (zip dists aren't
    // readable), and a path package's composer version is often dev-*.
    for (const b of bundles) {
      const isPath = b.distType === "path";
      const aioPath = isPath ? bundlePath(entry.composerDir, b.distUrl, "meta-box-aio.php") : null;
      const corePath = isPath ? bundlePath(entry.composerDir, b.distUrl, "vendor/meta-box/meta-box/meta-box.php") : null;
      const aio = (aioPath && pluginHeaderVersion(await ghRawFile(entry.repo, aioPath))) || b.version;
      const core = corePath ? pluginHeaderVersion(await ghRawFile(entry.repo, corePath)) : null;
      scan.push({ slug: "meta-box-aio", version: aio, composer: b.composer });
      if (core) {
        scan.push({ slug: "meta-box", version: core, composer: b.composer, via: `${b.composer} ${aio}` });
      } else {
        unscanned.push({ name: `${b.composer} (bundled meta-box core)`, version: aio, reason: "bundled meta-box core version not found" });
      }
    }

    // Versions that can't be compared would false-positive on every advisory.
    for (const pl of scan.filter(pl => !isNumericVersion(pl.version))) {
      unscanned.push({ name: pl.composer, version: pl.version, reason: "non-numeric version — can't compare, check installed version" });
    }
    // A guessed slug the feed has never heard of may just be the wrong slug,
    // so list it rather than reporting the plugin as clean.
    const noEntry = scan.filter(pl => pl.guessed && isNumericVersion(pl.version) && !idx[pl.slug]);
    const scannable = scan.filter(pl => isNumericVersion(pl.version) && !noEntry.includes(pl));

    console.log(`\n## ${entry.repo}  (${scannable.length} scanned, ${noEntry.length} no feed entry, ${unscanned.length} unscanned)`);

    let anyVuln = false;
    for (const pl of scannable) {
      // A record can list the same slug more than once (e.g. several editions),
      // so keep one match per record id.
      const seen = new Set();
      const vulns = (idx[pl.slug] || []).filter(v =>
        v.affected.some(r => inRange(pl.version, r)) && !seen.has(v.id) && seen.add(v.id));
      if (vulns.length) {
        anyVuln = true;
        for (const v of vulns) {
          const fix = v.patched_versions?.length ? ` → fixed in ${v.patched_versions.join(", ")}` : (v.patched ? "" : " (no patch available)");
          const src = pl.via ? ` [bundled core in ${pl.via}]` : pl.guessed ? ` [slug guessed from ${pl.composer}]` : "";
          console.log(`  [VULN] ${pl.slug} ${pl.version}${src} — ${v.severity}${v.score ? ` ${v.score}` : ""} — ${v.title}${v.cve ? ` (${v.cve})` : ""}${fix}`);
          findings.push({
            key: `${entry.repo}:${pl.slug}:${v.id}`,
            repo: entry.repo,
            component: pl.slug,
            composer: pl.composer,
            installed: pl.version,
            fixedIn: v.patched_versions || [],
            patched: !!v.patched,
            severity: v.severity,
            score: v.score === "" ? null : v.score,
            cve: v.cve || null,
            title: v.title,
            description: v.description,
            published: feedDate(v.published),
            unauthenticated: /\bPR:N\b/.test(v.vector),
            cwe: v.cwe || null,
            remediation: v.remediation || null,
            references: v.references,
            via: pl.via ? `bundled core in ${pl.via}` : pl.guessed ? `slug guessed from ${pl.composer}` : null,
          });
        }
      }
    }
    if (!anyVuln) console.log("  No known vulnerabilities in scanned plugins. ✅");

    if (noEntry.length) {
      console.log("  No Wordfence entry (slug guessed from package name — add to SLUG_MAP if Wordfence uses a different slug):");
      for (const pl of noEntry) console.log(`    - ${pl.composer} ${pl.version}  (looked up as ${pl.slug})`);
    }

    if (unscanned.length) {
      console.log("  Not scanned:");
      for (const u of unscanned) console.log(`    - ${u.name} ${u.version}  (${u.reason})`);
    }
  }

  if (jsonPath) {
    const out = {
      source: "wordpress",
      generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      feedDate: statSync(FEED).mtime.toISOString().replace(/\.\d{3}Z$/, "Z"),
      // The feed licence requires attribution wherever the records are reproduced.
      attribution: `Vulnerability data: Wordfence Intelligence. Copyright 2012-${new Date().getUTCFullYear()} Defiant Inc. Licence: https://www.wordfence.com/wordfence-intelligence-terms-and-conditions/`,
      findings,
      scanErrors,
    };
    writeFileSync(jsonPath, JSON.stringify(out, null, 2) + "\n");
    console.log(`\nWrote ${findings.length} finding(s) to ${jsonPath}`);
  }
}

main();
