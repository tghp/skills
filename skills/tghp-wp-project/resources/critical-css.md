# Critical CSS System & Template Inheritance

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

## Template Inheritance

`AbstractInheritingThemeFile` provides a file location system with a priority chain. Both `Asset` and `Template` extend this.

The search path priority is:

1. Child theme directory + subpath (priority 1)
2. Parent theme directory + subpath (priority 10)
3. Plugin directory + subpath (priority 100)

Each subclass defines its search subpath via `getSearchSubPath()` — `Asset` uses `'assets'`, `Template` uses `'templates'`. This means the plugin can ship fallback templates or assets that the theme can override simply by placing a file at the same relative path.

This is how block templates work: `AbstractBlock::render()` uses the `Template` class to locate `templates/blocks/{code}/template.php`, searching the theme first and falling back to the plugin.
