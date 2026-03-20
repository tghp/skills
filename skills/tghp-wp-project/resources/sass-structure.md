# SASS Structure

SASS is structured using a SMACSS-inspired architecture with critical/non-critical CSS splitting.

## Entry points

Each compiles to a separate CSS file:

- `critical.scss` — Critical-path styles, inlined in `<head>` by the `Asset` class
- `main.scss` — Non-critical styles, lazy-loaded via a print media trick
- `critical--template-<template>.scss` — Per-template critical CSS (e.g. `critical--template-home.scss`)

## Directory structure

```
sass/
├── abstracts/           # Variables, mixins, shared setup
│   ├── _variables.scss  # Breakpoints, sizing, font config, sass-mq integration
│   ├── _mixins.scss     # Forwards individual mixin files
│   ├── mixins/
│   │   ├── _layout.scss      # max-width, main-padding, full-bleed, aspect-ratio
│   │   ├── _typography.scss  # Font family & sizing helpers (rem conversion)
│   │   └── _util.scss        # mq() wrapper, pseudo-element helper
│   ├── _abstracts.scss  # Forwards variables & mixins
│   └── _setup.scss      # Single forwarding file used by all partials
├── base/                # Reset (the-new-css-reset) and base defaults
├── layout/              # Site header, footer, main, navigation
├── components/          # Reusable UI components (buttons, etc.)
└── pages/               # Page-specific styles
```

## Conventions

- Partials are suffixed with `--critical` or `--non-critical` to indicate which entry point they belong to
- `abstracts/_setup.scss` is `@use`d by any partial that needs access to variables or mixins
- Breakpoints are defined in `_variables.scss` and shared with `sass-mq` for responsive media queries via the `mq()` mixin wrapper
- When creating a new page template or post type, create matching SCSS entry points (e.g. `critical--template-about.scss`, `single-event.scss`) — the Asset class will auto-discover and load them on the relevant pages

## Class naming: BEM

CSS class names follow **BEM** (Block Element Modifier) convention:

- **Block**: the top-level component (`.card`, `.hero`, `.site-header`)
- **Element**: a child within the block, joined with `__` (`.card__title`, `.hero__description`)
- **Modifier**: a variation, joined with `--` (`.card--featured`, `.button--primary`)

For Gutenberg blocks, the block code from `AbstractBlock::getCode()` is the BEM block name:

```scss
.call-to-action {
  // Block
  &__heading { /* Element */ }
  &__description { /* Element */ }
  &__button { /* Element */ }
  &--dark { /* Modifier */ }
}
```

Note: the `__` in BEM class names (`.card__title`) is unrelated to the `__` used in SASS variable/mixin naming (`$font__body-family`, `@include font__heading`). The variable naming is a project convention for grouping related values — it is not BEM.
