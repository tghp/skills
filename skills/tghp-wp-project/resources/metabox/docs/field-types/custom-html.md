# Custom HTML

The custom HTML field allows you to output anything. You can even use a PHP callback function to output the HTML.

This field is usually used to display custom messages/instructions to users. Sometimes, it's used with PHP callback to display more advanced content (such as content from a query).

## Screenshots[​](#screenshots "Direct link to Screenshots")

The custom HTML field interface

The custom html field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/custom-html/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name         | Key      | Description                                                      |
| ------------ | -------- | ---------------------------------------------------------------- |
| Content      | std      | The custom HTML content.                                         |
| PHP Callback | callback | The PHP function that returns the custom HTML content. Optional. |

This is a sample field settings array for registering this field with code:

```
[
    'type' => 'custom_html',
    'std'  => '<div class="alert alert-warning">This is a custom HTML content</div>',
],

```

## Styling[​](#styling "Direct link to Styling")

Because this field is usually used to display custom content, it requires some CSS to make the content looks good. To enqueue a CSS file to the admin editing page, use the [rwmb\_enqueue\_scripts](https://docs.metabox.io/fields/custom-html/actions/rwmb-enqueue-scripts/) hook:

```
add_action( 'rwmb_enqueue_scripts', function () {
    wp_enqueue_style( 'style-id', get_template_directory_uri() . '/css/admin.css' );
} );

```

And in the `admin.css` you can put your custom styles.
