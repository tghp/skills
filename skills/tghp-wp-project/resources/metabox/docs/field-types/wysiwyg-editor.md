# WYSIWYG Editor

The WYSIWYG field creates an editor to enter rich content. You can enter headings, paragraphs, lists, and insert media.

What is WYSIWYG?

"WYSIWYG" stands for **W**hat **Y**ou **S**ee **I**s **W**hat **Y**ou **G**et, a general term of visual editor, where you see the formatted content as you type.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The WYSIWYG field interface

The wysiwyg field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/wysiwyg/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                        | Key     | Description                                                                                                                |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Save data in the raw format | raw     | Whether to save content in the raw format without applying wpautop(). Can be true or false (default). Optional.            |
| Editor options              | options | A list of editor options, [see here](https://developer.wordpress.org/reference/classes/%5FWP%5FEditors/parse%5Fsettings/). |

By default, the plugin uses 2 editor options:

| Name          | Default Value | Description                                                     |
| ------------- | ------------- | --------------------------------------------------------------- |
| editor\_class | rwmb-wysiwyg  | Just to make CSS consistent with other fields                   |
| dfw           | true          | Allow to use "Distraction Free Writing" mode (full-screen mode) |

This is a sample field settings array when creating this field with code:

```
[
    'name'    => 'WYSIWYG / Rich Text Editor',
    'id'      => 'field_id',
    'type'    => 'wysiwyg',
    'raw'     => false,
    'options' => [
        'textarea_rows' => 4,
        'teeny'         => true,
    ],
],

```

## Data[​](#data "Direct link to Data")

If `raw` is `true`, this field saves exactly what you enter into the database. Otherwise, it saves the value after applying `wpautop` function.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying the content:**

```
<h2>Content</h2>
<?php rwmb_the_value( 'my_field_id' ) ?>

```

Content formatting

Note that the helper function doesn't format the value of this field nor run shortcodes in the content. In case you want to make it behaves similar to the post content (e.g. format and shortcodes), use this code:

```
global $wp_embed;
$value = rwmb_meta( 'my_field_id' );
$value = do_shortcode( wpautop( $wp_embed->autoembed( $value ) ) );
echo $value;

```

## Filters[​](#filters "Direct link to Filters")

### `rwmb_wysiwyg_settings`[​](#rwmb%5Fwysiwyg%5Fsettings "Direct link to rwmb_wysiwyg_settings")

This filter is used to change the options for the editor (which is passed by `$field['option']`) and is applied to all `wysiwyg` fields.

This filter accepts 1 param - an array of editor settings.
