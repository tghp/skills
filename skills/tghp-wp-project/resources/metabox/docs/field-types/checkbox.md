# Checkbox

The checkbox field creates a single checkbox.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The checkbox field interface

The checkbox field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/checkbox/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name               | Key | Description                                 |
| ------------------ | --- | ------------------------------------------- |
| Checked by default | std | Whether the checkbox is checked by default? |

This is a sample field settings array when creating this field with code:

```
[
    'name' => 'Checkbox',
    'id'   => 'field_id',
    'type' => 'checkbox',
    'std'  => 1, // 0 or 1
],

```

## Data[​](#data "Direct link to Data")

This field saves the "checked" and "unchecked" values in the database as "1" or "0".

## Template usage[​](#template-usage "Direct link to Template usage")

**Conditional check:**

```
$value = rwmb_meta( 'my_field_id' );
if ( $value ) {
    echo 'Checked';
} else {
    echo 'Unchecked';
}

```

**Displaying "Yes/No":**

```
rwmb_the_value( 'my_field_id' );

```
