# Asset Class: CSS, Inline Assets & Template Inheritance

## CSS Discovery and Output

The `Asset` class (extending `AbstractInheritingThemeFile`) handles intelligent CSS discovery and output based on the current page context.

### How CSS files are resolved

`getCssFileSearchNames()` builds a list of CSS filenames to look for based on what WordPress is currently rendering:

- Always includes `main` (non-critical) / `critical` (critical)
- Singular posts: adds `single-{posttype}` / `critical--single-{posttype}`
- Pages: adds `page` and the template name (e.g. `template-home`) / `critical--template-home`
- Archives: adds `archive-{taxonomy}` / `critical--archive-{taxonomy}`
- Search: adds `search` / `critical--search`

### Output methods

Both output methods are called in the theme's `header.php`, alongside `_S()->dev->outputHmrLoad()` which handles Vite HMR script injection during development:

- `_S()->asset->outputCriticalCss()` — Inlines all matching critical CSS into `<style>` tags in `<head>`. Skipped when HMR is active.
- `_S()->asset->outputDeferedNonCriticalCss()` — Outputs matching non-critical CSS as preloaded `<link>` tags using the print media trick for lazy loading.

### Creating CSS for new templates or post types

When creating a new page template or post type, create matching SCSS entry points and they will be automatically discovered and loaded on the relevant pages:

- New page template `template-about.php` → create `critical--template-about.scss`
- New post type `event` → create `critical--single-event.scss` and optionally `single-event.scss` (non-critical)

Block-specific styles live in `assets/src/sass/components/blocks/` as `--critical` suffixed partials (e.g. `_page-header--critical.scss`). These are imported via a `_blocks--critical.scss` manifest file.

For the full SASS directory layout, entry point conventions, and the `--critical`/`--non-critical` naming pattern, read `resources/sass-structure.md`.

## Inlining asset file contents: `outputAsset()`

When a template needs the raw contents of a file from the theme's `assets/` directory — most commonly an SVG icon — use `Asset::outputAsset()` rather than hard-coding `<img>` tags, `file_get_contents()` calls, or `get_stylesheet_directory_uri()` paths.

```php
// Inline an SVG icon (most common use)
<?= _S()->asset->outputAsset('images/icon-search.svg') ?>

// Dynamic filename
<?= _S()->asset->outputAsset("images/podcast-icons/{$iconLabel}.svg") ?>

// Base64 data URI (for CSS backgrounds or non-SVG images)
$logo = _S()->asset->outputAsset('images/logo.png', true);
```

Signature: `outputAsset(string $path, bool $base64 = false): string`. The path is relative to the `assets/` directory (no leading slash).

Why use it:

- **Template inheritance** — resolves via the same child-theme → parent-theme → plugin chain as CSS/template lookups (see below), so a child theme can override a plugin-shipped SVG by placing a file at the same path
- **In-memory caching** — repeated calls for the same path don't re-read the file
- **Environment-aware paths** — routes through `Util::formatPathForEnvironments()` so paths behave correctly across local/staging/production
- **Correct SVG mime type** — normalises `image/svg` to `image/svg+xml` for data URIs

When you reach for an inline asset in a template, check `_S()->asset->outputAsset()` (or `TGHPSite()->asset->outputAsset()`, per project convention) first — do not hand-roll file reads or enqueue logic for single-asset inlining.

## Template Inheritance

`AbstractInheritingThemeFile` provides a file location system with a priority chain. Both `Asset` and `Template` extend this.

The search path priority is:

1. Child theme directory + subpath (priority 1)
2. Parent theme directory + subpath (priority 10)
3. Plugin directory + subpath (priority 100)

Each subclass defines its search subpath via `getSearchSubPath()` — `Asset` uses `'assets'`, `Template` uses `'templates'`. This means the plugin can ship fallback templates or assets that the theme can override simply by placing a file at the same relative path.

This is how block templates work: `AbstractBlock::render()` uses the `Template` class to locate `templates/blocks/{code}/template.php`, searching the theme first and falling back to the plugin.
