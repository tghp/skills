---
name: maintenance-wp
description: Use this skill when checking WordPress projects for security updates since a given date. Triggers on requests to check WordPress core updates, WordPress security releases, or WordPress maintenance status.
allowed-tools: bash
---

Check WordPress for critical security updates by fetching the official release feed.

# How To Use

All JS scripts referenced can be run directly, they contain a shebang that ensures they run with bun which is already available.

Usage:

1. User asks to check WordPress and provides a last-check date
2. Convert the user-provided date to ISO 8601 format (e.g. `2026-02-01T00:00:00Z`)
3. Run the releases script:

```
./scripts/releases.js <isoDate>
```

4. Check watched repos for their current WordPress version:

```
./scripts/watch-versions.js
```

5. Read the output and write a summary to a local file `~/Reports/report-wordpress-<date>.md` and then output the contents of the file:

## Summary Format

### Critical / Security Updates

Bullet list containing any releases flagged as security releases (indicated by `<security>yes</security>` in the output). If none, state "No critical security updates found."
Follow the following format in the bullet list: `<version> (<human readable release date>): <release summary>`

---

### Watched Versions Comparison

Compare the watched repos against the releases that contain critical/security updates as listed in the previous section and detail if any of the watched repos need an update.
Format the comparison in a table with the following headings:

- Repo: Name of the repo checked
- Current Version: The current version reported
- Recommended Version: Version recommended to update to
- Status: Recommended actions, with iconography for visual scanning

---

### Updates Found

Bullet list of all releases returned: version, date, one-line description.

---

### Per-Update Details

For each release, a short paragraph summarizing the notable changes.
