# File Input

The file input field creates a simple text input for uploading a single file. You can select a file from the Media Library or enter a file URL directly (even a URL for a file hosted on another website). After selecting from the Media Library, the input file URL will be pasted into the input and is saved into the database.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The file input field interface

The file input field settings

## Settings[​](#settings "Direct link to Settings")

This field doesn't have any specific settings. It only uses [common settings](https://docs.metabox.io/fields/file-input/field-settings/).

## Data[​](#data "Direct link to Data")

This field saves the input file URL in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Displaying file:**

```
<?php $value = rwmb_meta( 'my_field_id' ) ?>
<p><a href="<?= $value >">Download file</a></p>

```

**Displaying uploaded image:**

```
<?php $value = rwmb_meta( 'my_field_id' ) ?>
<p><img src="<?= $value >"></p>

```
