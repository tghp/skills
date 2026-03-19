#!/usr/bin/env bun

import { Octokit } from "@octokit/rest";

const [ownerRepo, sinceDate] = process.argv.slice(2);

if (!ownerRepo || !sinceDate) {
  console.error("Usage: ./releases.js <owner/repo> <sinceDate>");
  console.error("Example: ./releases.js payloadcms/payload 2026-02-01T00:00:00Z");
  process.exit(1);
}

const [owner, repo] = ownerRepo.split("/");

if (!owner || !repo) {
  console.error("Invalid owner/repo format. Expected: owner/repo");
  process.exit(1);
}

const since = new Date(sinceDate);

if (isNaN(since.getTime())) {
  console.error("Invalid date format. Expected ISO 8601.");
  process.exit(1);
}

const octokit = new Octokit();

let page = 1;
let allReleases = [];
let done = false;

while (!done) {
  const { data } = await octokit.rest.repos.listReleases({
    owner,
    repo,
    per_page: 100,
    page,
  });

  if (data.length === 0) {
    break;
  }

  for (const release of data) {
    const createdAt = new Date(release.created_at);
    if (createdAt < since) {
      done = true;
      break;
    }
    allReleases.push(release);
  }

  page++;
}

if (allReleases.length === 0) {
  console.log("No releases found since " + sinceDate);
  process.exit(0);
}

let output = `<releases repo="${ownerRepo}" since="${sinceDate}" count="${allReleases.length}">\n\n`;

for (const release of allReleases) {
  output += `<release>\n`;
  output += `<name>${release.name || release.tag_name}</name>\n`;
  output += `<tag>${release.tag_name}</tag>\n`;
  output += `<date>${release.created_at}</date>\n`;
  output += `<prerelease>${release.prerelease ? "yes" : "no"}</prerelease>\n`;
  output += `<changes>\n${release.body || "No release notes."}\n</changes>\n`;
  output += `</release>\n\n`;
}

output += `</releases>`;
console.log(output);
