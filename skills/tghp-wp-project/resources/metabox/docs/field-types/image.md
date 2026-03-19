# Image

The image field creates a simple image upload with default UI like `<input type="file">`. Unlike other media fields, this field doesn't use Media Library UI to upload images.

This field is very similar to [file](https://docs.metabox.io/fields/image/fields/file/). The only difference is that the file field allows uploading all file types while this field allows only images.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The image field interface

The image field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/image/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                     | Key                        | Description                                                                                                                                                                                             |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max number of files      | max\_file\_uploads         | Max number of uploaded files. Optional.                                                                                                                                                                 |
| Force delete             | force\_delete              | Whether or not delete the files from Media Library when deleting them from post meta. true or false (default). Optional. Note: it might affect other posts if you use the same file for multiple posts. |
| Custom upload folder     | upload\_dir                | Full path to a custom upload folder.                                                                                                                                                                    |
| Unique filename callback | unique\_filename\_callback | Custom callback to set the uploaded file name. Works only when uploading to a custom folder.                                                                                                            |

This is a sample field settings array when creating this field with code:

```
[
    'name'         => 'Image Upload',
    'id'           => 'field_id',
    'type'         => 'image',
    'force_delete' => false,
],

```

## Data[​](#data "Direct link to Data")

This field saves multiple attachment IDs in the database. Each value (attachment ID) is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

## Custom upload folder[​](#custom-upload-folder "Direct link to Custom upload folder")

To upload files to a custom folder, set "Custom upload folder" to your folder full path.

If you're using code to create this field, you can use WordPress constants to specify the path easier, such as:

```
'upload_dir' => ABSPATH . '/invoices/',

// or

'upload_dir' => WP_CONTENT_DIR . '/invoices/',
'unique_filename_callback' => 'my_function',

```

The custom folder should be inside your WordPress website's root folder. So you can store it in `/uploads/`, `/downloads/` folders if you want. The configuration is _per_ field, so you can have one field storing files in `/downloads/` and another field in `/invoices/`.

The uploaded file name is normally the original file name and maybe with the suffix "-1", "-2" to prevent duplicated names. In case you want to set custom names for files, pass your custom callback to the setting `unique_filename_callback`.

Unlike the normal case, where files are added to the WordPress Media Library, files uploaded to custom folders are **not available in the Media Library**. Thus, the data saved in the custom fields is **file URL**, not attachment ID.

To get the field data, you can use `get_post_meta()` to get file URL, or use `rwmb_meta()` to get an array of file details which includes: `path`, `url` and `name`.

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

This field has some filters to change the texts displayed on the screen.

| Filter                     | Default         | Description         |
| -------------------------- | --------------- | ------------------- |
| rwmb\_file\_upload\_string | Upload Files    | File upload string  |
| rwmb\_file\_add\_string    | \+ Add new file | Add new file string |
| rwmb\_file\_delete\_string | Delete          | File delete string  |
| rwmb\_file\_edit\_string   | Edit            | File edit string    |

All filters above accept 2 parameters:

* `$string`: the string needs to be changed
* `$field`: array of the field settings

The code below changes the "+ Add new file" string:

```
add_filter( 'rwmb_file_add_string', function () {
    return '+ New File';
} );

```

## Tutorials[​](#tutorials "Direct link to Tutorials")

[How to display uploaded images as a WordPress image gallery?](https://metabox.io/display-uploaded-images-as-wordpress-image-gallery/)
