# Background

The background field allows you to set background properties for a post. You can set the background color, select an image, and set other background settings.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The background field interface

The background field settings

## Settings[​](#settings "Direct link to Settings")

This field doesn't have any specific settings. It only uses [common settings](https://docs.metabox.io/fields/background/field-settings/).

This is a sample field settings array when creating this field with code:

```
[
    'id'   => 'background',
    'name' => 'Section background',
    'type' => 'background',
],

```

## Data[​](#data "Direct link to Data")

This field stores background properties in a serialized array in the post meta.

## Template usage[​](#template-usage "Direct link to Template usage")

**Getting the background properties:**

```
$background = rwmb_meta( 'my_field_id' );
echo $background['color'];
echo $background['image'];

```

This helper function returns an array of background properties:

```
[
    'color'      => '#111222',
    'image'      => 'https://domain.com/wp-uploads/2017/12/bg.png',
    'position'   => 'top left',
    'attachment' => 'fixed',
    'size'       => 'cover',
    'repeat'     => 'no-repeat',
];

```

**Outputting the CSS for the background:**

```
<div style="<?php rwmb_the_value( 'my_field_id' ) ?>">
    <h2>My section title</h2>
    <p>My section content</p>
</div>

```
