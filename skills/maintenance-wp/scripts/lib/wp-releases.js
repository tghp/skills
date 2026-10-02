// WordPress.org release feed: fetching, security detection and version
// extraction. Shared by releases.js and watch-versions.js.

import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://wordpress.org/news/category/releases/feed/";

const SECURITY_KEYWORDS = [
  "security",
  "cve",
  "vulnerability",
  "vulnerabilities",
  "exploit",
];

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "item" || name === "category",
});

/**
 * Fetch release feed items, newest first, until `stop(item)` returns true
 * (that item is not included) or the feed runs out.
 * Throws if the first page can't be fetched.
 */
export async function fetchReleases(stop = () => false) {
  let page = 1;
  const items = [];

  while (true) {
    const url = page === 1 ? FEED_URL : `${FEED_URL}?paged=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Past last page or feed error
      if (page > 1) {
        break;
      }
      throw new Error(`Failed to fetch feed: ${response.status}`);
    }

    const parsed = parser.parse(await response.text());
    const pageItems = parsed?.rss?.channel?.item;

    if (!pageItems || pageItems.length === 0) {
      break;
    }

    for (const item of pageItems) {
      if (stop(item)) {
        return items;
      }
      items.push(item);
    }

    page++;
  }

  return items;
}

export function isSecurityRelease(item) {
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
export function extractVersions(title) {
  const matches = [
    ...title.matchAll(/(?:WordPress\s+|and\s+)([\d.]+(?:\s*(?:Beta|Release Candidate|RC|Alpha)\s*\d*)?)/gi),
  ];
  return matches.map((m) => m[1].trim());
}
