# maintenance-wp — running a full scan

Audits WordPress **core**, **plugins** (public + premium), and **premium version-currency**
across a configured list of GitHub repos, comparing installed versions (from each repo's
`composer.lock`) against:

- the official WordPress release feed (core),
- the Wordfence Intelligence v3 vulnerability feed (plugin CVEs), and
- each vendor's update API (premium plugins with no public feed).

## Prerequisites (one-time)

- `bun` runtime + deps (`bun install` in this folder)
- Env vars in `~/.zshrc`:
  - `GITHUB_PERSONAL_ACCESS_TOKEN` — read access to the repos
  - `WORDFENCE_API_TOKEN` — free token from the Wordfence dashboard (Integrations); only needed for `--download`
- Config: `~/.tghp/maintenance-wp/config.json` — the repos to scan
- Licenses (optional, for the premium version check): `~/.tghp/maintenance-wp/licenses.json`
  — fill in keys (the file is `chmod 600`; never commit it)

First-time setup: `./scripts/premium-versions.js --init` scaffolds **both** `config.json`
(repos, with a commented `_example`) and `licenses.json` (vendor keys, `chmod 600`), creating
`~/.tghp/maintenance-wp/` if needed. It won't overwrite either file if it already exists, so
re-running is safe. Edit `config.json` → `repos` to list your sites before the first scan.

## Run a full scan

One command runs all four scripts in sequence:

```bash
cd ~/.claude/skills/maintenance-wp

./scripts/run-all.js                       # since the last run (remembered automatically)
./scripts/run-all.js --download            # same, refreshing the Wordfence feed first
./scripts/run-all.js 2026-06-15            # or: explicit since-date (YYYY-MM-DD or full ISO)
./scripts/run-all.js --days 14             # or: last N days
```

`run-all.js` resolves the date, runs each scan under its own banner, keeps going if one step
fails, and prints a ✅/❌ summary at the end.

**The date is optional.** It only sets the window for the core-release list (`releases.js`) —
plugin CVEs, premium currency and watched core versions are checked against current data
regardless. With no date, `run-all.js` uses the start of the last run whose core-release step
succeeded, saved in `~/.tghp/maintenance-wp/last-run.json`; if there's no record yet, it uses
the last 90 days. A failed core-release step doesn't update the saved date, so nothing gets
skipped. The first line of the output says which date was used and why.

### The individual scripts (still usable standalone)

```bash
./scripts/releases.js 2026-06-15T00:00:00Z   # core releases since date (ISO 8601 required here)
./scripts/watch-versions.js                  # installed core version per repo
./scripts/plugin-security.js [--download]    # plugin CVEs (Wordfence feed)
./scripts/premium-versions.js                # premium version-currency (vendor APIs)
```

## Coverage

| Check | Source | Notes |
| --- | --- | --- |
| WordPress core | WordPress release feed | security releases flagged |
| Public plugins | Wordfence feed | `wpackagist-plugin/*` |
| Premium plugins (CVEs) | Wordfence feed | **every** non-first-party plugin is looked up: via `SLUG_MAP` where the composer name differs from the Wordfence slug (e.g. `tghp/rank-math-pro` → `seo-by-rank-math-pro`), otherwise by package basename |
| **Meta Box AIO** | Wordfence feed | scanned twice: the AIO version against `meta-box-aio`, and the **bundled `meta-box` core** version against `meta-box` (both read from the plugin headers in the repo) |
| Premium plugins (currency) | vendor update APIs | `premium-versions.js` — "newer available", **not** CVEs |
| First-party `tghp/*` plugins | — | no public feed; code review / SAST only (listed under "Not scanned") |

**Reading the output:** `plugin-security.js` prints, per repo:

- `[VULN]` lines. A `[slug guessed from …]` tag means the slug came from the package basename
  — confirm it's the same plugin before acting.
- **No Wordfence entry** — a guessed slug the feed doesn't know. Not proof the plugin is clean:
  the slug may be wrong. If Wordfence lists it under another slug, add it to `SLUG_MAP`; only
  map to a slug whose version line matches the package (a premium plugin's own slug, never the
  free plugin's).
- **Not scanned** — first-party plugins, and anything with a non-numeric version (e.g.
  `dev-main`), which can't be range-compared.

**Meta Box AIO caveat:** Wordfence keys some advisories to `meta-box-aio` directly (e.g.
CVE-2026-14488, unauthenticated post deletion ≤ 3.8.0). The bundled-core findings are
registered against the standalone `meta-box` slug; attributing those to the AIO bundle is sound
inference (identical core code shipped verbatim), not an advisory keyed to `meta-box-aio`.

## Important notes

- **Wordfence rate limit:** the free key caps requests hard and returns `429` with no
  `Retry-After`. Use `--download` **once per session** — repeated refreshes within the window
  get throttled (cooldown up to ~40 min observed).
- **Feed cache:** `~/.tghp/maintenance-wp/wordfence-feed.json` (~140 MB). Updates daily, so
  `--download` to refresh before a fresh audit; otherwise the cached feed is used. Its modified
  time is the last **download**, not the last scan — scans without `--download` don't touch it.
- **Scan history:** `~/.tghp/maintenance-wp/last-run.json` holds the last successful run's start
  time. The dated reports in `~/Reports/` are the full history (one per scan run through the
  skill).
- **Premium version check** makes live calls to vendor update APIs (Meta Box, Rank Math, EDD
  stores). Entries whose vendor won't answer without a license key report `⚪ could not check`.

## Editing the scanned repos

Edit `~/.tghp/maintenance-wp/config.json`:

```json
{
  "repos": [
    { "repo": "your-org/your-site" },
    { "repo": "your-org/site-in-subfolder", "composerDir": "wordpress" }
  ]
}
```

Use `composerDir` when a repo's `composer.lock` is in a subfolder rather than the root.

## Reports

Written to `~/Reports/report-wordpress-<date>.md` — a single combined report covering core,
plugin CVEs, premium version-currency, and coverage gaps. The dated report is generated via
the `/maintenance-wp` skill (which applies severity grouping and the Meta Box caveat), not by
`run-all.js` itself — `run-all.js` prints the raw scan output.

## Findings for notifications

`run-all.js` also writes the plugin step's matched CVEs to `~/.tghp/maintenance-wp/findings.json`
(standalone: `./scripts/plugin-security.js --json <path>`). It writes core security updates to
`core-findings.json` (standalone: `./scripts/watch-versions.js --json <path>`): one per site whose core
version WordPress.org marks insecure, targeting the nearest secure version on its branch. Both are the
input for [`maintenance-notify`](../maintenance-notify/), which creates Asana tasks and Slack messages
for Critical/High issues. To scan **and** notify in one go, use `/maintenance-wp-orchestrator`; `/maintenance-wp`
on its own never notifies.

## Or use it through Claude

Running `/maintenance-wp` **doesn't start a scan**. Claude reads the local status and prints a
short overview: when the last scan ran, how old the Wordfence feed is, and the steps for a scan
(date window, feed refresh, full suite or a single check, report location). Then it waits. Tell
it how to run the scan, e.g.:

> "Full scan with download"
> "Just plugin CVEs, no download"
> "Core releases since 2026-06-01"

or ask questions about the setup or past scans — nothing runs until you ask for a scan.
To skip the overview, say how to run it up front: `/maintenance-wp full scan with download`.
Claude then runs the scan and writes the report.
