# Recipes

Ready-to-use editable template patterns. The placeholder `{project}` refers to your project name (from `.aem-skills-config.yaml`) — substitute it throughout when applying a recipe.

Each recipe ships **at minimum** these files under `ui.content/src/main/content/jcr_root/conf/{project}/settings/wcm/`:

```
templates/<template-name>/
├── .content.xml
├── initial/.content.xml
├── structure/.content.xml
├── policies/.content.xml
├── thumbnail.png
└── thumbnail.png.dir/.content.xml
```

Plus matching policy nodes under `policies/.content.xml` (the root policies XML, separate from per-template mapping).

---

## Recipe 1 — Minimal Landing-Page Template

A simple page with header (locked), main content area (unlocked), footer (locked).

### `templates/landing-page/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Template"
          jcr:title="Landing Page"
          jcr:description="Marketing landing page with hero, content, footer"
          ranking="{Long}100"
          status="enabled"
          allowedPaths="[/content/{project}(/.*)?]"/>
```

### `templates/landing-page/initial/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="{project}/components/page"
    cq:template="/conf/{project}/settings/wcm/templates/landing-page">
    <root
      jcr:primaryType="nt:unstructured"
      sling:resourceType="wcm/foundation/components/responsivegrid"/>
  </jcr:content>
</jcr:root>
```

### `templates/landing-page/structure/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="{project}/components/page">
    <root
      jcr:primaryType="nt:unstructured"
      sling:resourceType="wcm/foundation/components/responsivegrid"
      editable="{Boolean}false">
      <header
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/header"/>
      <container
        jcr:primaryType="nt:unstructured"
        sling:resourceType="wcm/foundation/components/responsivegrid"
        editable="{Boolean}true"/>
      <footer
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/footer"/>
    </root>
  </jcr:content>
</jcr:root>
```

### `templates/landing-page/policies/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="wcm/core/components/policies/mappings">
    <root
      jcr:primaryType="nt:unstructured"
      sling:resourceType="wcm/foundation/components/responsivegrid"
      cq:policy="{project}/components/page/policy_landing">
      <container
        jcr:primaryType="nt:unstructured"
        cq:policy="{project}/components/container/policy_landing_main"/>
    </root>
  </jcr:content>
</jcr:root>
```

### Companion policies — `policies/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent">
    <{project}>
      <components>
        <page>
          <policy_landing
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/core/components/policy/policy"
            jcr:title="Landing — Page"/>
        </page>
        <container>
          <policy_landing_main
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/core/components/policy/policy"
            jcr:title="Landing — Main Container"
            components="[
              {project}/components/hero,
              {project}/components/text,
              {project}/components/image,
              {project}/components/teaser,
              {project}/components/promo-banner
            ]"/>
        </container>
      </components>
    </{project}>
  </jcr:content>
</jcr:root>
```

---

## Recipe 2 — Article Page Template (Strict)

For long-form content. Limited components to keep articles consistent.

### `templates/article-page/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:Template"
          jcr:title="Article Page"
          jcr:description="Editorial article page with rich text and inline media"
          ranking="{Long}200"
          status="enabled"
          allowedPaths="[/content/{project}/.*(/articles)(/.*)?]"/>
```

Allowed-components in the article's main container:

```xml
components="[
  {project}/components/text,
  {project}/components/image,
  {project}/components/quote,
  {project}/components/embed,
  core/wcm/components/separator/v1/separator
]"
```

---

## Recipe 3 — Locked Footer Pattern

To prevent **any** changes to the footer across all templates, lock the footer container and set its policy with **no allowed components**.

### Structure (locked footer)

```xml
<footer
  jcr:primaryType="nt:unstructured"
  sling:resourceType="{project}/components/footer"
  editable="{Boolean}false">
  <copyright
    jcr:primaryType="nt:unstructured"
    sling:resourceType="{project}/components/text"
    editable="{Boolean}false"/>
  <social
    jcr:primaryType="nt:unstructured"
    sling:resourceType="{project}/components/social-links"
    editable="{Boolean}false"/>
</footer>
```

### Policy mapping

```xml
<footer
  jcr:primaryType="nt:unstructured"
  cq:policy="{project}/components/footer/policy_locked"/>
```

### Policy node

```xml
<policy_locked
  jcr:primaryType="nt:unstructured"
  sling:resourceType="wcm/core/components/policy/policy"
  jcr:title="Footer — Locked"
  components="[]"/>
```

Authors cannot modify the footer or its children. Updates require a code change.

---

## Recipe 4 — Site Root with `cq:allowedTemplates`

Constrains all of `/content/{project}/...` to the page family of templates.

### `content/{project}/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="{project}/components/page"
    cq:allowedTemplates="[
      /conf/{project}/settings/wcm/templates/landing-page$,
      /conf/{project}/settings/wcm/templates/article-page$,
      /conf/{project}/settings/wcm/templates/root-page$
    ]"
    jcr:title="{project}"
    cq:template="/conf/{project}/settings/wcm/templates/root-page"/>
</jcr:root>
```

---

## Recipe 5 — Reusable Section Component with Sub-Grid Policy

A `section` component that contains its own responsive grid (for "card row" layouts).

### Structure (page-level container houses one or more sections)

```xml
<container
  jcr:primaryType="nt:unstructured"
  sling:resourceType="wcm/foundation/components/responsivegrid"
  editable="{Boolean}true"/>
```

### Policy mapping (page-level container allows `section`, section's inner grid allows leaf content)

```xml
<container cq:policy="{project}/components/container/policy_page_main">
  <!-- mapping pattern below applies to every section instance authors add -->
</container>
```

### Policies

```xml
<container>
  <policy_page_main
    jcr:primaryType="nt:unstructured"
    sling:resourceType="wcm/core/components/policy/policy"
    components="[{project}/components/section]"/>
</container>
<section>
  <policy_default
    jcr:primaryType="nt:unstructured"
    sling:resourceType="wcm/core/components/policy/policy"
    jcr:title="Section — Default"/>
</section>
```

For the section's inner grid (when component contains its own `responsivegrid` child), you'd add a per-instance mapping or use the section component's own design dialog to lock the inner-grid policy.

---

## Recipe 6 — Minimal Template Type

The simplest possible blueprint type.

### `template-types/{project}-page/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:Template"
          jcr:title="{project} Page Type"
          jcr:description="Blueprint for {project} page templates"
          ranking="{Long}100"
          status="enabled"/>
```

Then `initial/`, `structure/`, `policies/` mirroring the landing-page recipe above, but emptier — the type is meant to be customised per template.

---

## Recipe 7 — Container Layout Style Variants (`cq:styleGroups`)

Use when the design needs authorable container layouts (multi-column grids, horizontal-scroll rows, full-bleed vs fixed-width). This is the recipe that prevents the recurring **"the style is authorable but never applies at runtime"** defect.

### Policy node — the full child-node form (NOT the inline array)

```xml
<container>
  <policy_landing_containers
      jcr:primaryType="nt:unstructured"
      jcr:title="Landing — Containers"
      sling:resourceType="wcm/core/components/policy/policy"
      components="[{project}/components/teaser,{project}/components/image,core/wcm/components/text/v2/text]">
    <jcr:content jcr:primaryType="nt:unstructured"/>
    <cq:styleGroups jcr:primaryType="nt:unstructured">
      <item0 jcr:primaryType="nt:unstructured" cq:styleGroupLabel="Layout">
        <cq:styles jcr:primaryType="nt:unstructured">
          <item0 jcr:primaryType="nt:unstructured"
                 cq:styleClasses="cmp-container--{project}-cols-3"
                 cq:styleId="20260721001"
                 cq:styleLabel="3 Columns"/>
          <item1 jcr:primaryType="nt:unstructured"
                 cq:styleClasses="cmp-container--{project}-scroll-x"
                 cq:styleId="20260721002"
                 cq:styleLabel="Horizontal Scroll"/>
        </cq:styles>
      </item0>
    </cq:styleGroups>
  </policy_landing_containers>
</container>
```

### Content that pre-applies a variant references the numeric `cq:styleId`

```xml
<!-- /content/{project}/.../jcr:content/root/container/container_feature -->
<container_feature
    jcr:primaryType="nt:unstructured"
    sling:resourceType="{project}/components/container"
    cq:styleIds="[20260721001]"/>   <!-- the numeric id, NOT the class name -->
```

### Required SCSS (the class lands on the grid-column wrapper — target two levels down)

```scss
// ui.frontend/src/main/webpack/components/_container.scss
.cmp-container--{project}-cols-3 > .cmp-container > .aem-Grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    &::before, &::after { display: none; }   // neutralize .aem-Grid clearfix pseudos
    > .aem-GridColumn { width: auto; }        // reset aem-GridColumn--default--12 (=width:100%)
}

.cmp-container--{project}-scroll-x > .cmp-container > .aem-Grid {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 24px;
    &::before, &::after { display: none; }
    > .aem-GridColumn {
        width: auto;
        flex: 0 0 288px;   // fixed card width; also stops embedded images inflating to full width
    }
}
```

**Three-part contract — all three or it fails:** (1) policy has the `cq:styleGroups` subtree with `cq:styleId`; (2) content `cq:styleIds` uses the matching numeric id; (3) SCSS targets `.cmp-container--variant > .cmp-container > .aem-Grid` (not the bare `.cmp-container--variant`). See `policies.md` → "where the class lands" and `{best-practices}/references/style-system-dom-contracts.md` §1–§2.

---

## Recipe 8 — SEO & single-`<h1>` Heading Baseline (mandatory for any Sites page)

A page with several Teaser and/or Title components emits **multiple `<h1>`** unless heading levels are pinned by policy — the recurring "multiple H1 / SEO H1" defect. The rule: **exactly one component instance per page owns the `<h1>` (the hero teaser); every other teaser and every Title is H2/H3 and forbidden from H1.**

### Title component policies — default H2, disallow H1

```xml
<title>
  <policy_content_title
      jcr:primaryType="nt:unstructured"
      jcr:title="Content Title"
      jcr:description="Section headings. H1 is reserved for the hero — never allowed here."
      sling:resourceType="wcm/core/components/policy/policy"
      allowedTypes="[h2,h3,h4,h5,h6]"
      type="h2"/>
</title>
```

### Teaser policies — one hero policy owns H1; the content-teaser policy is H2/H3

```xml
<teaser>
  <!-- The ONE hero: exactly one instance uses this policy → the page's single <h1> -->
  <policy_hero_teaser
      jcr:primaryType="nt:unstructured"
      jcr:title="Hero Teaser (owns the page H1)"
      sling:resourceType="wcm/core/components/policy/policy"
      allowedTypes="[h1,h2]"
      titleType="h1">
    <cq:styleGroups jcr:primaryType="nt:unstructured"><!-- hero variants --></cq:styleGroups>
  </policy_hero_teaser>

  <!-- Every OTHER teaser (feature cards, testimonials, promos) → never H1 -->
  <policy_content_teaser
      jcr:primaryType="nt:unstructured"
      jcr:title="Content Teaser"
      sling:resourceType="wcm/core/components/policy/policy"
      allowedTypes="[h2,h3,h4]"
      titleType="h3"/>
</teaser>
```

> **Core Teaser v2 honors the policy's `titleType`, not per-instance overrides**, and all instances sharing one policy share its heading level. So multiple non-hero teasers that share `policy_content_teaser` all render `<h3>` — correct. Do **not** try to vary heading level per instance by editing content; use the policy. Map the single hero instance to `policy_hero_teaser` and all others to `policy_content_teaser` in the template's `policies/.content.xml`.

### SEO head (canonical + OpenGraph)

- **Canonical must be absolute.** Core Page v3 renders `<link rel="canonical">` but it falls back to a **relative** URL unless an **Externalizer publish-domain OSGi config** exists. That config is a `configsmith` deliverable — see `configsmith.md`. Do not add a second canonical in HTL (duplicate-canonical is a worse defect).
- **OpenGraph** tags have no Core rendering — the page component's `customheaderlibs.html` emits `og:title/description/image/url/type` from page properties, and `composer` must author those properties (`jcr:description`, `ogImage`, …) on the page.

---

## Anti-Patterns to Avoid

### ❌ Allowed-components on the structure node

```xml
<container components="[{project}/components/text]"/>
```

Ignored. Put it on the **policy**, not the structure.

### ❌ Renaming a structure path without updating the mapping

If `structure/jcr:content/root/container` becomes `structure/jcr:content/root/main`, you must also rename in `policies/.content.xml`. Otherwise the policy goes unmapped.

### ❌ Shipping authored content in `initial/`

```xml
<initial>
  <jcr:content>
    <root>
      <hero text="Q4 Holiday Sale" image="/content/dam/.../holiday-2025.jpg"/>
    </root>
  </jcr:content>
</initial>
```

Initial is supposed to be a *blank starting point*, not finished content. Authors will start with stale Q4 content next quarter unless they delete it. Put placeholders only.

### ❌ Template with no `allowedPaths`

```xml
<jcr:root jcr:primaryType="cq:Template" status="enabled"/>
```

Template appears at every content branch. Combined with no `cq:allowedTemplates` on content, authors at `/content/global` can use your `/content/{project}/products` template.

### ❌ Locking the entire root grid

```xml
<root editable="{Boolean}false">
  ...
</root>
```

Authors cannot add anything to the page. Lock specific structural elements (header/footer), not the root grid.

## See Also

- [`SKILL.md`](../SKILL.md) — entry point.
- [`anatomy.md`](anatomy.md) — three-layer model.
- [`policies.md`](policies.md) — full policy reference.
- [`allowed-components.md`](allowed-components.md) — the `components` list explained.
- [`allowed-templates.md`](allowed-templates.md) — `cq:allowedTemplates` patterns.
