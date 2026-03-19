# Password

The password field creates a simple password input. The password is encrypted by [wp\_hash\_password()](https://developer.wordpress.org/reference/functions/wp%5Fhash%5Fpassword/) before saving it into the database to make sure it's safe.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The password field interface

The password field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/password/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name                  | Key  | Description                                                               |
| --------------------- | ---- | ------------------------------------------------------------------------- |
| Size of the input box | size | Size of the input box. Without this setting, the input box is full-width. |

This is a sample field settings array when creating this field with code:

```
[
    'name' => 'Password',
    'id'   => 'password',
    'type' => 'password',
],

```

## Data[​](#data "Direct link to Data")

This field saves the encrypted password in the database for better security. The password is encrypted by [wp\_hash\_password()](https://developer.wordpress.org/reference/functions/wp%5Fhash%5Fpassword/) function.

## Template usage[​](#template-usage "Direct link to Template usage")

As the password is encrypted in the database, you **cannot** get the original password via code. There's no reversing function that can turn a password hash into the original one. Otherwise, it will be insecure.

Instead of trying to get the original password, you should check the saved password is correct, like this:

```
<?php
$value = rwmb_meta( 'my_field_id' );
if ( wp_check_password( 'password to check', $value ) ) {
    echo 'Password is correct';
}

```
