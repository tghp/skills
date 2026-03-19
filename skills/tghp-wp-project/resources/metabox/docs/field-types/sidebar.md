# Sidebar

The sidebar field allows you to select one or multiple sidebars. This field has several settings that can be displayed as a: simple select dropdown, checkbox list, or beautiful select dropdown with select2 library.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The sidebar field default interface

The sidebar field with checkbox list interface

The sidebar field with radio list interface

The sidebar field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/sidebar/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name        | Key         | Description                                                                                                                |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Placeholder | placeholder | The placeholder for the select box. The default is "Select a sidebar". Applied only when the field type is a select field. |
| Field type  | field\_type | How the sidebars are displayed? See below.                                                                                 |

This field inherits the look and field (and settings) from other fields, depending on the field type, which accepts the following value:

| Field type       | Description                                                                     | Settings inherited from                     |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| select           | Simple select dropdown.                                                         | [Select](https://docs.metabox.io/fields/sidebar/fields/select/)                   |
| select\_advanced | Beautiful select dropdown using the select2 library. This is the default value. | [Select advanced](https://docs.metabox.io/fields/sidebar/fields/select-advanced/) |
| checkbox\_list   | Flatten list of checkboxes which allows to select multiple items.               | [Checkbox list](https://docs.metabox.io/fields/sidebar/fields/checkbox-list/)     |
| radio\_list      | Flatten list of radio boxes which allows to select only 1 item.                 | [Radio](https://docs.metabox.io/fields/sidebar/fields/radio/)                     |

This is a sample field settings array when creating this field with code:

```
[
    'name'        => 'Sidebar',
    'id'          => 'sidebar',
    'type'        => 'sidebar',
    'field_type'  => 'select_advanced',
    'placeholder' => 'Select a sidebar',
],

```

## Data[​](#data "Direct link to Data")

This field saves sidebar ID(s) in the database.

If "Multiple" is not set, a single sidebar ID is saved in the database. Otherwise, the field saves multiple sidebar IDs in the database, where each sidebar ID is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

If the field is cloneable, then the value is stored as a serialized array in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Display widgets for the selected sidebar:**

```
<div class="sidebar">
    <?php rwmb_the_value( 'my_field_id' ) ?>
</div>

```

**Checking if the selected sidebar has widgets and displaying it:**

```
<?php
$sidebar_id = rwmb_meta( 'my_field_id' );
if ( is_active_sidebar( $sidebar_id ) ) {
    dynamic_sidebar( $sidebar_id );
}

```
