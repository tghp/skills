# TGHP Agent Skills

Curated collection of skills for TGHP workflows.

## Installation

```
pnpx skills add tghp/skills --skill='*'
```

Or for individual skills:

```
pnpx skills add tghp/skills --skill tghp-wp-project
pnpx skills add tghp/skills --skill maintenance-js
pnpx skills add tghp/skills --skill maintenance-wp
```

## Skills

| Skill | Description |
| ----- | ----------- |
| [tghp-wp-project](./skills/tghp-wp-project/) | Guidance for agents when working with TGHP WP codebases |
| [maintenance-js](./skills/maintenance-js/) | Security update checks for JS packages (Payload CMS, Next.js, Astro) |
| [maintenance-wp](./skills/maintenance-wp/) | Security update checks for WordPress core |

## Setup

### Prerequisites

The maintenance skills use bun scripts and require navigating to each skill directory to install dependencies:

```
cd skills/maintenance-js && bun install
cd skills/maintenance-wp && bun install
```

Both maintenance skills use the GitHub API for checking repo versions. Add an access token as an export (e.g. in `~/.zshrc`):

```
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token
```

### Watched Repos

Both maintenance skills compare upstream releases against the versions installed in your repos. Each reads its config from `~/.tghp/`.

#### `maintenance-js`

Config: `~/.tghp/maintenance-js/config.json`

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

Each key is the upstream `owner/repo` (see known packages below), `npmPackage` is the npm package name to look up in lockfiles, and `repos` lists the dependent repos to check. Use `lockfileDir` for monorepos where the lockfile isn't at the root.

Known packages:

| Package | Owner/Repo | NPM Package |
| ------- | ---------- | ----------- |
| Payload CMS | `payloadcms/payload` | `payload` |
| Next.js | `vercel/next.js` | `next` |
| Astro | `withastro/astro` | `astro` |

#### `maintenance-wp`

Config: `~/.tghp/maintenance-wp/config.json`

```json
{
  "repos": [
    { "repo": "org/repo" },
    { "repo": "org/monorepo", "composerDir": "wordpress" }
  ]
}
```

`repos` lists the repos to check. The skill looks for `johnpbloch/wordpress` in each repo's `composer.lock`. Use `composerDir` for monorepos where `composer.lock` isn't at the root.