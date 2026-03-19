# File Advanced

The file advanced field uses the WordPress media popup for selecting / uploading files. You can also reorder files if you want.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The file advanced field interface

The file advanced field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/file-advanced/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                | Key                | Description                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max number of files | max\_file\_uploads | Max number of uploaded files. Optional.                                                                                                                                                                                                                                                            |
| Force delete        | force\_delete      | Whether or not delete the files from Media Library when deleting them from post meta. true or false (default). Optional. Note: it might affect other posts if you use the same file for multiple posts.                                                                                            |
| MIME types          | mime\_type         | The MIME type of files which you want to show in the Media Library. Note: this is a filter for items in the media popup, it doesn't restrict file types when uploading. See [common MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics%5Fof%5FHTTP/MIME%5Ftypes/Common%5Ftypes). |
| Show status         | max\_status        | Display how many files uploaded/remaining. Applied only when "Max number of files" is defined. true (default) or false. Optional.                                                                                                                                                                  |

This is a sample field settings array when creating this field with code:

```
[
    'id'               => 'file',
    'name'             => 'File Advanced',
    'type'             => 'file_advanced',
    'force_delete'     => false,
    'max_file_uploads' => 2,
    'mime_type'        => 'application/pdf',
    'max_status'       => false,
],

```

## Data[​](#data "Direct link to Data")

This field saves multiple attachment IDs in the database. Each value (attachment ID) is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying uploaded files with links:**

```
<?php $files = rwmb_meta( 'my_field_id' ); ?>
<h3>Uploaded files</h3>
<ul>
    <?php foreach ( $files as $file ) : ?>
        <li><a href="<?= $file['url']; ?>"><?= $file['name']; ?></a></li>
    <?php endforeach ?>
</ul>

```

or simpler:

```
<h3>Uploaded files</h3>
<?php rwmb_the_value( 'my_field_id' ) ?>

```

`rwmb_the_value()` outputs files in an unordered list, while `rwmb_meta()` returns an array of files, each file has the following information:

```
[
    'ID'    => 123,
    'name'  => 'intro.txt',
    'path'  => '/var/www/wp-content/uploads/intro.txt',
    'url'   => 'https://example.com/wp-content/uploads/intro.txt',
    'title' => 'Introduction',
];

```

**Displaying only one file:**

```
<?php $files = rwmb_meta( 'my_field_id', ['limit' => 1] ) ?>
<?php $file = reset( $files ) ?>
<a class="button" href="<?= $file['url'] ?>">Download file</a>

```

## Filters[​](#filters "Direct link to Filters")

This field has some filters to change the texts displayed on the screen..

| Filter                               | Default      | Description            |
| ------------------------------------ | ------------ | ---------------------- |
| rwmb\_media\_add\_string             | \+ Add Media | Add new file string    |
| rwmb\_media\_single\_files\_string   | file         | Singular "file" string |
| rwmb\_media\_multiple\_files\_string | files        | Plural "files" string  |
| rwmb\_media\_remove\_string          | Remove       | File remove string     |
| rwmb\_media\_edit\_string            | Edit         | File edit string       |
| rwmb\_media\_view\_string            | View         | File view string       |

The code below changes the "+ Add Media" string:

```
add_filter( 'rwmb_media_add_string', function () {
    return '+ New File';
} );

```
