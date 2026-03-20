# Groundwork.js Guide

`@tghp/groundwork.js` is TGHP's lightweight frontend framework for organising JS that runs on every page and binding component behaviour to DOM elements.

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

## Passing data from PHP to components

The `data-gw-*-init` attribute provides a clean route for passing server-side data to JS:

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

## Multiple namespaces

A project may have multiple Groundwork instances with different namespaces for separate JS bundles. For example, a `'main'` namespace for core functionality and a `'graphic'` namespace for a Three.js-based bundle. Each namespace uses its own data attribute prefix (`data-gw-main-init` vs `data-gw-graphic-init`).

Adding a new Groundwork namespace requires:
1. A new JS entry point in `assets/src/js/` creating the Groundwork instance
2. A corresponding enqueue in the `Enqueues` class — follow the existing pattern in `Enqueues::enqueueScripts()`

## React components via Groundwork

Groundwork components are not limited to vanilla JS. A common pattern is mounting React (or Preact) applications as Groundwork components — the component function receives the DOM element, creates a React root, and renders into it. This keeps the initialisation consistent (same `data-gw-*-init` attribute pattern for data passing) while allowing complex interactive UIs where needed.

When a project uses React via Groundwork, you'll typically find React component files alongside the Groundwork component that mounts them, e.g.:

```
assets/src/js/main/components/
  careers/             ← React component tree
    CareersBlock.tsx
    JobCard.tsx
  careers.ts           ← Groundwork component that mounts CareersBlock
```
