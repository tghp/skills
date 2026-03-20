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

## Multiple namespaces

A project may have multiple Groundwork instances with different namespaces for separate JS bundles. For example, a `'main'` namespace for core functionality and a `'graphic'` namespace for a Three.js-based bundle. Each namespace uses its own data attribute prefix (`data-gw-main-init` vs `data-gw-graphic-init`).

Adding a new Groundwork namespace requires:
1. A new JS entry point in `assets/src/js/` creating the Groundwork instance
2. A corresponding enqueue in the `Enqueues` class — follow the existing pattern in `Enqueues::enqueueScripts()`

## React components via Groundwork

For interactive UIs that need React, mount the React application as a Groundwork component. This keeps initialisation consistent — the same `data-gw-*-init` attribute pattern handles data passing from PHP to React, and the component lifecycle is managed by Groundwork.

### File structure

A React feature has two files: a Groundwork wrapper (`.ts`) and the React component tree (`.tsx`):

```
assets/src/js/main/components/
  term-list/            ← React component tree
    TermList.tsx
  term-list.ts          ← Groundwork wrapper that mounts TermList
```

### The Groundwork wrapper

The wrapper is a standard Groundwork `ComponentFunction` that creates a React root and renders into the element:

```typescript
// term-list.ts
import { ComponentFunction } from '@tghp/groundwork.js';
import { createRoot } from 'react-dom/client';
import TermList from './term-list/TermList';

type TermListArgs = {
  taxonomySlug: string;
  apiBase: string;
};

const termListComponent: ComponentFunction<HTMLDivElement, TermListArgs> = (
  elem,
  args
) => {
  const root = createRoot(elem);
  root.render(<TermList {...args} />);
};

export default termListComponent;
```

### The React component

A standard React component — receives props from the Groundwork wrapper:

```tsx
// term-list/TermList.tsx
import { useState, useEffect } from 'react';

type Term = {
  id: number;
  name: string;
  slug: string;
};

type TermListProps = {
  taxonomySlug: string;
  apiBase: string;
};

const TermList = ({ taxonomySlug, apiBase }: TermListProps) => {
  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    fetch(`${apiBase}/taxonomy-terms/${taxonomySlug}`)
      .then((res) => res.json())
      .then((data) => setTerms(data.terms));
  }, [taxonomySlug, apiBase]);

  return (
    <ul>
      {terms.map((term) => (
        <li key={term.id}>{term.name}</li>
      ))}
    </ul>
  );
};

export default TermList;
```

### Registration and PHP integration

Register the wrapper in `main.ts` like any other Groundwork component:

```typescript
import termListComponent from './main/components/term-list';
groundworkMain.components.add('term-list', termListComponent);
```

In PHP, pass data via `data-gw-main-init` as usual:

```php
<?php
$args = [
  'term-list' => [
    'taxonomySlug' => 'content_area',
    'apiBase' => rest_url('referenceproject/v1'),
  ],
];
?>
<div data-gw-main-init='<?= esc_attr(json_encode($args)) ?>'></div>
```

The React component receives `taxonomySlug` and `apiBase` as props — the PHP→JS boundary is the same `data-gw-*-init` pattern used for vanilla components.
