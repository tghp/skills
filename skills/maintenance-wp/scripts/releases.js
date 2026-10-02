#!/usr/bin/env bun

import { fetchReleases, isSecurityRelease, extractVersions } from "./lib/wp-releases.js";

const [sinceDate] = process.argv.slice(2);

if (!sinceDate) {
  console.error("Usage: ./releases.js <sinceDate>");
  console.error("Example: ./releases.js 2026-02-01T00:00:00Z");
  process.exit(1);
}

const since = new Date(sinceDate);

if (isNaN(since.getTime())) {
  console.error("Invalid date format. Expected ISO 8601.");
  process.exit(1);
}

let allItems;
try {
  allItems = await fetchReleases((item) => new Date(item.pubDate) < since);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (allItems.length === 0) {
  console.log("No releases found since " + sinceDate);
  process.exit(0);
}

let output = `<releases source="wordpress.org" since="${sinceDate}" count="${allItems.length}">\n\n`;

for (const item of allItems) {
  const security = isSecurityRelease(item);
  const versions = extractVersions(item.title || "");
  output += `<release>\n`;
  output += `<name>${item.title}</name>\n`;
  output += `<version>${versions.join(", ")}</version>\n`;
  output += `<date>${item.pubDate}</date>\n`;
  output += `<link>${item.link}</link>\n`;
  output += `<security>${security ? "yes" : "no"}</security>\n`;
  output += `<description>\n${item.description || "No description."}\n</description>\n`;
  output += `</release>\n\n`;
}

output += `</releases>`;
console.log(output);
