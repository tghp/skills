# TGHP Agent Skills

Curated collection of skills for TGHP workflows.

## Installation

```
pnpx skills add tghp/skills --skill='*'
```

### Extra Steps

The following skills use bun scripts for automation of package/project versions and require navigating to the skill directory to run `bun install`:

- [maintenance-js](./skills/maintenance-js/)

## Skills

| Skill | Description |
| ----- | ----------- |
| [tghp-wp-project](./skills/tghp-wp-project/) | Guidance for agents when working with TGHP WP codebases |
| [maintenance-js](./skills/maintenance-js/) | Automated maintenance checks against known packages and projects. Also see [Maintenance Skills](#maintenance-skills) below for how to point the skill to repos to watch |

## Maintenance Skills

### `maintenance-js`

This skill reads watched repos from `~/.tghp/maintenance-js/config.json`. Create this file with the following structure:

```json
{
  "owner/repo": {
    "npmPackage": "package-name",
    "repos": [
      { "repo": "org/repo" },
      { "repo": "org/monorepo", "lockfileDir": "apps/web" }
    ]
  }
}
```

Each key is the upstream `owner/repo` known package (see below), `npmPackage` is the npm package name to look up in lockfiles, and `repos` lists the dependent repos to check. Use `lockfileDir` for monorepos where the lockfile isn't at the root.

#### Known Packages

- Payload CMS
  - Upstream: `payloadcms/payload`
  - NPM Package: `payload`
- Next.js
  - Upstream: `vercel/next.js`
  - NPM Package: `next`
- Astro
  - Upstream: `withastro/astro`
  - NPM Package: `astro`