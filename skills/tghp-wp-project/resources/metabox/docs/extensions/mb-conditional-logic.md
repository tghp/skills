# MB Conditional Logic

**MB Conditional Logic** helps you to show or hide meta boxes, custom fields or any elements based on other fields' values.

Watch

You can also combine conditions. It works not only for meta boxes or custom fields, but also other HTML elements.

## Getting started[​](#getting-started "Direct link to Getting started")

### With UI[​](#with-ui "Direct link to With UI")

If you are using [MB Builder](https://docs.metabox.io/extensions/meta-box-conditional-logic/extensions/meta-box-builder/) (which is included in [Meta Box Lite](https://metabox.io/lite/) or [Meta Box AIO](https://metabox.io/pricing/)), you can set conditional logic for a specific field by clicking the plus in the **Conditional Logic** section:

In this section, you can choose to show or hide a field when all or any conditions match. For each rule, you need to select or enter a dependency field ID, the operator and enter the field value. The dependency field ID is auto-suggested from the list of current fields and you can add as many rules as you want:

Using MB Builder is intuitive and self-explained.

For advanced usage (like with custom conditions or using outside field groups), please use code which are explained in detailed below.

### With code[​](#with-code "Direct link to With code")

In case you use code to register meta boxes, you need to add an extra parameter `visible` or `hide` to a field (or a meta box if you want to hide the whole meta box) to set the conditional logic for it.

For example, Tthe code below registers a meta box that is **hidden when the post format is "aside"**. The meta box also have 2 custom fields: Brand and Product. **The Product field will be hidden if user select a brand that's not "Apple"**.

```
add_filter( 'rwmb_meta_boxes', function( $meta_boxes ) {
	$meta_boxes[] = [
		'title' => 'Brands and Products',

		// Hide this meta box when post format is aside
		'hidden' => [ 'post_format', 'aside' ],

		'fields' => [
			[
				'id'      => 'brand',
				'name'    => 'Brand',
				'type'    => 'select',
				'options' => [
					'Apple'  => 'Apple',
					'Google' => 'Google',
				],
			],
			[
				'id'      => 'apple_products',
				'name'    => 'Which Apple product that you love?',
				'type'    => 'radio',
				'options' => [
					'iPhone' => 'iPhone',
					'iPad'   => 'iPad',
				],

				// Hide this field when user selected a brand that's not 'Apple'
				'hidden' => [ 'brand', '!=', 'Apple' ]
			],
		],
	];

	return $meta_boxes;
} );

```

## Syntax[​](#syntax "Direct link to Syntax")

To make a meta box or a field visible/hidden, please add a setting for the meta box or the field with the following syntax:

```
// Condition to show.
'visible' => [ 'field', 'operator', 'value' ],

// Condition to hide
'hidden' => [ 'field', 'operator', 'value' ],

```

| Name     | Description                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| field    | Meta Box field ID or ID of a DOM element to compare.                                                                                                                                            |
| operator | Comparison operators: \=, \>=, <=, \>, <, !=, in, contains, between, starts with, ends with, match. All of them can combine with not operator to become negate operator. Default: \=. Optional. |
| value    | Value to compare with.                                                                                                                                                                          |

info

You can bypass `operator` if it's `=`, which is the default value. So you can write:

```
'visible' => [ 'field', 'value' ],
// or
'hidden' => [ 'field', 'value' ],

```

The normal operators like `=`, `!=`, etc. are pretty clear. Let's see the advanced operators like `contains`, `starts with`, etc.

## Advanced Operators[​](#advanced-operators "Direct link to Advanced Operators")

### `contains`[​](#contains "Direct link to contains")

The operator `contains` can check if **a field value contains another string or value**:

```
'visible' => ['brand', 'contains', 'pp'] // Apple, App, ...

```

In case a field has multiple value (checkbox list, select multiple...), this operator checks **if the field value (which is an array) contains a value**:

```
'visible' => ['brand', 'contains', 'Apple'];

```

It also works with `taxonomy_advanced` field. In this case, please **set the value to the term ID**. For example, if you need to check if a taxonomy advanced field has a value:

```
'visible' => ['product_type', 'contains', 4]; // 4 is a term ID.

```

### `in`[​](#in "Direct link to in")

This operator is used to check if **a field value is in an array of specific values**:

```
'visible' => ['brand', 'in', ['Apple', 'Samsung']];

```

In case a field has multiple value (checkbox list, select multiple...), this operator checks if **any of the field value is in the specified array**. For example, if the `brand` field above is a `checkbox_list` field, then it will be visible if users select any of the value "Apple" or "Samsung":

```
'visible' => ['brand', 'in', ['Apple', 'Samsung']];

```

If you use with a `taxonomy_advanced` field, please **set the value to the term IDs**:

```
'visible' => ['product_type', 'in', [2, 4]]; // The field will be visible if the product type has any term with ID 2 or 4.

```

### `between`[​](#between "Direct link to between")

This operator check if the field value is between minimum and maximum values.

Let say that we have a date field `released_date` and we want to show another field only when `released_date` is between "2015-06-01" and "2015-12-01":

```
'visible' => [ 'released_date', 'between', [ '2015-06-01', '2015-12-01' ] ]

```

Please note that the `between` operator does not only compare numeric fields but also date and time fields.

### `starts with`[​](#starts-with "Direct link to starts-with")

This operator checks if field value starts with a string:

```
'visible' => [ 'brand', 'starts with', 'App' ] // Apple, App

```

### `ends with`[​](#ends-with "Direct link to ends-with")

This operator checks if field value ends with a string:

```
'visible' => [ 'brand', 'ends with', 'le' ] // Apple, Google

```

### `match`[​](#match "Direct link to match")

This operator checks if field value matches a regular expression:

```
'visible' => [ 'brand', 'match', '[a-z]$' ],

```

### `not`[​](#not "Direct link to not")

We can combine `not` operator with other operators to negative the meaning of them. So we'll have `not contains`, `not in`, `not match`, `not starts with`, `not ends with`, `not between`.

## Multiple conditions[​](#multiple-conditions "Direct link to Multiple conditions")

Sometimes, you'll need to use more than one conditional logic. To do that, you can define multiple conditions to show or hide a meta box or a custom field. For example:

```
// Visible when 'brand' is 'Apple' AND 'released_year' is between 2010 and 2015
'visible' => [
    [ 'brand', 'Apple' ],
    [ 'released_year', 'between', [ 2010, 2015 ] ],
],

```

By default, if you define compound statement, the logic will correct if **ALL** of them are correct. In case you want to visible a field if **ONE** of them is correct, move all statements to `when` key and put new `relation` key like this example:

```
// Visible when 'brand' is 'Apple' OR 'released_year' is between 2010 and 2015
'visible' => [
    'when' => [
         [ 'brand', 'Apple' ],
         [ 'released_year', 'between', [ 2010, 2015 ] ],
     ],
     'relation' => 'or'
],

```

## Special values[​](#special-values "Direct link to Special values")

This section shows you how to specify the `value` in the conditions for some specific fields.

### Checkbox field[​](#checkbox-field "Direct link to Checkbox field")

For checkboxes, use `0` or `false` if it's not checked, `1` or `true` if it's checked.

```
'visible' => [ 'checkbox_field', true ], // Visible if checkbox_field is checked

```

### Media fields[​](#media-fields "Direct link to Media fields")

For media fields that use WordPress media popup to handle upload like `file_advanced`, `image_advanced`, the extension checks **number of uploaded files** instead of their values.

This example shows or hides a field depends on there's a file uploaded:

```
// Visible when file_advanced field is has file
'visible' => [ 'file_advanced', '>', 0 ],

// Or hidden if image_advanced doesn't contains anything
'hidden' => [ 'image_advanced', 0 ],

```

## Toggle by other elements[​](#toggle-by-other-elements "Direct link to Toggle by other elements")

MB Conditional Logic can work with other HTML elements the same as Meta Box fields. With this feature, you can show or hide any meta box or field based on post types, page parent, post ID, categories...

To make it work with HTML element, instead of passing the field ID as the first parameter, please pass the **element's ID**.

Here are the list of available built-in WordPress elements:

| Param          | Description    |
| -------------- | -------------- |
| post\_ID       | Post ID        |
| page\_template | Page template  |
| parent\_id     | Parent post ID |
| post\_format   | Post format    |

Examples:

Display a meta box (or a field) if page template is `template-custom.php`:

```
'visible' => [ 'page_template', 'template-custom.php' ],

```

### Featured image[​](#featured-image "Direct link to Featured image")

Featured image is a special HTML element. It has the field name/ID `_thumbnail_id` and when empty, WordPress sets the value to `-1`. The plugin can detect changes for featured image and let you define conditions with it.

Examples:

Make a field visible if no featured image:

```
'visible' => [ '_thumbnail_id', '=', '-1' ],

```

Make a field visible if featured image is set:

```
'visible' => [ '_thumbnail_id', '!=', '-1' ],

```

Or make a field visible only if featured image is a specific image with ID `123`:

```
'visible' => [ '_thumbnail_id', '=', '123' ],

```

## Using outside field groups[​](#using-outside-field-groups "Direct link to Using outside field groups")

The extension can even work with elements outside field groups. Let's say you want to hide an element `.custom-div` when a field with ID `brand` is `Microsoft`, then you can do that with the following code:

```
add_filter( 'rwmb_outside_conditions', function( $conditions ) {
    $conditions['.custom-div'] = [
        'hidden' => ['brand', 'Microsoft'],
        // or you can write this for clarity
        'hidden' => ['#brand', 'Microsoft'],
	];
    return $conditions;
} );

```

Note that the `.custom-div` can be any CSS selector, like `#custom-id` or `.my-class .children`.

If you want to hide an element `.custom-div` based on a value of an input, which is not a Meta Box field, specify its ID as follows:

```
add_filter( 'rwmb_outside_conditions', function( $conditions ) {
    $conditions['.custom-div'] = array(
        'hidden' => ['#input-id', 'value'],
    );
    return $conditions;
} );

```

If you want to hide a tab created by [MB Tabs](https://docs.metabox.io/extensions/meta-box-conditional-logic/extensions/meta-box-tabs/), [see this](https://docs.metabox.io/extensions/meta-box-conditional-logic/hide-tabs-with-conditional-logic/).

## Using with taxonomies[​](#using-with-taxonomies "Direct link to Using with taxonomies")

### Post category[​](#post-category "Direct link to Post category")

For post category, use `post_category` as the first parameter:

```
'visible' => ['post_category', 'in', [4, 5, 6]]

```

By default, the extension uses category IDs to check. If you want to use slug, use the following code:

```
'visible' => ['slug:post_category', 'in', ['fashion', 'gaming', 'technology']]

```

### Post tag[​](#post-tag "Direct link to Post tag")

Support for post tag is available only for Gutenberg editor.

To add conditions by post tag, use `tags` as the first parameter:

```
'visible' => ['tags', 'in', [4, 5, 6]]

```

Unlike post category, you have to use tag IDs.

### Custom taxonomies[​](#custom-taxonomies "Direct link to Custom taxonomies")

For custom taxonomies, use `tax_input[taxonomy_slug]` as the first parameter:

```
'hidden' => ['tax_input[product]', 'in', [5, 6, 7]],

```

Similarly to post category, it works with slug, too.

```
'hidden' => ['slug:tax_input[product]', '!=', 'drones']

```

## Using with Group[​](#using-with-group "Direct link to Using with Group")

The extension uses jQuery to check the field ID and value to match the condition. For the sub-fields in a **non-cloneable** group, the field ID actually has the format `groupID_fieldID`. You need to use that format for the condition like this:

```
[
	'id'     => 'group',
	'type'   => 'group',
	'fields' => [
		[
			'id'    => 'brand',
			'name'  => 'Brand',
			'type'  => 'select',
			'options' => [
				'apple'     => 'Apple',
				'google'    => 'Google',
				'microsoft' => 'Microsoft'
			],
		),
		[
			'id'    => 'apple_products',
			'name'  => 'Which Apple product that you love?',
			'type'  => 'radio',
			'options' => [
				'iPhone'  => 'iPhone',
				'iPad'    => 'iPad',
				'Macbook' => 'Macbook',
			],

			'visible' => [ 'group_brand', '=', 'apple' ]
		],
	],
],

```

If the group is **cloneable**, the conditional logic **runs inside the clone only**. In this case you **don't** have to change the sub-field IDs like above.

## Custom callback[​](#custom-callback "Direct link to Custom callback")

To set conditional logic with custom JavaScript callback, just put your function call in the first parameter. Like so:

In your JavaScript file:

```
// Your custom JavaScript function that checks the condition
function my_custom_callback() {
    return true;
}

```

In your PHP file:

```
'visible' => [ 'my_custom_callback()', true ]

```

Please note that your function can return anything you want and you can use any operator to compare. For example

```
// Your js
function dummy_function() {
    return ['foo', 'bar', 'baz];
}

```

```
// Your field or meta box
'hidden' => [ 'dummy_function()', 'contains', 'bar' ];

```

## Toggle types[​](#toggle-types "Direct link to Toggle types")

By default, we use jQuery `.show()` and `.hide()` method (which equivalent to CSS `display` property) to toggle elements. Imagine you have three fields named A, B, and C. So by default it will display vertical like so:

```
A
-
B
-
C

```

Or if you use Column extension, it will display horizontal like so:

```
A | B | C

```

What happen when field B is hidden? The field C will jump to B place, sometimes, you will want to keep the position of these field, so if field B is hidden, it should keep the blank space like so:

```
A
-

-
C

```

Or

```
A | | C

```

So, basically, we have to use CSS `visibility` property instead of `display` property. To do so, just add `'toggle_type' => 'visibility'` to your Meta Box.

We also support **slide and fade animations**. In order to use these animation just set `toggle_type` to `slide` or `fade`.

In short, we support 4 toggle types: `visibility`, `display`, `slide`, `fade`.

## Running conditional logic manually[​](#running-conditional-logic-manually "Direct link to Running conditional logic manually")

There are situations where you manually modify some fields' values by code. In those cases, no events of the changes are fired, and your conditions might not be applied for other fields.

To fix that, you can run the conditions manually via JavaScript like this:

```
let $scope = $( '.scope' );
rwmb.runConditionalLogic( $scope );

```

Where `.scope` is a selector of the wrapper element, which contains all the fields you want to apply conditional logic to. It might be a field group, or any `div`, or even the whole page. When running this code, the conditional logic will be applied to all fields inside this wrapper element. In other words, some fields will be visible or hidden based on the current values of other fields.

## Notes[​](#notes "Direct link to Notes")

### Cloneable groups[​](#cloneable-groups "Direct link to Cloneable groups")

It's important to note that, when you have a **cloneable group**, then all the rules are applied **within** the group clones only. It won't work if the rule refers to a field outside of the group.

In other words, both the dependency and dependant of the rules must be sub-fields of the group.

### Chained hidden fields[​](#chained-hidden-fields "Direct link to Chained hidden fields")

Another important rule is that **if a field is hidden, then all fields depend on it will be hidden** regardless of their values.

For example, if you have 3 fields A, B, C and set the rule as follow:

```
IF A = 1 or B = 1 THEN show C

```

Then if A or B is hidden, the C is always hidden, regardless values of A and B.

## Known issues[​](#known-issues "Direct link to Known issues")

Conditional Logic doesn't works with [autocomplete](https://docs.metabox.io/extensions/meta-box-conditional-logic/fields/autocomplete/) field.
