#!/usr/bin/env bun
// Installed WordPress core version per watched repo.
//
// Usage:
//   ./scripts/watch-versions.js                # list versions
//   ./scripts/watch-versions.js --json <path>  # also write core findings
//                                              # (input for maintenance-notify)
//
// With --json, every repo whose installed core version WordPress.org's
// stable-check API marks "insecure" becomes one finding: upgrade to the nearest
// secure version on the same branch (e.g. a 7.0.x backport), else the latest.
// It lists the security releases published since the installed version.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Octokit } from "@octokit/rest";
import { fetchReleases, isSecurityRelease, extractVersions } from "./lib/wp-releases.js";

const WP_PACKAGE = "johnpbloch/wordpress";
const STABLE_CHECK_URL = "https://api.wordpress.org/core/stable-check/1.0/";

const jsonIdx = process.argv.indexOf("--json");
const jsonPath = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : null;
if (jsonIdx >= 0 && (!jsonPath || jsonPath.startsWith("--"))) {
  console.error("--json needs an output path.");
  process.exit(1);
}

const configPath = join(homedir(), '.tghp', 'maintenance-wp', 'config.json');

let watchConfig;

try {
  watchConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`Config file not found: ${configPath}`);
    console.error('Create it with the following structure:');
    console.error(JSON.stringify({
      repos: [
        { repo: 'org/repo' },
        { repo: 'org/monorepo', composerDir: 'site' },
      ],
    }, null, 2));
  } else {
    console.error(`Failed to read config: ${e.message}`);
  }
  process.exit(1);
}

if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
  console.error('GITHUB_PERSONAL_ACCESS_TOKEN not set.');
  process.exit(1);
}

const noop = () => {};

const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  log: { debug: noop, info: noop, warn: noop, error: noop },
});

/**
 * Fetch a file from a GitHub repo via the contents API.
 * Returns the file content as a string, or null if not found.
 */
async function fetchFileContent(owner, repo, path) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (data.content) {
      return Buffer.from(data.content, 'base64').toString();
    }

    if (data.download_url) {
      const response = await fetch(data.download_url);
      return response.text();
    }

    return null;
  } catch (e) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
}

function getVersionFromComposerLock(content) {
  const lock = JSON.parse(content);
  const packages = lock.packages || [];
  const wp = packages.find((pkg) => pkg.name === WP_PACKAGE);
  return wp?.version ?? null;
}

const { repos } = watchConfig;

if (!repos || repos.length === 0) {
  console.error('No repos configured in config.json');
  process.exit(1);
}

let output = '';
const installed = []; // { repo, version }
const scanErrors = [];

for (const entry of repos) {
  const { repo: repoName, composerDir } = entry;
  const [owner, repo] = repoName.split("/");
  const prefix = composerDir ? `${composerDir}/` : '';

  const lockContent = await fetchFileContent(
    owner,
    repo,
    `${prefix}composer.lock`,
  );

  if (!lockContent) {
    output += `- ${repoName}: composer.lock not found at ${prefix}composer.lock\n`;
    scanErrors.push({ repo: repoName, error: `composer.lock not found at ${prefix}composer.lock — core version unknown` });
    continue;
  }

  const version = getVersionFromComposerLock(lockContent);

  if (version) {
    output += `- ${repoName}: WordPress ${version} (via ${prefix}composer.lock)\n`;
    installed.push({ repo: repoName, version: String(version).replace(/^v/i, '') });
  } else {
    output += `- ${repoName}: ${WP_PACKAGE} not found in ${prefix}composer.lock\n`;
    scanErrors.push({ repo: repoName, error: `${WP_PACKAGE} not found in ${prefix}composer.lock — core version unknown` });
  }
}

if (output) {
  console.log(output);
} else {
  console.error('No output available');
  process.exit(1);
}

// --- core findings (--json) ---

function parseVersion(v) {
  return String(v).split('.').map((n) => parseInt(n, 10) || 0);
}
function cmp(a, b) {
  const A = parseVersion(a), B = parseVersion(b);
  for (let i = 0; i < Math.max(A.length, B.length, 3); i++) {
    const x = A[i] ?? 0, y = B[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
const branch = (v) => parseVersion(v).slice(0, 2).join('.');
const isFinal = (v) => /^\d+(\.\d+)*$/.test(v); // not a beta / RC
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const decode = (s) => String(s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&#8230;/g, '…').replace(/&#160;/g, ' ').replace(/&#8217;/g, "'")
  .replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&')
  .replace(/\s*\[…\]\s*$/, '…').trim();

// stable-check keys drop a trailing ".0" (7.1, not 7.1.0).
function stableStatus(stable, v) {
  return stable[v] ?? stable[v.replace(/\.0$/, '')] ?? null;
}

async function writeCoreFindings() {
  const res = await fetch(STABLE_CHECK_URL);
  if (!res.ok) {
    console.error(`Stable-check API failed: HTTP ${res.status} — core findings not written.`);
    process.exit(1);
  }
  const stable = await res.json();
  const versions = Object.keys(stable);
  const latest = versions.find((v) => stable[v] === 'latest');

  const insecure = [];
  for (const i of installed) {
    const status = stableStatus(stable, i.version);
    if (status === null) {
      scanErrors.push({ repo: i.repo, error: `WordPress ${i.version} not known to the stable-check API — check by hand` });
    } else if (status === 'insecure') {
      insecure.push(i);
    }
  }

  // Release feed back to the oldest installed insecure version (3-year cap),
  // to find each installed version's release date and the security releases since.
  const wanted = new Set(insecure.map((i) => i.version));
  const cap = Date.now() - 3 * 365 * 24 * 3600 * 1000;
  let releases = [];
  if (insecure.length) {
    const seen = new Set();
    releases = await fetchReleases((item) => {
      if (new Date(item.pubDate).getTime() < cap || [...wanted].every((w) => seen.has(w))) return true;
      for (const v of extractVersions(item.title || '').filter(isFinal)) {
        for (const w of wanted) if (cmp(v, w) === 0) seen.add(w);
      }
      return false;
    });
  }
  const releasedOn = (v) => {
    const item = releases.find((r) => extractVersions(r.title || '').filter(isFinal).some((x) => cmp(x, v) === 0));
    return item ? new Date(item.pubDate) : null;
  };

  const findings = [];
  for (const i of insecure) {
    // Nearest secure version on the same branch (a backport), else the latest.
    const sameBranch = versions
      .filter((v) => stable[v] !== 'insecure' && branch(v) === branch(i.version) && cmp(v, i.version) > 0)
      .sort(cmp);
    const target = sameBranch[0] || latest;
    const since = releasedOn(i.version);
    const missed = releases
      .filter((r) => isSecurityRelease(r) && (since ? new Date(r.pubDate) > since : extractVersions(r.title || '').some((v) => isFinal(v) && cmp(v, i.version) > 0)))
      .reverse(); // oldest first
    const severity = missed.some((r) => /critical/i.test(r.description || '')) ? 'Critical' : 'High';

    findings.push({
      key: `${i.repo}:wordpress-core:${i.version}`,
      revision: target, // a newer target updates the same task rather than adding one
      repo: i.repo,
      component: 'wordpress-core',
      composer: WP_PACKAGE,
      installed: i.version,
      fixedIn: [target],
      patched: true,
      severity,
      score: null,
      cve: null,
      title: `WordPress core ${i.version} → ${target} (security update)`,
      description: `WordPress.org marks ${i.version} as insecure. ${sameBranch[0] ? `${target} is the secure release on the ${branch(i.version)} branch` : `Upgrade to the latest release, ${target}`}.`
        + (missed.length ? `\n\nSecurity releases since ${i.version}:\n` + missed.map((r) => `• ${r.title} (${isoDate(r.pubDate)}): ${decode(r.description)}`).join('\n') : ''),
      published: missed.length ? isoDate(missed[0].pubDate) : (since ? isoDate(since) : null),
      unauthenticated: null,
      cwe: null,
      remediation: `Update ${WP_PACKAGE} to ${target}.`,
      references: missed.map((r) => r.link),
      via: null,
    });
  }

  writeFileSync(jsonPath, JSON.stringify({
    source: 'wordpress',
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    findings,
    scanErrors,
  }, null, 2) + '\n');
  console.log(`Wrote ${findings.length} core finding(s) to ${jsonPath}`);
}

if (jsonPath) {
  await writeCoreFindings();
}
