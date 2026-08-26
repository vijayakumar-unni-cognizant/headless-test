# Client Library Patterns for AEM Components

How runtime CSS/JS and dialog clientlibs are wired in this project. The runtime path is webpack-driven; the dialog path is the classic `ui.apps` clientlib.

## Table of Contents

- [Runtime Styles & JS — ui.frontend Webpack Partials](#runtime-styles--js--uifrontend-webpack-partials)
  - [Where the files live](#where-the-files-live)
  - [How they reach the page](#how-they-reach-the-page)
  - [What NOT to do](#what-not-to-do)
- [MANDATORY: Every Component Needs CSS](#mandatory-every-component-needs-css)
- [SCSS Architecture (BEM)](#scss-architecture-bem)
  - [Basic Template](#basic-template)
  - [BEM Naming](#bem-naming)
- [SCSS Checklist](#scss-checklist)
- [JavaScript Pattern](#javascript-pattern)
  - [Component Runtime JS](#component-runtime-js)
- [Dialog Clientlib (ui.apps)](#dialog-clientlib-uiapps)
  - [File Structure](#file-structure)
  - [Configuration Files](#configuration-files)
  - [Including the Dialog Clientlib](#including-the-dialog-clientlib)
- [Dialog JavaScript Pattern](#dialog-javascript-pattern)
  - [Key Requirements](#key-requirements)
  - [`granite:class` Placement Guide](#graniteclass-placement-guide)
  - [Dialog XML Examples](#dialog-xml-examples)
- [Clientlib Types Summary](#clientlib-types-summary)
- [Mockup Analysis Workflow](#mockup-analysis-workflow)

---

## Runtime Styles & JS — ui.frontend Webpack Partials

Project components do **not** ship a per-component runtime clientlib in `ui.apps`. Styles and JS live as partials under `ui.frontend/src/main/webpack/components/`, are bundled by webpack, and are delivered via the existing site-wide clientlib `{project}.site`.

### Where the files live

```
ui.frontend/src/main/webpack/components/
├── _{component-name}.scss   ← required for every component with UI
└── _{component-name}.js     ← optional; only when the component needs runtime interactivity
```

Naming rules:

- Kebab-case, leading underscore (SCSS partial convention).
- One file per component — flat directory, no subfolders.
- Matches existing partials: `_card.scss`, `_hero.scss`, `_app-promo.scss`, `_helloworld.js`.

### How they reach the page

- `ui.frontend/src/main/webpack/site/main.scss` already glob-imports them: `@import '../components/**/*.scss';`
- `ui.frontend/src/main/webpack/site/main.ts` already glob-imports them: `import '../components/**/*.js';`
- The webpack build emits the bundle into the site clientlib at `ui.apps/.../clientlibs/clientlib-site/` (category `{project}.site`, declared in its `.content.xml`).
- The page template loads `{project}.site` site-wide — no per-component wiring needed.

### What NOT to do

- Do **not** create `ui.apps/.../clientlibs/clientlib-{component-name}/` for runtime CSS/JS. (Dialog clientlibs are a separate case — see below.)
- Do **not** add `<sly data-sly-call="${clientlib.css @ categories='...'}"/>` or `${clientlib.js ...}` to the component HTL. The site clientlib already delivers them.
- Do **not** edit `main.scss`, `main.ts`, or `clientlib-site` to register a new partial. The glob imports pick it up automatically.

---

## MANDATORY: Every Component Needs CSS

**MUST CREATE** a SCSS partial for every component that has UI rendering.

When creating a component:

1. ALWAYS create `ui.frontend/src/main/webpack/components/_{component-name}.scss`.
2. ALWAYS analyze mockup images (or Figma design) to extract visual requirements.
3. ALWAYS include base styles, responsive breakpoints, and accessibility CSS.
4. NEVER skip the partial unless the component has zero UI output.

---

## SCSS Architecture (BEM)

### Basic Template

```scss
/**
 * Component: {component-name}
 */

/* Base component styles */
.cmp-{component-name} {
    display: block;
    position: relative;
}

/* Element: Title */
.cmp-{component-name}__title {
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

/* Element: Content */
.cmp-{component-name}__content {
    padding: 1rem;
}

/* Element: List — navigation columns (header, footer) MUST stack vertically */
.cmp-{component-name}__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;   /* explicit: prevents horizontal stacking inside flex parents */
}

.cmp-{component-name}__item {
    margin-bottom: 0.5rem;
}

/* Element: Link */
.cmp-{component-name}__link {
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
}

.cmp-{component-name}__link:hover,
.cmp-{component-name}__link:focus {
    text-decoration: underline;
    outline: 2px solid currentColor;
    outline-offset: 2px;
}

/* Modifier: Empty state */
.cmp-{component-name}--empty {
    border: 2px dashed #ccc;
    padding: 1rem;
    text-align: center;
    color: #666;
}

/* Responsive: Tablet */
@media (min-width: 768px) {
    .cmp-{component-name} {
        padding: 1.5rem;
    }

    .cmp-{component-name}__title {
        font-size: 2rem;
    }
}

/* Responsive: Desktop */
@media (min-width: 1024px) {
    .cmp-{component-name} {
        padding: 2rem;
    }
}
```

### BEM Naming

```
.cmp-{component}             - Block (component root)
.cmp-{component}__{element}  - Element (child)
.cmp-{component}--{modifier} - Modifier (variant)
```

---

## Page Container Pattern (full-width sections)

Components that span the full viewport width (hero, CTA strip, feature grid, testimonial, footer) **must** wrap their content in an inner container that constrains and centers the readable content:

```scss
/* Full-width section wrapper */
.cmp-{component-name} {
    width: 100%;
    background: $color-surface;
    padding: $spacing-xl 0;
}

/* Inner content container — constrains width and centers */
.cmp-{component-name}__container {
    max-width: $layout-max-width;   /* define in _variables.scss: $layout-max-width: 1280px */
    margin: 0 auto;
    padding: 0 $spacing-md;

    @media (min-width: $bp-desktop) {
        padding: 0 $spacing-lg;
    }
}
```

Add `$layout-max-width` to `_variables.scss` if not already present:
```scss
//== Layout
$layout-max-width: 1280px;
```

**Never** apply `max-width` to the outermost component block — always to the inner `__container`. The outermost block must be free to carry full-bleed background colors and images.

---

## Image Sizing Contract (MANDATORY for every embedded image)

**An embedded Core Image (`core/wcm/components/image/v3/image`) and a Core Teaser image render at the rendition's native pixel width — up to the largest `allowedRenditionWidths` value in the image policy (commonly `1600`).** With no CSS size constraint, the `<img>` paints at that intrinsic width. On a page where the parent's flex/grid layout has not resolved (e.g. a Style-System container variant whose class landed on the wrong element — see [`create-editable-template/references/policies.md`](../../create-editable-template/references/policies.md) and `{best-practices}/references/style-system-dom-contracts.md` §1), there is no width to shrink to, so a 4:3 asset inflates to ~1080px tall and the section looks broken. This is the single most common "image is huge / doesn't match the design" defect.

**Every component that embeds an image MUST ship this CSS in its SCSS partial. It is the floor — it does not depend on the layout resolving correctly.**

```scss
/* Element: image wrapper — the <div class="cmp-{name}__image"> that wraps the embedded Core Image */
.cmp-{component-name}__image {
    /* The rendered Core Image markup is  div.cmp-image > img.cmp-image__image  */
    .cmp-image,
    img {
        display: block;
        width: 100%;
        height: auto;      /* preserve aspect ratio — never let height run free */
        max-width: 100%;   /* never exceed the wrapper, regardless of rendition width */
    }
}
```

### Fixed-ratio images (cards, teasers, thumbnails, avatars, media tiles)

When the design shows the image cropped to a fixed shape (card thumbnail, circular avatar, 16:9 media tile), constrain the wrapper with `aspect-ratio` and cover-fit the image — otherwise a tall asset still blows the card height out:

```scss
.cmp-{component-name}__image {
    aspect-ratio: 16 / 9;        /* the design's crop ratio — 1/1 for avatars, 4/3 for cards, etc. */
    overflow: hidden;

    .cmp-image,
    img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;       /* fill the box, crop the overflow — no distortion, no runaway height */
    }
}

/* Circular avatar */
.cmp-{component-name}__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; }
}
```

### Rules

- **NEVER** leave an embedded Core Image or a Core Teaser image (`.cmp-teaser__image`) without at least `width:100%; height:auto; max-width:100%`.
- Selectors must target **both** `img` **and** the Core wrapper (`.cmp-image` / `.cmp-teaser__image .cmp-image`) — the Adaptive Image Servlet renders `<div class="cmp-image"><img class="cmp-image__image"></div>`, so a bare `img` rule can miss the wrapper's own size.
- For Teaser variants, scope it under the variant + inner element per `{best-practices}/references/style-system-dom-contracts.md` §1: `.cmp-teaser--{variant} .cmp-teaser__image img { … }`.
- `aspect-ratio` + `object-fit: cover` is required wherever the design crops the image to a shape; plain `width:100%; height:auto` is the minimum for free-flowing content images.

---

## SCSS Checklist

Every component SCSS MUST include:

- [ ] Base component class (`.cmp-{component-name}`)
- [ ] Element classes for all major DOM elements
- [ ] Hover and focus states for interactive elements
- [ ] Empty state styling for authoring mode
- [ ] At least 2 responsive breakpoints (768px, 1024px)
- [ ] Accessibility: focus outlines, color contrast
- [ ] Full-width section components have `__container` with `max-width: $layout-max-width; margin: 0 auto`
- [ ] Navigation list elements (`__list`) use `flex-direction: column` to prevent horizontal stacking
- [ ] **Every embedded image (Core Image or Teaser image) has the Image Sizing Contract** — at minimum `img, .cmp-image { width:100%; height:auto; max-width:100% }`; fixed-ratio (card/teaser/avatar/media) images add `aspect-ratio` + `object-fit:cover`. An unconstrained embedded image renders at its native rendition width (up to 1600px) and is the #1 "image too big" defect.

---

## JavaScript Pattern

### Component Runtime JS

Create `_{component-name}.js` under `ui.frontend/src/main/webpack/components/` **only** when the component needs interactivity. Follow the existing `_helloworld.js` shape — IIFE, `data-cmp-is="{component-name}"` root selector, `data-cmp-hook-{component-name}="..."` for element hooks, MutationObserver so author-mode drag/drop re-initializes the component.

```javascript
// Example of how a component should be initialized via JavaScript

(function() {
    "use strict";

    // Best practice:
    // Don't rely on the DOM structure or CSS selectors — use dedicated data attributes
    // to identify all elements that the script needs to interact with.
    var selectors = {
        self:     '[data-cmp-is="{component-name}"]',
        button:   '[data-cmp-hook-{component-name}="button"]'
    };

    function Component(config) {

        function init(config) {
            // Prevent re-initialization by removing the marker attribute.
            config.element.removeAttribute("data-cmp-is");

            var button = config.element.querySelector(selectors.button);
            if (button) {
                button.addEventListener("click", onClick);
            }
        }

        function onClick(event) {
            event.preventDefault();
            // Handle click
        }

        if (config && config.element) {
            init(config);
        }
    }

    // Use a MutationObserver so components dropped onto the page in author mode
    // (or modified via dialog) are also initialized.
    function onDocumentReady() {
        var elements = document.querySelectorAll(selectors.self);
        for (var i = 0; i < elements.length; i++) {
            new Component({ element: elements[i] });
        }

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var body     = document.querySelector("body");
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                var nodesArray = [].slice.call(mutation.addedNodes);
                if (nodesArray.length > 0) {
                    nodesArray.forEach(function(addedNode) {
                        if (addedNode.querySelectorAll) {
                            var elementsArray = [].slice.call(addedNode.querySelectorAll(selectors.self));
                            elementsArray.forEach(function(element) {
                                new Component({ element: element });
                            });
                        }
                    });
                }
            });
        });

        observer.observe(body, { subtree: true, childList: true, characterData: true });
    }

    if (document.readyState !== "loading") {
        onDocumentReady();
    } else {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
    }

}());
```

HTL counterpart for the hooks:

```html
<section class="cmp-{component-name}" data-cmp-is="{component-name}">
    <button class="cmp-{component-name}__button" data-cmp-hook-{component-name}="button">…</button>
</section>
```

---

## Dialog Clientlib (ui.apps)

> Dialog clientlibs still live in `ui.apps` because they target the AEM authoring UI, depend on `cq.authoring.dialog`, and are attached to the dialog node via `extraClientlibs`. They are **not** part of the publish-side webpack bundle.

Create a dialog clientlib only when the dialog needs custom JavaScript (conditional show/hide, validation, multifield item logic).

### File Structure

```
ui.apps/src/main/content/jcr_root/apps/{project}/clientlibs/clientlib-{component-name}-dialog/
├── .content.xml
├── js.txt
└── js/
    └── {component-name}-dialog.js
```

### Configuration Files

**`.content.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:primaryType="cq:ClientLibraryFolder"
    categories="[{project}.{component-name}.dialog]"
    dependencies="[cq.authoring.dialog]"/>
```

**`js.txt`**

```
#base=js
{component-name}-dialog.js
```

### Including the Dialog Clientlib

Attach the dialog clientlib to the dialog root node via `extraClientlibs`:

```xml
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="nt:unstructured"
    jcr:title="{Component Name}"
    sling:resourceType="cq/gui/components/authoring/dialog"
    extraClientlibs="[{project}.{component-name}.dialog]">
    <!-- dialog content -->
</jcr:root>
```

---

## Dialog JavaScript Pattern

> **CRITICAL**: Coral UI components render asynchronously. You MUST use `foundation-contentloaded`
> (not `dialog-ready`) and the Foundation Field API for reliable field manipulation.

```javascript
/**
 * Dialog clientlib for conditional field validation
 * Category: {project}.{component-name}.dialog
 *
 * IMPORTANT:
 * - Use "foundation-contentloaded" event (fires AFTER Coral UI components are rendered)
 * - Use adaptTo("foundation-field").setDisabled() for proper Granite UI field control
 * - Apply granite:class to the field node in dialog XML (see granite:class placement guide below)
 */
(function(document, $) {
    "use strict";

    /**
     * Selector for the controlling field (e.g., link text input)
     * NOTE: granite:class must be on the textfield node in dialog XML
     */
    var LINK_TEXT_SELECTOR = ".cmp-componentname__link-text";

    /**
     * Selector for the dependent field (e.g., link URL pathfield)
     */
    var LINK_URL_SELECTOR = ".cmp-componentname__link-url";

    /**
     * Toggle the disabled state of dependent field based on controlling field value
     */
    function toggleDependentField($controlField, $dependentField) {
        var controlValue = $controlField.val();

        if (controlValue && controlValue.trim().length > 0) {
            // Enable the dependent field
            $dependentField.prop("disabled", false);
            $dependentField.adaptTo("foundation-field").setDisabled(false);
        } else {
            // Disable the dependent field
            $dependentField.prop("disabled", true);
            $dependentField.adaptTo("foundation-field").setDisabled(true);
        }
    }

    /**
     * Initialize dialog functionality when dialog content is fully loaded
     * NOTE: "foundation-contentloaded" fires AFTER Coral UI components are rendered,
     * unlike "dialog-ready" which may fire before inputs exist in the DOM
     */
    $(document).on("foundation-contentloaded", function(e) {
        var $dialog = $(e.target);

        // Find all multifield items in the dialog
        $dialog.find("coral-multifield-item").each(function() {
            var $multifieldItem = $(this);
            var $controlField = $multifieldItem.find(LINK_TEXT_SELECTOR);
            var $dependentField = $multifieldItem.find(LINK_URL_SELECTOR);

            if ($controlField.length && $dependentField.length) {
                // Set initial state
                toggleDependentField($controlField, $dependentField);

                // Listen for changes on controlling field
                $controlField.on("input change", function() {
                    toggleDependentField($controlField, $dependentField);
                });
            }
        });
    });

    /**
     * Handle multifield add event - initialize new items
     */
    $(document).on("coral-collection:add", function(e) {
        var $addedItem = $(e.target);

        // Check if this is a multifield item
        if ($addedItem.is("coral-multifield-item")) {
            var $controlField = $addedItem.find(LINK_TEXT_SELECTOR);
            var $dependentField = $addedItem.find(LINK_URL_SELECTOR);

            if ($controlField.length && $dependentField.length) {
                // Set initial state for new item
                toggleDependentField($controlField, $dependentField);

                // Listen for changes on controlling field
                $controlField.on("input change", function() {
                    toggleDependentField($controlField, $dependentField);
                });
            }
        }
    });

})(document, Granite.$);
```

### Key Requirements

- **MUST** use `foundation-contentloaded` event (NOT `dialog-ready`) - ensures Coral UI is fully rendered
- **MUST** use `adaptTo("foundation-field").setDisabled()` for proper Granite UI field enable/disable
- **MUST** use `Granite.$` for jQuery in AEM dialogs
- **MUST** listen for `coral-collection:add` for multifield support
- **SHOULD** use BEM-style class names (e.g., `.cmp-componentname__field-name`)
- **SHOULD** apply `granite:class` to the field node in dialog XML (see placement guide below)

### `granite:class` Placement Guide

Always apply `granite:class` on the **dialog XML node** for the field. Where the CSS class ends up in the rendered HTML depends on the component type:

- **Simple fields** (textfield, textarea, checkbox, numberfield): Apply `granite:class` directly on the field node. Granite UI renders the class on the input element itself.
- **Complex fields** (pathfield, select/dropdown): Apply `granite:class` on the field node. Granite UI propagates it to the rendered input/wrapper — your JS selector will find it on the coral component wrapper.
- **Multifield**: Apply `granite:class` on the **multifield node itself**, NOT on child field nodes. Child fields inside a multifield are duplicated per item, so target the multifield container.
- **Show/hide targets** (containers, wrapper divs): Apply `granite:class` on the wrapper node that should be shown/hidden.

#### Quick Reference: `granite:class` Placement by Component

| Component | `sling:resourceType` | Where to put `granite:class` | Rendered on |
|-----------|----------------------|------------------------------|-------------|
| Textfield | `.../form/textfield` | Field node | `<input>` element |
| Textarea | `.../form/textarea` | Field node | `<textarea>` element |
| Checkbox | `.../form/checkbox` | Field node | `<coral-checkbox>` wrapper |
| Numberfield | `.../form/numberfield` | Field node | `<coral-numberinput>` wrapper |
| Pathfield | `.../form/pathfield` | Field node | `<coral-pathfield>` wrapper |
| Select | `.../form/select` | Field node | `<coral-select>` wrapper |
| Multifield | `.../form/multifield` | **Multifield node** (not children) | `<coral-multifield>` wrapper |
| Container | `.../container` | Container/wrapper node | `<div>` wrapper |

> **Tip:** When in doubt, inspect the rendered dialog HTML in browser DevTools to verify where the class appears. Right-click the field in the dialog → Inspect Element, and search for your class name.

### Dialog XML Examples

Correct `granite:class` placement on field nodes:

```xml
<!-- Simple field: granite:class goes on the field node -->
<linkText
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
    fieldLabel="Link Text"
    name="./linkText"
    granite:class="cmp-componentname__link-text"/>

<!-- Complex field: granite:class also goes on the field node (Granite propagates it) -->
<linkURL
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/pathfield"
    fieldLabel="Link URL"
    name="./linkURL"
    granite:class="cmp-componentname__link-url"/>

<!-- Multifield: granite:class goes on the MULTIFIELD node, not child fields -->
<links
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/multifield"
    fieldLabel="Links"
    composite="{Boolean}true"
    granite:class="cmp-componentname__links-multifield">
    <field jcr:primaryType="nt:unstructured"
        sling:resourceType="granite/ui/components/coral/foundation/container">
        <!-- Child fields inside multifield do NOT get granite:class -->
        <linkText
            jcr:primaryType="nt:unstructured"
            sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
            fieldLabel="Link Text"
            name="./linkText"/>
    </field>
</links>

<!-- Show/hide target container -->
<advancedSettings
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/container"
    granite:class="cmp-componentname__advanced-settings">
    <!-- fields inside this container -->
</advancedSettings>
```

---

## Clientlib Types Summary

| Type | Where it lives | Category | How it's loaded |
|------|----------------|----------|-----------------|
| **Component runtime CSS/JS** | `ui.frontend/src/main/webpack/components/_{name}.scss` + `_{name}.js` | Bundled into `{project}.site` | Page template loads `{project}.site` site-wide. Glob imports in `site/main.scss` and `site/main.ts` pick the partials up automatically. |
| **Dialog clientlib** | `ui.apps/.../clientlibs/clientlib-{name}-dialog/` | `{project}.{name}.dialog` (depends on `cq.authoring.dialog`) | `extraClientlibs` property on the dialog root node. Author-only. |

---

## Mockup Analysis Workflow

**If mockup/image provided:**

1. Identify layout structure (flexbox, grid, block)
2. Extract spacing values (padding, margins)
3. Note typography (font sizes, weights, colors)
4. Identify interactive states (hover, focus, active)
5. Check for responsive variations

**If no mockup:**

1. Create basic structural CSS
2. Include focus/hover states
3. Add responsive breakpoints
