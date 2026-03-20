# Frontend Forms Guide

Some projects include a form framework plugin (currently `tghp-mb-contact`, found at `src/plugins/tghp-mb-contact/`) that handles the plumbing of form rendering, validation, submission storage, email notifications, and reCAPTCHA. If the project has this plugin, forms use the system described here. If it doesn't, the project doesn't have frontend forms via this pattern.

## How it works

The form system has two layers:

1. **The form framework plugin** — handles rendering, validation, the `contact_submission` post type, email notifications, and reCAPTCHA. You rarely need to modify this plugin directly — treat it as an abstraction layer.

2. **The site plugin's Form definers** — form definitions live in `inc/Metaboxio/Form/` in the site plugin, using the same definer pattern as post types and blocks. Each form is a class implementing `FormDefinerInterface`. This is where all your work happens.

Submissions flow through: form render → validation → post creation → email notification → post-processing → redirect. The framework handles most of this automatically — you mainly define fields and optionally add post-processing logic.

## Creating a new form

### 1. The definer class

Create a class in `inc/Metaboxio/Form/` implementing `FormDefinerInterface`:

```php
namespace TGHP\<Name>\Metaboxio\Form;

class ContactForm implements FormDefinerInterface
{
    public function getName(): string
    {
        return 'contact';
    }

    public function define(): array
    {
        return [
            'title' => 'Contact Form',
            'fields' => [
                [
                    'id' => 'sender_name',
                    'name' => 'Your Name',
                    'type' => 'text',
                    'required' => true,
                    'email' => true,
                ],
                [
                    'id' => 'sender_email',
                    'name' => 'Email Address',
                    'type' => 'email',
                    'required' => true,
                    'email' => true,
                ],
                [
                    'id' => 'message',
                    'name' => 'Message',
                    'type' => 'textarea',
                    'required' => true,
                    'email' => true,
                ],
                [
                    'id' => 'g-recaptcha',
                    'type' => 'recaptcha',
                ],
            ],
            'options' => [
                'confirmation' => 'Thanks for getting in touch!',
                'button_class' => 'button',
                'email' => [
                    'email' => _MB()->getSingleMetafieldValueFromOptions('contact_email'),
                    'title' => 'New contact form submission',
                ],
                'ajax' => true,
            ],
        ];
    }
}
```

### 2. Register the definer

Add it to `Form::_getDefiners()` in `inc/Metaboxio/Form.php`:

```php
protected function _getDefiners()
{
    return [
        new Form\ContactForm(),
    ];
}
```

### 3. Render in a template

Use the `tghpcontact_form()` function in your template:

```php
<?php tghpcontact_form('contact'); ?>
```

The function wraps the form in `<div class="tghpform tghpform--contact">` and handles rendering via Meta Box's frontend submission system.

Alternatively, use the shortcode (less common in templates, more common in content):

```
[tghpcontact_form id="contact"]
```

## Form definition structure

The array returned by `define()` has this shape:

```php
[
    'title' => string,         // Form title (used in admin, email subject)
    'fields' => array,         // Meta Box field arrays (see below)
    'options' => [
        'confirmation' => string,       // Success message shown after submission
        'button_class' => string,       // CSS class(es) for the submit button
        'submit_class' => string,       // Additional submit-specific class
        'submit_text_sr_only' => bool,  // Wrap submit text in screen-reader-only span
        'email' => [
            'email' => string,          // Recipient email address
            'title' => string,          // Email subject line
        ],
        'redirect' => string,           // URL to redirect after submission (optional)
        'ajax' => bool,                 // Submit via AJAX (true) or full page reload (false)
        'delete_after_processing' => bool, // Delete the submission post after processing
        'class' => string,              // Additional CSS class on form wrapper
    ],
    'tghp_send_email' => bool,  // Set to false to disable email notification entirely
]
```

## Field definitions

Fields use standard Meta Box field types. Key additional properties for the form system:

- **`email`** (bool) — include this field's value in the notification email. Fields without `email: true` are stored but not emailed.
- **`required`** (bool) — field is required for submission
- **`placeholder`** (string) — placeholder text

Field IDs are automatically prefixed with `_tghpcontact_` by the framework — use plain IDs in your definition. The same Meta Box field types are available (text, email, textarea, select, checkbox, file, etc.) — consult `resources/metabox/index.md` for field type options.

### reCAPTCHA

Add a reCAPTCHA field with:

```php
[
    'id' => 'g-recaptcha',
    'type' => 'recaptcha',
]
```

This requires `RECAPTCHA_KEY_SITE_{FORM_ID}` and `RECAPTCHA_KEY_SECRET_{FORM_ID}` environment variables (uppercase form ID, hyphens replaced with underscores).

## Post-processing

For forms that need custom logic after submission (updating user profiles, managing subscriptions, calling external APIs), implement `FormAfterSubmissionProcessorInterface`:

```php
namespace TGHP\<Name>\Metaboxio\Form;

class UserDetails implements FormDefinerInterface, FormAfterSubmissionProcessorInterface
{
    public function getName(): string
    {
        return 'user-details';
    }

    public function define(): array
    {
        return [
            'title' => 'Update Details',
            'fields' => [ /* ... */ ],
            'options' => [
                'ajax' => false,
                'delete_after_processing' => true,
            ],
        ];
    }

    public function afterProcess($postId): void
    {
        // $postId is the contact_submission post
        // Read submitted values:
        $email = tghpcontact_get_submission_data($postId, 'email');

        // Do custom processing...
        // The framework auto-deletes the post if delete_after_processing is set
    }
}
```

The `afterProcess` hook fires after the submission post is created and email is sent. Use `tghpcontact_get_submission_data($postId, $key)` to read submitted values (auto-prefixes the key).

### Accessing the site plugin in form definers

If your form needs access to the site plugin instance (e.g. to read subscription types or user data), implement `FormBeforeDefineAccessesSiteClassInterface`:

```php
class GuestSubscribe implements FormDefinerInterface, FormBeforeDefineAccessesSiteClassInterface
{
    private $sitePlugin;

    public function beforeDefine($sitePlugin): void
    {
        $this->sitePlugin = $sitePlugin;
    }

    public function define(): array
    {
        // Can now use $this->sitePlugin to access orchestrator properties
        $types = $this->sitePlugin->subscriptions->getTypes();
        // ...
    }
}
```

## Pre-populating fields

For forms that edit existing data (user profiles, shipping addresses), set the `std` property on fields to pre-fill values:

```php
[
    'id' => 'first_name',
    'name' => 'First Name',
    'type' => 'text',
    'std' => wp_get_current_user()->first_name,
]
```

The `std` value can be a static value or computed at render time.

## Validation

The framework provides built-in validators for email, file, and reCAPTCHA fields. Custom validation can be added via filters:

- `tghpcontact_during_process` — validate during processing (all forms)
- `tghpcontact_during_process_{$formId}` — form-specific validation

Return a `WP_Error` to reject the submission.

## Email notification

By default, forms send an HTML email containing all fields marked with `email: true`. The email system:

- Formats values intelligently (checkboxes → yes/no, files → URLs, selects → "value (label)")
- Uses recipient and subject from the form's `email` option, falling back to the plugin's global settings
- Can be customised via filters: `tghpcontact_email_to`, `tghpcontact_email_subject`, `tghpcontact_email_content`

## Styling forms

Form styles use the `.tghpform` class. Look for existing form SCSS in `assets/src/sass/components/` (typically `_tghpform--critical.scss` and `_tghpform.scss`). Form layout mixins may exist in `assets/src/sass/abstracts/mixins/_forms.scss`.

## AJAX vs standard submission

- **`ajax: true`** — form submits without page reload. Success/error messages appear inline. Best for simple contact forms and subscribe forms.
- **`ajax: false`** — full page reload on submission. Use when post-processing needs to redirect (e.g. profile updates with success/error query params).
