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
