#!/usr/bin/env bun

import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://wordpress.org/news/category/releases/feed/";

const SECURITY_KEYWORDS = [
  "security",
  "cve",
  "vulnerability",
  "vulnerabilities",
  "exploit",
];

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

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "item" || name === "category",
});

let page = 1;
let allItems = [];
let done = false;

while (!done) {
  const url = page === 1 ? FEED_URL : `${FEED_URL}?paged=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    // Past last page or feed error
    if (page > 1) {
      break;
    }
    console.error(`Failed to fetch feed: ${response.status}`);
    process.exit(1);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;

  if (!items || items.length === 0) {
    break;
  }

  for (const item of items) {
    const pubDate = new Date(item.pubDate);
    if (pubDate < since) {
      done = true;
      break;
    }
    allItems.push(item);
  }

  page++;
}

if (allItems.length === 0) {
  console.log("No releases found since " + sinceDate);
  process.exit(0);
}

function isSecurityRelease(item) {
  // Check categories (case-insensitive)
  const categories = item.category || [];
  const categoryMatch = categories.some((cat) => {
    const text = (typeof cat === "string" ? cat : cat["#text"] || "").toLowerCase();
    return text === "security";
  });

  if (categoryMatch) {
    return true;
  }

  // Check title and RSS description (excerpt) for keywords
  const title = (item.title || "").toLowerCase();
  const description = (item.description || "").toLowerCase();
  const textToCheck = `${title} ${description}`;

  return SECURITY_KEYWORDS.some((kw) => textToCheck.includes(kw));
}

/**
 * Extract version number(s) from a release title.
 * Handles compound titles like "WordPress 6.9.3 and 7.0 beta 4".
 */
function extractVersions(title) {
  const matches = [
    ...title.matchAll(/(?:WordPress\s+|and\s+)([\d.]+(?:\s*(?:Beta|Release Candidate|RC|Alpha)\s*\d*)?)/gi),
  ];
  return matches.map((m) => m[1].trim());
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
