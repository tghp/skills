---
name: maintenance-wp
description: Use this skill when checking WordPress projects for security updates (core releases, plugin CVEs, premium plugin versions) without sending notifications, or answering questions about the scan setup and history. Triggers on requests to check WordPress core updates, WordPress security releases, or WordPress maintenance status.
allowed-tools: bash
---

Check WordPress projects for security updates: WordPress core releases, plugin CVEs, and premium plugin version-currency.

# How To Use

All JS scripts live in `scripts/` and run directly (each has a `#!/usr/bin/env bun` shebang; bun is available).

## Setup

On an already-configured machine, skip to **On activation**. First-time setup (one-time):

1. `bun install` in this skill's folder.
2. Set env vars: `GITHUB_PERSONAL_ACCESS_TOKEN` (reads each repo's `composer.lock`) and, for feed refreshes, `WORDFENCE_API_TOKEN`.
3. `./scripts/premium-versions.js --init` — scaffolds `~/.tghp/maintenance-wp/config.json` and `licenses.json`, creating the directory. Safe to re-run: it won't overwrite an existing file.
4. Edit `config.json` → `repos` to list the sites to scan (it ships empty with a commented `_example`). Optionally add vendor keys to `licenses.json` (`chmod 600`) for the premium version check — entries without keys are skipped, but the file itself must exist or the premium check fails.
5. `./scripts/run-all.js --download` on the first run fetches the Wordfence feed to `wordfence-feed.json`.

Everything lives in `~/.tghp/maintenance-wp/`: `config.json` and `licenses.json` (created by step 3), `wordfence-feed.json` (created by `--download`), `last-run.json` (written by `run-all.js`). The only thing you must provide by hand is the env vars and the repo list.

## On activation — show the steps, don't scan

When the skill is activated (e.g. `/maintenance-wp` with no arguments), **don't run any scan scripts**. Scans hit GitHub and vendor APIs, and `--download` spends the rate-limited Wordfence quota. Instead, check setup, then read the local status (below — file reads only, no scripts) and print a brief overview, then wait.

**Setup check first.** Confirm each of these (file reads plus `[ -n "$VAR" ] && echo set || echo missing` — never print a token's value):

- `node_modules/` exists in this skill's folder
- `~/.tghp/maintenance-wp/config.json` exists and its `repos` is non-empty
- `~/.tghp/maintenance-wp/licenses.json` exists
- `GITHUB_PERSONAL_ACCESS_TOKEN` is set
- `WORDFENCE_API_TOKEN` is set, or `~/.tghp/maintenance-wp/wordfence-feed.json` exists

If any are missing, print this instead of the overview, listing only the missing items, and wait:

```
maintenance-wp — setup incomplete.

- Dependencies not installed → run `bun install` in <skill folder>
- No config.json → run `./scripts/premium-versions.js --init`, then list your sites under `repos`
- config.json has no repos → add `{ "repo": "owner/name" }` entries under `repos`
- No licenses.json → run `./scripts/premium-versions.js --init` (vendor keys are optional)
- GITHUB_PERSONAL_ACCESS_TOKEN not set → add `export GITHUB_PERSONAL_ACCESS_TOKEN=...` to ~/.zshrc (fine-grained PAT, Contents: Read-only, access to the repos), then restart the terminal
- No Wordfence feed and WORDFENCE_API_TOKEN not set → add `export WORDFENCE_API_TOKEN=...` to ~/.zshrc (free token: Wordfence dashboard → Integrations)

Want me to do the steps I can (bun install, --init)?
```

You may run `bun install` and `--init` if the user says yes — neither hits a scan API. The env vars and the repo list are theirs to provide. Once setup is complete, show the overview:

```
maintenance-wp — nothing has been run.

Last scan: <date> (<source>) · Wordfence feed: downloaded <date> (<N> days old)

Steps to run a scan:
1. Window for core releases — default: since the last scan (<date>). Or give a date, or "last N days".
2. Refresh the Wordfence feed — <recommended: feed is N days old | not needed: feed is current>. Rate-limited, so once per session.
3. Scope — full suite (default), or one check: core releases · core versions · plugin CVEs · premium versions.
4. Report — written to ~/Reports/report-wordpress-<today>.md.

Tell me how to run it (e.g. "full scan with download", "just plugin CVEs"), or ask a question.
```

Keep it to that — no extra explanation. Then:

- **The user says how to run it** → go to **Running a scan** with their choices; anything they don't specify uses the defaults above.
- **The user asks a question** → answer from the skill, scripts and files. Still don't run a scan unless they ask for one.
- **The activation itself already says to run a scan** (e.g. `/maintenance-wp full scan with download`, or "run the WordPress security scan") → skip the overview and run it as specified.

**Local status / when was the last scan?** Check, in order:

1. `~/.tghp/maintenance-wp/last-run.json` — start of the last `run-all.js` run whose core-release step succeeded.
2. `~/Reports/report-wordpress-<date>.md` — one per scan written through this skill; the newest file's date and modified time give the last scan.

Don't use `wordfence-feed.json`'s modified time as the last scan date — it only changes on `--download`, so it's the last feed **download**, not the last scan. It does tell you how stale the feed is (for step 2 of the overview: recommend a refresh if it's more than a few days old).

If neither exists, show `Last scan: none recorded` and give the step 1 default as "last 90 days".

## Running a scan

Only once the user has asked for one (see **On activation**).

1. A last-check date is **optional** — it only sets the window for the core-release list (`releases.js`); the plugin, premium and watched-version checks don't use it.
2. With no date, run without one: `run-all.js` defaults to the start of the last run whose core-release step succeeded (stored in `~/.tghp/maintenance-wp/last-run.json`), or the last 90 days if none is recorded. If `last-run.json` doesn't exist but `~/Reports/` has earlier `report-wordpress-<date>.md` files, pass the newest report's date instead of relying on the 90-day fallback. If the user does give a date, pass it as ISO 8601 (e.g. `2026-02-01T00:00:00Z`), plain `YYYY-MM-DD`, or `--days N`.
3. Run the full scan suite:

```
./scripts/run-all.js [isoDate]
```

   Add `--download` to refresh the Wordfence feed first (do this if the cached feed is more than a few days old):

```
./scripts/run-all.js [isoDate] --download
```

   `run-all.js` runs all four scripts in sequence and prints a pass/fail summary:
   - `releases.js <isoDate>` — WordPress core releases since the date (the header line of the output says which date was used and why — report it) (security releases flagged with `<security>yes</security>`).
   - `watch-versions.js` — installed WordPress core version per watched repo.
   - `plugin-security.js` — plugin CVEs from the Wordfence feed. Looks up **every** plugin except first-party ones: wpackagist plugins by slug, premium plugins via `SLUG_MAP` (e.g. `tghp/rank-math-pro` → `seo-by-rank-math-pro`) or else their package basename. **Meta Box AIO** is scanned twice: its own version against `meta-box-aio`, and its bundled `vendor/meta-box/meta-box` core version against `meta-box`. `[VULN]` lines list version, severity, CVE, and fix version; a `[slug guessed from …]` tag means the slug came from the package basename. Guessed slugs the feed doesn't know are listed under "No Wordfence entry"; first-party plugins and non-numeric versions (e.g. `dev-main`) under "Not scanned".
   - `premium-versions.js` — version-currency for premium plugins with no public feed, via each vendor's update API (keys from `licenses.json`). Reports installed-vs-latest only — **not** CVEs.

   If the user chose a single check (step 3 of the overview), run just that script instead of `run-all.js`:

   | Check | Command |
   | --- | --- |
   | core releases | `./scripts/releases.js <isoDate>` (ISO 8601 required) |
   | core versions | `./scripts/watch-versions.js --json ~/.tghp/maintenance-wp/core-findings.json` |
   | plugin CVEs | `./scripts/plugin-security.js [--download]` |
   | premium versions | `./scripts/premium-versions.js` |

   Single scripts don't update `last-run.json` — only `run-all.js` does.

4. Read the combined output and write a report to `~/Reports/report-wordpress-<date>.md`, then output its contents. For a single-check run, include only the sections that check covers.

## Structured output

`run-all.js` also writes two findings files, the input for `maintenance-notify`:

- `~/.tghp/maintenance-wp/findings.json`: plugin CVEs (`plugin-security.js --json <path>` standalone). One entry per repo × advisory, with severity, CVSS, CVE, published date, description, an `unauthenticated` flag and fix versions.
- `~/.tghp/maintenance-wp/core-findings.json`: core security updates (`watch-versions.js --json <path>` standalone). One entry per repo whose installed core version WordPress.org's stable-check API marks **insecure**. The target is the nearest secure version on the same branch (e.g. a 7.0.x backport), otherwise the latest. The entry lists the security releases since the installed version, and is Critical if any of those releases fixed a critical issue. Its `published` field is the date of the first security release the site missed.

Both files include `scanErrors` for repos that couldn't be read. This skill never notifies on its own — Asana tasks and Slack messages come from `maintenance-wp-orchestrator`, which runs this scan and then `maintenance-notify`.

# Report Format

## Executive Summary

Lead with the headline: is core clean? Are there High-severity plugin CVEs? Name the most urgent items (especially anything **unauthenticated**).

## Critical / Security Updates (WordPress core)

Bullet list of any core releases flagged as security releases. If none: "No critical security updates found." Format: `<version> (<human readable release date>): <release summary>`.

## Watched Versions Comparison (WordPress core)

Table comparing watched repos against security releases. Columns: Repo · Current Version · Recommended Version · Status (with icons).

Take **Recommended Version** from `~/.tghp/maintenance-wp/core-findings.json` (each insecure repo's `fixedIn`), not from the release list. It's backport-aware: a site on an older branch is pointed at that branch's secure backport (e.g. 7.0.4 → 7.0.6), and those backports often have no release announcement of their own. Repos with no finding there are secure. Mark them ✅ with their current version, noting if a newer branch exists.

## Plugin Security Audit (CVEs)

This is usually the substantive section. Note the Wordfence feed cache date.

- **🔴 Critical / High severity** — table: Repo · Plugin · Installed · Fixed In · CVE · Issue. Prioritise **unauthenticated** issues. Group Meta Box findings into their own sub-table (affected repos, AIO version, bundled core version), keeping AIO-keyed advisories distinct from bundled-core ones. For any `[slug guessed from …]` finding, confirm the Wordfence plugin name matches before reporting it.
- **🟠 Medium severity** — table of remaining CVEs; call out fleet-wide bumps that can be batched into a single PR.
- **Recommended actions** — ordered by priority (unauthenticated → fleet-wide High → per-site).

**Meta Box AIO caveat:** advisories under `meta-box-aio` (e.g. CVE-2026-14488, unauthenticated post deletion ≤ 3.8.0) are keyed to AIO directly. The bundled-core findings (e.g. file deletion ≤ 5.11.1) are registered against the standalone `meta-box` slug; attributing those to the AIO bundle is sound inference (identical core code shipped verbatim), not a Wordfence advisory keyed to `meta-box-aio` — state this in the report.

**YayCurrency Pro caveat:** Wordfence has no Pro slug, so `SLUG_MAP` scans `yaycommerce/yaycurrency-pro` against the free `yaycurrency` advisories. Pro shares the free plugin's code and version line, so this is sound inference, not a Wordfence advisory keyed to Pro — state this in the report.

## Premium Version-Currency (informational)

Table of premium plugins behind latest (Meta Box AIO, PDF Embedder Premium, etc.). Label clearly as "newer available", **not** CVEs. Flag major-version jumps as needing staging.

## Coverage Gaps (not scanned)

List plugins with no vuln data, grouped:

- **No Wordfence entry** — premium plugins whose guessed slug isn't in the feed. Not the same as clean: the slug may be wrong. Suggest a `SLUG_MAP` entry if a matching Wordfence slug is known.
- **Non-numeric version** — can't be compared; the installed version needs checking by hand.
- **First-party TGHP plugins** — code review / SAST only.
- **Premium version check skipped** — premium plugins missing license keys in `licenses.json`.
