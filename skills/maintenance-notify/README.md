# maintenance-notify — Asana tasks + Slack messages for CVEs

Takes the findings a discovery skill writes (`maintenance-wp` today, `maintenance-js` later). For
every **Critical/High** plugin CVE, and every site on an insecure WordPress core version, it creates an Asana task on the source's board, then posts to the repo's
Slack channel with a link to the task. Normally run by `/maintenance-wp-orchestrator` straight
after a scan.

## Setup (one-time)

1. **Asana:** create a personal access token (Asana → Settings → Apps → Developer apps) and add it
   to `~/.zshrc`:

   ```bash
   export ASANA_ACCESS_TOKEN=...
   ```

2. **Slack:** create a Slack app (e.g. "TGHP Maintenance") with the bot scope `chat:write` only, and
   install it to the workspace. To let `discover.js` look up channel IDs, also add `channels:read`
   (and `groups:read` for private channels). Otherwise paste the IDs into the config by hand. Add the
   bot token to `~/.zshrc`:

   ```bash
   export SLACK_BOT_TOKEN=xoxb-...
   ```

   Invite the bot to every repo channel and to an alerts channel (e.g. `#maintenance-alerts`).
   `chat:write` can only post to channels the bot is a member of.

3. **Mapping:** run the discover script. It reads the Asana board's sections and its **Client**
   field options, plus the Slack channels the bot can see. It matches them to the repos in
   `~/.tghp/maintenance-wp/config.json` and writes `~/.tghp/maintenance-notify/config.json`:

   ```bash
   cd ~/.claude/skills/maintenance-notify
   ./scripts/discover.js            # --print to preview, --force to regenerate
   ```

   Fix anything it flags with a `_check` note, then delete the note. Then set `alerts.slackChannel`.

4. **Test:** do a dry run against the latest scan. It makes no API calls and writes nothing:

   ```bash
   ./scripts/notify.js --dry-run
   ```

## Running

```bash
./scripts/notify.js --source wordpress --since <scan start ISO> --report ~/Reports/report-wordpress-<date>.md
./scripts/notify.js --status     # undelivered notifications from earlier runs
```

CVEs fixed by the same plugin update get one task and one Slack message, titled
`<Client>: Update <Plugin> <installed> → <version that fixes them all> (N vulnerabilities)`, with
every CVE in the description. Core tasks are titled `<Client>: <title>`. Each task:

- is assigned to `asana.assignee`
- is due one month after the CVE's published date (the earliest CVE, for a plugin update; core: after the first security release the site missed); change it with `dueAfterMonths` in the config
- has the Client field set
- carries the full vulnerability details in its description

## When something fails

A CVE only counts as notified once **both** its Asana task and its Slack message have gone out.
Every failure is raised, never skipped quietly:

- **Covered failures:** API errors, missing mappings, bad tokens, and a scan that failed or produced
  stale findings.
- **Retries:** rate limits and server errors are retried up to 3 times.
- **Queue:** anything still undelivered is kept in `~/.tghp/maintenance-notify/ledger.json` and
  retried first on the next run.
- **Alerts:**
  - one consolidated alert in the alerts channel
  - a comment on the Asana task (when only Slack failed)
  - a macOS notification
  - a `⚠️ Notification failures` banner at the top of the report
  - exit code `2`

The ledger also prevents duplicates. Weekly scans re-find the same CVEs, but each one is only sent
once. If the ledger is lost, existing tasks are still matched by the finding key at the bottom of
each task's description.
