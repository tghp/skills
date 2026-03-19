[Skip to main content](#%5F%5Fdocusaurus%5FskipToContent%5Ffallback)

**Meta Box Lite**, a feature-rich free UI version of Meta Box. [Learn more](https://metabox.io/lite/)

[![Meta Box Documentation](https://docs.metabox.io/field-settings/img/logo.svg)![Meta Box Documentation](https://docs.metabox.io/field-settings/img/logo-white.svg)](https://metabox.io)[Getting Started](https://docs.metabox.io/field-settings/category/getting-started/)[Field Types](https://docs.metabox.io/field-settings/fields/)[Extensions](https://docs.metabox.io/field-settings/extensions/)[Tutorials](https://docs.metabox.io/field-settings/tutorials/)

[Support](https://support.metabox.io)[Community](https://www.facebook.com/groups/metaboxusers)

[![Meta Box Documentation](https://docs.metabox.io/field-settings/img/logo.svg)![Meta Box Documentation](https://docs.metabox.io/field-settings/img/logo-white.svg)](https://metabox.io)

* [Getting Started](https://docs.metabox.io/field-settings/category/getting-started/)
* [Field Types](https://docs.metabox.io/field-settings/fields/)
* [Extensions](https://docs.metabox.io/field-settings/extensions/)
* [Tutorials](https://docs.metabox.io/field-settings/tutorials/)
* [Advanced](https://docs.metabox.io/field-settings/category/advanced/)
* [Developer Guides](https://docs.metabox.io/field-settings/category/developer-guides/)  
   * [Creating fields with code](https://docs.metabox.io/field-settings/creating-fields-with-code/)  
   * [Field settings](https://docs.metabox.io/field-settings/field-settings/)  
   * [Displaying fields with code](https://docs.metabox.io/field-settings/displaying-fields-with-code/)  
   * [Creating new field types](https://docs.metabox.io/field-settings/creating-new-field-types/)  
   * [Bundling Meta Box](https://docs.metabox.io/field-settings/bundling/)  
   * [Composer](https://docs.metabox.io/field-settings/composer/)
* [Integrations](https://docs.metabox.io/field-settings/integrations/polylang/)
* [References](https://docs.metabox.io/field-settings/category/references/)
* [Others](https://docs.metabox.io/field-settings/category/others/)

* [Developer Guides](https://docs.metabox.io/field-settings/category/developer-guides/)
* Field settings

# Field settings

Each field contains settings to determine where and how data is loaded and saved. All fields share some common settings, but also offer unique settings per field type. There are also settings from extensions which are explained on each extension docs.

Below is the list of common field settings with a brief description. The keys are for reference in code.

* General
* Advanced

| Name                 | Key                 | Description                                                                                                                                                             |
| -------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label                | name                | Field label. Optional. If empty, the field input is 100% width.                                                                                                         |
| ID                   | id                  | Field ID. Required and must be unique. **It will be used as meta\_key when saving to the database**. Use only numbers, letters, and underscores (and rarely dashes).    |
| Type                 | type                | Field type. Required.                                                                                                                                                   |
| Label description    | label\_description  | Label description, displayed below the field label. Optional.                                                                                                           |
| Input description    | desc                | Field description, displayed below the field input. Optional.                                                                                                           |
| Default value        | std                 | Default value. Optional.                                                                                                                                                |
| Placeholder          | placeholder         | Placeholder text for the input or select box. Optional.                                                                                                                 |
| Required             | required            | Whether the field is required (true or false). Optional. Default false.                                                                                                 |
| Disabled             | disabled            | Whether the field is disabled (true or false). Optional. Default false.                                                                                                 |
| Read only            | readonly            | Whether the field is read only (true or false). Optional. Default false.                                                                                                |
| Multiple             | multiple            | Does the field have multiple values (like the select field)? Optional. Default false.                                                                                   |
| Cloneable            | clone               | Is the field clonable (repeatable)? true or false. Optional. Default false.                                                                                             |
| Sortable             | sort\_clone         | Ability to drag-and-drop reorder clones (true or false). Optional. Default false.                                                                                       |
| Clone default value  | clone\_default      | Clone the default value of fields? true or false (default).                                                                                                             |
| Clone as multiple    | clone\_as\_multiple | Whether to store clone values in multiple rows in the database? Optional. Default false.                                                                                |
| Max number of clones | max\_clone          | Maximum number of clones. Optional. Default 0 (unlimited).                                                                                                              |
| Min number of clones | min\_clone          | Minimum number of clones. Optional. Default 0.                                                                                                                          |
| Add more text        | add\_button         | The text for **Add more** clone button. Optional. Default "+ Add more".                                                                                                 |
| Hide from front end  | hide\_from\_front   | Whether to hide the field from front-end submission forms. Required the [MB Frontend Submission](https://metabox.io/plugins/mb-frontend-submission/) extension to work. |
| Hide from REST API   | hide\_from\_rest    | Whether to hide the field from REST API responses. Required the [MB REST API](https://metabox.io/plugins/mb-rest-api/) extension to work.                               |

| Name                     | Key                | Description                                                                                                                                                    |
| ------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before                   | before             | Custom HTML outputted before field's HTML.                                                                                                                     |
| After                    | after              | Custom HTML outputted after field's HTML.                                                                                                                      |
| Custom CSS class         | class              | Custom CSS class, in case you want to customize the field. Optional.                                                                                           |
| Custom sanitize callback | sanitize\_callback | Custom PHP callback for sanitizing field value before saving into the database. Set it to none to bypass the sanitization. See [more details](https://docs.metabox.io/field-settings/sanitization/). |
| Save field value         | save\_field        | Whether to save field value. Optional. Default true. This option doesn't work in the block editor (Gutenberg).                                                 |
| Custom HTML5 attributes  | attributes         | Custom attributes for inputs. See [more details](https://docs.metabox.io/field-settings/custom-attributes/).                                                                                         |
| Validation               | validation         | Validation rules for fields. Optional. See [more details](https://docs.metabox.io/field-settings/validation/).                                                                                       |
| Custom settings          | N/A                | Custom field settings, useful when you want to add your settings to fields.                                                                                    |
