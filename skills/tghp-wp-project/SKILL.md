---
name: tghp-wp-project
description: Use this skill when working on WordPress themes, plugins, custom fields, post types, blocks, or any WordPress development task in a project that uses a TGHP structure. Structural markers include `src/plugins/` or `src/themes/` directories, `johnpbloch/wordpress` in composer.json, `@tghp/vitepress` in package.json, or PHP namespaces under `TGHP\`. This skill takes priority over generic WordPress skills — the project structure is non-standard and generic WordPress guidance will produce incorrect results.
---

When invoked in a project, you will be looking at a WordPress codebase built as a bespoke solution for a client. If a generic WordPress skill (e.g. `wordpress-pro`) is also available, prefer the guidance in this skill. The project structure is intentionally non-standard — generic WordPress advice (e.g. editing functions.php, using ACF, manually placing plugins) will produce incorrect results here.

## TGHP WP Project Methodology

This is not a typical WordPress repo. Unlike the conventional approach of committing the entire WordPress installation, these projects treat WordPress like a modern application: dependencies are declared in `composer.json` and the repo contains only bespoke code.

We will throughout refer to the project as "<name>". This will refer to a slugified version of the project name that informs some naming conventions. For example, "Hello World" becomes "hello-world", "Acme" becomes "acme", etc.

### How the project is structured

- WordPress core lives in `wp/` as a Composer dependency (`johnpbloch/wordpress`) — gitignored
- Third-party plugins are Composer dependencies via wpackagist.org — also gitignored
- `wp-content/` is in the project root (not inside `wp/`) and is where Composer installs plugins and themes
- Custom code lives only in `src/themes/<name>/` and `src/plugins/<name>-site/` — this is the only application code committed to the repo
- `composer.lock` pins every dependency to exact versions for reproducible builds
- `wp-config.php` is a static file that reads from `.env` — it rarely needs editing
- Custom packages in `src/themes/` and `src/plugins/` each have their own `composer.json` with `type: wordpress-theme` or `type: wordpress-plugin`, which causes Composer's `installer-paths` config to symlink/install them into the appropriate `wp-content/` locations

The `src/` directory is the boundary: everything in it is "ours", everything outside is "theirs" or derived.

### What this means in practice

- Only edit files inside `src/` — never manually modify `wp-content/plugins/`, `wp-content/themes/`, or `wp/`
- To add or update a third-party plugin, change `composer.json` — do not download or copy plugins manually
- To patch a third-party plugin, use `cweagans/composer-patches` — do not edit the plugin's files directly
- PHP logic belongs in the site plugin (`src/plugins/<name>-site/`), not in the theme's `functions.php`
- The theme (`src/themes/<name>/`) contains only templates, assets, and a `style.css` header

## The Site Plugin

Location: src/plugins/<name>-site/
Namespace: `\TGHP\<Name>` (where `<Name>` is a PascalCase version of `<name>`, e.g. "hello-world" → `HelloWorld`, "acme" → `Acme`)

The plugin uses a custom autoloader (via `spl_autoload_register`), not Composer's PSR-4. The mapping is the same in practice — `\TGHP\<Name>\PostType\Event` resolves to `inc/PostType/Event.php` — but be aware this is a hand-rolled autoloader, not a Composer classmap.

### Architecture

The bulk of the plugin's code lives inside `inc/` of the plugin directory:

- A singleton orchestrator instantiates all subsystems and sets up Monolog-based debug logging (to `wp-content/log/tghp-<name>-site/debug.log`)
- Subclasses are organised into domains and added as public properties to the orchestrator class
  - Some manage "entities" using a definer pattern, for declarative registration of post types, taxonomies, blocks, forms, crons via classes implementing `DefinerInterface`

The entrypoint for the plugin instantiates the orchestrator class, thereby triggering any lifecycle hooks subsystems have defined. This creates the following flow:

```
<name>-site.php → \TGHP\<Name>\<Name>::instance() → instantiates subsystems → subsystem behaviour
```

The orchestrator is available for access outside of the plugin via the `_S()` global in newer codebases and `TGHPSite()` in older codebases.

### Core Subclasses

These classes should always be present, and within the namespace defined earlier:

- Name - The singleton orchestrator
- Abstract<Name> - Base class that all classes inherit from (provides access back to the orchestrator via `$this-><name>`, where the property name is the lowercased class name, e.g. `$this->helloWorld` for `HelloWorld`)
- Admin - WP admin area customisation; includes `controlEditor()` which disables the Gutenberg block editor for specific page templates that use Meta Box fields instead
- Api - REST API route registration (uses a definer-like pattern but manages its own definer array rather than extending `AbstractDefines`)
- Asset - Utilities surrounding asset output
- Enqueues - Style/script enqueues
- Menu - WP Nav menus
- Metabox\Metabox - Definer for metabox definer classes
- Metabox\Block - Definer for metabox form classes
- Metabox\Form - Definer for mb-frontend-submission forms
- Page - Utilities for getting a WP page post by its template, for which there is usually a 1-to-1 relationship. Standardised into methods e.g. `getHomePage()`
- PostType - Definer for any post types added
- Taxonomy - Definer for any taxonomies added
- Template - Locates template files using the theme file inheritance chain (child theme → parent theme → plugin)
- ThemeSupports - Manages theme support definitions
- Dev - Vite HMR integration; manages dev server script injection and hot-reloading of CSS/JS
- Util - Misc utils

### Other classes

Most projects will contain other classes for project specific functionality. You'll find these alongside the core classes.

## The Definer Pattern

The definer pattern is how post types, taxonomies, metabox field groups, blocks, forms, and API routes are registered. Each entity gets its own class that extends an abstract base and overrides `define()`.

**Before creating any new post type, taxonomy, block, field group, form, or API endpoint, you must read `resources/definer-pattern.md`.** It contains the full interface/abstract base class reference, worked examples for post types, taxonomies, and API routes, and the step-by-step process for adding a new definer. Getting the class structure wrong is the most common mistake — the reference doc prevents this.

## The Site Theme

Location: src/themes/<name>/

The theme and the site plugin are tightly coupled in the project, as such you'll find functions.php is empty. Anything that might traditionally be in here belongs in the site plugin instead.

### Scripts and Styles

#### Vitepress

`@tghp/vitepress` (not to be confused with the Vue-powered static site generator of the same name) is TGHP's Vite preset for WordPress themes. It handles compilation of both scripts and styles. It wraps Vite with conventions suited to the project structure:

- Auto-discovers entry points in `src/themes/<name>/assets/src/` — JS in `js/` and SCSS in `sass/`
- Compiles to `src/themes/<name>/assets/dist/`
- Provides HMR dev server integration with WordPress (via `VITE_HMR` and `VITE_PORT` env vars)
- Supports Preact out of the box (`preact: true`)
- Extends via an `alterConfig` callback for project-specific Vite config

The `vite.config.mts` at the project root imports vitepress and passes it project-level config. The template includes support for exclusive build modes (`--scripts` / `--styles` flags) for faster iteration when only one asset type needs rebuilding.

npm scripts:

- `npm run dev` — HMR dev server (requires `VITE_HMR=1` and `VITE_PORT` in `.env`)
- `npm run watch` — production-like watch builds
- `npm run watch:styles` / `watch:scripts` — single asset type watch (may not be present in older projects)
- `npm run build` — production build

Builds are typically very fast so it is viable to use `npm run build` as a method of checking for errors in script and/or styles.

#### Scripts

We use TypeScript here, however you may find there is no TypeScript used at all. This typically indicates an older project and in this case TypeScript should not be used. However, if any TypeScript is present, prefer writing TypeScript for new scripts.

Scripts are enqueued as ES modules via `wp_enqueue_script_module()` (WordPress 6.5+). The `Enqueues` class handles this, routing through `Dev::enqueueScript()` when HMR is active.

#### Groundwork

`@tghp/groundwork.js` is TGHP's lightweight frontend framework for organising JS that runs on every page and binding component behaviour to DOM elements. It uses a namespace-based system where components are bound to DOM elements via `data-gw-{namespace}-init` attributes.

**Before writing or modifying any JS component, you must read `resources/groundwork-guide.md`.** It covers the component/include pattern, typed component args, passing data from PHP to JS, using multiple namespaces, and mounting React components via Groundwork. Writing JS in this project without understanding Groundwork will produce code that doesn't integrate with the existing architecture.

#### Styles

We use SASS with a critical/non-critical CSS splitting architecture. **Before writing or modifying any styles, you must read `resources/sass-structure.md`** — it covers the directory layout, entry point conventions, and the `--critical`/`--non-critical` naming pattern.

**Before working on the CSS system itself (how CSS is discovered, output, or loaded), read `resources/critical-css.md`** — it explains the Asset class, how CSS files are resolved per page context, where the output methods are called (`header.php`), and the template inheritance chain.

## Meta Box Integration

These projects use [Meta Box AIO](https://metabox.io/) (not ACF) for custom fields, settings pages, Gutenberg blocks, and forms. The Metaboxio namespace in the site plugin contains the integration classes.

### Key classes

- `Metaboxio\Metabox` — Field group definitions, settings pages. Uses the definer pattern with `MetaboxDefinerInterface`.
- `Metaboxio\Block` — Gutenberg blocks via Meta Box's `mb-blocks` extension. Uses `BlockDefinerInterface`. Restricts allowed block types via `setAllowedBlockTypes()` — only custom blocks in the `<name>-blocks` category plus a configurable set of core blocks (typically image, paragraph, heading, list, embed — check the method for the project's specific allowlist). Different post types may have different allowed sets.
- `Metaboxio\Form` — Frontend forms via Meta Box.

### Field key prefixing

All field IDs are prefixed with `_tghp<name>_` (defined as a constant in the plugin entry point). The `Metabox` class provides helpers:

- `Metabox::generateKey($key)` — adds prefix
- `Metabox::maybeGenerateKey($key)` — adds prefix only if not already present
- `Metabox::removePrefixFromKey($fields)` — strips prefix from key or array of keys

### Accessing field values

The `_MB()` global (alias for `TGHPSiteMetabox()`, `_MB` may not be present in older codebases) returns the `Metabox` instance:

```php
// Single field from current post (auto-prefixes the key)
_MB()->getSingleMetafieldValue('hero_title');

// From a specific post
_MB()->getSingleMetafieldValue('hero_title', [], $postId);

// From a settings/options page (note: settings page fields are NOT prefixed)
_MB()->getSingleMetafieldValueFromOptions('twitter_url');

// Multiple fields at once
_MB()->getMultipleMetafieldValues(['hero_title', 'hero_subtitle']);
```

Quoting a field ID with double quotes bypasses the auto-prefix — useful for accessing fields from other plugins: `_MB()->getSingleMetafieldValue('"other_plugin_field"')`.

### Enabled extensions

The plugin enables these Meta Box AIO extensions: `meta-box-include-exclude`, `meta-box-conditional-logic`, `meta-box-tabs`, `meta-box-show-hide`, `meta-box-group`, `mb-admin-columns`, `mb-settings-page`, `mb-blocks`, `mb-revision`, `mb-frontend-submission`, `mb-term-meta`, `mb-user-meta`.

### How Meta Box maps to this project

In this project you never use Meta Box's raw `rwmb_meta_boxes` filter directly — the definer pattern handles that. But the array structures inside `define()` are identical to what the Meta Box docs describe.

**Before defining any field groups or settings pages, you must read `resources/metabox-patterns.md`** — it contains worked examples for field groups, settings pages, and blocks showing exactly how to create the correct definer classes. Getting these class structures wrong is the most common mistake.

**Before creating any Gutenberg blocks, you must read `resources/blocks-guide.md`** — it covers AbstractBlock, block templates, shared template partials, block SCSS patterns, Data classes, and allowed block type configuration. This is more comprehensive than the block section in metabox-patterns.md.

### Meta Box documentation

For field type options, settings, and extension configuration, read `resources/metabox/index.md` for a table of contents covering the full Meta Box docs. Consult these when choosing field types, looking up field settings, or working with extensions like conditional logic, groups, or relationships.

## Environment & Configuration

Configuration flows from `.env` through `wp-config.php`. The `.env` file (based on `.env.example`) stores environment-specific values and is not committed to the repo. `wp-config.php` reads from `.env` via `phpdotenv` and is treated as a static file — it rarely needs editing.

Key env vars:

- `APP_ENV` — `local`, `staging`, `production`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` — database credentials
- `WP_CONTENT_URL` — override for wp-content URL (useful for CDN or non-standard hosts)
- `WP_DEBUG` — `0` or `1`
- `VITE_HMR` / `VITE_PORT` — uncomment to enable HMR dev server
- `EMAIL_SMTP_*` — SMTP configuration

## Where to Put New Code

This project's structure differs from typical WordPress — most logic lives in the site plugin, not the theme. Use this as a guide:

| Task                   | Where                                   | How                                                                                                  |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| New post type          | `inc/PostType/` in site plugin          | Extend `AbstractPostType`, set `$postTypeCode`, add to `PostType::_getDefiners()`                    |
| New taxonomy           | `inc/Taxonomy/` in site plugin          | Extend `AbstractTaxonomy`, set `$taxonomyCode` + `$postTypeCode`, add to `Taxonomy::_getDefiners()`  |
| New custom fields      | `inc/Metaboxio/Metabox/` in site plugin | Extend `AbstractMetabox`, implement `MetaboxDefinerInterface`, add to `Metabox::_getDefiners()`      |
| New Gutenberg block    | `inc/Metaboxio/Block/` in site plugin   | Extend `AbstractBlock`, override `define()`, add to `Block::_getDefiners()`                          |
| New REST API endpoint  | `inc/Api/` in site plugin               | Implement `ApiDefinerInterface`, add to `Api::getDefiners()`                                         |
| New page template      | Theme root (e.g. `template-about.php`)  | Create template file + matching critical CSS entry point                                             |
| New JS behaviour       | `assets/src/js/` in theme               | Create Groundwork component, import and register in `main.ts`                                        |
| New styles             | `assets/src/sass/` in theme             | Add partial with `--critical` or `--non-critical` suffix, `@use` from appropriate entry point        |
| Project-specific logic | `inc/` in site plugin                   | New class extending `Abstract<Name>`, add as property on orchestrator                                |
| Admin customisation    | `inc/Admin.php` in site plugin          | Extend existing `Admin` class                                                                        |
| Nav menus              | `inc/Menu.php` in site plugin           | Add to `register_nav_menus()` call                                                                   |
| Theme supports         | `inc/ThemeSupports.php` in site plugin  | Add to `add_theme_support()` calls                                                                   |

The key principle: if it's PHP logic or WordPress registration, it belongs in the site plugin. The theme contains only templates, assets (JS/SCSS/images), and `style.css` for the theme header.

## Resource Reference

When working on specific domains, read the relevant resource before making changes:

| Working on...                          | Read this first                    |
| -------------------------------------- | ---------------------------------- |
| Post types, taxonomies, API endpoints  | `resources/definer-pattern.md`     |
| Custom fields, settings pages          | `resources/metabox-patterns.md`    |
| Gutenberg blocks                       | `resources/blocks-guide.md`        |
| JS components, interactivity           | `resources/groundwork-guide.md`    |
| SCSS partials, new entry points        | `resources/sass-structure.md`      |
| CSS loading, critical CSS, inheritance | `resources/critical-css.md`        |
| Meta Box field types and options       | `resources/metabox/index.md`       |
