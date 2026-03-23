# The Definer Pattern

The definer pattern is the primary mechanism for declaratively registering WordPress entities (post types, taxonomies, metabox field groups, blocks, forms, API routes). Rather than scattering `register_post_type()` calls across the codebase, each entity is encapsulated in a definer class.

## How it works

`AbstractDefines` is the base class for all definer managers (`PostType`, `Taxonomy`, and the Metaboxio classes). On `init` (priority 1), `processDefiners()` iterates over definer instances returned by `_getDefiners()`, validates they implement `DefinerInterface`, and calls `_processDefiner()` on each. The manager then handles the actual WordPress registration at the appropriate hook.

External code can add definers via filters:

- `tghp_add_definers` — global, applies to all definer managers
- `tghp_add_definers_{classname}` — scoped to a specific manager (lowercased FQCN)

## Interfaces and abstract base classes

All definers implement `DefinerInterface` which requires a single `define(): array` method. Specialised interfaces extend it, and each has a corresponding abstract base class that handles boilerplate:

| Interface                  | Abstract base class  | Key properties / methods                                           | Used by             |
| -------------------------- | -------------------- | ------------------------------------------------------------------ | ------------------- |
| `PostTypeDefinerInterface` | `AbstractPostType`   | `$postTypeCode`, `$disableGutenberg`                               | `PostType`          |
| `TaxonomyDefinerInterface` | `AbstractTaxonomy`   | `$taxonomyCode`, `$postTypeCode`                                   | `Taxonomy`          |
| `MetaboxDefinerInterface`  | `AbstractMetabox`    | `getStrippedTinymceConfig()`                                       | `Metaboxio\Metabox` |
| `BlockDefinerInterface`    | `AbstractBlock`      | Auto-derives `getCode()`, `getId()`, `render()` from class name    | `Metaboxio\Block`   |
| `FormDefinerInterface`     | (none)               | `getName()`, `define()`                                            | `Metaboxio\Form`    |

Always extend the abstract base class rather than implementing the raw interface — the base class handles registration boilerplate and provides sensible defaults. You only need to set the required properties and override `define()`.

Post types and taxonomies use a `const` + property pattern: the constant (e.g. `POST_TYPE_CODE`) provides a static reference for use outside the class (e.g. `Event::POST_TYPE_CODE`), while the property satisfies the abstract base class. Always define both.

`Api` uses a similar definer-like pattern with `ApiDefinerInterface` (`getRoute()`, `getType()`, `handle($data)`) but manages its own definer array rather than extending `AbstractDefines`. Add API definers to `Api::getDefiners()`, not `_getDefiners()`.

## Adding a new definer

1. Create the definer class in the appropriate subdirectory (e.g. `inc/PostType/`)
2. Extend the abstract base class
3. Add an instance to the `_getDefiners()` array of the parent manager

### Example — registering a post type

File: `inc/PostType/Event.php`

```php
namespace TGHP\<Name>\PostType;

class Event extends AbstractPostType
{
    const POST_TYPE_CODE = 'event';
    protected $postTypeCode = self::POST_TYPE_CODE;

    public function define(): array
    {
        return [
            'label' => 'Events',
            'public' => true,
            'has_archive' => true,
            'supports' => ['title', 'editor', 'thumbnail'],
            'menu_icon' => 'dashicons-calendar-alt',
        ];
    }
}
```

Then in `PostType.php`, add it to `_getDefiners()`:

```php
protected function _getDefiners()
{
    return [
        new PostType\Event(),
    ];
}
```

### Example — registering a taxonomy

File: `inc/Taxonomy/EventCategory.php`

```php
namespace TGHP\<Name>\Taxonomy;

class EventCategory extends AbstractTaxonomy
{
    const TAXONOMY_CODE = 'event_category';
    protected $taxonomyCode = self::TAXONOMY_CODE;
    protected $postTypeCode = Event::POST_TYPE_CODE;

    public function define(): array
    {
        return [
            'label' => 'Event Categories',
            'hierarchical' => true,
            'show_in_rest' => true,
        ];
    }
}
```

Then in `Taxonomy.php`, add it to `_getDefiners()`.

### Example — registering an API endpoint

File: `inc/Api/SearchEndpoint.php`

```php
namespace TGHP\<Name>\Api;

class SearchEndpoint implements ApiDefinerInterface
{
    public function getRoute(): string
    {
        return '/search';
    }

    public function getType(): string
    {
        return 'GET';
    }

    public function handle($data): array
    {
        $query = sanitize_text_field($data['q'] ?? '');
        // ...
        return $results;
    }
}
```

Then in `Api.php`, add it to `getDefiners()` (note: `getDefiners()`, not `_getDefiners()`).

The same extend-and-override pattern applies to metabox field groups and blocks — for those, read `resources/metabox-patterns.md` and `resources/blocks-guide.md` respectively.

## Project-specific definer patterns

Some projects extend the definer pattern beyond the core set — for example, a project might have its own `CronDefinerInterface` for scheduled tasks or other domain-specific definer managers. If the project has a custom definer pattern for the type of entity you're registering, use it. If you're building something that feels like it fits the definer pattern (declarative registration of a repeating entity type) but no pattern exists for it yet, offer the definer approach as an option to the user.
