# Groundwork.js Guide

`@tghp/groundwork.js` is the project's frontend JS framework. All JS behaviour in this project must go through Groundwork — do not write raw `document.querySelector()` calls, attach event listeners directly, or use side-effect imports. Every piece of JS is either a Groundwork **component** or **include**.

## Entry point setup

A `Groundwork` instance is created with a namespace (e.g. `'main'`). The namespace determines the data attribute prefix used for component binding:

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

## Includes vs Components

**Includes** run immediately on every page. Each should export a function that is called with no arguments. Use these for global behaviour (scroll detection, analytics, etc.).

**Components** are triggered by `data-gw-{namespace}-init` attributes on DOM elements. The attribute value is JSON where keys map to registered component names:

```html
<div data-gw-main-init='{"video": { "id": 123, "autoplay": false }}'></div>
```

## Passing data from PHP to JS (the PHP→JS boundary)

The `data-gw-*-init` attribute is the standard and only way to pass server-side data to JS in this project. Do not use `wp_localize_script()`, custom `data-*` attributes, or inline `<script>` tags — always encode data as JSON in the Groundwork init attribute:

```php
<?php
$videoArgs = [
  'video' => [
    'id' => $videoId,
    'autoplay' => $autoplay,
  ]
];
?>
<div data-gw-main-init='<?= json_encode($videoArgs) ?>'></div>
```

## Typed components

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

While there is no end-to-end typesafety between PHP and TS, defining the types improves DX and catches errors on the JS side.

## Instances

If a component function returns a value (e.g. an API object), Groundwork stores it as an instance accessible via `getInstance`. This allows other code to interact with initialised components.

## Namespaces and entry points

The Groundwork namespace is not always `'main'` — some projects use a project-specific name (e.g. `'ifp'`) or split functionality across multiple namespaces (e.g. `'main'` for general components, `'article'` for article-specific JS). **Always check the existing entry point(s) in `assets/src/js/`** to find the actual namespace(s) in use.

The "primary" namespace — the one with the most components and includes, or named similarly to the project — is where general-purpose components and includes should go.

### When to create a new namespace

For specific areas of the site (e.g. "account", "search") that have their own distinct set of components, prefer creating a new entry point and namespace. However, if the project has only one namespace with no splitting, ask the user whether to add to the existing one or start a new one.

Adding a new Groundwork namespace requires:
1. A new JS entry point in `assets/src/js/` creating the Groundwork instance
2. A corresponding enqueue in the `Enqueues` class — follow the existing pattern in `Enqueues::enqueueScripts()`

### Directory structure per namespace

Namespace-specific code should be organised into a folder inside `js/` that matches the namespace name, with its own `components/` and/or `includes/` sub-folders (only create folders that are needed):

```
assets/src/js/
├── main.ts                    <- entry point for 'main' namespace
├── main/
│   ├── components/
│   │   └── video.ts
│   └── includes/
│       └── globals.ts
├── account.ts                 <- entry point for 'account' namespace
└── account/
    └── components/
        └── subscriptions.ts
```

## React/Preact components via Groundwork

For interactive UIs that need a component framework, mount React or Preact as a Groundwork component. This keeps initialisation consistent — the same `data-gw-*-init` attribute pattern handles data passing from PHP, and the component lifecycle is managed by Groundwork.

### Which framework is this project using?

Check `vite.config.mts` for the vitepress configuration:
- `preact: true` → the project uses **Preact**. Read `resources/preact-groundwork.md`.
- `react: true` (without `preact: true`) → the project uses **React**. Read `resources/react-groundwork.md`.
- Neither configured → no component framework is set up yet. If the user needs one, prefer React unless they specify Preact. Set `react: true` in the vitepress config and follow `resources/react-groundwork.md`.

If a component framework is already in use in the project, continue using it — do not switch.

### Common pattern (both frameworks)

Regardless of framework, the structure is the same:

1. **Groundwork wrapper** (`.ts`) — a `ComponentFunction` that mounts the framework component
2. **Component tree** (`.tsx`) — the actual UI, in a subdirectory named after the component
3. **Registration** — import the wrapper and register it with `groundworkMain.components.add()`
4. **PHP integration** — pass data via `data-gw-{namespace}-init` JSON attribute, same as vanilla components

The only differences between React and Preact are the import sources and mount call. See the relevant guide for exact syntax.
