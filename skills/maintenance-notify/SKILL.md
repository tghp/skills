---
name: maintenance-notify
description: Use this skill to create Asana tasks and send Slack notifications for security findings (CVEs) produced by a maintenance discovery skill (maintenance-wp today, maintenance-js later), to retry or list pending notifications, or to set up the Asana board / Slack channel mapping. Normally invoked by maintenance-wp-orchestrator after a scan, not directly.
allowed-tools: bash
---

Turn a discovery skill's findings into Asana tasks and Slack messages. For each finding at or above the source's `minSeverity` (default **High**, so Critical + High), in order:

1. Create an Asana task in the repo's section of the source's board (WordPress: **Maintenance: WordPress**):
   - **Title:** `<Client>: <CVE title>`
   - **Assignee:** the configured assignee
   - **Due date:** one month after the CVE's published date (or, for core, the first missed security release). Set by `dueAfterMonths` in the config, default 1.
   - **Client field:** set to the repo's option
   - **Description:** the full vulnerability details
2. Post to the repo's Slack channel, linking the task.

All scripts live in `scripts/` and run directly (bun shebang, no dependencies).

## Setup check (run on every activation)

Confirm each of these. Use file reads plus `[ -n "$VAR" ] && echo set || echo missing`, and never print a token's value:

- `ASANA_ACCESS_TOKEN` is set
- `SLACK_BOT_TOKEN` is set
- `~/.tghp/maintenance-notify/config.json` exists, has a block for the source (e.g. `wordpress`), and has `alerts.slackChannel` set
- No repo entry in that block still carries a `_check` note, and every entry has `section`, `clientName` and `slackChannel` (`clientOption` may be blank — the task is then created without the Client field)

If any are missing, list only those and stop:

```
maintenance-notify — setup incomplete.

- ASANA_ACCESS_TOKEN not set → create a personal access token (Asana → Settings → Apps → Developer apps), add `export ASANA_ACCESS_TOKEN=...` to ~/.zshrc, restart the terminal
- SLACK_BOT_TOKEN not set → create a Slack app ("TGHP Maintenance") with the bot scope chat:write (plus channels:read/groups:read if you want discover.js to find channel IDs), install it, add `export SLACK_BOT_TOKEN=xoxb-...` to ~/.zshrc, invite the bot to every repo channel and the alerts channel
- No config → run `./scripts/discover.js`, then check the result
- Repos need checking → <repo: _check note> (edit config.json, then delete the _check note)
- No alerts channel → set `alerts.slackChannel` to the channel ID for failure alerts
```

Also run `./scripts/notify.js --status`. If anything is pending, say so: "N CVEs awaiting notification". These are failures from earlier runs.

## Running

Fully automatic. The orchestrator calls it straight after a scan, with no confirmation step:

```
./scripts/notify.js --source wordpress --since <scan start, ISO> --report <report path>
```

- `--findings <path>[,<path>…]`: defaults to the source's files (WordPress: `~/.tghp/maintenance-wp/findings.json` for plugin CVEs and `core-findings.json` for core security updates). Each file is checked for staleness separately.
- `--since`: findings generated before this time count as a failed scan, which is alerted, not ignored.
- `--report`: adds a `## Notifications` section to the report. On failure it also adds a **⚠️ Notification failures** banner under the H1. Re-running replaces both rather than duplicating them.
- `--dry-run`: shows what would be sent. It makes no API calls and writes nothing. Use it only for setup and testing.
- `--status`: lists pending (undelivered) notifications.

Exit codes: `0` means everything was delivered, `2` means there were notification failures, `1` means a usage error.

After running, show the `## Notifications` summary. **If the exit code is 2, lead with the failures.** Name each CVE and repo, say what failed, and point out that it's queued for retry. Never describe a run with failures as complete.

## Failures: a CVE must never go missing

A finding counts as notified only once **both** its Asana task and its Slack post have succeeded. These are all failures:

- An Asana or Slack API error
- A repo with no mapping
- A missing or invalid token
- A missing or stale findings file
- A repo the scan couldn't read (`scanErrors`)

How failures are handled:

- **Retries:** 429s, 5xx errors and network errors are retried up to 3 times, honouring `Retry-After`. Other errors fail at once.
- **Queue:** `~/.tghp/maintenance-notify/ledger.json` tracks every finding. Delivered findings are never re-sent. Undelivered ones are retried first on every run, even if a later scan no longer reports them. Asana and Slack are tracked separately, so a task that exists isn't re-created when only its Slack post failed.
- **Alerts:** one consolidated message goes to `alerts.slackChannel`, listing every undelivered CVE with enough detail to log it by hand, plus any run-level problems. If the Slack post fails, a comment is also added to the Asana task. Locally there is a macOS notification, a `❌ NOTIFICATION FAILURES` block in the output, the report banner, and exit code 2.
- **Lost ledger:** if `ledger.json` is lost, existing tasks are still found by the finding key, which is written at the bottom of each task's description. Tasks aren't duplicated.

## Config: `~/.tghp/maintenance-notify/config.json`

Generated by `./scripts/discover.js`. That script finds the board by name, its sections and its **Client** single-select field, plus the Slack channels the bot can see. It matches them to the repos in the source's config and flags anything uncertain with a `_check` note. It won't overwrite an existing source block without `--force`. Use `--print` to preview.

```json
{
  "wordpress": {
    "minSeverity": "High",
    "dueAfterMonths": 1,
    "asana": { "workspace": "<gid>", "project": "<gid>", "assignee": "chris.grace@tghp.co.uk", "clientField": "<gid>" },
    "repos": {
      "tghp/example-client": { "section": "<gid>", "clientOption": "<gid>", "clientName": "Example Client", "slackChannel": "C0123…" }
    }
  },
  "alerts": { "slackChannel": "C0456…" }
}
```

## Findings input (for discovery skills)

A source writes a JSON file in this shape. Only `key`, `repo`, `severity` and `title` are required. The rest fill in the task and the message:

```json
{
  "source": "wordpress",
  "generatedAt": "2026-10-02T09:00:00Z",
  "attribution": "Vulnerability data: …",
  "scanErrors": [{ "repo": "org/site", "error": "composer.lock not found" }],
  "findings": [{
    "key": "org/site:<component>:<advisory id>",
    "repo": "org/site", "component": "userswp", "composer": "wpackagist-plugin/userswp",
    "installed": "1.2.70", "fixedIn": ["1.2.71"], "severity": "High", "score": 8.1,
    "cve": "CVE-2026-19991", "title": "…", "description": "…", "published": "2026-09-10",
    "unauthenticated": false, "cwe": "…", "remediation": "…", "references": ["…"], "via": null
  }]
}
```

`key` must be stable across scans. It's the dedup identity. An optional `revision` field updates a task in place: when a delivered finding comes back with a different `revision`, its Asana task is updated (title, description, due date) and a fresh Slack message is posted, instead of a new task being created. Core findings use this: the key is `<repo>:wordpress-core:<installed version>` and the revision is the target version. So while a site stays on 7.0.4, a newer security release updates the same task. If the task was deleted in Asana, a new one is created. To add a source, add it to `SOURCES` in `scripts/lib.js` (repo config path, default findings path, board name) and give it its own block in the config.
