# MB Term Meta

MB Term Meta helps you to add custom fields to taxonomies.

## Settings[​](#settings "Direct link to Settings")

Creating custom meta boxes for taxonomies is similar to posts. The only difference is you need to specify `taxonomies` settings which the meta box will be added to:

```
add_filter( 'rwmb_meta_boxes', function ( $meta_boxes ) {
    $meta_boxes[] = [
        'title'      => 'Standard Fields',
        'taxonomies' => 'category', // List of taxonomies. Array or comma-separated string.

        'fields' => [
            [
                'name' => 'Featured?',
                'id'   => 'featured',
                'type' => 'checkbox',
            ],
            [
                'name' => 'Featured Content',
                'id'   => 'featured_content',
                'type' => 'wysiwyg',
            ],
            [
                'name' => 'Featured Image',
                'id'   => 'image_advanced',
                'type' => 'image_advanced',
            ],
            [
                'name' => 'Color',
                'id'   => 'color',
                'type' => 'color',
            ],
        ],
    ];
    return $meta_boxes;
} );

```

## Data[​](#data "Direct link to Data")

WordPress provides an identical way to store values in the meta tables for post / term / user. This extension utilizes that API and stores field value in the term meta exactly like post meta.

## Getting field value[​](#getting-field-value "Direct link to Getting field value")

You're able to use helper function [rwmb\_meta()](https://docs.metabox.io/extensions/mb-term-meta/functions/rwmb-meta/) to get field value for terms.

```
$term_id = get_queried_object_id();
$value = rwmb_meta( $field_id, ['object_type' => 'term'], $term_id );
echo $value;

```

info

* In the 2nd parameter, you need to pass `'object_type' => 'term'`, and
* The last parameter is the term ID. To get the ID of the the current category/term page, please use the function `get_queried_object_id()`.

Other parameters are the same as for post. Please see [this documentation](https://docs.metabox.io/extensions/mb-term-meta/displaying-fields-with-code/) for details.

warning

It requires the extension version 1.1+ to use the helper function. If you're using an older version, please [update now](https://docs.metabox.io/extensions/mb-term-meta/updates/).

## FAQ[​](#faq "Direct link to FAQ")

How to output term meta in MB Views?

Please use this code to output term meta in a view

`{% set custom_field = mb.rwmb_meta( 'field_id', { object_type: 'term' }, term_id ) %} {{ custom_field }}`

[\# Link to this question](#how-to-output-term-meta-in-mb-views)
