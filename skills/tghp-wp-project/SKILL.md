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
- To patch a third-party plugin, use `cweagans/composer-patches` (see `resources/composer-patches.md`) — do not edit the plugin's files directly
- PHP logic belongs in the site plugin (`src/plugins/<name>-site/`), not in the theme's `functions.php`
- The theme (`src/themes/<name>/`) contains only templates, assets, and a `style.css` header

### Before writing code — check project conventions

These projects share a common template but conventions vary by project age. Before writing new code, verify these project-specific details:

- **Global functions**: Check the plugin entrypoint (`<name>-site.php`) to see which helpers exist (`_S()`, `TGHPSite()`, `TGHP<Name>()`) and use whichever the project already uses (see "Architecture" below)
- **React vs Preact**: Check `vite.config.mts` for `preact: true` or `react: true` — imports differ (see `resources/groundwork-guide.md`)
- **Metabox namespace**: Check whether the project uses `inc/Metaboxio/` or `inc/Metabox/` — don't assume
- **Groundwork namespace**: Check the JS entry point for the actual namespace string (not always `'main'`) — this determines `data-gw-{namespace}-init` attributes in PHP
- **JS or TS**: Check whether entry points are `.js` or `.ts` — don't introduce TypeScript into a JavaScript-only entry point

### Template code ethos

Templates will primarily call into the orchestrator's subsystems to access metabox content and project-specific logic. The rule of thumb: if a piece of logic is more than a few statements, it belongs in a subsystem method rather than inline in the template (e.g. `_S()->article->getArticleReadTime()` or `TGHPSite()->article->getArticleReadTime()` rather than computing it in the template). Before writing new logic anywhere — templates, subsystems, or API endpoints — check whether an existing subsystem already provides it. Common examples: the `Page` class for page lookups by template, `Util` for srcset generation and filter removal, `Asset::outputAsset()` for inlining SVGs or other asset file contents (see `resources/critical-css.md`), and any domain class (e.g. `Post`, `Article`, `Podcast`) for content processing utilities like author lists, table of contents generation, or content formatting.

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

The orchestrator is available for access outside of the plugin via global helper functions defined in the plugin entrypoint. These vary by project age — **check the plugin entrypoint before writing any code that calls these functions**. Using an alias that doesn't exist in the project is a fatal PHP error. The possible globals are:

- `_S()` / `_MB()` — short aliases, **only present in newer codebases** (many projects lack these entirely)
- `TGHPSite()` / `TGHPSiteMetabox()` — present in most codebases
- `TGHP<Name>()` — project-specific function (e.g. `TGHPColossus()`), always present

Match whichever form the existing templates already use. If the project's templates use `TGHPSite()`, use `TGHPSite()` — do not switch to `_S()` even if it exists in the entrypoint. Consistency with the existing codebase is the priority.

### Core Subclasses

These classes should always be present, and within the namespace defined earlier:

- Name - The singleton orchestrator
- Abstract<Name> - Base class that all classes inherit from (provides access back to the orchestrator via `$this-><name>`, where the property name is the lowercased class name, e.g. `$this->helloWorld` for `HelloWorld`)
- Admin - WP admin area customisation; includes `controlEditor()` which disables the Gutenberg block editor for specific page templates that use Meta Box fields instead
- Api - REST API route registration (uses a definer-like pattern but manages its own definer array rather than extending `AbstractDefines`)
- Asset - Utilities surrounding asset output
- Enqueues - Style/script enqueues
- Menu - WP Nav menus
- Metaboxio\Metabox - Definer for metabox field group classes
- Metaboxio\Block - Definer for Gutenberg block classes
- Metaboxio\Form - Definer for mb-frontend-submission forms
- Page - Utilities for getting a WP page post by its template, for which there is usually a 1-to-1 relationship. Standardised into methods e.g. `getHomePage()`, `getContactUsPage()`. **When you need a reference to a specific page, check this class first** — do not write raw `WP_Query` or `get_pages()` calls to find pages by template
- PostType - Definer for any post types added
- Taxonomy - Definer for any taxonomies added
- Template - Locates template files using the theme file inheritance chain (child theme → parent theme → plugin)
- ThemeSupports - Manages theme support definitions
- Dev - Vite HMR integration; manages dev server script injection and hot-reloading of CSS/JS
- Util - Misc utils

### Adding project-specific classes

Most projects extend well beyond the core set with domain-specific classes (e.g. `Article`, `Podcast`, `Subscriptions`, `Search`). Adding new subsystems is extremely common and encouraged for organising functionality into logical domains.

Before creating a new class, check whether an existing class already covers the domain — if so, add the functionality there. If the boundary is unclear, ask the user.

To add a new subsystem:

1. Create the class in `inc/`, extending `Abstract<Name>`
2. Add a public property declaration on the orchestrator class
3. Instantiate it in the orchestrator's `__construct()` — most projects have comments labelling the project-specific section; append there. If no comments exist, append after the existing instantiations
4. The class is now accessible via the project's global accessor (e.g. `_S()-><propertyName>` or `TGHPSite()-><propertyName>` — match whichever the project uses)

```php
// In the orchestrator's __construct():
$this->podcast = new Podcast($this);
```

The new class inherits `$this-><name>` (the orchestrator reference) from `Abstract<Name>`, giving it access to all other subsystems.

#### Nested subsystems for complex domains

When a domain has multiple distinct concerns, group them under a parent subsystem that instantiates its own children rather than adding everything flat on the orchestrator. For example, a "users" domain might manage roles, profile details, subscriptions, and content gating — each as a separate class under `inc/Users/`:

```php
// inc/Users.php
class Users extends Abstract<Name>
{
    public $roles;
    public $subscriptions;
    public $contentGating;

    public function __construct(<Name> $<name>)
    {
        parent::__construct($<name>);

        $this->roles = new Users\Roles($<name>);
        $this->subscriptions = new Users\Subscriptions($<name>);
        $this->contentGating = new Users\ContentGating($<name>);
    }
}
```

The children still extend `Abstract<Name>` and receive the orchestrator, so they can access any other subsystem. Access follows the nesting: `TGHPSite()->users->subscriptions->getActiveSubscription()`.

Use this pattern when a subsystem would otherwise accumulate many unrelated methods or when you find yourself prefixing method names to disambiguate (e.g. `getUserRoles()`, `getUserSubscriptions()`, `getUserGating()` — the prefix is a sign these are separate concerns).

### Registering WordPress hooks

As a general convention, each subsystem registers its own WordPress hooks (`add_action`, `add_filter`) in its `__construct` — not in the orchestrator, and not in a separate `registerHooks()` method. Each subsystem owns its hooks:

```php
class Enqueues extends Abstract<Name>
{
    public function __construct(<Name> $<name>)
    {
        parent::__construct($<name>);

        add_action('wp_enqueue_scripts', [$this, 'enqueueScripts']);
        add_action('wp_enqueue_scripts', [$this, 'unenqueueStyles'], 100);
    }
}
```

Definer-managed classes are the main exception: the definer manager (`PostType`, `Taxonomy`, `Metaboxio\Metabox`, etc.) registers a single `init` hook in its own constructor and then delegates per-entity registration to the definer framework — individual definer classes (e.g. `PostType\Event`) contain only a `define()` method and do not call `add_action`/`add_filter` themselves. Genuinely orchestrator-level hooks may occasionally live on the orchestrator, but those are rare — prefer the subsystem.

## The Definer Pattern

The definer pattern is how post types, taxonomies, metabox field groups, blocks, forms, and API routes are registered. Each entity gets its own class that extends an abstract base and overrides `define()`.

**Before creating any new post type, taxonomy, block, field group, form, or API endpoint, you must read `resources/definer-pattern.md`.** It contains the full interface/abstract base class reference, worked examples for post types, taxonomies, and API routes, and the step-by-step process for adding a new definer. Getting the class structure wrong is the most common mistake — the reference doc prevents this.

## The Site Theme

Location: src/themes/<name>/

The theme and the site plugin are tightly coupled. In newer projects, `functions.php` will be empty (or contain only a comment referencing the site plugin). Older projects may have some code in `functions.php`, but regardless — **do not add new code to `functions.php`**. Anything that would traditionally go there belongs in the site plugin instead.

### Template parts

Reusable sub-parts of templates live in a `template-parts/` directory in the theme root, organised into domain subdirectories. For example:

```
template-parts/
├── post/
│   ├── loop-post.php
│   └── social-icons.php
├── people/
│   └── profile-card.php
└── arrow-button.php
```

Load these with `get_template_part()`:

```php
get_template_part('template-parts/post/social-icons');
get_template_part('template-parts/people/profile-card', null, ['postType' => 'team']);
```

When a piece of markup is used in more than one template, extract it into a template part rather than duplicating it. Group by domain (e.g. `post/`, `people/`, `account/`) rather than putting everything flat in `template-parts/`.

### Scripts and Styles

#### Vitepress

`@tghp/vitepress` (not to be confused with the Vue-powered static site generator of the same name) is TGHP's Vite preset for WordPress themes. It handles compilation of both scripts and styles. It wraps Vite with conventions suited to the project structure:

- Auto-discovers entry points in `src/themes/<name>/assets/src/` — JS in `js/` and SCSS in `sass/`
- Compiles to `src/themes/<name>/assets/dist/` — **this directory is gitignored; built assets are never committed**. Do not `git add` anything under `assets/dist/`, and do not infer tracking state from an empty `git status` (empty just means git is ignoring the path). Dist is rebuilt at deploy time
- Provides HMR dev server integration with WordPress (via `VITE_HMR` and `VITE_PORT` env vars)
- Supports React (`react: true`) and Preact (`preact: true`) — check `vite.config.mts` to see which is configured. If neither, prefer React for new projects unless the user specifies Preact
- Extends via an `alterConfig` callback for project-specific Vite config

The `vite.config.mts` at the project root imports vitepress and passes it project-level config. The template includes support for exclusive build modes (`--scripts` / `--styles` flags) for faster iteration when only one asset type needs rebuilding.

npm scripts:

- `npm run dev` — HMR dev server (requires `VITE_HMR=1` and `VITE_PORT` in `.env`)
- `npm run watch` — production-like watch builds
- `npm run watch:styles` / `watch:scripts` — single asset type watch (may not be present in older projects)
- `npm run build` — production build

Builds are typically very fast so it is viable to use `npm run build` as a method of checking for errors in script and/or styles.

#### Scripts

We use TypeScript here, however you may find there is no TypeScript used at all. This typically indicates an older project. The rule: if the entry point file is `.js` (not `.ts`), new files under that entry point should also be `.js` — do not introduce TypeScript into a JavaScript-only entry point. If any TypeScript is present in the project (`.ts` entry points exist), prefer TypeScript for new files.

Scripts are enqueued as ES modules. The `Enqueues` class wraps this — to enqueue a new script entry point, add a `_enqueueScript` call to `enqueueScripts()`:

```php
public function enqueueScripts()
{
    $this->_enqueueScript(
        'main',
        get_stylesheet_directory_uri() . '/assets/src/js/main.ts',
        get_stylesheet_directory_uri() . '/assets/dist/main.js',
        get_stylesheet_directory() . '/assets/dist/main.js'
    );
}
```

The three paths are: handle name, HMR dev source path, production dist URI, and production dist filesystem path. Follow the existing pattern in the project's `Enqueues` class for any new entry points.

#### Groundwork

`@tghp/groundwork.js` is the project's JS framework. All frontend JS in this project goes through Groundwork — do not use raw `document.querySelector()`, direct DOM manipulation, or side-effect imports in `main.ts`. Every piece of JS behaviour is either a Groundwork **component** (bound to a DOM element via `data-gw-{namespace}-init`) or a Groundwork **include** (runs on every page).

The `data-gw-{namespace}-init` attribute is also the standard way to pass data from PHP to JS. Encode server-side values as JSON in this attribute — do not use `wp_localize_script()`, custom data attributes, or inline `<script>` tags.

**Before writing or modifying any JS, you must read `resources/groundwork-guide.md`.** It covers the component/include pattern, typed component args, the PHP→JS data boundary, multiple namespaces, and mounting React components via Groundwork. Code that bypasses Groundwork will not integrate with the project architecture and will need to be rewritten.

#### Styles

We use SASS with a critical/non-critical CSS splitting architecture. **Before writing or modifying any styles, you must read `resources/sass-structure.md`** — it covers the directory layout, entry point conventions, and the `--critical`/`--non-critical` naming pattern.

**Before working on the CSS system itself (how CSS is discovered, output, or loaded), read `resources/critical-css.md`** — it explains the Asset class, how CSS files are resolved per page context, where the output methods are called (`header.php`), and the template inheritance chain.

## Meta Box Integration

These projects use [Meta Box AIO](https://metabox.io/) (not ACF) for custom fields, settings pages, Gutenberg blocks, and forms. The integration classes live in the site plugin under a dedicated namespace — most commonly `Metaboxio` (e.g. `inc/Metaboxio/Metabox/`, `inc/Metaboxio/Block/`). Older projects may use a different structure such as `Metabox` (without the 'io' suffix) or `Blocks` (plural) for the block orchestrator. Always check the existing directory structure before creating new definer classes.

### Key classes

- `Metaboxio\Metabox` — Field group definitions, settings pages. Uses the definer pattern with `MetaboxDefinerInterface`.
- `Metaboxio\Block` — Gutenberg blocks via Meta Box's `mb-blocks` extension. Uses `BlockDefinerInterface`. Restricts allowed block types via `setAllowedBlockTypes()` — only custom blocks in the `<name>-blocks` category plus a configurable set of core blocks (typically image, paragraph, heading, list, embed — check the method for the project's specific allowlist). Different post types may have different allowed sets.
- `Metaboxio\Form` — Frontend forms via the `tghp-mb-contact` plugin and Meta Box's `mb-frontend-submission` extension. Not all projects have forms — check for `src/plugins/tghp-mb-contact/`. **Before creating or modifying any frontend forms, you must read `resources/forms-guide.md`** — it covers the form definition structure, field options, rendering in templates, post-processing, validation, and email notifications. Forms have their own field prefix (`_tghpcontact_`) and a different definition structure to metabox field groups.

### Field key prefixing

All field IDs are prefixed with `_tghp<name>_` (defined as a constant in the plugin entry point). The `Metabox` class provides helpers:

- `Metabox::generateKey($key)` — adds prefix
- `Metabox::maybeGenerateKey($key)` — adds prefix only if not already present
- `Metabox::removePrefixFromKey($fields)` — strips prefix from key or array of keys

### Accessing field values

Access the `Metabox` instance via whichever global the project uses (see the priority list above — `_MB()` in newer codebases, `TGHPSiteMetabox()` in older ones, or `TGHP<Name>()->metabox` if neither alias exists):

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

`resources/metabox/index.md` is a table of contents for the full Meta Box docs, shipped with the skill. It's the authoritative answer for anything Meta Box-related — prefer it over reading `vendor/meta-box/` source, which is slower to grep and not what the docs are curated to replace.

Read it when:

- Choosing a field type or looking up its settings
- Checking whether a **metabox group option** exists (`closed`, `context`, `priority`, `default_hidden`, `include`, `revision`, etc. — not just per-field settings)
- **Verifying a capability before you use it** — e.g. "does Meta Box support collapsing a metabox by default?" is a docs question, not a source-code question. Grep the docs first; only fall back to `vendor/` if the docs genuinely don't cover it
- Working with any of the extensions (conditional logic, groups, relationships, columns, etc.)

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

This project's structure differs from typical WordPress — most logic lives in the site plugin, not the theme. Use this as a guide (note: the `Metaboxio` paths shown here are the modern convention — older projects may use `Metabox` or `Blocks` instead; always check the existing directory structure):

| Task                   | Where                                   | How                                                                                                  |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| New post type          | `inc/PostType/` in site plugin          | Extend `AbstractPostType`, set `$postTypeCode`, add to `PostType::_getDefiners()`                    |
| New taxonomy           | `inc/Taxonomy/` in site plugin          | Extend `AbstractTaxonomy`, set `$taxonomyCode` + `$postTypeCode`, add to `Taxonomy::_getDefiners()`  |
| New custom fields      | `inc/Metaboxio/Metabox/` in site plugin | Extend `AbstractMetabox`, implement `MetaboxDefinerInterface`, add to `Metabox::_getDefiners()`      |
| New Gutenberg block    | `inc/Metaboxio/Block/` in site plugin   | Extend `AbstractBlock`, override `define()`, add to `Block::_getDefiners()`                          |
| New frontend form      | `inc/Metaboxio/Form/` in site plugin    | Implement `FormDefinerInterface`, add to `Form::_getDefiners()` (requires `tghp-mb-contact` plugin)  |
| New REST API endpoint  | `inc/Api/` in site plugin               | Implement `ApiDefinerInterface`, add to `Api::getDefiners()`                                         |
| New page template      | Theme root (e.g. `template-about.php`)  | Create template file + matching critical CSS entry point                                             |
| New JS behaviour       | `assets/src/js/` in theme               | Create Groundwork component, import and register in `main.ts`                                        |
| New styles             | `assets/src/sass/` in theme             | Add partial with `--critical` or `--non-critical` suffix, `@use` from appropriate entry point        |
| Project-specific logic | `inc/` in site plugin                   | New class extending `Abstract<Name>`, add as property on orchestrator                                |
| Admin customisation    | `inc/Admin.php` in site plugin          | Extend existing `Admin` class                                                                        |
| Nav menus              | `inc/Menu.php` in site plugin           | Add to `register_nav_menus()` call                                                                   |
| Theme supports         | `inc/ThemeSupports.php` in site plugin  | Add to `add_theme_support()` calls                                                                   |

The key principle: if it's PHP logic or WordPress registration, it belongs in the site plugin. The theme contains only templates, assets (JS/SCSS/images), and `style.css` for the theme header.

### Theme template naming

WordPress template files in the theme root follow these conventions:

- **Page templates**: `template-{name}.php` (e.g. `template-contact.php`) — selected in the page editor
- **Post type singles**: `single-{posttype}.php` (e.g. `single-event.php`) — auto-used for single post views
- **Taxonomy archives**: `taxonomy-{taxonomy_code}.php` (e.g. `taxonomy-content_area.php`) — auto-used for taxonomy term archive pages
- **Generic**: `index.php`, `page.php`, `single.php`, `404.php`

### Common multi-domain workflows

Features rarely touch just one domain. These are the typical combinations:

**New page template** → also create:
- Critical CSS entry point (`critical--template-{name}.scss`) that `@use`s from a `pages/` partial
- Metabox field group targeting the template via `include` → `template` (if the page has CMS-managed content)
- Consider disabling Gutenberg for the template via `Admin::controlEditor()` if using Meta Box fields

**New post type** → also create:
- Single template (`single-{posttype}.php`) in theme
- Critical CSS entry point (`critical--single-{posttype}.scss`)
- Metabox field group for any custom fields on the post type

**New taxonomy** → also create:
- Taxonomy archive template (`taxonomy-{taxonomy_code}.php`) in theme if a listing page is needed

## Resource Reference

When working on specific domains, read the relevant resource before making changes:

| Working on...                          | Read this first                    |
| -------------------------------------- | ---------------------------------- |
| Post types, taxonomies, API endpoints  | `resources/definer-pattern.md`     |
| Custom fields, settings pages          | `resources/metabox-patterns.md`    |
| Gutenberg blocks                       | `resources/blocks-guide.md`        |
| Frontend forms                         | `resources/forms-guide.md`         |
| JS components, interactivity           | `resources/groundwork-guide.md`    |
| React components via Groundwork        | `resources/react-groundwork.md`    |
| Preact components via Groundwork       | `resources/preact-groundwork.md`   |
| SCSS partials, new entry points        | `resources/sass-structure.md`      |
| CSS loading, critical CSS, inheritance | `resources/critical-css.md`        |
| Patching third-party plugins           | `resources/composer-patches.md`    |
| Meta Box field types and options       | `resources/metabox/index.md`       |
