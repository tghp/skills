# Preact Components via Groundwork

For interactive UIs that need Preact, mount the Preact application as a Groundwork component. This keeps initialisation consistent — the same `data-gw-*-init` attribute pattern handles data passing from PHP to Preact, and the component lifecycle is managed by Groundwork.

## File structure

A Preact feature has two files: a Groundwork wrapper (`.ts`) and the Preact component tree (`.tsx`):

```
assets/src/js/main/components/
  term-list/            <- Preact component tree
    TermList.tsx
  term-list.ts          <- Groundwork wrapper that mounts TermList
```

## The Groundwork wrapper

The wrapper is a standard Groundwork `ComponentFunction` that renders a Preact component into the element:

```typescript
// term-list.ts
import { ComponentFunction } from '@tghp/groundwork.js';
import { h, render } from 'preact';
import TermList from './term-list/TermList';

type TermListArgs = {
  taxonomySlug: string;
  apiBase: string;
};

const termListComponent: ComponentFunction<HTMLDivElement, TermListArgs> = (
  elem,
  args
) => {
  render(h(TermList, args), elem);
};

export default termListComponent;
```

## The Preact component

A standard Preact component — receives props from the Groundwork wrapper:

```tsx
// term-list/TermList.tsx
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

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

Key differences from React:
- Import `h` from `preact` (the JSX factory) and `render` for mounting
- Hooks come from `preact/hooks`, not `react`
- Mounting uses `render(vnode, container)` instead of `createRoot(container).render(vnode)`

## Registration and PHP integration

Register the wrapper in your entry point like any other Groundwork component:

```typescript
import termListComponent from './main/components/term-list';
groundworkMain.components.add('term-list', termListComponent);
```

In PHP, pass data via `data-gw-{namespace}-init` as usual:

```php
<?php
$args = [
  'term-list' => [
    'taxonomySlug' => 'content_area',
    'apiBase' => rest_url('<name>/v1'),
  ],
];
?>
<div data-gw-main-init='<?= esc_attr(json_encode($args)) ?>'></div>
```

The Preact component receives `taxonomySlug` and `apiBase` as props — the PHP->JS boundary is the same `data-gw-*-init` pattern used for vanilla components.
