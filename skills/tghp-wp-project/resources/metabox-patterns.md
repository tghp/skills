# Meta Box Patterns in This Project

The Meta Box docs describe field groups as arrays passed to the `rwmb_meta_boxes` filter. In this project you never write that filter directly — the definer pattern handles it. But the array structure inside `define()` is identical to what the docs describe, so use the Meta Box docs (`resources/metabox/index.md`) as your reference for field types, settings, and options.

There are three patterns:

## Field groups (the most common)

For adding custom fields to posts, pages, or specific templates. Create a class in `inc/Metaboxio/Metabox/` extending `AbstractMetabox` and implementing `MetaboxDefinerInterface`. The `define()` method returns an array of field group arrays — the same structure the Meta Box docs describe.

```php
namespace TGHP\<Name>\Metaboxio\Metabox;

use TGHP\<Name>\Metaboxio\Metabox;

class EventFields extends AbstractMetabox implements MetaboxDefinerInterface
{
    public function define(): array
    {
        $metaBoxes[] = [
            'id' => Metabox::generateKey('event_details'),
            'title' => 'Event Details',
            'post_types' => ['event'],
            'revision' => true,
            'fields' => [
                [
                    'id' => Metabox::generateKey('event_date'),
                    'name' => 'Date & Time',
                    'type' => 'datetime',
                ],
                [
                    'id' => Metabox::generateKey('event_location'),
                    'name' => 'Location',
                    'type' => 'text',
                ],
                [
                    'id' => Metabox::generateKey('event_description'),
                    'name' => 'Description',
                    'type' => 'wysiwyg',
                    'options' => [
                        'tinymce' => [...$this->getStrippedTinymceConfig()],
                    ],
                ],
                [
                    'id' => Metabox::generateKey('event_image'),
                    'name' => 'Featured Image',
                    'type' => 'single_image',
                ],
                [
                    'id' => Metabox::generateKey('event_ticket_url'),
                    'name' => 'Ticket URL',
                    'type' => 'url',
                ],
            ],
        ];

        return $metaBoxes;
    }
}
```

Then add it to `Metabox::_getDefiners()`. Use `Metabox::generateKey()` for all field IDs to apply the project prefix.

To target fields to specific page templates, use `include`:
```php
'post_types' => ['page'],
'include' => [
    'template' => ['template-about.php'],
],
```

### Per-field `class` lands on the wrapper, not the input

The Meta Box per-field `class` arg adds the class to the field's `.rwmb-field` wrapper `<div>` — not the `<input>`/`<textarea>`. Target it with `.rwmb-field.your-class` (no `:has()` needed). The docs say "customize the field" without disambiguating; if you reach for `:has()` to traverse from input up to wrapper, the assumption is wrong and the selector silently matches nothing.

### Gating a metabox on arbitrary runtime state (e.g. `post_status`)

`include`/`exclude` has no built-in rule for post status, post meta, or any other runtime check — but the `custom` key accepts a callable that receives the metabox array and returns `bool`. Return `true` to show it. This is how you gate a metabox on anything not covered by the built-in rules.

```php
public function define(): array
{
    $onlyPublished = [
        'custom' => [$this, 'currentPostIsPublished'],
    ];

    $metaBoxes[] = [
        'id' => Metabox::generateKey('event_salesforce'),
        'title' => 'Salesforce',
        'post_types' => ['event'],
        'include' => $onlyPublished,
        'fields' => [
            // ...
        ],
    ];

    return $metaBoxes;
}

public function currentPostIsPublished(array $metaBox): bool
{
    $editPostId = (int) ($_GET['post'] ?? 0);
    if (!$editPostId) {
        return false;
    }

    $post = get_post($editPostId);
    return $post instanceof \WP_Post && $post->post_status === 'publish';
}
```

Resolve the edited post via `$_GET['post']` rather than `get_post()` — the include/exclude filter runs during metabox registration, before the global `$post` is always set. Return `false` on the new-post screen and anywhere the post can't be resolved, so the metabox stays hidden until it's editing a real row.

Callable forms accepted by `custom`: a function name string, `[$this, 'method']`, or `['ClassName', 'staticMethod']`. Combine with other rules using `relation => 'AND'` if you need both built-in and custom checks to pass.

## Settings pages

For site-wide options (social links, contact info, etc.). The class implements both `MetaboxPreparerInterface` (to register the settings page) and `MetaboxDefinerInterface` (to define fields on it).

`prepare()` registers the page via the `mb_settings_pages` filter. `define()` returns field groups that target the page by its ID. Note that settings page fields do NOT use `Metabox::generateKey()` — they are stored without the prefix.

```php
namespace TGHP\<Name>\Metaboxio\Metabox;

class Settings extends AbstractMetabox implements MetaboxPreparerInterface, MetaboxDefinerInterface
{
    public function prepare(): void
    {
        add_filter('mb_settings_pages', [$this, 'register']);
    }

    public function register($settingsPages)
    {
        $settingsPages[] = [
            'id' => 'site-options',
            'menu_title' => 'Site Options',
            'option_name' => 'site_options',
            'submenu_title' => 'Options',
            'tab_style' => 'left',
            'submit_button' => 'Save Options',
            'columns' => 1,
            'tabs' => [
                'general' => 'General',
                'social' => 'Social Media',
            ],
        ];

        return $settingsPages;
    }

    public function define(): array
    {
        $metaboxes[] = [
            'id' => 'settings_general',
            'title' => 'General',
            'settings_pages' => 'site-options',
            'tab' => 'general',
            'fields' => [
                [
                    'name' => 'Phone',
                    'id' => 'phone',
                    'type' => 'text',
                ],
                [
                    'name' => 'Email',
                    'id' => 'email',
                    'type' => 'email',
                ],
                [
                    'name' => 'Address',
                    'id' => 'address',
                    'type' => 'textarea',
                ],
            ],
        ];

        $metaboxes[] = [
            'id' => 'settings_social',
            'title' => 'Social Media',
            'settings_pages' => 'site-options',
            'tab' => 'social',
            'fields' => [
                [
                    'name' => 'Twitter URL',
                    'id' => 'twitter_url',
                    'type' => 'url',
                ],
                [
                    'name' => 'LinkedIn URL',
                    'id' => 'linkedin_url',
                    'type' => 'url',
                ],
            ],
        ];

        return $metaboxes;
    }
}
```

Access settings page values with `_MB()->getSingleMetafieldValueFromOptions('field_id')` (no prefix).

## Gutenberg blocks

For the full guide to creating Gutenberg blocks — including the definer class, block templates, shared partials, block SCSS, and Data classes — read `resources/blocks-guide.md`. It covers the end-to-end process.
