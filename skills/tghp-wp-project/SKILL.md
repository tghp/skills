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
PSR-4 Namespace: `\TGHP\<Name>` (where `<Name>` is a PascalCase version of `<name>`, e.g. "hello-world" → `HelloWorld`, "acme" → `Acme`)

### Architecture

The bulk of the plugin's code lives inside `inc/` of the plugin directory:

- A singleton orchestrator instantiates all subsystems
- Subclasses are organised into domains and added as public properties to the orchestrator class
  - Some manage "entities" using a definer pattern, for declarative registration of post types, taxonomies, blocks, forms, crons via classes implementing `DefinerInterface`

The entrypoint for the plugin instantiates the orchestrator class, thereby triggering any lifecycle hooks subsystems have defined. This creates the following flow:

```
<name>-site.php → \TGHP\<Name>\<Name>::instance() → instantiates subsystems → subsystem behaviour
```

The orchestrator is available for access outside of the plugin via the `_S()` global in newer codebases and `TGHPSite()` in older codebases.

### Core Subclasses

These classes should always be present, and within the PSR-4 namespace defined earlier:

- Name - The singleton orchestrator
- Abstract<Name> - Base class that all classes inherit from (provides access back to the orchestrator via `$this-><name>`, where the property name is the lowercased class name, e.g. `$this->helloWorld` for `HelloWorld`)
- Admin - WP admin area
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
- Util - Misc utils

### Other classes

Most projects will contain other classes for project specific functionality. You'll find these alongside the core classes.

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
- `npm run watch:styles` / `watch:scripts` — single asset type watch
- `npm run build` — production build

Builds are typically very fast in so it is viable to use `npm run build` as a method of checking for errors in script and/or styles.

#### Scripts

We use TypeScript here, however you may find there is no TypeScript used at all. This typically indicates an older project and in this case TypeScript should not be used. However, if any TypeScript is present, prefer writing TypeScript for new scripts.

Scripts are enqueued as ES modules via `wp_enqueue_script_module()` (WordPress 6.5+). The `Enqueues` class handles this, routing through `Dev::enqueueScript()` when HMR is active.

#### Groundwork

`@tghp/groundwork.js` is TGHP's lightweight frontend framework for organising JS that runs on every page and binding component behaviour to DOM elements.

A `Groundwork` instance is created with a namespace (e.g. `'main'`). The namespace determines the data attribute prefix used for component binding. A typical entry point:

```typescript
import Groundwork from '@tghp/groundwork.js';
import globalInclude from './main/includes/globals';
import videoComponent from './main/components/video';

const groundworkMain = new Groundwork('main');

// Includes run on every page as soon as groundwork runs
groundworkMain.includes.add('globals', globalInclude);

// Components bind to DOM elements via data-gw-main-init attributes
groundworkMain.components.add('video', videoComponent);

groundworkMain.run();
```

**Includes** run immediately on every page. Each should export a function that is called with no arguments.

**Components** are triggered by `data-gw-{namespace}-init` attributes on DOM elements. The attribute value is JSON where keys map to registered component names:

```html
<div data-gw-main-init='{"video": { "id": 123, "autoplay": false }}'></div>
```

This pattern also provides a clean route to passing data from PHP to a component:

```php
<?php
$videoArgs = [
  'video' => [
    'id' => $videoId,
    'autoplay' => $autoplay,
  ]
];
?>
<div data-gw-main-init='<?= json_encode($videoArgs) =>'></div>
```

A component should export a function that receives the DOM element and args:

```typescript
import { ComponentFunction } from '@tghp/groundwork.js';

type VideoArgs = {
  id: number;
  autoplay?: boolean;
};

const videoComponent: ComponentFunction<HTMLDivElement, VideoArgs> = (
  elem, // type is HTMLDivElement
  args // type is VideoArgs
) => {
  const { id, autoplay } = args;
  // Component logic here
};

export default videoComponent;
```

While there is no end-to-end typesafety here between PHP and TS, it's worth defining the types anyway for the sake of DX.

If a component function returns a value (e.g. an API object), Groundwork stores it as an instance accessible via `getInstance`.

Adding a new Groundwork namespace (e.g. for a distinct JS bundle) requires a corresponding enqueue in the `Enqueues` class — follow the existing pattern in `Enqueues::enqueueScripts()`.

#### Styles

We use SASS with a critical/non-critical CSS splitting architecture. Before writing or modifying any styles, you must first read `resources/sass-structure.md` — it covers the directory layout, entry point conventions, the `--critical`/`--non-critical` naming pattern, and how to create new style entry points that the Asset class will auto-discover.

## The Definer Pattern

The definer pattern is the primary mechanism for declaratively registering WordPress entities (post types, taxonomies, metabox field groups, blocks, forms, API routes). Rather than scattering `register_post_type()` calls across the codebase, each entity is encapsulated in a definer class that implements the appropriate interface.

### How it works

`AbstractDefines` is the base class. Subclasses like `PostType`, `Taxonomy`, and the Metaboxio classes extend it. On `init` (priority 1), `processDefiners()` iterates over definer instances returned by `_getDefiners()`, validates they implement `DefinerInterface`, and calls `_processDefiner()` on each. The parent class then handles the actual WordPress registration at the appropriate hook.

External code can add definers via filters:

- `tghp_add_definers` — global, applies to all definer managers
- `tghp_add_definers_{classname}` — scoped to a specific manager (lowercased FQCN)

### Definer interfaces

All definers implement `DefinerInterface` which requires a single `define(): array` method. Specialised interfaces extend it:

| Interface                  | Additional methods                                                 | Used by             |
| -------------------------- | ------------------------------------------------------------------ | ------------------- |
| `PostTypeDefinerInterface` | `getPostTypeCode(): string`                                        | `PostType`          |
| `TaxonomyDefinerInterface` | `getTaxonomyCode(): string`, `getAssociatedPostTypeCode(): string` | `Taxonomy`          |
| `MetaboxDefinerInterface`  | (none beyond define)                                               | `Metaboxio\Metabox` |
| `BlockDefinerInterface`    | `getCode(): string`, `getId(): string`, `render(): void`           | `Metaboxio\Block`   |
| `FormDefinerInterface`     | (varies)                                                           | `Metaboxio\Form`    |

Note: `Api` uses a similar definer-like pattern with `ApiDefinerInterface` (`getRoute()`, `getType()`, `handle($data)`) but manages its own definer array rather than extending `AbstractDefines`. Add API definers to `Api::getDefiners()`, not `_getDefiners()`.

### Adding a new definer

1. Create the definer class in the appropriate subdirectory (e.g. `inc/PostType/`)
2. Implement the relevant interface
3. Add an instance to the `_getDefiners()` array of the parent manager

**Example — registering a post type:**

File: `inc/PostType/EventPostType.php`

```php
namespace TGHP\<Name>\PostType;

class EventPostType implements PostTypeDefinerInterface
{
    public function getPostTypeCode(): string
    {
        return 'event';
    }

    public function define(): array
    {
        return [
            'label' => 'Events',
            'public' => true,
            'has_archive' => true,
            'supports' => ['title', 'editor', 'thumbnail'],
            'menu_icon' => 'dashicons-calendar-alt',
        ];
    }
}
```

Then in `PostType.php`, add it to `_getDefiners()`:

```php
protected function _getDefiners()
{
    return [
        new PostType\EventPostType(),
    ];
}
```

The same pattern applies to taxonomies, metabox field groups, and blocks — create a class implementing the right interface, return it from `_getDefiners()`. For API routes, the pattern is similar but uses `Api::getDefiners()` instead (see the note above).

## Meta Box Integration

These projects use [Meta Box AIO](https://metabox.io/) (not ACF) for custom fields, settings pages, Gutenberg blocks, and forms. The Metaboxio namespace in the site plugin contains the integration classes.

### Key classes

- `Metaboxio\Metabox` — Field group definitions, settings pages. Uses the definer pattern with `MetaboxDefinerInterface`.
- `Metaboxio\Block` — Gutenberg blocks via Meta Box's `mb-blocks` extension. Uses `BlockDefinerInterface`. Restricts allowed block types to only those explicitly defined.
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

In this project you never use Meta Box's raw `rwmb_meta_boxes` filter directly — the definer pattern handles that. But the array structures inside `define()` are identical to what the Meta Box docs describe. Before defining any field groups, blocks, or settings pages, you must first read `resources/metabox-patterns.md` — it contains worked examples for all three patterns (field groups, settings pages, and blocks) showing exactly how to create the correct definer classes. Getting these class structures wrong is the most common mistake.

### Meta Box documentation

For field type options, settings, and extension configuration, read `resources/metabox/index.md` for a table of contents covering the full Meta Box docs. Consult these when choosing field types, looking up field settings, or working with extensions like conditional logic, groups, or relationships.

## Critical CSS System

The `Asset` class (extending `AbstractInheritingThemeFile`) handles intelligent CSS discovery and output based on the current page context.

### How CSS files are resolved

`getCssFileSearchNames()` builds a list of CSS filenames to look for based on what WordPress is currently rendering:

- Always includes `main` (non-critical) / `critical` (critical)
- Singular posts: adds `single-{posttype}` / `critical--single-{posttype}`
- Pages: adds `page` and the template name (e.g. `template-home`) / `critical--template-home`
- Archives: adds `archive-{taxonomy}` / `critical--archive-{taxonomy}`
- Search: adds `search` / `critical--search`

### Output methods

- `_S()->asset->outputCriticalCss()` — Inlines all matching critical CSS into `<style>` tags in `<head>`. Skipped when HMR is active.
- `_S()->asset->outputDeferedNonCriticalCss()` — Outputs matching non-critical CSS as preloaded `<link>` tags using the print media trick for lazy loading.

When creating a new page template or post type, create matching SCSS entry points (e.g. `critical--template-about.scss`, `single-event.scss`) and they will be automatically discovered and loaded on the relevant pages.

## Template Inheritance

`AbstractInheritingThemeFile` provides a file location system with a priority chain: child theme → parent theme → plugin. Both `Asset` and `Template` extend this.

The search path priority is:

1. Child theme directory + subpath (priority 1)
2. Parent theme directory + subpath (priority 10)
3. Plugin directory + subpath (priority 100)

Each subclass defines its search subpath via `getSearchSubPath()` — `Asset` uses `'assets'`, `Template` uses `'template'`. This means the plugin can ship fallback templates or assets that the theme can override simply by placing a file at the same relative path.

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

| Task                   | Where                                   | How                                                                                           |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| New post type          | `inc/PostType/` in site plugin          | Create class implementing `PostTypeDefinerInterface`, add to `PostType::_getDefiners()`       |
| New taxonomy           | `inc/Taxonomy/` in site plugin          | Create class implementing `TaxonomyDefinerInterface`, add to `Taxonomy::_getDefiners()`       |
| New custom fields      | `inc/Metaboxio/Metabox/` in site plugin | Create class implementing `MetaboxDefinerInterface`, add to `Metabox::_getDefiners()`         |
| New Gutenberg block    | `inc/Metaboxio/Block/` in site plugin   | Create class implementing `BlockDefinerInterface`, add to `Block::_getDefiners()`             |
| New REST API endpoint  | `inc/Api/` in site plugin               | Create class implementing `ApiDefinerInterface`, add to `Api::getDefiners()`                  |
| New page template      | Theme root (e.g. `template-about.php`)  | Create template file + matching critical CSS entry point                                      |
| New JS behaviour       | `assets/src/js/` in theme               | Create Groundwork component, import and register in `main.ts`                                 |
| New styles             | `assets/src/sass/` in theme             | Add partial with `--critical` or `--non-critical` suffix, `@use` from appropriate entry point |
| Project-specific logic | `inc/` in site plugin                   | New class extending `Abstract<Name>`, add as property on orchestrator                         |
| Admin customisation    | `inc/Admin.php` in site plugin          | Extend existing `Admin` class                                                                 |
| Nav menus              | `inc/Menu.php` in site plugin           | Add to `register_nav_menus()` call                                                            |
| Theme supports         | `inc/ThemeSupports.php` in site plugin  | Add to `add_theme_support()` calls                                                            |

The key principle: if it's PHP logic or WordPress registration, it belongs in the site plugin. The theme contains only templates, assets (JS/SCSS/images), and `style.css` for the theme header.
