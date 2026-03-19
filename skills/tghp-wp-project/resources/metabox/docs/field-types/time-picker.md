# Time

The time field allows you to select a time via a friendly UI. This field uses jQuery UI time picker libraries.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The time field interface

The time field with select dropdowns

The time field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/time/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                  | Key         | Description                                                                                                                           |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Size of the input box | size        | Size of the input box. Optional. Default 10\. Without this setting, the input box is full-width.                                      |
| Inline                | inline      | Whether to display the time picker inline with the input and don't require to click to show the time picker? true or false (default). |
| Time picker options   | js\_options | Time picker options. [See here](http://trentrichardson.com/examples/timepicker/).                                                     |

This is a sample field settings array when creating this field with code:

```
[
    'name'       => 'Time picker',
    'id'         => 'field_id',
    'type'       => 'time',
    'js_options' => [
        'stepMinute'      => 15,
        'controlType'     => 'select',
        'showButtonPanel' => false,
        'oneLine'         => true,
    ],
],

```

## Data[​](#data "Direct link to Data")

This field saves ther entered time in the database.

If the field is cloneable, then the value is stored as a serialized array in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying entered time:**

```
<?php $value = rwmb_meta( 'my_field_id' ) ?>
<p>Entered: <?= $value ?>

```

or simpler:

```
<p>Entered: <?= rwmb_the_value( 'my_field_id' ) ?>

```
