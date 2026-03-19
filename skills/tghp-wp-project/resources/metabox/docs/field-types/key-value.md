# Key Value

The key-value field allows you to enter an unlimited group of "key-value" pairs. It's usually used for a list of items, such as a product specification.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The key value field interface

The key value field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/key-value/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name        | Key         | Description                                                                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Placeholder | placeholder | Array of placeholder texts for key and value inputs. Format \['key' => 'Key placeholder', 'value' => 'Value placeholder'\]. Optional. |

This is a sample field settings array when creating this field with code:

```
[
    'id'   => 'key_value',
    'name' => 'Key Value',
    'type' => 'key_value',
    'desc' => 'Add more additional info below:',
],

```

## Data[​](#data "Direct link to Data")

This field saves a serialized array of data of pairs in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying list of key-value pairs:**

```
<?php $pairs = rwmb_meta( 'my_field_id' ) ?>
<h3>Specification</h3>
<ul>
    <?php foreach ( $pairs as $pair ) : ?>
        <li><label><?= $pair[0] ?>:</label> <?= $pair[1] ?></li>
    <?php endforeach ?>
</ul>

```

or simpler:

```
<h3>Specification</h3>
<?php rwmb_the_value( 'my_field_id' ) ?>

```
