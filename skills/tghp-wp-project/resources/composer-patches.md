# Composer Patches

When a third-party plugin needs a modification, do not edit its files directly — they live in `wp-content/plugins/` and are managed by Composer. Instead, use `cweagans/composer-patches` to apply a patch file.

## Setup

If the project doesn't already use composer-patches, add it:

```bash
composer require cweagans/composer-patches
```

Ensure it's allowed in `composer.json` under `config.allow-plugins`:

```json
"config": {
  "allow-plugins": {
    "cweagans/composer-patches": true
  }
}
```

## Creating a patch

1. Find the installed plugin file you need to modify (e.g. `wp-content/plugins/wp-search-with-algolia/includes/class-algolia-plugin.php`)
2. Copy the original file, make your changes to the installed copy, then generate a diff:

```bash
diff -u wp-content/plugins/wp-search-with-algolia/includes/class-algolia-plugin.php.orig \
       wp-content/plugins/wp-search-with-algolia/includes/class-algolia-plugin.php \
       > patches/composer/wp-search-with-algolia/my-patch.patch
```

3. Store patch files in `patches/composer/{plugin-name}/` — this directory structure is a project convention, not a Composer requirement
4. Use paths relative to the plugin root in the diff headers (e.g. `a/includes/class-algolia-plugin.php`)

## Registering the patch

Add the patch to `composer.json` under `extra.patches`, keyed by the Composer package name:

```json
"extra": {
  "patches": {
    "wpackagist-plugin/wp-search-with-algolia": {
      "Expose algolia results": "patches/composer/wp-search-with-algolia/expose-search-algolia-results.patch"
    }
  }
}
```

The key is a human-readable description, the value is the path to the patch file.

## Applying

Run `composer install` (or `composer update {package-name}`) — composer-patches applies patches automatically after installing packages. If a patch fails to apply (e.g. after a plugin update changes the target file), Composer will error and the patch needs updating.
