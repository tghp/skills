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
| [maintenance-wp](./skills/maintenance-wp/) | Security update checks for WordPress core, plugin CVEs (Wordfence) and premium plugin versions |

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

`maintenance-wp` also uses the Wordfence Intelligence feed for plugin CVEs. Add a free API token from the Wordfence dashboard (Integrations) — it's only needed when refreshing the feed (`--download`):

```
export WORDFENCE_API_TOKEN=your_token
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

`repos` lists the repos to check. The skill reads each repo's `composer.lock` for `johnpbloch/wordpress` and the installed plugins. Use `composerDir` for monorepos where `composer.lock` isn't at the root.

Rather than writing it by hand, scaffold both config files with:

```
cd skills/maintenance-wp && ./scripts/premium-versions.js --init
```

This creates `config.json` (empty `repos`, with an `_example`) and `licenses.json` (`chmod 600`, never commit it) in `~/.tghp/maintenance-wp/`, and won't overwrite either if it exists. `licenses.json` holds vendor license keys for the premium version check; keys are optional, but the file must exist. Running `/maintenance-wp` checks all of the above and lists anything missing. See [skills/maintenance-wp/README.md](./skills/maintenance-wp/README.md) for full details.
