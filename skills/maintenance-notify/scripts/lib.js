// Shared helpers for maintenance-notify: config + ledger paths, Asana and
// Slack API clients (with retry), and local alerts.

import { homedir, platform } from "os";
import { join, dirname } from "path";
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "fs";
import { spawnSync } from "child_process";

export const DIR = join(homedir(), ".tghp/maintenance-notify");
export const CFG = join(DIR, "config.json");
export const LEDGER = join(DIR, "ledger.json");

// Where each source's discovery skill keeps its repo list and default board.
export const SOURCES = {
  wordpress: {
    reposConfig: join(homedir(), ".tghp/maintenance-wp/config.json"),
    findings: [
      join(homedir(), ".tghp/maintenance-wp/findings.json"),      // plugin CVEs
      join(homedir(), ".tghp/maintenance-wp/core-findings.json"), // core security updates
    ],
    project: "Maintenance: WordPress",
  },
};

export const SEVERITIES = ["None", "Low", "Medium", "High", "Critical"];
export const severityRank = s => SEVERITIES.indexOf(s);

// Compare dotted versions (leading v and suffixes ignored): <0, 0 or >0.
export function compareVersions(a, b) {
  const parse = v => String(v ?? "").replace(/^v/i, "").split(/[.+-]/).map(n => parseInt(n, 10) || 0);
  const A = parse(a), B = parse(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] ?? 0, y = B[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function die(msg) { console.error(msg); process.exit(1); }

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

// Write via a temp file + rename so a crash mid-write can't corrupt the file.
export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, JSON.stringify(data, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
}

export function arg(name) {
  const i = process.argv.indexOf(name);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export class ApiError extends Error {
  constructor(service, message, { status, retryable } = {}) {
    super(`${service}: ${message}`);
    this.status = status;
    this.retryable = retryable;
  }
}

// Retry rate limits (429), server errors (5xx) and network failures up to 3
// attempts, honouring Retry-After. Anything else (401/403/400...) fails at once.
async function withRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const retryable = e instanceof ApiError ? e.retryable : true; // fetch threw: network
      if (!retryable || attempt >= 3) throw e instanceof ApiError ? e : new ApiError("network", e.message);
      const wait = e.retryAfter ? Math.min(e.retryAfter, 60) * 1000 : 2 ** attempt * 1000;
      process.stderr.write(`  ↻ ${e.message} — retrying in ${wait / 1000}s (attempt ${attempt + 1}/3)\n`);
      await sleep(wait);
    }
  }
}

function retryAfter(res) {
  const n = parseInt(res.headers.get("retry-after") || "", 10);
  return isNaN(n) ? null : n;
}

// --- Asana -----------------------------------------------------------------

export async function asana(method, path, body) {
  const tok = process.env.ASANA_ACCESS_TOKEN;
  if (!tok) throw new ApiError("Asana", "ASANA_ACCESS_TOKEN not set", { retryable: false });
  return withRetry(async () => {
    const res = await fetch(`https://app.asana.com/api/1.0${path}`, {
      method,
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify({ data: body }) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json.errors?.map(e => e.message).join("; ") || res.statusText;
      const err = new ApiError("Asana", `HTTP ${res.status} ${msg}`, {
        status: res.status, retryable: res.status === 429 || res.status >= 500,
      });
      err.retryAfter = retryAfter(res);
      throw err;
    }
    return json;
  });
}

// GET every page of a list endpoint.
export async function asanaAll(path) {
  const out = [];
  let offset = null;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const page = await asana("GET", `${path}${sep}limit=100${offset ? `&offset=${offset}` : ""}`);
    out.push(...page.data);
    offset = page.next_page?.offset;
  } while (offset);
  return out;
}

// --- Slack -----------------------------------------------------------------

// Slack returns HTTP 200 with { ok: false, error } for most failures.
export async function slack(method, body, { get = false } = {}) {
  const tok = process.env.SLACK_BOT_TOKEN;
  if (!tok) throw new ApiError("Slack", "SLACK_BOT_TOKEN not set", { retryable: false });
  return withRetry(async () => {
    const qs = get && body ? `?${new URLSearchParams(body)}` : "";
    const res = await fetch(`https://slack.com/api/${method}${qs}`, {
      method: get ? "GET" : "POST",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json; charset=utf-8" },
      body: get ? undefined : JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      const err = new ApiError("Slack", `HTTP ${res.status}`, { status: res.status, retryable: true });
      err.retryAfter = retryAfter(res);
      throw err;
    }
    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!json.ok) {
      throw new ApiError("Slack", `${method} → ${json.error}${json.needed ? ` (needs scope ${json.needed})` : ""}`, {
        status: res.status, retryable: json.error === "ratelimited" || json.error === "service_unavailable",
      });
    }
    return json;
  });
}

// Escape text for Slack mrkdwn.
export const slackEscape = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// --- Local alerts ----------------------------------------------------------

// macOS banner, so an unattended run's failure is still seen. Best-effort.
export function desktopAlert(title, message) {
  if (platform() !== "darwin") return;
  const q = s => JSON.stringify(String(s).slice(0, 200));
  spawnSync("osascript", ["-e", `display notification ${q(message)} with title ${q(title)} sound name "Basso"`]);
}
