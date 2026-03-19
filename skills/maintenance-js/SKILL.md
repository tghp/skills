---
name: maintenance-js
description: Use this skill when checking a known JS package (Payload CMS / Next.js / Astro) for security updates since a given date
allowed-tools: bash
---

Check a single package for critical security updates by fetching GitHub releases.

# How To Use

All JS scripts referenced can be run directly, they contain a shebang that ensure they run with bun which is already avaiable.

Usage:

1. User asks to check a package and provides a last-check date
2. Look up the package in the Known Packages list below to get its `owner/repo`
3. Convert the user-provided date to ISO 8601 format (e.g. `2026-02-01T00:00:00Z`)
4. Run the releases script:

```
./scripts/releases.js <owner/repo> <isoDate>
```

5. Check for watched repos that depend on the `owner/repo` in NPM

```
./scripts/watch-versions.js <owner/repo>
```

6. Read the output and write a summary with these sections to a local file `~/Reports/report-<owner/repo>-<date>.md` and then output the contents of the file:

## Summary Format

### Critical / Security Updates

Bullet list containing any releases that contain security fixes, CVE references, or critical patches. If none, state "No critical security updates found."
Follow the following format in the bullet list: `<version> (<human readable release date>): <release summary>`

---

### Watched Versions Comparison

Compare the watched repos against the release found that contain critical/security updates as listed in the previous section and detail if any of the watched repos need an update.
Format the comparison in table with the follwong headings:

- Repo: Name of the repo checked:
- Current Version: The current version reported
- Recommended Version: Version recommended to update to
- Status: Recommended actions, with iconography for visual scanning

---

### Updates Found

Bullet list of all releases returned: version, date, one-line description.

---

### Per-Update Details

For each release, a short paragraph summarizing the notable changes.

---

# Known Packages

| Package     | Owner/Repo           |
| ----------- | -------------------- |
| Payload CMS | `payloadcms/payload` |
| Next.js     | `vercel/next.js`     |
| Astro       | `withastro/astro`    |
