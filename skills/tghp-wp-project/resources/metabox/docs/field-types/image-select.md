# Image Select

The image select field allows you to select a choice visually with images. It works similar to the radio/checkbox field but uses images for a more user-friendly interface.

:::

## Screenshots[​](#screenshots "Direct link to Screenshots")

The image select field interface

The image select field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/image-select/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name     | Key      | Description                                                                                                                                                 |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choices  | options  | List of choices, each per line. Use the format "value: Image URL" for each choice.When using with code, this setting is an array of 'value' => 'Image URL'. |
| Multiple | multiple | Whether enable multiple selection? true or false (default).                                                                                                 |

This is a sample field settings array when creating this field with code:

```
[
    'id'       => 'image_select',
    'name'     => 'Layout',
    'type'     => 'image_select',
    'options'  => [
        'left'  => 'http://placehold.it/90x90&text=Left',
        'right' => 'http://placehold.it/90x90&text=Right',
        'none'  => 'http://placehold.it/90x90&text=None',
    ],
],

```

## Data[​](#data "Direct link to Data")

If "Multiple" is not set, this field saves the selected value in the database.

If "Multiple" is set, this field saves multiple values in the database. Each value is stored in a single row in the database with the same key (similar to what `add_post_meta` does with the last parameter `false`).

If the field is cloneable, the value is stored as a serialized array in a single row in the database.

warning

Note that this field stores the **values**, not image URLs.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying the selected value:**

```
<?php $value = rwmb_meta( 'my_field_id' ); ?>
<p>Selected: <?= $value ?></p>

```

**Displaying the list of multiple choices:**

```
<?php $values = rwmb_meta( 'my_field_id' ); ?>
<ul>
    <?php foreach ( $values as $value ) : ?>
        <li><?= $value ?></li>
    <?php endforeach ?>
</ul>

```

**Displaying cloneable values:**

```
<?php $values = rwmb_meta( 'my_field_id' ); ?>
<ul>
    <?php foreach ( $values as $value ) : ?>
        <li><?= $value ?></li>
    <?php endforeach ?>
</ul>

```
