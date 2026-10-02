#!/usr/bin/env bun
// Turn a discovery skill's findings into Asana tasks + Slack messages.
//
// For every finding at or above the source's minSeverity (default High), in order:
//   1. create an Asana task in the repo's section of the source's board
//      ("<client>: <title>", assigned, due dueAfterMonths (default 1) after the
//      CVE / release published date,
//      Client field set, full details in the description), then
//   2. post to the repo's Slack channel, linking the task.
//
// A finding is only "notified" once both have succeeded. Every finding is
// tracked in ~/.tghp/maintenance-notify/ledger.json: delivered ones are never
// re-sent, and undelivered ones stay pending and are retried first on every
// run — even if a later scan no longer reports them. Failures are never quiet:
// they go to the alerts Slack channel (or a comment on the Asana task), a macOS
// notification, a ❌ block in the output, the report banner, and exit code 2.
//
// A finding with a `revision` (e.g. the target core version) updates its
// existing task in place when the revision changes, rather than adding a task.
//
// Usage:
//   ./scripts/notify.js [--source wordpress] [--findings <path>[,<path>…]]
//                       [--since <iso>]     # findings older than this = stale scan → failure
//                       [--report <path>]   # add the Notifications section (+ failure banner) to a report
//                       [--dry-run]         # show what would be sent; no API calls, no writes
//   ./scripts/notify.js --status            # list pending (undelivered) notifications
//
// Exit codes: 0 all delivered · 2 notification failures (see output) · 1 usage error.

import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  DIR, CFG, LEDGER, SOURCES, severityRank, arg, die, readJson, writeJson,
  asana, asanaAll, slack, slackEscape, desktopAlert,
} from "./lib.js";
import { join } from "path";

const source = arg("--source") || "wordpress";
const src = SOURCES[source] || die(`Unknown source "${source}" — known: ${Object.keys(SOURCES).join(", ")}`);
const findingsPaths = arg("--findings") ? arg("--findings").split(",") : src.findings;
const since = arg("--since");
const reportPath = arg("--report");
const dryRun = process.argv.includes("--dry-run");
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const ledger = readJson(LEDGER, {});
const isPending = e => e.source === source && (!(e.asana && e.slack) || e.update);
const save = () => { if (!dryRun) writeJson(LEDGER, ledger); };

if (process.argv.includes("--status")) {
  const pending = Object.entries(ledger).filter(([, e]) => isPending(e));
  console.log(`${pending.length} ${source} notification(s) pending${pending.length ? ":" : "."}`);
  for (const [, e] of pending) console.log(`  - ${e.finding.repo}: ${e.finding.title}${e.lastError ? `\n      last error: ${e.lastError}` : ""}`);
  process.exit(pending.length ? 2 : 0);
}

const failures = []; // per-finding: { finding, stage, error }
const problems = []; // run-level: scan/config/auth problems not tied to one finding
const results = { created: [], updated: [], completed: [], found: [], already: 0 };
const createdNow = new Set(); // keys whose Asana task was created this run
const updatedNow = new Set(); // keys whose Asana task was updated this run

// --- 1. Load findings ------------------------------------------------------
// Each file's attribution (e.g. the Wordfence licence line) travels with its findings.
let findings = [];
for (const path of findingsPaths) {
  if (!existsSync(path)) {
    problems.push(`Findings file missing (${path}) — that scan didn't run or failed, so new issues may have been missed.`);
    continue;
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (since && new Date(data.generatedAt) < new Date(since)) {
    problems.push(`Findings are stale (${path} generated ${data.generatedAt}, before this run started ${since}) — that scan failed, so new issues may have been missed.`);
  } else {
    findings.push(...(data.findings || []).map(f => ({ f, attribution: data.attribution || "" })));
  }
  for (const e of data.scanErrors || []) problems.push(`${e.repo} wasn't fully scanned: ${e.error}.`);
}

// --- 2. Config -------------------------------------------------------------
const config = readJson(CFG, {});
const cfg = config[source];
const alertChannel = config.alerts?.slackChannel || "";
if (!cfg) problems.push(`No "${source}" block in ${CFG} — run ./scripts/discover.js.`);
const minRank = severityRank(cfg?.minSeverity || "High");
if (cfg && minRank < 0) problems.push(`Unknown minSeverity "${cfg.minSeverity}" in ${CFG}.`);

// --- 3. Queue qualifying findings in the ledger -----------------------------
const qualifyingWith = findings.filter(({ f }) => severityRank(f.severity) >= (minRank < 0 ? severityRank("High") : minRank));
const qualifying = qualifyingWith.map(({ f }) => f);
for (const { f, attribution } of qualifyingWith) {
  const e = (ledger[f.key] ??= { source, queuedAt: nowIso() });
  // A delivered finding whose revision moved on (e.g. a newer core security
  // release) gets its task updated and a fresh Slack message.
  if (e.asana && e.slack && f.revision != null && e.finding?.revision !== f.revision) {
    e.update = true;
    e.slack = null;
  }
  e.finding = f; // refresh with the latest scan's data
  if (attribution) e.attribution = attribution;
}
const pending = Object.entries(ledger).filter(([, e]) => isPending(e));
results.already = qualifying.filter(f => !isPending(ledger[f.key])).length;
save();

function fail(key, stage, error) {
  const e = ledger[key];
  e.lastError = `${stage}: ${error}`;
  e.lastAttempt = nowIso();
  e.attempts = (e.attempts || 0) + 1;
  failures.push({ finding: e.finding, stage, error: String(error) });
  save();
}

// --- 4. Preflight: auth + mappings ------------------------------------------
let asanaOk = !!process.env.ASANA_ACCESS_TOKEN, slackOk = !!process.env.SLACK_BOT_TOKEN;
let asanaErr = asanaOk ? null : "ASANA_ACCESS_TOKEN not set";
let slackErr = slackOk ? null : "SLACK_BOT_TOKEN not set";
if (!dryRun && pending.length + problems.length) {
  if (asanaOk && pending.length) {
    try { await asana("GET", "/users/me?opt_fields=gid"); } catch (e) { asanaOk = false; asanaErr = e.message; }
  }
  if (slackOk) {
    try { await slack("auth.test", {}); } catch (e) { slackOk = false; slackErr = e.message; }
  }
}
if (!asanaOk && pending.length) problems.push(`Asana unavailable: ${asanaErr}`);
if (!slackOk) problems.push(`Slack unavailable: ${slackErr}`);
if (!alertChannel) problems.push(`No alerts.slackChannel in ${CFG} — failures can only be alerted locally.`);

function mappingFor(repo) {
  const m = cfg?.repos?.[repo];
  if (!m) return { error: `${repo} has no mapping in ${CFG}` };
  // clientOption is optional: when blank the task is created without the Client field.
  const missing = ["section", "clientName", "slackChannel"].filter(k => !m[k]);
  return missing.length ? { error: `${repo} mapping is missing ${missing.join(", ")}` } : { m };
}

// --- 5. Message builders ----------------------------------------------------
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cveUrl = cve => `https://www.cve.org/CVERecord?id=${encodeURIComponent(cve)}`;
const taskName = (m, f) => `${m.clientName}: ${f.title}`;
// Due date: published date + dueAfterMonths (default 1), clamped to month end.
function dueOn(published) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published || "")) return null;
  const months = cfg?.dueAfterMonths ?? 1;
  const [y, mo, d] = published.split("-").map(Number);
  const last = new Date(Date.UTC(y, mo - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

function taskNotes(f, attr) {
  const line = (label, html) => `<strong>${label}:</strong> ${html}\n`;
  return "<body>" +
    line("Repo", esc(f.repo)) +
    line("Package", `${esc(f.component)} (${esc(f.composer)})`) +
    line("Installed", `${esc(f.installed)} → fixed in ${f.fixedIn?.length ? esc(f.fixedIn.join(", ")) : "no patch available"}`) +
    line("Severity", `${esc(f.severity)}${f.score != null ? ` (CVSS ${esc(f.score)})` : ""}`) +
    (typeof f.unauthenticated === "boolean" ? line("Unauthenticated", f.unauthenticated ? "<strong>Yes</strong>" : "No") : "") +
    (f.cve ? line("CVE", `<a href="${esc(cveUrl(f.cve))}">${esc(f.cve)}</a>`) : "") +
    (f.cwe ? line("Weakness", esc(f.cwe)) : "") +
    line("Published", esc(f.published || "unknown")) +
    (f.via ? `\n<em>Note: ${esc(f.via)} — the finding is inferred from that, not an advisory keyed to this exact package. Confirm before acting.</em>\n` : "") +
    `\n<h2>Description</h2>${esc(f.description || "—")}\n` +
    (f.remediation ? `\n<h2>Remediation</h2>${esc(f.remediation)}\n` : "") +
    (f.references?.length ? `\n<h2>References</h2><ul>${f.references.map(r => `<li><a href="${esc(r)}">${esc(r)}</a></li>`).join("")}</ul>` : "") +
    (attr ? `\n<em>${esc(attr)}</em>\n` : "") +
    `\n<code>${esc(f.key)}</code></body>`;
}

const emoji = f => (f.severity === "Critical" ? ":rotating_light:" : ":red_circle:");
function findingLine(f) {
  const fix = f.fixedIn?.length ? `fixed in ${slackEscape(f.fixedIn.join(", "))}` : "no patch available";
  return `\`${slackEscape(f.component)}\` ${slackEscape(f.installed)} → ${fix}${f.cve ? ` · <${cveUrl(f.cve)}|${slackEscape(f.cve)}>` : ""} · published ${slackEscape(f.published || "?")}`;
}
function slackMessage(f, taskUrl, updated) {
  const head = `${emoji(f)} *${slackEscape(f.severity)}*${f.score != null ? ` (${f.score})` : ""}${f.unauthenticated ? " · *Unauthenticated*" : ""} · ${slackEscape(f.repo)}`;
  return {
    text: `${f.severity} CVE in ${f.repo}: ${f.title}`,
    unfurl_links: false,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `${head}\n*<${taskUrl}|${slackEscape(f.title)}>*\n${findingLine(f)}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: updated ? "Asana task updated by maintenance-notify — a newer fix is now needed" : "Asana task created by maintenance-notify" }] },
    ],
  };
}

async function postAlert(text) {
  if (!slackOk || !alertChannel) return false;
  try {
    await slack("chat.postMessage", { channel: alertChannel, text, unfurl_links: false });
    return true;
  } catch (e) {
    problems.push(`Couldn't post to the alerts channel: ${e.message}`);
    slackOk = false; // don't keep trying
    return false;
  }
}

// --- 6. Deliver ---------------------------------------------------------------
if (dryRun) {
  console.log(`DRY RUN — nothing will be sent.\n`);
  for (const [key, e] of pending) {
    const f = e.finding, { m, error } = mappingFor(f.repo);
    if (error) { console.log(`  ❌ ${f.repo}: ${f.title}\n      ${error}`); fail(key, "config", error); continue; }
    console.log(`  ${e.update ? "✏️  Asana update" : e.asana ? "↷ (task exists)" : "➕ Asana"} "${taskName(m, f)}" → section ${m.section}, due ${dueOn(f.published) || "none"}`);
    console.log(`  ${e.slack ? "↷ (already posted)" : "💬 Slack"} → ${m.slackChannel}`);
  }
} else {
  // Existing tasks, matched by the finding key in their notes: a fallback for a
  // lost ledger or another machine. (Not by title — two Wordfence records can
  // share a title.)
  let existingTasks = null;
  if (asanaOk && cfg && pending.some(([, e]) => !e.asana)) {
    try {
      existingTasks = await asanaAll(`/projects/${cfg.asana.project}/tasks?opt_fields=notes,permalink_url`);
    } catch (e) { asanaOk = false; asanaErr = e.message; problems.push(`Couldn't list existing Asana tasks: ${e.message}`); }
  }

  for (const [key, e] of pending) {
    const f = e.finding;
    const { m, error } = cfg ? mappingFor(f.repo) : { error: `no "${source}" config` };
    if (error) { fail(key, "config", error); continue; }

    if (e.asana && e.update) {
      if (!asanaOk) { fail(key, "Asana", asanaErr || "unavailable"); continue; }
      try {
        const due = dueOn(f.published);
        await asana("PUT", `/tasks/${e.asana.gid}`, { name: taskName(m, f), html_notes: taskNotes(f, e.attribution), ...(due && { due_on: due }) });
        delete e.update;
        updatedNow.add(key);
        save();
      } catch (err) {
        if (err.status !== 404) { fail(key, "Asana update", err.message); continue; }
        // The task was deleted in Asana; the issue is still open, so make a new one.
        delete e.asana;
        delete e.update;
      }
    }

    if (!e.asana) {
      if (!asanaOk) { fail(key, "Asana", asanaErr || "unavailable"); continue; }
      const name = taskName(m, f);
      const existing = existingTasks?.find(t => t.notes?.includes(key));
      if (existing) {
        // Created on an earlier run whose ledger is gone; assume Slack went out too.
        e.asana = { gid: existing.gid, url: existing.permalink_url, at: nowIso(), found: true };
        e.slack ??= { assumed: true, at: nowIso() };
        results.found.push(f);
        save();
        continue;
      }
      try {
        const body = {
          name,
          projects: [cfg.asana.project],
          assignee: cfg.asana.assignee,
          html_notes: taskNotes(f, e.attribution),
          ...(dueOn(f.published) && { due_on: dueOn(f.published) }),
          ...(cfg.asana.clientField && m.clientOption && { custom_fields: { [cfg.asana.clientField]: m.clientOption } }),
        };
        const task = (await asana("POST", "/tasks?opt_fields=permalink_url", body)).data;
        e.asana = { gid: task.gid, url: task.permalink_url, at: nowIso() };
        createdNow.add(key);
        save();
        // Asana won't take a section on create, so move it in afterwards. If
        // that fails the task still exists (in the project, no section) — alert
        // rather than re-create.
        try {
          await asana("POST", `/sections/${m.section}/addTask`, { task: task.gid });
        } catch (err) {
          problems.push(`Task for ${f.repo} "${f.title}" was created but couldn't be moved to its section (${err.message}): ${task.permalink_url}`);
        }
      } catch (err) {
        fail(key, "Asana", err.message);
        continue;
      }
    }

    if (!e.slack) {
      try {
        if (!slackOk) throw new Error(slackErr || "Slack unavailable");
        const res = await slack("chat.postMessage", { channel: m.slackChannel, ...slackMessage(f, e.asana.url, updatedNow.has(key)) });
        e.slack = { channel: res.channel, ts: res.ts, at: nowIso() };
        save();
      } catch (err) {
        fail(key, "Slack", err.message);
        try {
          await asana("POST", `/tasks/${e.asana.gid}/stories`, { text: `⚠️ maintenance-notify: the Slack notification for this issue failed (${err.message}). It will be retried on the next run.` });
        } catch {} // the task itself exists; the alert channel + local alerts still fire
        failures.at(-1).taskUrl = e.asana.url;
        continue;
      }
    }

    delete e.lastError;
    e.deliveredAt = nowIso();
    (createdNow.has(key) ? results.created : updatedNow.has(key) ? results.updated : results.completed).push({ f, url: e.asana.url });
    save();
  }

  // One consolidated alert: every undelivered CVE (with enough detail to log it
  // by hand) plus run-level problems (stale scan, unscanned repos, auth).
  const runProblems = problems.filter(p => !p.startsWith("No alerts.slackChannel") && !p.startsWith("Slack unavailable"));
  if (failures.length || runProblems.length) {
    const lines = [`:warning: *maintenance-notify (${source}) — ${failures.length} CVE(s) not fully notified${runProblems.length ? `, ${runProblems.length} problem(s)` : ""}*`];
    for (const x of failures) {
      const f = x.finding;
      lines.push(`\n• *${slackEscape(f.repo)}*: ${slackEscape(f.title)} (${slackEscape(f.severity)}${f.unauthenticated ? ", unauthenticated" : ""})`,
        `   ${findingLine(f)}`,
        `   *${slackEscape(x.stage)} failed:* \`${slackEscape(x.error)}\`${x.taskUrl ? ` — <${x.taskUrl}|Asana task exists>` : " — log by hand if urgent"}`);
    }
    if (runProblems.length) lines.push(`\n*Problems:*`, ...runProblems.map(p => `• ${slackEscape(p)}`));
    if (failures.length) lines.push(`\nQueued — retried first on the next run.`);
    await postAlert(lines.join("\n"));
  }
}

// --- 7. Summary -----------------------------------------------------------------
const failed = failures.length + problems.length > 0;
const md = [];
md.push(`## Notifications`, ``);
md.push(`${qualifying.length} finding(s) at ${cfg?.minSeverity || "High"}+ this scan · ${results.created.length} new task(s)${results.updated.length ? ` · ${results.updated.length} task(s) updated` : ""} · ${results.already} already notified${results.completed.length ? ` · ${results.completed.length} earlier failure(s) now delivered` : ""}${results.found.length ? ` · ${results.found.length} matched an existing Asana task` : ""}${dryRun ? " · **dry run, nothing sent**" : ""}`, ``);
if (results.created.length + results.updated.length + results.completed.length) {
  md.push(`| Repo | Finding | Severity | Task |`, `| --- | --- | --- | --- |`);
  for (const { f, url } of [...results.created, ...results.updated, ...results.completed]) md.push(`| ${f.repo} | ${f.title.replace(/\|/g, "\\|")} | ${f.severity} | [Asana](${url}) |`);
  md.push(``);
}
const failureLines = [
  ...failures.map(x => `- **${x.finding.repo}** — ${x.finding.title.replace(/\|/g, "\\|")} (${x.finding.severity}${x.finding.cve ? `, ${x.finding.cve}` : ""}): **${x.stage} failed** — ${x.error}`),
  ...problems.map(p => `- ${p}`),
];
if (failed) md.push(`### ❌ Failures`, ``, ...failureLines, ``, `Failed notifications are queued in \`${LEDGER}\` and retried first on the next run (\`./scripts/notify.js --status\` lists them).`, ``);
const summary = md.join("\n");

console.log(`\n${summary}`);
if (failed) {
  console.log(`\n${"!".repeat(72)}\n❌ NOTIFICATION FAILURES — ${failures.length} CVE(s) not fully notified, ${problems.length} run problem(s)\n${failureLines.join("\n")}\n${"!".repeat(72)}`);
  if (!dryRun) desktopAlert("maintenance-notify: notification failures", `${failures.length} CVE(s) not notified, ${problems.length} problem(s). See the report / terminal.`);
}

if (!dryRun) writeJson(join(DIR, "last-notify.json"), { source, at: nowIso(), created: results.created.length, already: results.already, failures: failures.length, problems });

// --- 8. Report injection -----------------------------------------------------------
if (reportPath && !dryRun) {
  if (!existsSync(reportPath)) console.error(`⚠️  Report ${reportPath} not found — summary not added.`);
  else {
    let r = readFileSync(reportPath, "utf8");
    r = r.replace(/\n?<!-- notify:banner -->[\s\S]*?<!-- \/notify:banner -->\n?/g, "\n").replace(/\n?<!-- notify:section -->[\s\S]*?<!-- \/notify:section -->\n?/g, "\n");
    if (failed) {
      const banner = `<!-- notify:banner -->\n> **⚠️ Notification failures** — some CVEs were not fully notified. See [Notifications](#notifications).\n>\n${failureLines.map(l => `> ${l}`).join("\n")}\n<!-- /notify:banner -->\n`;
      const h1 = r.match(/^# .*\n/m);
      r = h1 ? r.replace(h1[0], `${h1[0]}\n${banner}`) : `${banner}\n${r}`;
    }
    r = `${r.trimEnd()}\n\n<!-- notify:section -->\n${summary.trimEnd()}\n<!-- /notify:section -->\n`;
    writeFileSync(reportPath, r);
    console.log(`\nUpdated ${reportPath}`);
  }
}

process.exit(failed ? 2 : 0);
