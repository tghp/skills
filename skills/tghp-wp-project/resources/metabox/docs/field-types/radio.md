# Radio

The radio field creates a simple list of radio inputs where you can select a single choice from the predefined list.

## Screenshots[​](#screenshots "Direct link to Screenshots")

Radio choices inline

Radio choices on multiple lines

The radio field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/radio/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name    | Key     | Description                                                                                                                                                                               |
| ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choices | options | List of choices, each per line. If you need to set values and labels, use the format "value: Label" for each choice.When using with code, this setting is an array of 'value' => 'Label'. |
| Inline  | inline  | Display choices on a single line? true or false.                                                                                                                                          |

This is a sample field settings array when creating this field with code:

```
[
    'name'    => 'Radio',
    'id'      => 'radio',
    'type'    => 'radio',
    'inline'  => false,
    'options' => [
        'value1' => 'Label1',
        'value2' => 'Label2',
    ],
],

```

## Data[​](#data "Direct link to Data")

This field saves a single selected value in the database.

If the field is cloneable, then the value is stored as a serialized array in a single row in the database.

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
