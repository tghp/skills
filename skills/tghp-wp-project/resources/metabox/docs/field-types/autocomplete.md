# Autocomplete

The autocomplete field creates a simple text input with autocomplete feature. You can select multiple values from the predefined list.

This field uses jQuery UI library to perform the autocomplete action.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The autocomplete field interface

The autocomplete field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/autocomplete/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                  | Key     | Description                                                                                                                                                                                                                                                                    |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Choices               | options | List of choices, each per line. If you need to set values and labels, use the format "value: Label" for each choice.When using with code, this setting is an array of 'value' => 'Label'. It can be an URL to a remote resource that returns the array of data in JSON format. |
| Size of the input box | size    | Input size. Default 30. Optional.                                                                                                                                                                                                                                              |

This is a sample field settings array for registering this field with code:

```
[
    'name'    => 'Autocomplete',
    'id'      => 'field_id',
    'type'    => 'autocomplete',
    'options' => [
        'java'       => 'Java',
        'javascript' => 'JavaScript',
        'php'        => 'PHP',
        'csharp'     => 'C#',
        'kotlin'     => 'Kotlin',
        'swift'      => 'Swift',
    ],
],

```

## Getting options remotely via Ajax[​](#getting-options-remotely-via-ajax "Direct link to Getting options remotely via Ajax")

In case you want to use remote data instead of user-defined data for the "Choices" (`options`) settings, you can set this setting as an URL of your remote data source.

For example, you can set the "Choices" with the value: `https://yourdomain.com/wp-admin/admin-ajax.php?action=something`, which will send an ajax request to the `admin-ajax.php` file, and then you can handle it with your function as follows:

```
add_action( 'wp_ajax_something', function() {
    $s = $_REQUEST[ 'term' ];
    // Do some stuff here to find matches.

    $response = [
        [ 'value' => '123', 'label' => 'Some Post' ],
        [ 'value' => '77', 'label' => 'Another Post' ],
    ];

    // Do some stuff to prepare JSON response ( headers, etc ).
    echo wp_json_encode( $response );
    die;
} );

```

Note that the data returned must be in JSON format as above. The ajax request also sends the search term via `$_REQUEST['term']` parameter as you see above.

## Data[​](#data "Direct link to Data")

This field saves multiple values in the database. Each value is stored in a single row in the database with the same key (similar to what `add_post_meta` does with the last parameter `false`).

If the field is cloneable, then the value is stored as a serialized array in a single row in the database. Each value of that array is an array of cloned values.

warning

Note that this field stores the **values**, not labels.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying selected values:**

```
<?php $values = rwmb_meta( 'my_field_id' ); ?>
<ul>
    <?php foreach ( $values as $value ) : ?>
        <li><?= $value ?></li>
    <?php endforeach ?>
</ul>

```

**Displaying selected labels:**

```
<p>Choices:</p>
<?php rwmb_the_value( 'my_field_id' ) ?>

```

info

`rwmb_the_value()` automatically formats values as an unordered list.

**Displaying both values and labels:**

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
<?php
$field   = rwmb_get_field_settings( 'my_field_id' );
$options = $field['options'];
$values  = rwmb_meta( 'my_field_id' );
?>
<ul>
    <?php foreach ( $values as $clone ) : ?>
        <li>
            <ul>
                <?php foreach ( $clone as $value ) : ?>
                    <li>
                        Value: <?= $value ?><br>
                        Label: <?= $options[ $value ] ?>
                    </li>
                <?php endforeach ?>
            </ul>
        </li>
    <?php endforeach ?>
</ul>

```
