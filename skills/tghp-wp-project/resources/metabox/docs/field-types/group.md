# MB Group

**MB Group** helps you to organize custom fields into repeatable and collapsible groups. You can use this extension to group related fields into one group to create hierarchy. You can clone the whole group, or sub-group. There's no limitation on the nesting level.

## Tutorial[​](#tutorial "Direct link to Tutorial")

If this is your first time using [MB Group](https://docs.metabox.io/extensions/meta-box-group/extensions/meta-box-group/), start with this beginner-friendly guide:

👉 [How to Create a Group of Custom Fields with MB Group](https://metabox.io/create-group-of-custom-fields-with-meta-box-group/)

The rest of this page is a detailed reference. Feel free to come back whenever you need to check specific settings or examples.

## Settings[​](#settings "Direct link to Settings")

MB Group introduces a new field type: `group`. Here are its available settings:

| Name           | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| name           | Field label. Works like other fields. Optional.                             |
| id             | Field ID, used to store the group's values (including all sub-fields).      |
| type           | Must be set to group.                                                       |
| fields         | An array of sub-fields. Each sub-field is declared like a normal field.     |
| clone          | Makes the group clonable (repeater).                                        |
| sort\_clone    | Allows drag-and-drop reordering of clones. true or false.                   |
| collapsible    | Makes the group collapsible. true or false (default false). Optional.       |
| save\_state    | Save the collapse/expand state? true or false (default false). Optional.    |
| default\_state | Default state when the page loads: collapsed or expanded (default).         |
| group\_title   | Title of collapsible groups. See [Collapsible Groups](#collapsible-groups). |

### Example: Simple group with sub-fields[​](#example-simple-group-with-sub-fields "Direct link to Example: Simple group with sub-fields")

To add a group, create a field with `type => group` and list its sub-fields inside the `fields` parameter:

```
add_filter( 'rwmb_meta_boxes', function ( $meta_boxes ) {
    $meta_boxes[] = [
        'title'  => 'Album Tracks',
        'fields' => [
            [
                'id'         => 'standard',
                'type'       => 'group',  // Group!
                'clone'      => true,     // Clone whole group?
                'sort_clone' => true,     // Drag and drop clones to reorder them?

                // List of sub-fields.
                'fields'     => [
                    [
                        'name' => 'Track name',
                        'id'   => 'text',
                    ],
                    [
                        'name' => 'Release Date',
                        'id'   => 'date',
                        'type' => 'date',
                    ],
                    [
                        'name'    => 'Genre',
                        'id'      => 'genre',
                        'type'    => 'select_advanced',
                        'options' => [
                            'pop'  => 'Pop',
                            'rock' => 'Rock',
                        ],
                    ],
                ],
            ],
        ],
    ];
    return $meta_boxes;
} );

```

Here's how it looks:

### Nested groups[​](#nested-groups "Direct link to Nested groups")

You can even put a group **inside another group**, creating multi-level nested structures:

```
add_filter( 'rwmb_meta_boxes', function ( $meta_boxes ) {
    $meta_boxes[] = [
        'title'  => 'Multi-level nested groups',
        'fields' => [
            [
                'id'     => 'group',
                'type'   => 'group',
                'fields' => [
                    [
                        'name' => 'Text',
                        'id'   => 'text',
                    ],
                    [
                        'name'   => 'Sub group',
                        'id'     => 'sub_group',
                        'type'   => 'group',
                        'fields' => [
                            // Normal field (cloned)
                            [
                                'name'  => 'Sub text',
                                'id'    => 'sub_text',
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ];
    return $meta_boxes;
} );

```

✅ MB Group supports **unlimited nesting levels**.

### Collapsible groups[​](#collapsible-groups "Direct link to Collapsible groups")

Want to make your groups collapsible? Just set:

```
'collapsible' => true

```

Collapsible groups support extra settings:

| Name           | Description                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| save\_state    | Save the expanded/collapsed state? true or false. Default false.                     |
| default\_state | Default state when the page loads: collapsed or expanded (default).                  |
| group\_title   | Title of each group item. Can include static text, clone index, or sub-field values. |

#### Dynamic group titles[​](#dynamic-group-titles "Direct link to Dynamic group titles")

You can mix static text, clone index, and sub-field values in the `group_title`:

```
'group_title' => 'Branch {#}: {sub_field_1} - {sub_field_2}',

```

* `{#}` → group index (if clonable).
* `{sub_field_id}` → value of a sub-field.
* Combine as many as you need.

#### Example: Collapsible group with nested groups[​](#example-collapsible-group-with-nested-groups "Direct link to Example: Collapsible group with nested groups")

```
add_filter( 'rwmb_meta_boxes', function ( $meta_boxes ) {
    $meta_boxes[] = [
        'title'  => 'Company Branches',
        'fields' => [
            [
                'id'          => 'g1',
                'name'        => 'Branches',
                'type'        => 'group',
                'clone'       => true,
                'collapsible' => true,
                'group_title' => '{name}', // ID of the subfield

                'fields' => [
                    [
                        'name' => 'Name',
                        'id'   => 'name',
                    ],
                    [
                        'name' => 'Address',
                        'id'   => 'address',
                    ],
                    [
                        'id'          => 'contacts',
                        'type'        => 'group',
                        'clone'       => true,
                        'collapsible' => true,
                        'group_title' => '{person}',
                        'fields'      => [
                            [
                                'id'   => 'person',
                                'name' => 'Person',
                            ],
                            [
                                'id'   => 'phone',
                                'name' => 'Phone',
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ];

    return $meta_boxes;
} );

```

## Data storage[​](#data-storage "Direct link to Data storage")

* Group values are saved as an array of sub-field values (including nested groups).
* Data is stored in the database as a serialized array.
* Sub-field data is saved "as is" (no extra sanitizing or transformation).

warning

It's important to understand that when a field is placed inside a **group**, **its value is saved exactly as it is**. The plugin **does not apply any sanitization or transformation** when saving or retrieving field values. This behavior helps avoid heavy processing, especially when working with complex structures or deeply nested groups.

Example:

If you add a `date` field inside a group and set a `save_format` that differs from the display format, the `save_format` will **not** be applied. In this case, the saved value will always match the **displayed value** \- no formatting changes are made during saving.

## Getting sub-field values[​](#getting-sub-field-values "Direct link to Getting sub-field values")

To retrieve group data, use `rwmb_meta()`:

```
$group_value = rwmb_meta( 'group_id' ) ?: [];

```

This returns an associative array of sub-field IDs and values:

```
[
    'sub_field_1' => 'value 1',
    'sub_field_2' => 'value 2',
]

```

To access a sub-field:

```
$value = $group_value['sub_field_1'] ?? '';
echo $value;

```

If the group is cloneable, `rwmb_meta()` returns an array of groups, like this:

```
[
    [ 'sub_field_1' => 'value 1', 'sub_field_2' => 'value 2' ],
    [ 'sub_field_1' => 'value 3', 'sub_field_2' => 'value 4' ],
]

```

Loop through them:

```
$groups = rwmb_meta( 'group_id' ) ?: [];
foreach ( $groups as $group ) {
    echo $group['sub_field_1'] ?? '';
}

```

### Example: Contacts group[​](#example-contacts-group "Direct link to Example: Contacts group")

Registering a group of contacts:

```
add_filter( 'rwmb_meta_boxes', function ( $meta_boxes ) {
    $meta_boxes[] = [
        'title'  => 'Contacts',
        'fields' => [
            [
                'id'     => 'contacts',
                'type'   => 'group',
                'clone'  => true,
                'fields' => [
                    [ 'id' => 'name',  'name' => 'Name' ],
                    [ 'id' => 'email', 'name' => 'Email' ],
                    [ 'id' => 'phone', 'name' => 'Phone' ],
                ],
            ],
        ],
    ];
    return $meta_boxes;
} );

```

Displaying contacts in `single.php`:

```
$contacts = rwmb_meta( 'contacts' ) ?: [];
foreach ( $contacts as $contact ) {
    echo '<div class="contact">';
    echo '<h4>Contact info</h4>';
    echo '<p><strong>Name:</strong> ' . $contact['name'] . '</p>';
    echo '<p><strong>Email:</strong> ' . $contact['email'] . '</p>';
    echo '<p><strong>Phone:</strong> ' . $contact['phone'] . '</p>';
    echo '</div>';
}

```

### Outputting groups with page builders[​](#outputting-groups-with-page-builders "Direct link to Outputting groups with page builders")

* ✅ Elementor and Oxygen: can output group sub-fields directly.
* ❌ Other builders (e.g., Beaver Builder, Divi): use an [MB View](https://docs.metabox.io/extensions/meta-box-group/extensions/mb-views/) or a shortcode

Example shortcode (group with `title`, `images`, and `desc`):

```
add_shortcode( 'my_group', function() {
    $group = rwmb_meta( 'group_field_id' );
    if ( empty( $group ) ) {
        return '';
    }

    $output = '';

    // Title
    $title = $group['title'] ?? '';
    $output .= $title ? '<h3>' . $title . '</h3>' : '';

    // Images
    $image_ids = $group['images'] ?? [];
    if ( $image_ids ) {
        $output .= '<div class="images">';
        foreach ( $image_ids as $id ) {
            $image = RWMB_Image_Field::file_info( $id, ['size' => 'thumbnail'] );
            $output .= '<img src="' . $image['url'] . '">';
        }
        $output .= '</div>';
    }

    // Description
    $desc = $group['desc'] ?? '';
    $output .= $desc ? wpautop( $desc ) : '';

    return $output;
} );

```

Usage: Add `[my_group]` into your post/page content or page builder module.

### Sub-field values[​](#sub-field-values "Direct link to Sub-field values")

`rwmb_meta()` returns **raw values** for sub-fields. It does not format them like it does for individual fields.

| Field type           | Value                     |
| -------------------- | ------------------------- |
| taxonomy, user, post | Object ID(s)              |
| File & image fields  | Attachment ID(s)          |
| map, osm             | "latitude,longitude,zoom" |
| oembed               | URL                       |
| wysiwyg              | Raw content (no <p></p>)  |

Example: getting image info from sub-fields:

```
$group = rwmb_meta( 'group_id' );
$image_ids = $group['image_key'] ?? [];
foreach ( $image_ids as $id ) {
    $image = RWMB_Image_Field::file_info( $id, ['size' => 'thumbnail'] );
    echo '<img src="' . $image['url'] . '">';
}

```

These are some helper functions that you can use to retrieve more info:

| Field type                                           | Helper function(s)                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| image, image\_advanced, image\_upload, single\_image | [wp\_get\_attachment\_image\_src()](https://developer.wordpress.org/reference/functions/wp%5Fget%5Fattachment%5Fimage%5Fsrc/) |
| \-                                                   | [wp\_get\_attachment\_image\_url()](https://developer.wordpress.org/reference/functions/wp%5Fget%5Fattachment%5Fimage%5Furl/) |
| \-                                                   | RWMB\_Image\_Field::file\_info( $image\_id, $args ); (where $args is an array and accepts only size attribute)                |
| file, file\_advanced, file\_upload                   | [get\_attached\_file()](https://developer.wordpress.org/reference/functions/get%5Fattached%5Ffile/)                           |
| \-                                                   | RWMB\_File\_Field::file\_info( $image\_id );                                                                                  |
| oembed                                               | RWMB\_OEmbed\_Field::get\_embed( $url );                                                                                      |
| taxonomy, taxonomy\_advanced                         | [get\_term()](https://developer.wordpress.org/reference/functions/get%5Fterm/)                                                |
| user                                                 | [get\_userdata()](https://developer.wordpress.org/reference/functions/get%5Fuserdata/)                                        |
| post                                                 | [get\_post()](https://developer.wordpress.org/reference/functions/get%5Fpost/)                                                |
| wysiwyg                                              | [wpautop()](https://developer.wordpress.org/reference/functions/wpautop/)                                                     |

Read more on [how field values are saved into the database](https://docs.metabox.io/extensions/meta-box-group/database/).

## Setting default values[​](#setting-default-values "Direct link to Setting default values")

There are 2 ways to set default values:

* Per sub-field → using `std` on each field.
* Whole group → using `std` on the group.

### Per sub-field[​](#per-sub-field "Direct link to Per sub-field")

```
add_filter( 'rwmb_meta_boxes', function( $meta_boxes ) {
	$meta_boxes[] = [
		'title' => 'Test Group Default Value',
		'fields' => [
			[
				'type' => 'group',
				'id'   => 'group',
				'fields' => [
					[
						'id'   => 'name',
						'name' => 'Name',
						'std'  => 'My Name',
					],
					[
						'type' => 'email',
						'id'   => 'email',
						'name' => 'Email',
						'std'  => 'myemail@domain.com',
					],
				],
			]
		],
	];
	return $meta_boxes;
} );

```

Result:

### Whole group[​](#whole-group "Direct link to Whole group")

Instead of setting `std` for each field, define an array for the group:

```
add_filter( 'rwmb_meta_boxes', function( $meta_boxes ) {
	$meta_boxes[] = [
		'title' => 'Test Meta Box',
		'fields' => [
			[
				'type' => 'group',
				'id'   => 'group',
				'fields' => [
					[
						'id'   => 'name',
						'name' => 'Name',
					],
					[
						'type' => 'email',
						'id'   => 'email',
						'name' => 'Email',
					],
				],

				'std' => [
					'name'  => 'My name',
					'email' => 'myemail@domain.com',
				],
			]
		],
	];
	return $meta_boxes;
} );

```

If the group is **cloneable**, `std` should be an array of group values:

```
'std' => [
    [ 'name' => 'Name 1', 'email' => 'email1@domain.com' ],
    [ 'name' => 'Name 2', 'email' => 'email2@domain.com' ],
],

```

And here is the result:

See this video for demonstration:

## Changing clone button text[​](#changing-clone-button-text "Direct link to Changing clone button text")

Change the button label with `add_button`:

```
[
	'type'       => 'group',
	'name'       => 'Tracks',
	'id'         => 'tracks',
	'add_button' => 'Add another track',
	'fields'     => [
		// Sub-fields here.
	],
],

```

## Clone default values[​](#clone-default-values "Direct link to Clone default values")

When cloning a group:

* If the group has `'clone_default' => true`, all sub-fields will use their default values.
* If a sub-field is cloneable, its own `clone_default` takes priority.

Learn more: [clone\_default parameter](https://docs.metabox.io/extensions/meta-box-group/cloning-fields/)

## Changing group titles with JavaScript[​](#changing-group-titles-with-javascript "Direct link to Changing group titles with JavaScript")

You can filter group titles with JavaScript:

```
jQuery( function() {
    // Change "myVendor/myPlugin" to your unique namespace
    rwmb.hooks.addFilter( 'group.title', 'myVendor/myPlugin', function( title ) {
        // Change the title and return the value here.
        return title + ' Some random string';
    } );
} );

```

## Known issues[​](#known-issues "Direct link to Known issues")

* When cloning nested groups, input `id` attributes may change in unpredictable ways. Avoid relying on them in custom JavaScript.
* For `wysiwyg` fields inside cloneable groups, **don't end the field ID with `_{number}`** (like `_12`). This pattern is reserved by the clone script. Use another format instead.
