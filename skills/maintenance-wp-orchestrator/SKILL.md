---
name: maintenance-wp-orchestrator
description: Use this skill to run the full WordPress maintenance cycle end to end — scan for core/plugin security issues with maintenance-wp, then create Asana tasks and Slack notifications for Critical/High CVEs with maintenance-notify. Triggers on requests to "run WordPress maintenance", "scan and notify", "WordPress maintenance with notifications", or a scheduled maintenance run.
---

Runs the WordPress maintenance cycle in two steps:

1. **Discovery:** the `maintenance-wp` skill scans and writes the report, plus `~/.tghp/maintenance-wp/findings.json` (plugin CVEs) and `core-findings.json` (core security updates).
2. **Notification:** the `maintenance-notify` skill creates Asana tasks and sends Slack messages for Critical/High CVEs.

Sending is **fully automatic**: no preview, no confirmation. The one thing this skill must guarantee is that **no CVE goes missing silently**. Every failure is surfaced.

## On activation

1. **Setup check.** Run both skills' setup checks: maintenance-wp's "On activation" checklist and maintenance-notify's "Setup check". If anything is missing, print both lists together and stop. Also report pending notifications from earlier runs (`notify.js --status` in maintenance-notify's folder).
2. **Record the start time** with `date -u +%Y-%m-%dT%H:%M:%SZ`. This is `<start>`.
3. **Step 1: discovery.** Invoke the `maintenance-wp` skill with an explicit run instruction, so it skips its overview and scans straight away:
   - Default: `full scan`, plus `with download` if `~/.tghp/maintenance-wp/wordfence-feed.json` is more than 3 days old or missing.
   - If the user gave a date window or other options, pass them through.

   Let it finish completely: run `run-all.js`, write `~/Reports/report-wordpress-<today>.md` and output it.
4. **Step 2: notification.** Invoke the `maintenance-notify` skill to run:

   ```
   ./scripts/notify.js --source wordpress --since <start> --report ~/Reports/report-wordpress-<today>.md
   ```

   Run this **even if step 1 failed**. Notify treats a missing or stale findings file as a failure and alerts on it, and it still retries earlier pending notifications.
5. **Summary.** End with a short summary:
   - Scan result: is core clean, how many Critical/High CVEs.
   - Tasks created (with links).
   - Already notified.
   - **Failures.** If notify exited `2`, put the failures **first**, under a `❌ Notification failures` heading. Name each CVE and repo, say what failed, and say what to do (e.g. fix the token or mapping; the item is queued and is retried on the next run). Never report a run with failures as done.

## Notes

- `/maintenance-wp` on its own still only scans. Use this skill when tasks and notifications are wanted.
- Both plugin CVEs and core security updates are notified. CVEs fixed by the same plugin update share one task and one Slack message, listing every CVE and the version that fixes them all; a new CVE for the same installed version updates that task. Each site on an insecure core version gets one task, which is updated (not duplicated) if a newer security release lands before it's upgraded.
- Tasks are due one month after the CVE's published date (core: after the first missed security release).
