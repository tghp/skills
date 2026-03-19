# Video

The video field uses the WordPress media popup for selecting / uploading videos.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The video field interface

The video field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/video/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                | Key                | Description                                                                                                                                                                                             |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max number of files | max\_file\_uploads | Max number of uploaded files. Optional.                                                                                                                                                                 |
| Force delete        | force\_delete      | Whether or not delete the files from Media Library when deleting them from post meta. true or false (default). Optional. Note: it might affect other posts if you use the same file for multiple posts. |
| Show status         | max\_status        | Display how many files uploaded/remaining. Applied only when "Max number of files" is defined. true (default) or false. Optional.                                                                       |

This is a sample field settings array when creating this field with code:

```
[
    'name'             => 'Video',
    'id'               => 'field_id',
    'type'             => 'video',
    'max_file_uploads' => 3,
    'force_delete'     => false,
    'max_status'       => true,
],

```

## Data[​](#data "Direct link to Data")

This field saves multiple attachment IDs in the database. Each value (attachment ID) is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying videos with HTML5 player:**

```
<?php $videos = rwmb_meta( 'my_field_id' ); ?>
<h3>Uploaded videos</h3>
<ul>
    <?php foreach ( $videos as $video ) : ?>
        <li><video src="<?= $video['src']; ?>"></li>
    <?php endforeach ?>
</ul>

```

`rwmb_meta()` returns an array of videos, each video has the following information:

```
[
    'ID'          => 123,
    'src'         => 'https://example.com/wp-content/uploads/intro.mp4',
    'title'       => 'Introduction',
    'type'        => 'video',
    'caption'     => 'Video caption',
    'description' => 'Video description',

    // Array of video ID3 meta. See https://developer.wordpress.org/reference/functions/wp_get_attachment_id3_keys/
    'meta'        => [],

    // Video dimension.
    'dimensions'  => [
        'width'  => 640,
        'height' => 360,
    ],

    // Featured image: full size
    'image'       => [
        'src'    => 'https://example.com/wp-content/uploads/full.jpg',
        'width'  => 1024,
        'height' => 500,
    ],

    // Featured image: thumbnail
    'thumb'       => [
        'src'    => 'https://example.com/wp-content/uploads/full-150x150.jpg',
        'width'  => 150,
        'height' => 150',
    ],
];

```

**Displaying only one video:**

```
<?php $videos = rwmb_meta( 'my_field_id', ['limit' => 1] ) ?>
<?php $video = reset( $videos ) ?>
<video src="<?= $video['src'] ?>">

```

**Displaying videos in a player with a playlist:**

```
<h3>Videos</h3>
<?php rwmb_the_value( 'my_field_id' ) ?>

```

**Displaying list of videos with video player for each video:**

```
<?php $videos = rwmb_meta( 'my_field_id' ) ?>
<ul>
    <?php foreach ( $videos as $video ) : ?>
        <li>
            <?php
            echo wp_video_shortcode( [
                'src'    => $video['src'],
                'width'  => $video['dimensions']['width'],
                'height' => $video['dimensions']['height'],
            ] );
            ?>
        </li>
    <?php endforeach ?>
</ul>

```
