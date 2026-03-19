# Taxonomy

The taxonomy field allows you to select one or multiple taxonomy terms. This field has several settings that can be displayed as a: simple select dropdown, checkbox list, or beautiful select dropdown with select2 library.

If the taxonomy is hierarchical, you can display the field as a select or checkbox tree, e.g. showing children terms when a parent term is selected.

Taxonomy vs. taxonomy advanced

* Taxonomy field **doesn't store data**. It just sets post terms. Think about it like a replacement of the _Category_ or _Tag_ meta box of WordPress.
* Taxonomy advanced **stores terms' IDs** and doesn't set post terms.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The taxonomy field default interface

The taxonomy field with checkbox list interface

The taxonomy field with checkbox tree interface

The taxonomy field with select tree interface

The taxonomy field settings

The taxonomy field with radio list interface

The taxonomy field with radio list inline interface

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/taxonomy/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                    | Key             | Description                                                                                                                                                    |
| ----------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taxonomies              | taxonomy        | Taxonomy slug(s). Can be a string (for single taxonomy) or an array (for multiple taxonomies). Required.                                                       |
| Query args              | query\_args     | Query arguments for getting taxonomy terms. Uses same arguments as [get\_terms()](https://developer.wordpress.org/reference/functions/get%5Fterms/). Optional. |
| Placeholder             | placeholder     | The placeholder for the select box. The default is "Select a {taxonomy label}". Applied only when the field type is a select field.                            |
| Add new                 | add\_new        | Allow users to create a new term when submitting the post (true or false).                                                                                     |
| Remove default meta box | remove\_default | Remove the default WordPress taxonomy meta box. Only works with the classic editor.                                                                            |
| Field type              | field\_type     | How the terms are displayed? See below.                                                                                                                        |

This field inherits the look and field (and settings) from other fields, depending on the field type, which accepts the following value:

| Field type       | Description                                                                                                                                                                                       | Settings inherited from                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| select           | Simple select dropdown.                                                                                                                                                                           | [Select](https://docs.metabox.io/fields/taxonomy/fields/select/)                   |
| select\_advanced | Beautiful select dropdown using the select2 library. This is the default value.                                                                                                                   | [Select advanced](https://docs.metabox.io/fields/taxonomy/fields/select-advanced/) |
| select\_tree     | Hierarchical list of select boxes which allows to select multiple items (select/deselect parent item will show/hide child items). Applied only when the taxonomy is hierarchical (like category). | [Select](https://docs.metabox.io/fields/taxonomy/fields/select/)                   |
| checkbox\_list   | Flatten list of checkboxes which allows to select multiple items.                                                                                                                                 | [Checkbox list](https://docs.metabox.io/fields/taxonomy/fields/checkbox-list/)     |
| checkbox\_tree   | Hierarchical list of checkboxes which allows to select multiple items (select/deselect parent item will show/hide child items). Applied only when the taxonomy is hierarchical (like category).   | [Checkbox list](https://docs.metabox.io/fields/taxonomy/fields/checkbox-list/)     |
| radio\_list      | Flatten list of radio boxes which allows to select only 1 item.                                                                                                                                   | [Radio](https://docs.metabox.io/fields/taxonomy/fields/radio/)                     |

This is a sample field settings array when creating this field with code:

```
[
    'name'       => 'Taxonomy',
    'id'         => 'taxonomy',
    'type'       => 'taxonomy',
    'taxonomy'   => 'category',
    'field_type' => 'select_advanced',
],

```

## Ajax load[​](#ajax-load "Direct link to Ajax load")

Meta Box uses ajax to increase the performance of the field query. Instead of fetching all terms at once, the plugin now fetches only some terms when the page is loaded, and then it fetches more terms when users scroll down to the list.

See this video for demonstration (made for posts, but works similar for taxonomies, the UI of the MB Builder was from the old version, the new version of MB Builder has a better UI):

Watch

info

This feature is available only for fields that set the field type to **select advanced**. There are some extra parameters for you to disable or customize.

### Enable/Disable ajax requests[​](#enabledisable-ajax-requests "Direct link to Enable/Disable ajax requests")

This feature is enabled by default when you set the field type to "select advanced".

If you're using code to create this field, the settings to enable/disable it is `ajax`, which accepts a boolean value (and it's `true` by default):

```
[
    'id'       => 'project_cat',
    'title'    => 'Project Categories',
    'type'     => 'taxonomy',
    'taxonomy' => 'project_cat',
    'ajax'     => true,
],

```

Setting this parameter to `false` will disable ajax requests.

### Limit the number of terms for pagination[​](#limit-the-number-of-terms-for-pagination "Direct link to Limit the number of terms for pagination")

The number of terms for pagination is set via the `number` parameter in the "Query\_args" setting:

```
[
    'id'         => 'project_cat',
    'title'      => 'Project Categories',
    'type'       => 'taxonomy',
    'taxonomy'   => 'project_cat',
    'ajax'       => true,
    'query_args' => [
        'number' => 10,
    ],
],

```

When fetching new terms, the new terms will be appended to the list of options in the dropdown, to make the infinite scroll effect.

Initial load

The number of terms **doesn't affect the initial load** of the field. When the field is loaded, Meta Box **only queries for saved terms** (which is usually not many). So the initial query is very minimal and doesn't cause any performance problems.

### Searching parameters[​](#searching-parameters "Direct link to Searching parameters")

You probably don't want to perform an ajax request when opening the dropdown at first. You might want to _make ajax requests only when users type something_ and search for that. To do that, you need to set the `minimumInputLength` for the input, as below:

```
[
    'id'         => 'project_cat',
    'title'      => 'Project Categories',
    'type'       => 'taxonomy',
    'taxonomy'   => 'project_cat',
    'ajax'       => true,
    'query_args' => [
        'number' => 10,
    ],
    'js_options' => [
        'minimumInputLength' => 1,
    ],
],

```

This parameter sets the minimum number of characters required to start a search. It may be good if you don't want users to make too many ajax requests that could harm your server.

## Data[​](#data "Direct link to Data")

No value saved!

This field **does not save any value** in the database. Instead of that, it **sets the taxonomy terms for the current being edited post**. In short, it behaves exactly like the "Category" and "Tags" meta boxes.

The purpose of this field is to replace the default WordPress meta box for taxonomy and offer more options to control how it displays.

For this reason, if you have two taxonomy fields, and select different values for them, after saving, they still show the same value.

How to save data

If you prefer saving data, check out the [taxonomy advanced](https://docs.metabox.io/fields/taxonomy/fields/taxonomy-advanced/) field.

## Template usage[​](#template-usage "Direct link to Template usage")

**Getting selected term object:**

```
<?php $term = rwmb_meta( 'my_field_id' ); ?>
<pre>
    <!-- Show all data from the selected term -->
    <?php print_r( $term ); ?>
</pre>

```

**Displaying selected term name:**

```
<?php $term = rwmb_meta( 'my_field_id' ); ?>
<p><?= $term->name; ?></p>

```

or simpler:

```
<p><?php rwmb_the_value( 'my_field_id', ['link' => false] ) ?></p>

```

**Displaying the selected term with link:**

```
<?php $term = rwmb_meta( 'my_field_id' ); ?>
<p><a href="<?= get_term_link( $term ) ?>"><?= $term->name ?></a></p>

```

or simpler:

```
<p><?php rwmb_the_value( 'my_field_id' ) ?></p>

```

**Additional options for `rwmb_the_value()`:**

Using `rwmb_the_value` also has some extra options as following:

```
<!-- Displaying the term without link -->
<?php rwmb_the_value( 'my_field_id', ['link' => false] ) ?>

<!-- Displaying the term with link to view term (default) -->
<?php rwmb_the_value( 'my_field_id' ) ?>
<?php rwmb_the_value( 'my_field_id', ['link' => 'view'] ) ?>

<!-- Displaying the term with link to edit term -->
<?php rwmb_the_value( 'my_field_id', ['link' => 'edit'] ) ?>

```

**Displaying multiple selected terms:**

If "Multiple" is set, you can loop through the returned values like this:

```
<?php $terms = rwmb_meta( 'my_field_id' ); ?>
<h3>Project categories</h3>
<ul>
    <?php foreach ( $terms as $term ) : ?>
        <li><a href="<?= get_term_link( $term ) ?>"><?= $term->name ?></a></li>
    <?php endforeach ?>
</ul>

```

of simpler:

```
<h3>Project categories</h3>
<?php rwmb_the_value( 'my_field_id' ); ?>

```

`rwmb_the_value()` automatically output multiple selected terms as an unordered list with links to each user.

## Filters[​](#filters "Direct link to Filters")

`rwmb_taxonomy_choice_label` and `rwmb_{$field_id}_choice_label`

These filters allow developers to change the label of `taxonomy` fields. The first label applies to all `taxonomy` fields, and the second one is for a specific field.

Example: If you are using a field called `my_field` and you want to change the label in the select box, use this code:

```
function my_field_filter( $label, $field, $term ) {
    return $label . ' - Custom text';
}
add_filter( 'rwmb_my_field_choice_label', 'my_field_filter', 10, 3 );

```
