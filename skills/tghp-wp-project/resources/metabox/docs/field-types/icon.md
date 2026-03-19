# Icon

The icon field allows you to select an icon from a predefined icon library and show it on the front end. With this field, you can quickly search and select an icon from any icon library:

* Font Awesome Free (default, built-in)
* Font Awesome Pro (requires your Pro account on the Font Awesome website)
* Any icon font that requires a CSS file like [Line Awesome](https://icons8.com/line-awesome), [Boxicons](https://boxicons.com/), or any icon font in your themes or plugins. This is helpful if you use use many icons from the icon font across your website.
* Your own custom icon library, where you can define your own icons with SVG. This is optimal if you use only some icons, and want to use SVG to improve the performance of the website because it doesn't require you to load a CSS file.

Depending on the icon library you use, you can output the icon on the front end as an icon font, or as an SVG.

## Screenshots[​](#screenshots "Direct link to Screenshots")

The background field interface

The icon field settings

## Defining the icon library[​](#defining-the-icon-library "Direct link to Defining the icon library")

### Font Awesome Free[​](#font-awesome-free "Direct link to Font Awesome Free")

Font Awesome Free is the most popular icon library available on the Internet with more than 2000 icons. It's supported and included by Meta Box and you don't have to download it.

To use Font Awesome Free for your icon field, add a field with type `icon` in the [MB Builder](https://docs.metabox.io/fields/icon/extensions/meta-box-builder/) (similar to the settings screenshot above). Leave all the icon settings as default.

If you use code, use the following [field settings](https://docs.metabox.io/fields/icon/field-settings/):

```
[
	'name' => 'Icon',
	'id'   => 'icon',
	'type' => 'icon', // Required.
]

```

After that, go to edit your post and you'll see the select box for search and pick an icon:

info

The `icon` field is inherited from the [select\_advanced](https://docs.metabox.io/fields/icon/fields/select-advanced/) field, which makes it have the interface of the "select2" library.

### Font Awesome Pro[​](#font-awesome-pro "Direct link to Font Awesome Pro")

To use Font Awesome Pro, you need to [download the "Pro For Web"](https://fontawesome.com/download) package, or [download your own kit](https://fontawesome.com/kits):

Extract it and find the file `icons.json` under the `metadata` folder:

This file contains all the data for icons, including CSS classes and SVG codes. We need to use it to select and output icons.

Now copy it to your theme or your plugin, and then add a field with type `icon` and set the following parameters in the MB Builder UI:

* Icon set: select "Font Awesome Pro"
* Icon file: absolute or relative path from the WordPress root directory to the `icons.json` file

If you use code, the field settings will look similar to this:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_set'  => 'font-awesome-pro',                         // MUST.
	'icon_file' => get_theme_file_path( 'assets/icons.json' ), // Path to icons.json file.
]

```

After that, go to edit your post and you'll see the select box for search and pick an icon.

### Custom icon library[​](#custom-icon-library "Direct link to Custom icon library")

To use a custom icon library, you'll need to decide whether you want to use an icon font or use SVGs. Meta Box supports both of them. Below is the pros and cons of both:

| Icon font                                                        | SVGs                               |
| ---------------------------------------------------------------- | ---------------------------------- |
| Using CSS                                                        | Using SVG                          |
| Add CSS & font to the front end, which can reduce page speed     | No CSS & font, best for page speed |
| One CSS file for all icons, no need to prepare SVG for each icon | Need to prepare SVG for each icon  |

### Using icon font[​](#using-icon-font "Direct link to Using icon font")

To use an icon font, you need to prepare the **icon CSS** file, which is a CSS file to enqueue the icon font. In the MB Builder UI, you can enter an absolute URL or a relative URL to that file from the WordPress root directory or a CDN URL if the icon font has support for it (like Line Awesome, Boxicons).

By default, the plugin will try to parse the content of the icon CSS file and extract all CSS classes for you to choose from. However, if your CSS file contains more CSS classes which are not used for icons, or you want to select only some icons, you'll need to prepare the **icon file**, which is a JSON or text file to define the icons you want to use. In the MB Builder UI, enter the absolute or relative path from the WordPress root directory.

This is the field settings for this:

If you use code, the field settings will look similar to this:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_file' => 'path/to/icons-file',
	'icon_css'  => 'https://url/to/icon/style.css',
]

```

Some icon library uses JavaScript to load the icons. If you use such a library, you can set `icon_css` a callback function that enqueue the JavaScript file:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_file' => 'path/to/icons-file',
	'icon_css'  => function() {
		wp_enqueue_script( 'my_icon_script', 'https://path/to/icon/script.js', [], '', true );
	}
]

```

The `icon_file` defines a list of icons you want to use in your project. It's best if you don't want to use all icons from the icon font.

Here is a sample icon field using Boxicons:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_file' => get_theme_file_path( 'assets/icons.txt' ),               // Path to icons.txt in the theme.
	'icon_css'  => 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css', // Boxicon CDN.
]

```

In the theme, create an `icons.txt` file under the folder `assets` with the following content:

assets/icons.txt

```
bx bx-heart
bx bx-bookmark-heart
bx bx-check-circle

```

When editing a post, you'll see Boxicons as follows:

If you want the icons to have nice labels, you need to create a JSON file to specify values and labels like this:

assets/icons.json

```
{
	"bx bx-heart": "Heart",
	"bx bx-bookmark-heart": "Bookmark",
	"bx bx-check-circle": "Check"
}

```

Don't forget to update your field settings to point `icon_file` to the new `icons.json` file:

```
[
	'name'       => 'Icon',
	'id'         => 'icon',
	'type'       => 'icon',
	'icon_file'  => get_theme_file_path( 'assets/icons.json' ),
	'icon_css' => 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
]

```

When editing a post, you'll see Boxicons as follows:

### Using SVGs[​](#using-svgs "Direct link to Using SVGs")

To use SVGs, you'll need to get SVGs for your icons first. There are a lot of icon libraries that support downloading SVGs for icons, such as [Boxicons](https://boxicons.com/) or [Tabler icons](https://tablericons.com/). You can pick a specific icon library to use, or use an app like [Iconbuddy](https://iconbuddy.app/) or [Icones](https://icones.netlify.app) to search across multiple libraries.

Depending on how you manage icons within your project, you can _download SVGs and put them in a specific directory_, or _copy the SVG codes_.

If you **download SVGs and put them in a specific directory**, then you need to define the field as follows:

Where "Icon dir" is the absolute or relative path to the icon directory from the WordPress root path.

If you use code to register the field, your field settings will look like this:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_dir'  => get_theme_file_path( 'assets/icons' ), // Path to the icon dir.
]

```

The plugin will get the **file names** and will show them as from the dropdown:

If you want to specify labels for icons, you'll need to create a JSON file as follows:

assets/icons.json

```
{
	"hippo": "Hippo",
	"tractor": "Tractor",
	"truck-monster": "Truck Monster"
}

```

Where keys are the file names and values are the icon labels.

Then in the MB Builder UI, set the "Icon file" parameter the absolute or relative path to that file from the WordPress root directory:

If you use code, the field settings look like this:

```
[
	'name'      => 'Icon',
	'id'        => 'icon',
	'type'      => 'icon',
	'icon_file' => get_theme_file_path( 'assets/icons.json' ), // Path to the icon file.
	'icon_dir'  => get_theme_file_path( 'assets/icons' ),
]

```

Then you'll see the labels as follows:

If you **use the SVG codes**, then you only need to set the "Icon file" parameter. In this case, it **must be a JSON file that contains icon names, labels (optional), and SVG codes**.

This is a sample JSON file:

assets/icons.json

```
{
	"heart": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 4.595a5.904 5.904 0 0 0-3.996-1.558 5.942 5.942 0 0 0-4.213 1.758c-2.353 2.363-2.352 6.059.002 8.412l7.332 7.332c.17.299.498.492.875.492a.99.99 0 0 0 .792-.409l7.415-7.415c2.354-2.354 2.354-6.049-.002-8.416a5.938 5.938 0 0 0-4.209-1.754A5.906 5.906 0 0 0 12 4.595zm6.791 1.61c1.563 1.571 1.564 4.025.002 5.588L12 18.586l-6.793-6.793c-1.562-1.563-1.561-4.017-.002-5.584.76-.756 1.754-1.172 2.799-1.172s2.035.416 2.789 1.17l.5.5a.999.999 0 0 0 1.414 0l.5-.5c1.512-1.509 4.074-1.505 5.584-.002z'></path></svg>",
	"bookmark": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M18 2H6c-1.103 0-2 .897-2 2v18l8-4.572L20 22V4c0-1.103-.897-2-2-2zm0 16.553-6-3.428-6 3.428V4h12v14.553z'></path></svg>",
	"check": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z'></path><path d='M9.999 13.587 7.7 11.292l-1.412 1.416 3.713 3.705 6.706-6.706-1.414-1.414z'></path></svg>"
}

```

If you want to set the icon labels, use the following format:

assets/icons.json

```
{
	"heart": {
		"label": "Heart",
		"svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 4.595a5.904 5.904 0 0 0-3.996-1.558 5.942 5.942 0 0 0-4.213 1.758c-2.353 2.363-2.352 6.059.002 8.412l7.332 7.332c.17.299.498.492.875.492a.99.99 0 0 0 .792-.409l7.415-7.415c2.354-2.354 2.354-6.049-.002-8.416a5.938 5.938 0 0 0-4.209-1.754A5.906 5.906 0 0 0 12 4.595zm6.791 1.61c1.563 1.571 1.564 4.025.002 5.588L12 18.586l-6.793-6.793c-1.562-1.563-1.561-4.017-.002-5.584.76-.756 1.754-1.172 2.799-1.172s2.035.416 2.789 1.17l.5.5a.999.999 0 0 0 1.414 0l.5-.5c1.512-1.509 4.074-1.505 5.584-.002z'></path></svg>"
	},
	"bookmark": {
		"label": "Bookmark",
		"svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M18 2H6c-1.103 0-2 .897-2 2v18l8-4.572L20 22V4c0-1.103-.897-2-2-2zm0 16.553-6-3.428-6 3.428V4h12v14.553z'></path></svg>"
	},
	"check": {
		"label": "Check",
		"svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z'></path><path d='M9.999 13.587 7.7 11.292l-1.412 1.416 3.713 3.705 6.706-6.706-1.414-1.414z'></path></svg>"
	}
}

```

When you edit a post, you'll see this field like this:

## Settings[​](#settings "Direct link to Settings")

Let's see a brief description of them before going into the steps of using a custom icon library:

| Name      | Key        | Description                                                                                    |
| --------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Icon set  | icon\_set  | The name of your icon set.                                                                     |
| Icon file | icon\_file | The full path to the icon file definition, which can be a text or JSON file.                   |
| Icon CSS  | icon\_css  | URL to the icon CSS file. It's required only when you use icons as an icon font (e.g. no SVG). |
| Icon dir  | icon\_dir  | Full path to the folder that contains all SVGs of icons.                                       |

## Data[​](#data "Direct link to Data")

This field saves the icon name (e.g. **CSS class** if you use an icon font) into the database.

If the field is cloneable, the value is stored as a serialized array in a single row in the database.

## Template usage[​](#template-usage "Direct link to Template usage")

### Output format[​](#output-format "Direct link to Output format")

If you use an **icon font**, Meta Box will automatically enqueue the CSS file of the icon font (which you define in the `icon_css` parameter). The plugin will output an icon font in the format of:

```
<span class="my-icon-class"></span>

```

In other cases where you use Font Awesome Free/Pro or your own icon library with SVG available, the plugin will output the SVG directly.

### Examples[​](#examples "Direct link to Examples")

**Getting the selected icon name (CSS class):**

```
<?php $icon = rwmb_meta( 'my_field_id' ); ?>
<p>Selected: <?= $value ?></p>

```

**Displaying the selected icon (as an icon font or SVG):**

```
<?php rwmb_the_value( 'my_field_id' ) ?>

```
