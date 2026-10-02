#!/usr/bin/env bun
// Run the full WordPress maintenance scan suite in one go:
//   1. releases.js        — WordPress core releases since <date>
//   2. watch-versions.js  — installed core version per watched repo
//   3. plugin-security.js — plugin CVEs (Wordfence feed + Meta Box AIO core)
//   4. premium-versions.js— premium plugin version-currency (vendor APIs)
//
// Usage:
//   ./scripts/run-all.js                 # since the last successful run (see below)
//   ./scripts/run-all.js 2026-06-15      # explicit since-date (YYYY-MM-DD or full ISO)
//   ./scripts/run-all.js --days 14       # last 14 days
//   ./scripts/run-all.js --download      # refresh the Wordfence feed first
//
// The core-version and plugin steps also write their findings to
// ~/.tghp/maintenance-wp/core-findings.json and findings.json (the input for
// maintenance-notify).
//
// Steps run in sequence; a failure in one is reported but does not stop the rest.
//
// The since-date only affects releases.js. With no date given, it defaults to
// the start of the last run whose core-release step succeeded (stored in
// ~/.tghp/maintenance-wp/last-run.json), or the last 90 days if there isn't one.

import { spawnSync } from "child_process";
import { join } from "path";
import { homedir } from "os";
import { readFileSync, writeFileSync, existsSync } from "fs";

const HERE = import.meta.dir;
const DIR = join(homedir(), ".tghp/maintenance-wp");
const LAST_RUN = join(DIR, "last-run.json");
const FINDINGS = join(DIR, "findings.json");
const CORE_FINDINGS = join(DIR, "core-findings.json");
const FALLBACK_DAYS = 90;
const startedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const argv = process.argv.slice(2);

const download = argv.includes("--download");
const daysIdx = argv.indexOf("--days");
const days = daysIdx >= 0 ? parseInt(argv[daysIdx + 1], 10) : null;
const positional = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--days");

function readLastRun() {
  try {
    const { lastRun } = JSON.parse(readFileSync(LAST_RUN, "utf8"));
    return isNaN(new Date(lastRun).getTime()) ? null : lastRun;
  } catch {
    return null; // missing or unreadable — fall back
  }
}

function daysAgoIso(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Resolve the "since" date for releases.js into ISO 8601, and say where it came from.
function since() {
  if (positional) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(positional)) return { iso: `${positional}T00:00:00Z`, source: "given" };
    return { iso: positional, source: "given" }; // assume already a full ISO timestamp
  }
  if (days) return { iso: daysAgoIso(days), source: `last ${days} days` };
  const last = readLastRun();
  if (last) return { iso: last, source: "last run" };
  return { iso: daysAgoIso(FALLBACK_DAYS), source: `no previous run recorded — last ${FALLBACK_DAYS} days` };
}

// Preflight: fail fast on setup that would make every step fail or mislead,
// and warn about setup that only skips part of the scan.
function preflight() {
  const errors = [], warnings = [];
  if (!existsSync(join(HERE, "../node_modules"))) errors.push("Dependencies not installed — run `bun install` in the skill folder.");
  const cfg = join(DIR, "config.json");
  if (!existsSync(cfg)) errors.push(`No config at ${cfg} — run ./scripts/premium-versions.js --init, then list your repos under \`repos\`.`);
  else {
    let repos;
    try { repos = JSON.parse(readFileSync(cfg, "utf8")).repos; }
    catch (e) { errors.push(`Can't read ${cfg}: ${e.message}`); repos = null; }
    if (repos !== null && !(Array.isArray(repos) && repos.length)) errors.push(`No repos in ${cfg} — add { "repo": "owner/name" } entries under \`repos\`.`);
  }
  if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) errors.push("GITHUB_PERSONAL_ACCESS_TOKEN not set — add `export GITHUB_PERSONAL_ACCESS_TOKEN=...` to ~/.zshrc (fine-grained PAT, Contents: Read-only).");
  if (!existsSync(join(DIR, "licenses.json"))) warnings.push("No licenses.json — the premium version check will fail. Run ./scripts/premium-versions.js --init to create it.");
  if (download && !process.env.WORDFENCE_API_TOKEN) errors.push("--download needs WORDFENCE_API_TOKEN — add `export WORDFENCE_API_TOKEN=...` to ~/.zshrc (free token from the Wordfence dashboard, Integrations).");
  else if (!download && !existsSync(join(DIR, "wordfence-feed.json"))) warnings.push("No cached Wordfence feed — the plugin CVE check will fail. Re-run with --download.");
  for (const w of warnings) console.log(`⚠️  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`❌ ${e}`);
    console.error("\nSetup incomplete — see the skill's README.md (Prerequisites).");
    process.exit(1);
  }
}

preflight();
const { iso, source } = since();
const steps = [
  { name: "WordPress core releases", script: "releases.js", args: [iso] },
  { name: "Watched core versions", script: "watch-versions.js", args: ["--json", CORE_FINDINGS] },
  { name: "Plugin security (CVEs)", script: "plugin-security.js", args: ["--json", FINDINGS, ...(download ? ["--download"] : [])] },
  { name: "Premium version currency", script: "premium-versions.js", args: [] },
];

console.log(`WordPress maintenance scan — since ${iso} (${source})${download ? " (refreshing feed)" : ""}\n`);

const results = [];
for (const step of steps) {
  console.log(`\n${"=".repeat(72)}\n## ${step.name}  (${step.script})\n${"=".repeat(72)}`);
  const t0 = Date.now();
  const r = spawnSync("bun", [join(HERE, step.script), ...step.args], { stdio: "inherit" });
  const ok = r.status === 0;
  results.push({ name: step.name, ok, code: r.status });
  console.log(`\n— ${ok ? "✅ done" : `❌ exited ${r.status}`} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

console.log(`\n${"=".repeat(72)}\n## Summary\n${"=".repeat(72)}`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.ok ? "" : ` (exit ${r.code})`}`);
console.log(results[1].ok ? `\n  Core findings: ${CORE_FINDINGS}` : `\n  Core version check failed — ${CORE_FINDINGS} not updated.`);
console.log(results[2].ok ? `  Plugin findings: ${FINDINGS}` : `  Plugin CVE check failed — ${FINDINGS} not updated.`);

// Record this run's start time only if the core-release step succeeded, so a
// failed fetch doesn't move the window forward and skip releases.
if (results[0].ok) {
  writeFileSync(LAST_RUN, JSON.stringify({ lastRun: startedAt }, null, 2) + "\n");
  console.log(`\n  Next run defaults to since ${startedAt} (${LAST_RUN})`);
} else {
  console.log(`\n  Core release check failed — last-run date not updated.`);
}
process.exit(results.every(r => r.ok) ? 0 : 1);
