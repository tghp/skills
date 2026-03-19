# Slider

The slider field creates a slider where you can select a number by dragging a control. This field uses jQuery UI library to create the UI.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The slider field interface

The slider field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/slider/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name           | Key         | Description                                                             |
| -------------- | ----------- | ----------------------------------------------------------------------- |
| Prefix         | prefix      | Text displayed before the field value. Optional.                        |
| Suffix         | suffix      | Text displayed after the field value. Optional.                         |
| Slider options | js\_options | jQuery UI slider options. [See here](https://api.jqueryui.com/slider/). |

By default, Meta Box applies these default slider options:

Name | Value | Description --- | ---`range` | `min` | Create a range from the minimum value to one handle.`value` | `$field['std']` | Set the default field value.

If you set `range` to `true`, the plugin will save 2 values in the database, separated by pipe (`|`) character, e.g. `15|90`.

This is a sample field settings array when creating this field with code:

```
[
    'name'       => 'Slider',
    'id'         => 'slider',
    'type'       => 'slider',
    'prefix'     => '$',
    'suffix'     => ' USD',
    'js_options' => [
        'min'   => 10,
        'max'   => 255,
        'step'  => 5,
    ],

    'std' => 150,
],

```

## Data[​](#data "Direct link to Data")

This field saves a single selected value (without the prefix and suffix) in the database.

If the field is cloneable, the value is stored as a serialized array in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying the field value:**

```
<?php $value = rwmb_meta( 'my_field_id' ) ?>
<p>Selected value: <?= $value ?></p>

```

or simpler:

```
<p>Selected value: <?php rwmb_the_value( 'my_field_id' ) ?></p>

```
