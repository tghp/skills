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

### Declaration order within a ruleset

Place utility mixins (`@include button`, `@include max-width-element`, `@include block-padding-vertical`) at the top of a ruleset, before CSS properties. Media-query mixins (`@include mq(...)`) are the exception — they go inline at the point they apply, typically after properties or nested inside the element rule they modify.

```scss
.event-listings {
  @include block-padding-vertical;
  @include block-background-colors;

  display: flex;
  gap: 20px;

  &__heading {
    font-size: 1.5rem;

    @include mq($from: m) {
      font-size: 2rem;
    }
  }
}
```

Keeping base-styling mixins grouped at the top makes it immediately clear what foundation a rule is built on before scanning the overrides below.

## Class naming: BEM

CSS class names follow **BEM** (Block Element Modifier) convention:

- **Block**: the top-level component (`.card`, `.hero`, `.site-header`)
- **Element**: a child within the block, joined with `__` (`.card__title`, `.hero__description`)
- **Modifier**: a variation, joined with `--` (`.card--featured`, `.button--primary`)

For Gutenberg blocks, the block code from `AbstractBlock::getCode()` is the BEM block name.

### Always use `&__` for elements — never write the full block name in source

Once you're inside a block's rule, every element reference must go through the `&` parent selector. Do not write out the full `.<block>__<element>` class name in source — this applies **everywhere relevant**: the base block, inside modifiers, inside media queries, inside nested element rules, inside re-scoped block selectors, anywhere `&` can reach the element.

**Right:**

```scss
.call-to-action {
  $self: &;

  &__heading {
    /* .call-to-action__heading */

    // Media queries go *inside* the element rule, not wrapping it
    @include mq($from: m) {
      font-size: 2rem;
    }
  }
  &__description { /* .call-to-action__description */ }
  &__button { /* .call-to-action__button */ }

  &--dark {
    background: black;

    // Re-introduce the block so &__ can reach elements inside the modifier
    .call-to-action {
      &__heading { 
        color: white;
      }
      &__description {
        color: grey;
      }
    }
  }

  // For outside-in scopes (parent themes, utility classes, etc.), reference
  // the stored $self so it's obvious you're targeting the block's element
  .theme--winter & {
    #{$self}__heading {
      color: blue;
    }
  }
}
```

**Wrong:**

```scss
.call-to-action {
  .call-to-action__heading { }           // repeats block name at top level

  &--dark {
    .call-to-action__heading { }         // full class name inside modifier
    .call-to-action__description { }
  }
}
```

The compiled CSS is identical for both forms — this rule is about *source* consistency. Keeping every element name derived from `&` means renaming the block, or forking a variant, is a one-line change. It also makes element inventories scannable: every `&__foo` line in the file is an element declaration, with no ambiguity between block references and element references.

When reviewing or editing an existing partial, if you find `.<block>__<element>` written out inside a nested context, refactor it to the nested `&__` form rather than adding more of the same pattern.

### Variable `__` naming is unrelated

The `__` in BEM class names (`.card__title`) is unrelated to the `__` used in SASS variable/mixin naming (`$font__body-family`, `@include font__heading`). The variable naming is a project convention for grouping related values — it is not BEM.
