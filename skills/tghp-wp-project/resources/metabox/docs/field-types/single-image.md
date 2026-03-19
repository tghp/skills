# Single image

The single image field allows users to select or upload one image via the WordPress media library.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The single image field interface

The single image field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/single-image/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name         | Key           | Description                                                                                                                                                                                                                            |
| ------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Force delete | force\_delete | Whether or not delete the files from Media Library when deleting them from post meta. true or false (default). Optional. Note: it might affect other posts if you use the same file for multiple posts.                                |
| Image size   | image\_size   | Image size displays in the edit page. Optional. Default "thumbnail". Image size is used to make sure images are not blurry. It’s not meant to display images with the exact width and height. Images are always displayed as a square. |

This is a sample field settings array when creating this field with code:

```
[
    'type' => 'single_image',
    'name' => 'Single Image',
    'id'   => 'my_image',
],

```

## Data[​](#data "Direct link to Data")

This field saves the attachment ID in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying uploaded image:**

```
<?php $image = rwmb_meta( 'my_field_id', ['size' => 'thumbnail'] ); ?>
<h3>Logo</h3>
<img src="<?= $image['url']; ?>">

```

or simpler:

```
<h3>Logo</h3>
<?php rwmb_the_value( 'my_field_id', ['size' => 'thumbnail'] ) ?>

```

`rwmb_the_value()` outputs the image, and `rwmb_meta()` returns an array of image details:

```
[
    'ID'          => 123,
    'name'        => 'logo-150x80.png',
    'path'        => '/var/www/wp-content/uploads/logo-150x80.png',
    'url'         => 'https://example.com/wp-content/uploads/logo-150x80.png',
    'width'       => 150,
    'height'      => 80,
    'full_url'    => 'https://example.com/wp-content/uploads/logo.png',
    'title'       => 'Logo',
    'caption'     => 'Logo caption',
    'description' => 'Used in the header',
    'alt'         => 'Logo ALT text',
    'srcset'      => 'large.jpg 1920w, medium.jpg 960w, small.jpg 480w', // List of responsive image src
    'sizes'       => [], // List of image sizes. See https://developer.wordpress.org/reference/functions/wp_get_attachment_metadata/
    'image_meta'  => [], // List of image meta. See https://developer.wordpress.org/reference/functions/wp_get_attachment_metadata/
];

```

**Display the image with link to the full-size version (for lightbox effect):**

```
<?php $image = rwmb_meta( 'my_field_id', ['size' => 'thumbnail'] ); ?>
<h3>Logo</h3>
<a href="<?= $image['full_url'] ?>"><img src="<?= $image['url']; ?>"></a>

```

or simpler:

```
<h3>Logo</h3>
<?php rwmb_the_value( 'my_field_id', ['size' => 'thumbnail', 'link' => true] ) ?>

```

The 2nd argument for `rwmb_meta()` and `rwmb_the_value()` is an array of extra parameters and accepts the following parameters:

| Name | Description                                                         |
| ---- | ------------------------------------------------------------------- |
| size | Image size returned. Optional. Default thumbnail.                   |
| link | Set to true to show a link to the full-size version. Default false. |

## Filters[​](#filters "Direct link to Filters")

This field inherits from image advanced and thus, uses the [same filters](https://docs.metabox.io/fields/single-image/fields/image-advanced/) to change the texts displayed on the screen.

| Filter                                | Default      | Description             |
| ------------------------------------- | ------------ | ----------------------- |
| rwmb\_media\_add\_string              | \+ Add Media | Add new image string    |
| rwmb\_media\_single\_images\_string   | image        | Singular "image" string |
| rwmb\_media\_multiple\_images\_string | images       | Plural "images" string  |
| rwmb\_media\_remove\_string           | Remove       | Image remove string     |
| rwmb\_media\_edit\_string             | Edit         | Image edit string       |
| rwmb\_media\_view\_string             | View         | Image view string       |

The code below changes the "+ Add Media" string:

```
add_filter( 'rwmb_media_add_string', 'prefix_change_add_string' );
function prefix_change_add_string() {
    return '+ New Image';
}

```
