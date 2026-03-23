# Gutenberg Blocks Guide

This project uses Meta Box's `mb-blocks` extension to create custom Gutenberg blocks. Each block is a definer class in `inc/Metaboxio/Block/` that extends `AbstractBlock`.

## What AbstractBlock gives you

`AbstractBlock` (implements `BlockDefinerInterface` and `MetaboxDefinerInterface`) provides significant boilerplate reduction:

- **`getCode()`** — auto-derived from the class name: `HeroSlider` → `hero-slider`, `PageHeader` → `page-header`
- **`getId()`** — returns `tghp-{code}-block` (e.g. `tghp-hero-slider-block`)
- **`render($attributes)`** — loads the block template from `templates/blocks/{code}/template.php` in the plugin, passing `$block` (the class instance) as a variable
- **`enqueueAdminBlockAssets()`** — returns a callback that enqueues `assets/dist/block--{code}.css` for the admin block preview

You only need to override `define()` to declare the block's fields.

## Creating a block

### 1. The definer class

The `define()` array inside a block class uses the same field structure as Meta Box's documentation. For field type options and settings, consult `resources/metabox/index.md`. For the broader pattern of how Meta Box definers work in this project (field groups, settings pages), see `resources/metabox-patterns.md`.

File: `inc/Metaboxio/Block/HeroSlider.php`

```php
namespace TGHP\<Name>\Metaboxio\Block;

class HeroSlider extends AbstractBlock
{
    public function define(): array
    {
        $blocks[] = [
            'id' => $this->getId(),
            'type' => 'block',
            'icon' => 'slides',
            'title' => 'Hero Slider',
            'category' => '<name>-blocks',
            'render_callback' => function ($attributes) {
                $this->render($attributes);
            },
            'enqueue_assets' => $this->enqueueAdminBlockAssets(),
            'fields' => [
                [
                    'id' => 'heading',
                    'name' => 'Heading',
                    'type' => 'text',
                ],
            ],
        ];

        return $blocks;
    }

    public function getHeading(): string
    {
        return mb_get_block_field('heading');
    }
}
```

Note: block fields do NOT use `Metabox::generateKey()` — they are accessed via `mb_get_block_field()` with plain IDs.

Define getter methods on the class for each field — this keeps template logic clean and provides a typed API.

### 2. Register the block

Add it to `Block::_getDefiners()` in `inc/Metaboxio/Block.php`:

```php
protected function _getDefiners()
{
    return [
        new Block\HeroSlider(),
        // ...other blocks
    ];
}
```

### 3. The block template

Create `templates/blocks/hero-slider/template.php` in the plugin:

```php
<?php
/**
 * @var $block TGHP\<Name>\Metaboxio\Block\HeroSlider
 */

$blockClassName = $block->getCode();
?>
<?php if($blockClassName): ?>
    <div class="block <?= $blockClassName ?>">
        <div class="<?= $blockClassName ?>__title">
            <?= $block->getTitle() ?>
        </div>
    </div>
<?php endif ?>
```

The template receives `$block` — the class instance — and should call its getter methods rather than accessing fields directly.

### 4. Block styles

Block SCSS lives in `assets/src/sass/components/blocks/` in the theme, named with a `--critical` suffix:

```
assets/src/sass/components/blocks/_hero-slider--critical.scss
```

Import it from the `_blocks--critical.scss` manifest in the same directory. The Asset class will auto-discover the compiled CSS.

For admin block preview styles, create `assets/dist/block--hero-slider.css` — `enqueueAdminBlockAssets()` looks for this file automatically.

## Shared block template partials

When multiple blocks share common markup (e.g. a standard header with pre-title, title, and description), extract shared partials into `templates/blocks/common/`. For example:

- `templates/blocks/common/standard-header.php` — shared header section
- `templates/blocks/common/people-container.php` — shared people grid layout

Load these from block templates using the plugin's template system or direct `include`.

## Allowed block types

The `Block` class's `setAllowedBlockTypes()` method restricts which blocks appear in the editor. It whitelists:

1. All custom blocks in the `<name>-blocks` category
2. A configurable set of core blocks (typically image, paragraph, heading, list, embed)

Different post types may have different allowed sets — for instance, article posts might allow only a subset of blocks while pages get the full set. Check `Block.php`'s `setAllowedBlockTypes()` method for the project's specific configuration.
