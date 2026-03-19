# Button Group

The button group allows you to select one or more options by enabling buttons from a button group. This field is helpful when you want to display choices in the style of a toolbar.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The button group field interface

The select field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/button-group/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                         | Key      | Description                                                                                                                                                                               |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buttons                      | options  | List of buttons, each per line. If you need to set values and labels, use the format "value: Label" for each choice.When using with code, this setting is an array of 'value' => 'Label'. |
| Multiple                     | multiple | Whether to allow select multiple values? true or false (default).                                                                                                                         |
| Display buttons horizontally | inline   | Whether to display buttons horizontally (true \- default) or vertically (false).                                                                                                          |

This is a sample field settings array when creating this field with code:

```
[
    'id'       => 'styles',
    'name'     => 'Styles',
    'type'     => 'button_group',
    'options'  => [
        'bold'      => '<i class="dashicons dashicons-editor-bold"></i>',
        'italic'    => '<i class="dashicons dashicons-editor-italic"></i>',
        'underline' => '<i class="dashicons dashicons-editor-underline"></i>',
    ],
    'inline'   => true,
    'multiple' => true,
],

```

## Data[​](#data "Direct link to Data")

If "Multiple" is not set, this field saves the selected value in the database.

If "Multiple" is set, this field saves multiple values in the database. Each value is stored in a single row in the database with the same key (similar to what `add_post_meta` does with the last parameter `false`).

If the field is cloneable, the value is stored as a serialized array in a single row in the database.

warning

Note that this field stores the **values**, not labels.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying the selected value:**

```
<?php $value = rwmb_meta( 'my_field_id' ); ?>
<p>Selected: <?= $value ?></p>

```

**Displaying the selected label:**

```
<p>My choice: <?php rwmb_the_value( 'my_field_id' ) ?></p>

```

**Displaying both value and label:**

```
<?php
$field   = rwmb_get_field_settings( 'my_field_id' );
$options = $field['options'];
$value   = rwmb_meta( 'my_field_id' );
?>

Value: <?= $value ?><br>
Label: <?= $options[ $value ] ?>

```

**Displaying the list of multiple choices (values):**

```
<?php $values = rwmb_meta( 'my_field_id' ); ?>
<ul>
    <?php foreach ( $values as $value ) : ?>
        <li><?= $value ?></li>
    <?php endforeach ?>
</ul>

```

**Displaying the list of multiple choices (values and labels):**

```
<?php
$field   = rwmb_get_field_settings( 'my_field_id' );
$options = $field['options'];
$values  = rwmb_meta( 'my_field_id' );
?>
<ul>
    <?php foreach ( $values as $value ) : ?>
        <li>
            Value: <?= $value ?><br>
            Label: <?= $options[ $value ] ?>
        </li>
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
