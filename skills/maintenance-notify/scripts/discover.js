#!/usr/bin/env bun
// Setup helper: looks up the Asana board (sections + "Client" custom field
// options) and the Slack channels the bot can see, matches them to each repo
// in the source's config by name, and writes a pre-filled
// ~/.tghp/maintenance-notify/config.json for you to check. Read-only against
// both APIs.
//
// Usage:
//   ./scripts/discover.js                         # source: wordpress
//   ./scripts/discover.js --source wordpress
//   ./scripts/discover.js --project "Maintenance: WordPress" --field Client
//   ./scripts/discover.js --force                 # overwrite an existing config
//   ./scripts/discover.js --print                 # print the result, don't write
//
// Needs ASANA_ACCESS_TOKEN. Listing Slack channels needs the bot's
// channels:read scope (groups:read for private channels) on top of chat:write;
// without it the channel IDs are left blank for you to fill in.

import { CFG, SOURCES, arg, die, readJson, writeJson, asana, asanaAll, slack } from "./lib.js";

const source = arg("--source") || "wordpress";
const src = SOURCES[source] || die(`Unknown source "${source}" — known: ${Object.keys(SOURCES).join(", ")}`);
const projectName = arg("--project") || src.project;
const fieldName = arg("--field") || "Client";
const force = process.argv.includes("--force");
const printOnly = process.argv.includes("--print");

if (!process.env.ASANA_ACCESS_TOKEN) die("ASANA_ACCESS_TOKEN not set.");
const repos = readJson(src.reposConfig, null)?.repos;
if (!repos?.length) die(`No repos in ${src.reposConfig}.`);

// Name matching. Names are reduced to keys: the squashed name and its
// initials, with a few number words folded ("Institute for Progress" → i4p,
// "pledge-one" → pledge1). "tghp/example-client-wp" → exampleclient / ec.
const WORDS = { for: "4", one: "1", two: "2", to: "2" };
const words = s => String(s).toLowerCase().replace(/^.*\//, "").replace(/[-_ ](wp|wordpress|site)$/, "")
  .split(/[^a-z0-9]+/).filter(Boolean).map(w => WORDS[w] || w);
const norm = s => words(s).join("");
const initials = s => { const w = words(s); return w.length > 1 ? w.map(x => (/^\d/.test(x) ? x : x[0])).join("") : ""; };

// Exact: squashed names or initials are equal. Partial: one squashed name
// contains the other, or a code is a prefix of a name — but only for 3+
// characters, so short codes like "WA" don't match anything containing "wa".
function score(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb || na === initials(b) || nb === initials(a)) return 2;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return short.length >= 3 && long.includes(short) ? 1 : 0;
}
// names: the repo, plus anything already matched for it (e.g. its section name).
function match(names, items, name = i => i.name) {
  const scored = items.map(i => ({ i, s: Math.max(...names.filter(Boolean).map(n => score(n, name(i)))) }));
  for (const level of [2, 1]) {
    const hits = scored.filter(x => x.s === level);
    if (hits.length === 1) return { item: hits[0].i, exact: level === 2 };
    if (hits.length > 1) return { item: null, candidates: hits.map(x => name(x.i)) };
  }
  return { item: null };
}

// --- Asana ---
const me = (await asana("GET", "/users/me?opt_fields=gid,name,email,workspaces.name")).data;
console.log(`Asana: authenticated as ${me.name} <${me.email}>`);

let project = null;
for (const ws of me.workspaces) {
  const projects = await asanaAll(`/projects?workspace=${ws.gid}&archived=false&opt_fields=name`);
  const p = projects.find(p => p.name.trim().toLowerCase() === projectName.toLowerCase());
  if (p) { project = { ...p, workspace: ws }; break; }
}
if (!project) die(`No Asana project named "${projectName}" in workspaces: ${me.workspaces.map(w => w.name).join(", ")}`);
console.log(`Asana: project "${project.name}" (${project.gid}) in ${project.workspace.name}`);

const sections = await asanaAll(`/projects/${project.gid}/sections?opt_fields=name`);
console.log(`Asana: ${sections.length} sections — ${sections.map(s => s.name).join(", ")}`);

const settings = await asanaAll(`/projects/${project.gid}/custom_field_settings?opt_fields=custom_field.name,custom_field.resource_subtype,custom_field.enum_options.name,custom_field.enum_options.enabled`);
const field = settings.map(s => s.custom_field).find(f => f.name.trim().toLowerCase() === fieldName.toLowerCase());
let options = [];
if (!field) console.log(`⚠️  Asana: no "${fieldName}" custom field on the project — fields: ${settings.map(s => s.custom_field.name).join(", ") || "none"}`);
else if (field.resource_subtype !== "enum") console.log(`⚠️  Asana: "${field.name}" is a ${field.resource_subtype} field, not a single-select — clientOption can't be set.`);
else {
  options = field.enum_options.filter(o => o.enabled);
  console.log(`Asana: "${field.name}" field (${field.gid}) — ${options.length} options`);
}

// --- Slack ---
let channels = [];
if (!process.env.SLACK_BOT_TOKEN) console.log("⚠️  SLACK_BOT_TOKEN not set — channel IDs left blank.");
else {
  try {
    const auth = await slack("auth.test", {});
    console.log(`Slack: authenticated as ${auth.user} in ${auth.team}`);
    let cursor = "";
    do {
      const page = await slack("conversations.list", { types: "public_channel,private_channel", exclude_archived: "true", limit: "1000", ...(cursor && { cursor }) }, { get: true });
      channels.push(...page.channels);
      cursor = page.response_metadata?.next_cursor || "";
    } while (cursor);
    console.log(`Slack: ${channels.length} channels visible`);
  } catch (e) {
    console.log(`⚠️  ${e.message} — channel IDs left blank (add the channels:read scope, or paste IDs from Slack: channel → About → Channel ID).`);
  }
}

// --- Build config ---
const config = readJson(CFG, {});
if (config[source] && !force && !printOnly) die(`${CFG} already has a "${source}" block — re-run with --force to overwrite it, or --print to just see the result.`);

const out = {
  minSeverity: "High",
  dueAfterMonths: 1, // tasks are due this long after the CVE / release date
  asana: { workspace: project.workspace.gid, project: project.gid, assignee: me.email, clientField: field?.gid || "" },
  repos: {},
};
const todo = [];
for (const { repo } of repos) {
  const s = match([repo], sections);
  const o = match([repo, s.item?.name], options), c = match([repo, s.item?.name], channels);
  const entry = {
    section: s.item?.gid || "",
    clientOption: o.item?.gid || "",
    clientName: o.item?.name || s.item?.name || "",
    slackChannel: c.item?.id || "",
  };
  const notes = [];
  for (const [label, m, item] of [["section", s, s.item?.name], ["client option", o, o.item?.name], ["channel", c, c.item && `#${c.item.name}`]]) {
    if (!m.item) notes.push(`no ${label}${m.candidates?.length ? ` (candidates: ${m.candidates.join(", ")})` : ""}`);
    else if (!m.exact) notes.push(`${label} "${item}" is a partial match`);
  }
  if (notes.length) { entry._check = notes.join("; "); todo.push(`${repo}: ${entry._check}`); }
  entry._matched = [s.item?.name, o.item?.name, c.item && `#${c.item.name}`].map(x => x || "—").join(" · ");
  out.repos[repo] = entry;
}

config[source] = out;
config.alerts ??= { slackChannel: "" };

console.log("\nMatches (section · client option · channel):");
for (const [repo, e] of Object.entries(out.repos)) console.log(`  ${e._check ? "⚠️ " : "✅"} ${repo} → ${e._matched}`);

if (printOnly) { console.log(`\n${JSON.stringify(config, null, 2)}`); process.exit(0); }
writeJson(CFG, config);
console.log(`\nWrote ${CFG}`);
if (todo.length) console.log(`\nCheck and fix by hand (then delete the _check note):\n${todo.map(t => `  - ${t}`).join("\n")}`);
if (!config.alerts.slackChannel) console.log(`\nSet alerts.slackChannel to the channel ID for failure alerts (e.g. #maintenance-alerts) and invite the bot to it.`);
console.log(`\nInvite the bot to every repo channel — chat:write can only post to channels it's a member of.`);
