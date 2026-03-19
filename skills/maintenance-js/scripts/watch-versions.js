#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Octokit } from "@octokit/rest";
import { parse as parseYaml } from "yaml";

const [checkDependantRepo] = process.argv.slice(2);

if (!checkDependantRepo) {
  console.error("Usage: ./watch-versions.js <dependant-owner/dependant-repo>");
  console.error("Example: ./watch-versions.js payloadcms/payload");
  process.exit(1);
}

const configPath = join(homedir(), '.tghp', 'maintenance-js', 'config.json');

let watchConfig;

try {
  watchConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`Config file not found: ${configPath}`);
    console.error('Create it with the following structure:');
    console.error(JSON.stringify({
      'owner/repo': {
        npmPackage: 'package-name',
        repos: [
          { repo: 'org/repo' },
          { repo: 'org/monorepo', lockfileDir: 'apps/web' },
        ],
      },
    }, null, 2));
  } else {
    console.error(`Failed to read config: ${e.message}`);
  }
  process.exit(1);
}

if (!(checkDependantRepo in watchConfig)) {
  console.error('Invalid owner/repo. Not recognised as a repo to check versions for');
  console.error(`Available: ${Object.keys(watchConfig).join(', ')}`);
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
 * Handles large files by falling back to download_url.
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

    // File too large for base64 content — use download_url
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

/**
 * Extract resolved version from package-lock.json (npm lockfile v1/v2/v3).
 */
function getVersionFromNpmLock(content, packageName) {
  const lock = JSON.parse(content);

  // v2/v3 format — flat packages map
  if (lock.packages) {
    const pkg = lock.packages[`node_modules/${packageName}`];
    if (pkg?.version) {
      return pkg.version;
    }
  }

  // v1 format — nested dependencies
  if (lock.dependencies) {
    const dep = lock.dependencies[packageName];
    if (dep?.version) {
      return dep.version;
    }
  }

  return null;
}

/**
 * Extract resolved version from pnpm-lock.yaml (v5/v6/v9).
 */
function getVersionFromPnpmLock(content, packageName) {
  const lock = parseYaml(content);

  // v6+ with importers (monorepo or single-project)
  if (lock.importers) {
    const root = lock.importers['.'];
    if (root) {
      const dep =
        root.dependencies?.[packageName] ||
        root.devDependencies?.[packageName];

      if (dep) {
        const raw = typeof dep === 'string' ? dep : dep.version;
        // Strip pnpm peer-dep suffixes like "3.0.0(react@18.0.0)"
        return raw?.replace(/\(.*\)$/, '') ?? null;
      }
    }
  }

  // v5 format — top-level dependencies/devDependencies
  const dep =
    lock.dependencies?.[packageName] ||
    lock.devDependencies?.[packageName];

  if (dep) {
    const raw = typeof dep === 'string' ? dep : dep.version;
    return raw?.replace(/\(.*\)$/, '') ?? null;
  }

  return null;
}

const config = watchConfig[checkDependantRepo];
const { npmPackage, repos } = config;

let output = '';

for (const checkRepo of repos) {
  const { repo: checkRepoName, lockfileDir } = checkRepo;
  const [owner, repo] = checkRepoName.split("/");

  // lockfileDir defaults to repo root, allows overriding for monorepos
  const prefix = lockfileDir ? `${lockfileDir}/` : '';

  let version = null;
  let lockSource = '';

  // Try npm lockfile first
  const npmLockContent = await fetchFileContent(
    owner,
    repo,
    `${prefix}package-lock.json`,
  );

  if (npmLockContent) {
    version = getVersionFromNpmLock(npmLockContent, npmPackage);
    lockSource = `${prefix}package-lock.json`;
  }

  // Try pnpm lockfile if npm lock not found or didn't contain the package
  if (!version) {
    const pnpmLockContent = await fetchFileContent(
      owner,
      repo,
      `${prefix}pnpm-lock.yaml`,
    );

    if (pnpmLockContent) {
      version = getVersionFromPnpmLock(pnpmLockContent, npmPackage);
      lockSource = `${prefix}pnpm-lock.yaml`;
    }
  }

  if (version) {
    output += `- ${checkRepoName} has ${checkDependantRepo} version ${version} installed (via ${lockSource})\n`;
  } else {
    output += `- ${checkRepoName}: could not resolve installed version of ${npmPackage}\n`;
  }
}

if (output) {
  console.log(output);
} else {
  console.error('No output available');
  process.exit(1);
}
