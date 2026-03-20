#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Octokit } from "@octokit/rest";

const WP_PACKAGE = "johnpbloch/wordpress";

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
    continue;
  }

  const version = getVersionFromComposerLock(lockContent);

  if (version) {
    output += `- ${repoName}: WordPress ${version} (via ${prefix}composer.lock)\n`;
  } else {
    output += `- ${repoName}: ${WP_PACKAGE} not found in ${prefix}composer.lock\n`;
  }
}

if (output) {
  console.log(output);
} else {
  console.error('No output available');
  process.exit(1);
}
