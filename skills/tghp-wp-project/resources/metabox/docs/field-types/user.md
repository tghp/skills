# User

The user field allows you to select one or multiple users. This field has several settings that can be displayed as a: simple select dropdown, checkbox list, or beautiful select dropdown with select2 library.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The user field default interface

The user field with checkbox list interface

The user field with radio list interface

The user field settings

## Settings[​](#settings "Direct link to Settings")

Besides the [common settings](https://docs.metabox.io/fields/user/field-settings/), this field has the following specific settings, the keys are for use with code:

| Name        | Key         | Description                                                                                                                                           |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query args  | query\_args | Query arguments for getting users. Uses same arguments as [get\_users()](https://developer.wordpress.org/reference/functions/get%5Fusers/). Optional. |
| Placeholder | placeholder | The placeholder for the select box. The default is "Select a user". Applied only when the field type is a select field.                               |
| Field type  | field\_type | How the users are displayed? See below.                                                                                                               |

This field inherits the look and field (and settings) from other fields, depending on the field type, which accepts the following value:

| Field type       | Description                                                                                                                                                                                     | Settings inherited from                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| select           | Simple select dropdown.                                                                                                                                                                         | [Select](https://docs.metabox.io/fields/user/fields/select/)                   |
| select\_advanced | Beautiful select dropdown using the select2 library. This is the default value.                                                                                                                 | [Select advanced](https://docs.metabox.io/fields/user/fields/select-advanced/) |
| select\_tree     | Hierarchical list of select boxes which allows to select multiple items (select/deselect parent item will show/hide child items). Applied only when the post type is hierarchical (like pages). | [Select](https://docs.metabox.io/fields/user/fields/select/)                   |
| checkbox\_list   | Flatten list of checkboxes which allows to select multiple items.                                                                                                                               | [Checkbox list](https://docs.metabox.io/fields/user/fields/checkbox-list/)     |
| checkbox\_tree   | Hierarchical list of checkboxes which allows to select multiple items (select/deselect parent item will show/hide child items). Applied only when the post type is hierarchical (like pages).   | [Checkbox list](https://docs.metabox.io/fields/user/fields/checkbox-list/)     |
| radio\_list      | Flatten list of radio boxes which allows to select only 1 item.                                                                                                                                 | [Radio](https://docs.metabox.io/fields/user/fields/radio/)                     |

This is a sample field settings array when creating this field with code:

```
[
    'name'        => 'User',
    'id'          => 'user',
    'type'        => 'user',
    'field_type'  => 'select_advanced',
    'placeholder' => 'Select an author',
],

```

## Ajax load[​](#ajax-load "Direct link to Ajax load")

Meta Box uses ajax to increase the performance of the field query. Instead of fetching all users at once, the plugin now fetches only some users when the page is loaded, and then it fetches more users when users scroll down to the list.

See this video for demonstration (made for posts, but works similar for users, the UI of the MB Builder was from the old version, the new version of MB Builder has a better UI):

Watch

info

This feature is available only for fields that set the field type to **select advanced**. There are some extra parameters for you to disable or customize.

### Enable/Disable ajax requests[​](#enabledisable-ajax-requests "Direct link to Enable/Disable ajax requests")

This feature is enabled by default when you set the field type to "select advanced".

If you're using code to create this field, the settings to enable/disable it is `ajax`, which accepts a boolean value (and it's `true` by default):

```
[
    'id'    => 'project_author',
    'title' => 'Project Author',
    'type'  => 'user',
    'ajax'  => true,
],

```

Setting this parameter to `false` will disable ajax requests.

### Limit the number of users for pagination[​](#limit-the-number-of-users-for-pagination "Direct link to Limit the number of users for pagination")

The number of users for pagination is set via the `number` parameter in the "Query\_args" setting:

```
[
    'id'         => 'project_author',
    'title'      => 'Project Author',
    'type'       => 'user',
    'ajax'       => true,
    'query_args' => [
        'number' => 10,
    ],
],

```

When fetching new users, the new users will be appended to the list of options in the dropdown, to make the infinite scroll effect.

Initial load

The number of users **doesn't affect the initial load** of the field. When the field is loaded, Meta Box **only queries for saved users** (which is usually not many). So the initial query is very minimal and doesn't cause any performance problems.

### Searching parameters[​](#searching-parameters "Direct link to Searching parameters")

You probably don't want to perform an ajax request when opening the dropdown at first. You might want to _make ajax requests only when users type something_ and search for that. To do that, you need to set the `minimumInputLengthfor` the input, as below:

```
[
    'id'         => 'project_author',
    'title'      => 'Project Author',
    'type'       => 'user',
    'ajax'       => true,
    'query_args' => [
        'number' => 10,
    ],
    'js_options' => [
        'minimumInputLength' => 1,
    ],
],

```

This parameter sets the minimum number of characters required to start a search. It may be good if you don't want users to make too many ajax requests that could harm your server.

## Data[​](#data "Direct link to Data")

This field saves user ID(s) in the database.

If "Multiple" is not set, a single user ID is saved in the database. Otherwise, the field saves multiple user IDs in the database, where each user ID is stored in a single row in the database with the same meta key (similar to what `add_post_meta` does with the last parameter `false`).

If the field is cloneable, then the value is stored as a serialized array in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

**Getting selected user ID:**

```
<?php $user_id = rwmb_meta( 'my_field_id' ); ?>
<p>Selected user ID: <?= $user_id ?></p>

```

**Getting selected user object:**

```
<?php $user_id = rwmb_meta( 'my_field_id' ); ?>
<?php $user = get_userdata( $user_id ); ?>
<pre>
    <!-- Show all data from the selected user -->
    <?php print_r( $user ); ?>
</pre>

```

**Displaying selected user info:**

```
<?php $user_id = rwmb_meta( 'my_field_id' ); ?>
<?php $user = get_userdata( $user_id ); ?>
<p>Display name: <?= $user->display_name ?></p>
<p>Email: <?= $user->user_email ?></p>

```

or simpler:

```
<p>Display name: <?php rwmb_the_value( 'my_field_id', ['link' => false] ) ?></p>
<p>Email: <?php rwmb_the_value( 'my_field_id', ['display_field' => 'user_email', 'link' => false] ) ?></p>

```

**Additional options for `rwmb_the_value()`:**

Using `rwmb_the_value` also has some extra options as following:

```
<!-- Displaying the user display name without link -->
<?php rwmb_the_value( 'my_field_id', ['link' => false] ) ?>

<!-- Displaying the user display name with link to view post (default) -->
<?php rwmb_the_value( 'my_field_id' ) ?>
<?php rwmb_the_value( 'my_field_id', ['link' => 'view'] ) ?>

<!-- Displaying the user display name with link to edit post -->
<?php rwmb_the_value( 'my_field_id', ['link' => 'edit'] ) ?>

<!-- Displaying the user email -->
<?php rwmb_the_value( 'my_field_id', ['display_field' => 'user_email'] ) ?>

```

| Parameter      | Description                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------- |
| link           | Which type of link to display: false \- no link, view \- user posts page, edit \- edit user page. |
| display\_field | The user field to display. Default is display\_name.                                              |

**Displaying multiple selected users:**

If the "Multiple" is set or the field is cloneable, you can loop through the returned values like this:

```
<?php $user_ids = rwmb_meta( 'my_field_id' ); ?>
<h3>Speakers</h3>
<ul>
    <?php foreach ( $user_ids as $user_id ) : ?>
        <?php $user = get_userdata( $user_id ) ?>
        <li><?= $user->display_name ?></a></li>
    <?php endforeach ?>
</ul>

```

of simpler:

```
<h3>Speakers</h3>
<?php rwmb_the_value( 'my_field_id', ['link' => false] ); ?>

```

`rwmb_the_value()` automatically output multiple selected users as an unordered list with links to each user.

## Filters[​](#filters "Direct link to Filters")

`rwmb_user_choice_label` and `rwmb_{$field_id}_choice_label`

These filters allow developers to change the label of `user` fields. The first label applies to all `user` fields and the second one is for a specific field.

Example: If you are using a field called `some_user` and you want to change the label in the select box to user `first_name` instead of the default `display_name`:

```
function some_user_filter( $label, $field, $user ) {
    return $user->first_name ;
}
add_filter( 'rwmb_some_user_choice_label', 'some_user_filter', 10, 3 );

```
