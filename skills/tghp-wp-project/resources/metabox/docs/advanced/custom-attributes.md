# Custom attributes

With Meta Box, you can add custom attributes for inputs like text, URL, email field. This feature is very helpful if developers want to add HTML5 attributes or something like `data-*` attribute for their custom JavaScript code.

## How to add custom attributes to fields[​](#how-to-add-custom-attributes-to-fields "Direct link to How to add custom attributes to fields")

To add custom attributes to the fields, click the **Advanced** tab in the field settings, and click the **Add New** button under **Custom HTML5 Attributes**:

Then add your attribute name and value.

info

The instruction above uses [MB Builder](https://docs.metabox.io/custom-attributes/extensions/meta-box-builder/), an extension providing the UI to create fields, and is already bundled in [Meta Box Lite](https://metabox.io/lite/) and [Meta Box AIO](https://docs.metabox.io/custom-attributes/extensions/meta-box-aio/). If you prefer to use code, please see below.

Currently, this feature is supported in text, URL, email, checkbox, radio, date, time, datetime fields.

Complex values

By default, custom attributes accept strings as keys and values. If you want to enter complex values, like array, please use the [dot notation](https://docs.metabox.io/custom-attributes/extensions/meta-box-builder/#dot-notation) or [JSON notation](https://docs.metabox.io/custom-attributes/extensions/meta-box-builder/#json-notation).

## Adding custom attributes with code[​](#adding-custom-attributes-with-code "Direct link to Adding custom attributes with code")

Custom attributes are registered as an array `attributes` in the field settings, in format `'key' => 'value'` like this:

```
'fields' => [
    [
        'name'       => 'Username',
        'id'         => 'text',
        'type'       => 'text',
        'attributes' => [
            'required'  => true,
            'minlength' => 10,
        ],
    ],
],

```

If you want to add a custom `data-*` attribute, you can add it like this:

```
'attributes' => [
    // Simple value
    'data-option1'  => 'value1',
    // Array of values
    'data-option2'  => json_encode( ['key1' => 'value1', 'key2' => 'value2'] ),
],

```

### Common attributes[​](#common-attributes "Direct link to Common attributes")

There are several attributes that you can set under the `attributes` array, or directly in the field settings (e.g. outside the `attributes` array).

So, you can write like this:

```
'fields' => [
    [
        'name'       => 'Username',
        'id'         => 'text',
        'type'       => 'text',
        'attributes' => [
            'required'  => true,
            'minlength' => 10,
        ],
    ],
],

```

Or like this:

```
'fields' => [
    [
        'name'       => 'Username',
        'id'         => 'text',
        'type'       => 'text',
        'required'  => true,
        'minlength' => 10,
    ],
],

```

Here is the list of common attributes:

* disabled
* required
* autofocus
* readonly
* maxlength
* minlength
* pattern
