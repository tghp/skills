# Image Advanced

The image advanced field uses the WordPress media popup for selecting / uploading images. You can also reorder images if you want.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The image advanced field interface

The image advanced field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/image-advanced/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                | Key                | Description                                                                                                                                                                                                                            |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max number of files | max\_file\_uploads | Max number of uploaded files. Optional.                                                                                                                                                                                                |
| Force delete        | force\_delete      | Whether or not delete the files from Media Library when deleting them from post meta. true or false (default). Optional. Note: it might affect other posts if you use the same file for multiple posts.                                |
| Show status         | max\_status        | Display how many files uploaded/remaining. Applied only when "Max number of files" is defined. true (default) or false. Optional.                                                                                                      |
| Image size          | image\_size        | Image size displays in the edit page. Optional. Default "thumbnail". Image size is used to make sure images are not blurry. It’s not meant to display images with the exact width and height. Images are always displayed as a square. |
| New image placement | add\_to            | Whether to add new images to the beginning or the end of the list. beginning or end. Default end. Optional.                                                                                                                            |

This is a sample field settings array when creating this field with code:

```
[
    'id'               => 'image',
    'name'             => 'Image Advanced',
    'type'             => 'image_advanced',
    'force_delete'     => false,
    'max_file_uploads' => 2,
    'max_status'       => false,
    'image_size'       => 'thumbnail',
],

```

## Data[​](#data "Direct link to Data")

This field saves multiple attachment IDs in the database. Each value (attachment ID) is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying uploaded images:**

```
<?php $images = rwmb_meta( 'my_field_id', ['size' => 'thumbnail'] ); ?>
<h3>Uploaded images</h3>
<ul>
    <?php foreach ( $images as $image ) : ?>
        <li><img src="<?= $image['url']; ?>"></li>
    <?php endforeach ?>
</ul>

```

or simpler:

```
<h3>Uploaded files</h3>
<?php rwmb_the_value( 'my_field_id', ['size' => 'thumbnail'] ) ?>

```

`rwmb_the_value()` outputs images in an unordered list, and `rwmb_meta()` returns an array of images, each image has the following information:

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

**Display images with links to the full-size versions (for lightbox effects):**

```
<?php $images = rwmb_meta( 'my_field_id', ['size' => 'thumbnail'] ); ?>
<h3>Uploaded images</h3>
<ul>
    <?php foreach ( $images as $image ) : ?>
        <li><a href="<?= $image['full_url'] ?>"><img src="<?= $image['url']; ?>"></a></li>
    <?php endforeach ?>
</ul>

```

or simpler:

```
<h3>Uploaded files</h3>
<?php rwmb_the_value( 'my_field_id', ['size' => 'thumbnail', 'link' => true] ) ?>

```

**Displaying only one image:**

```
<?php $images = rwmb_meta( 'my_field_id', ['limit' => 1] ) ?>
<?php $image = reset( $images ) ?>
<img src="<?= $image['url']; ?>">

```

The 2nd argument for `rwmb_meta()` and `rwmb_the_value()` is an array of extra parameters and accepts the following parameters:

| Name  | Description                                                         |
| ----- | ------------------------------------------------------------------- |
| size  | Image size returned. Optional. Default thumbnail.                   |
| link  | Set to true to show a link to the full-size version. Default false. |
| limit | Limit the number of returned images.                                |

## Filters[​](#filters "Direct link to Filters")

This field inherits from file advanced and thus, uses the [same filters](https://docs.metabox.io/fields/image-advanced/fields/file-advanced/) to change the texts displayed on the screen.

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

## Tutorials[​](#tutorials "Direct link to Tutorials")

[How to display uploaded images as a WordPress image gallery?](https://metabox.io/display-uploaded-images-as-wordpress-image-gallery/)
