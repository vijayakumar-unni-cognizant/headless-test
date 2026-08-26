# URL Design Rules for AEM Component Creation

Rules for rebuilding the UI of a reference web page URL as AEM components, templates, and a sample page.

## Table of Contents

- [Rule 1: The URL is a Design Reference Only](#rule-1-the-url-is-a-design-reference-only)
- [Rule 2: Fetching the Reference URL](#rule-2-fetching-the-reference-url)
- [Rule 3: Page Decomposition into Components](#rule-3-page-decomposition-into-components)
- [Rule 4: Design Token Extraction → `_variables.scss`](#rule-4-design-token-extraction--_variablesscss)
- [Rule 5: Component Reuse Preference](#rule-5-component-reuse-preference)
- [Rule 6: HTL Is Authored Fresh — Not Copied from the URL DOM](#rule-6-htl-is-authored-fresh--not-copied-from-the-url-dom)
- [Rule 7: SCSS Partials Reference Variables — No Raw Values](#rule-7-scss-partials-reference-variables--no-raw-values)
- [Rule 8: Image Handling](#rule-8-image-handling)
- [Rule 9: Web Font Handling](#rule-9-web-font-handling)
- [Rule 10: Editable Template + Sample Page](#rule-10-editable-template--sample-page)
- [Rule 11: Fidelity Verification Checklist](#rule-11-fidelity-verification-checklist)

---

## Rule 1: The URL is a Design Reference Only

This is the **load-bearing constraint** for the entire URL workflow.

The reference URL provides:

- **Visual tokens:** colors, font families, font sizes, line heights, weights, spacing scale, border radii, breakpoints.
- **Web fonts:** sources (Google Fonts, Adobe Fonts, self-hosted) and which families/weights are actually used.
- **Block-level layout:** the vertical order, count, and rough nature of the page sections (hero, header, nav, feature cards, CTA strip, footer, etc.).
- **Component identity hints:** if a block visibly behaves like a teaser/card/accordion/tabs, that's a hint to extend the matching Core Component.

The reference URL does **NOT** provide:

- HTL structure. The URL's `<div class="...">` tree must not be transplanted into the component HTL.
- CSS class names. Never copy the URL's class names; always emit BEM (`cmp-{component-name}`, `cmp-{component-name}__{element}`, `cmp-{component-name}--{modifier}`).
- JavaScript code. The URL's JS is not used. If the design implies interactivity, author fresh JS following the existing project pattern in `_helloworld.js` (see `clientlib-patterns.md` → Component Runtime JS).
- Inline tracking, analytics, third-party widget snippets, ad scripts, cookie banners, or vendor SDKs.
- Markup-embedded tokens (e.g., a `style="color: #FF6600"` on a node never lands as inline style in HTL — it becomes a `$brand-primary` SCSS variable).

Every component generated from a URL input still runs through the standard AEMaaCS flow: Sling Model + dialog XML + HTL + ui.frontend SCSS partial + unit test + (optional) dialog clientlib. Same conventions, same file paths, same patterns as every other component this skill produces.

---

## Rule 2: Fetching the Reference URL

### Primary path: WebFetch

Call `WebFetch` with a prompt that explicitly asks for **raw HTML and inline CSS** rather than a natural-language summary. Example prompt:

> "Return the full HTML markup of this page including the `<head>` (with `<link rel='stylesheet'>` and `<link rel='preconnect'>` tags), any inline `<style>` blocks, the full `<body>` markup, and a list of all stylesheet URLs referenced. Do not summarize. Do not paraphrase."

Then, for each same-origin stylesheet URL found in the first response, run a follow-up `WebFetch` to retrieve the CSS contents.

### Fallback: user-pasted content

WebFetch cannot handle:

- Single-Page Applications that render the DOM at runtime (React, Next.js, Vue, Angular SPAs in CSR mode) — the initial HTML is a near-empty shell.
- Auth-gated pages (login required, session cookies, SAML, OAuth).
- Geo-blocked or rate-limited URLs.
- Pages behind a corporate proxy or Zscaler interception.

When the fetch returns thin or unusable content, **STOP and ask the user** to paste:

1. The **rendered HTML** (post-JavaScript) — typically captured by opening the page in a browser, right-clicking → Inspect, then copying the full `<html>` subtree from DevTools (NOT View Source, which shows the pre-render shell).
2. The **contents of each linked CSS file**, with the original filename and URL for each.

Do not proceed on thin content — token extraction and decomposition will be wrong, which defeats the entire purpose of having a design reference.

### Sanitize before parsing

Before extracting tokens, strip:

- Cookie consent banners, GDPR overlays.
- Tracking pixels, analytics scripts, third-party widgets (chat widgets, ad units, embed players).
- Vendor SDK output (Optimizely, Segment, Adobe Launch, etc.).
- A/B test variants — pick the dominant visual variant if multiple are visible.

These are not part of the design system; they're operational noise.

---

## Rule 3: Page Decomposition into Components

Walk the page top-to-bottom and group adjacent DOM into **semantic blocks**. Each semantic block becomes one candidate AEM component.

### Decomposition heuristics

- **Continuous full-width band with a single dominant message** → one block (hero, CTA strip, banner).
- **Repeating sibling structure** (3 identical cards, a grid of tiles, a list of articles) → one block representing the parent, with a multifield item model for the repeated child.
- **Discrete navigation region** (top nav, breadcrumb, side rail, footer nav) → its own block.
- **Inline rich content** (single article with mixed text + image) → one block with multiple authorable fields.
- **Anything visually self-contained** with its own padding/background and clear semantic role → its own block.

### Propose-then-confirm

Echo back the breakdown to the user **before** scaffolding anything. Use this table shape:

```
Reference URL: <url>
Proposed component breakdown ({N} components):

| # | Block (URL order) | Proposed component name | Role           | Reuse plan                                     |
|---|-------------------|-------------------------|----------------|------------------------------------------------|
| 1 | Top navigation    | (existing) navigation   | site nav       | EXTEND core navigation v2 (sling:resourceSuperType) |
| 2 | Page hero         | hero                    | landing hero   | NEW component                                  |
| 3 | Feature cards (×3)| feature-grid + feature-card | card grid  | NEW container + new multifield item            |
| 4 | CTA strip         | cta-banner              | conversion CTA | NEW component                                  |
| 5 | Footer            | (existing) footer       | site footer    | EXTEND existing project footer                 |

Confirm this list (and rename components if you prefer) before I scaffold.
```

Wait for explicit confirmation. Do not assume.

### Logo detection

When decomposing a header or footer block, identify the brand logo element. **Logos are always image fields — never text fields**, regardless of how the URL renders them (inline SVG, CSS background, `<img>` tag, or even a CSS-styled text span):

- **Dialog:** DAM `pathfield` for the logo image DAM reference + a `textfield` for alt text. Name them `logoImageReference` and `logoAlt`.
- **HTL:** `<img src="${model.logoImageReference @ context='uri'}" alt="${model.logoAlt @ context='attribute'}" class="cmp-{component}__logo"/>` — or embed Core Image if the logo needs responsive renditions.
- **NEVER** model a logo as a `textfield`, `richtext`, or plain text property — even if it appears on the reference URL as styled text or an SVG with text nodes.

### Naming

Use lowercase kebab-case, project-appropriate names (`hero`, `feature-card`, `cta-banner`). Do not use product/marketing labels from the URL — they're brittle and rarely match the AEM author's mental model.

---

## Rule 4: Design Token Extraction → `_variables.scss`

### Tokens to extract

| Token category | What to extract                                                                                                  | Where it lands in `_variables.scss`         |
|----------------|------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| Brand colors   | Primary, secondary, accent, background, surface, foreground, link, link-hover, error, success                    | `//== Brand colors`                         |
| Typography     | Heading font, body font, monospace font, fallback stacks                                                          | `//== Typography` (append to existing block)|
| Type scale     | Sizes for h1–h6 + body + small; line heights and weights for each                                                 | `//== Typography scale`                     |
| Spacing scale  | The 4–8 most-used spacing values (e.g., `4px`, `8px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`)             | `//== Spacing`                              |
| Border radius  | Common radii used across cards, buttons, inputs                                                                   | `//== Radius`                               |
| Breakpoints    | The `@media (min-width: …)` breakpoints in the URL's CSS, normalized (typically 480 / 768 / 1024 / 1440)         | `//== Breakpoints`                          |
| Shadows        | The 1–3 elevation shadows used                                                                                    | `//== Shadows`                              |

### Additive merge protocol

`_variables.scss` already contains site-level tokens (e.g., `$font-family`, `$color-foreground`, `$color-background`, `$color-link`). Step 3.12 of `SKILL.md` is **strictly additive**:

1. **Read** the current file first.
2. For each extracted token, decide:
   - **Reuse the existing variable** if the URL value matches within a small tolerance (≤5% luminance difference for colors, ≤1px for sizes). Don't introduce `$color-brand-foreground` when `$color-foreground` already covers it.
   - **Append** a new variable under the appropriate `//== Section` header.
3. **Never delete or rename** an existing variable — other components may depend on it.
4. **Group new tokens** under section comments (`//== Brand colors`, etc.) — do not interleave with existing sections without a clear group break.
5. **Document non-obvious choices** with a one-line comment when the URL token doesn't map cleanly (e.g., `$color-accent: #FF6600; // Mapped from 'btn-cta' background on URL`).

### Naming convention for new tokens

- Colors: `$color-{role}` (e.g., `$color-brand-primary`, `$color-brand-secondary`, `$color-surface`, `$color-text-muted`).
- Type scale: `$font-size-h1`, `$font-size-h2`, `$line-height-tight`, `$font-weight-bold`.
- Spacing: `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`, `$spacing-xl` (T-shirt sizes), OR `$spacing-4`, `$spacing-8`, `$spacing-16` (numeric) — pick **one** scheme and stay consistent with whatever is already in the file.
- Breakpoints: `$bp-mobile`, `$bp-tablet`, `$bp-desktop`, `$bp-wide`.

Avoid token names tied to specific products, campaigns, or marketing terms from the URL — they rot fast.

---

## Rule 5: Component Reuse Preference

Before creating a new component, **check whether an existing component covers the use case** — extending an existing component preserves the project's design system contracts and avoids duplicate maintenance.

### Decision order

1. **Project component already exists** under `/apps/[project]/components/` — extend via `sling:resourceSuperType="[project]/components/{existing-name}"`. Add fields via dialog merge if the existing component is missing what the URL needs.
2. **Core Component covers it** (teaser, card, list, navigation, button, image, embed, accordion, tabs, carousel, container) — extend via the Core Component's `sling:resourceSuperType` path. Load `references/extending-core-components.md` for the delegation pattern.
3. **Neither exists** — create new. Default to this only after #1 and #2 are ruled out.

### When to NOT extend

- The URL block's authoring model is fundamentally different from the existing component (e.g., a "feature card" with required external API integration shouldn't extend the static teaser).
- The URL block needs to be themable in a way the parent component locks down.
- The parent component is deprecated.

Document the decision in the Step 3 confirmation table (the "Reuse plan" column from Rule 3).

---

## Rule 6: HTL Is Authored Fresh — Not Copied from the URL DOM

When generating each component's `.html` file, the source of truth is:

- The **proposed structure** confirmed in Rule 3 (what blocks exist, in what order).
- The **dialog specification** (which fields the component exposes).
- The **AEM conventions** in `references/htl-patterns.md` (BEM classes, `data-sly-use.model`, `data-sly-test` empty states, i18n on static text, Core Image embedding).

The URL's HTML is **never** the source. You can glance at it to confirm the semantic role of an element (is this an `<h1>` or just visual styling on a `<p>`?), but the structure you emit is fresh.

### Anti-patterns to avoid

- Copying class names from the URL (e.g., `class="hero__title hero__title--lg"` from the URL → must become `class="cmp-hero__title"` in your HTL).
- Pasting `<div>` wrappers from the URL just because they appear in the source. AEM HTL should be the minimum semantic structure needed to render the dialog content.
- Inlining `style="..."` attributes. All styling lives in the SCSS partial.
- Embedding `<script>` tags. JS goes in `_{component-name}.js` under `ui.frontend/.../components/` only if interactivity is required.
- Hardcoding text. All authorable strings come from the Sling Model; all static strings use HTL i18n expressions (`${'Submit' @ i18n}`).

---

## Rule 7: SCSS Partials Reference Variables — No Raw Values

Each `_{component-name}.scss` partial generated in Step 3.7 must reference variables from `_variables.scss` rather than re-declaring raw values.

### Right

```scss
.cmp-hero {
    background: $color-brand-primary;
    padding: $spacing-lg $spacing-md;
}

.cmp-hero__title {
    color: $color-foreground;
    font-family: $font-family-heading;
    font-size: $font-size-h1;
    line-height: $line-height-tight;
    font-weight: $font-weight-bold;
}

@media (min-width: $bp-tablet) {
    .cmp-hero {
        padding: $spacing-xl $spacing-lg;
    }
}
```

### Wrong

```scss
.cmp-hero {
    background: #FF6600;          /* should be $color-brand-primary */
    padding: 32px 16px;            /* should be $spacing-lg $spacing-md */
}

.cmp-hero__title {
    color: #202020;                /* should be $color-foreground */
    font-family: "Inter", sans-serif;  /* should be $font-family-heading */
    font-size: 48px;               /* should be $font-size-h1 */
}
```

### Auditing the partials

After Step 3.7 completes for each component and Step 3.12 has merged tokens, **re-read each generated `_{component-name}.scss`** and confirm no raw colors, sizes, or breakpoints survived. Replace any stragglers with the corresponding variable. This is the single most common drift point — the fix is mechanical.

---

## Rule 8: Image Handling

Identical to the Figma flow (see `figma-design-rules.md` → Rule 8). The short version:

- **NEVER deep-link external page images** from AEM HTL. They will break (CORS, expiry, ownership, hotlink protection) and you don't own the rights.
- **Always model images as authorable.** Default: embed Core Image via `<div data-sly-resource="${'image' @ resourceType='core/wcm/components/image/v3/image'}"></div>` and let the author select a DAM asset.
- **Logos** (header logo, footer logo) — always a DAM `pathfield` dialog field named `logoImageReference`, plus a `logoAlt` textfield. The logo may appear on the URL as an `<img>`, inline SVG, or CSS background — regardless, it must be an authorable DAM image reference. Never a textfield.
- **Background images** that are part of the design (e.g., a hero background) → dialog pathfield → Sling Model property → HTL inline style or background-image rule keyed off the model value.
- **Icons** → if simple, inline the SVG markup in HTL; if complex, drop the SVG into the component folder as a static resource and reference via `data-sly-resource`.
- **Do not** save downloaded external images into `ui.content`. If the author needs starter images, surface that as a follow-up: "DAM seeding is a separate task — point your author at the URL screenshots."

---

## Rule 9: Web Font Handling

If the URL loads a non-system font (Google Fonts, Adobe Fonts, self-hosted), wire it up in `_variables.scss`:

```scss
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

//== Font
$font-family:           "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
$font-family-heading:   "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
$font-size:             16px;
$font-height:           1.5;

/* … existing variables continue … */
```

### Rules

- **Place the `@import` at the very top of `_variables.scss`** — above all `//==` sections. SCSS requires `@import` statements to precede other declarations.
- **Pull only the weights actually used by the URL** (`:wght@400;600;700`) — don't import the full family unless every weight is in use. Each unused weight is a network round-trip on first paint.
- **Always include a fallback stack** ending in a generic family (`sans-serif`, `serif`, `monospace`) so the page renders something while the web font loads.
- **Do not** add a `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` to the page template HTL. Keep font wiring in the SCSS source — it's bundled into `clientlib-site` with the rest of the styles.
- **Adobe Fonts (Typekit)** uses a per-project loader URL (`https://use.typekit.net/<projectId>.css`) — same `@import` rule applies.
- **Self-hosted fonts** — add a `@font-face` block (not `@import`) at the top of `_variables.scss` and reference the font file from `ui.frontend/src/main/webpack/resources/fonts/` (or the project's existing resources path). Confirm the font license permits self-hosting first.

---

## Rule 10: Editable Template + Sample Page

After all components are scaffolded and `_variables.scss` is merged, produce a **minimal editable template** and a **sample page** so the rebuilt UI is previewable end-to-end without manual authoring.

### STOP — Read an existing project template first, then defer to `create-editable-template`

Before writing any template XML, read at least one existing template under `ui.content/src/main/content/jcr_root/conf/[project]/settings/wcm/templates/`. Project-specific conventions (the `cq:templateType` reference, the structure root `sling:resourceType` — usually the project's own container component, not `wcm/foundation/components/responsivegrid` — and the editable-marker pattern) **cannot** be derived from generic AEM examples. A template that "looks right" but uses a foundation responsivegrid for the structure root will deploy successfully and render an empty page, with no error in the logs to point at the cause.

Quick reads to do (substitute the project name from `.aem-skills-config.yaml`):

```bash
find ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/templates -maxdepth 4 -type f
cat ui.content/.../templates/<existing-template>/.content.xml
cat ui.content/.../templates/<existing-template>/structure/.content.xml
cat ui.content/.../templates/<existing-template>/policies/.content.xml
find ui.content/.../wcm/template-types -maxdepth 2 -name .content.xml   # for the cq:templateType reference
```

For anything beyond a copy-of-existing-template scaffold, **delegate to the `create-editable-template` skill**. That skill's `SKILL.md` Step 0 and `references/templates.md` are the authoritative source for the shapes below; the recipe shown here is intentionally minimal for the URL-design pilot path.

What you must match from the existing project template:

- `cq:Template` root `.content.xml` has a `<jcr:content jcr:primaryType="cq:PageContent">` child carrying `cq:templateType`, `status`, `jcr:title`, `jcr:description` — properties do **not** live on the `cq:Template` root.
- Structure root uses the project's own container component (e.g., `<project>/components/container`) with `layout="responsiveGrid"`.
- The unlocked parsys is a nested inner container with `editable="{Boolean}true"` — not absence of an editable flag, not the foundation responsivegrid.
- Policy mapping `jcr:content` is `nt:unstructured` with `sling:resourceType="wcm/core/components/policies/mappings"`; each mapping is `nt:unstructured` with `wcm/core/components/policies/mapping` (singular).
- Policy IDs should reuse what already exists in `wcm/policies/.content.xml` — search for `jcr:title="Page Root"`, `jcr:title="Page Content"` etc.; reuse rather than invent.

### Editable template

**Path:** `ui.content/src/main/content/jcr_root/conf/[project]/settings/wcm/templates/{template-name}/`

Required subtrees and their purpose:

```
{template-name}/
├── .content.xml              # cq:Template node, status="enabled", ranking
├── initial/
│   ├── .content.xml          # cq:Page that becomes the page initial content
│   └── jcr:content/
│       └── root/
│           └── .content.xml  # cq:PageContent + responsivegrid with components in URL order
├── policies/
│   └── jcr:content/
│       └── .content.xml      # Policy mappings: which components are allowed in each responsivegrid
├── structure/
│   ├── .content.xml          # cq:Page
│   └── jcr:content/
│       └── root/
│           └── .content.xml  # Locked structure: header, responsivegrid, footer
└── thumbnail.png             # Optional thumbnail (skip if no source image)
```

### What to lock vs. unlock

- **Lock** site-chrome components (header, footer) into `structure/jcr:content/root/` so authors can't accidentally remove them.
- **Unlock** the main content area as a `responsivegrid` so authors can add/reorder the body components.
- In `policies/jcr:content/.content.xml`, the policy for the unlocked grid must include the **newly-created components** and the existing layout container in its `components=[…]` allowlist. Use the `group:[project]` notation to keep the allowlist groupable.

### Sample page

**Path:** `ui.content/src/main/content/jcr_root/content/[project]/{site}/{page-name}/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        jcr:primaryType="cq:PageContent"
        jcr:title="{Page Title from URL}"
        sling:resourceType="[project]/components/page"
        cq:template="/conf/[project]/settings/wcm/templates/{template-name}">
        <root jcr:primaryType="nt:unstructured"
              sling:resourceType="[project]/components/container">
            <!-- Component instances in URL vertical order, with minimal authored content -->
        </root>
    </jcr:content>
</jcr:root>
```

Keep authored content **minimal but renderable** — a hero with a title and a CTA URL, three feature cards each with placeholder titles, a footer with placeholder link text. The goal is "the page renders something visually meaningful on first load." Not a fully populated marketing page.

### Vault filter

After creating template + page, ensure `ui.content/src/main/content/META-INF/vault/filter.xml` covers `/conf/[project]/settings/wcm/templates/{template-name}` and `/content/[project]/{site}/{page-name}` (they're usually covered by the broader `/conf/[project]` and `/content/[project]` filter roots — verify, don't assume).

### When to defer to `create-editable-template`

If the template work is substantial — custom template type, restricted parsys per row, multiple policy variants, or you need to extend an existing template type — recommend the user invoke the `create-editable-template` skill next instead of expanding this step. The goal of Step 3.13 is "previewable end-to-end," not full template engineering.

---

## Rule 11: Fidelity Verification Checklist

Before declaring the rebuild complete, verify:

### Visual

- [ ] Open the sample page on a running AEM instance and compare side-by-side with the reference URL screenshot.
- [ ] Spacing, font sizes, and colors match within tolerance (≤2px, ≤5% luminance).
- [ ] Component vertical order matches the URL's section order.
- [ ] At least two breakpoints (typically `$bp-tablet` 768px and `$bp-desktop` 1024px) render correctly — resize the browser and confirm.
- [ ] Web font has loaded (no FOUT/FOIT) — open DevTools → Network → filter by font and confirm requests succeed.

### Code

- [ ] No URL-derived class names survived (only `cmp-{component-name}…` BEM classes in HTL and SCSS).
- [ ] No raw hex colors, raw `px` values, or hardcoded fonts in any `_{component-name}.scss` — all reference `_variables.scss`.
- [ ] No inline `style=""` attributes in any component HTL.
- [ ] No external image URLs hardcoded — all images go through Sling Model + dialog pathfield + Core Image.
- [ ] Logo in header and footer is an `<img>` backed by a DAM pathfield — not rendered as text or a CSS class name.
- [ ] Full-width section components (hero, CTA strip, feature grid, testimonial, footer) contain an inner `__container` div with `max-width` + `margin: 0 auto` — content never spans raw viewport width.
- [ ] No third-party scripts (analytics, ads, chat widgets) carried over from the URL.
- [ ] All static display text wrapped in `${'…' @ i18n}` HTL i18n expressions.
- [ ] Each component has a working empty/authoring state (`.cmp-{name}--empty` or equivalent).

### AEM

- [ ] Every component appears in the sidekick/insert menu under the project's component group.
- [ ] The sample page opens in the editor and the body components are addable/movable in the responsive grid.
- [ ] Locked structure components (header, footer) cannot be removed by an author.
- [ ] `clientlib-site` was rebuilt and the new component SCSS partials are present in the bundled CSS.
- [ ] No `clientlib-{component-name}/` runtime clientlibs were created under `ui.apps/.../clientlibs/` (see `clientlib-patterns.md`).
- [ ] Dialog clientlibs (if any) live under `ui.apps/.../clientlibs/clientlib-{name}-dialog/` with `cq.authoring.dialog` dependency.

If any checkbox fails, fix before reporting the rebuild complete.
