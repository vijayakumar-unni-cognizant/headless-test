# Content Policies & Policy Mappings

A **content policy** is the design configuration that applies to a component instance — allowed components, allowed text styles, max items, default property values, and so on. Policies live in `/conf/<project>/settings/wcm/policies/` and are **referenced** by editable templates through a mapping in `templates/<name>/policies/.content.xml`.

Policies are one of the single most powerful editable-template features: they let you reuse the same design configuration across multiple templates while letting different templates apply different policies to the same component.

## Where Policies Live

```
ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/policies/
├── jcr:content/
│   ├── {project}/                              # mirrors component path under /apps
│   │   ├── components/
│   │   │   ├── page/
│   │   │   │   ├── policy
│   │   │   │   └── policy_landing
│   │   │   ├── text/
│   │   │   │   └── policy_landing_text
│   │   │   ├── container/
│   │   │   │   └── policy_landing_main
│   │   │   └── ...
│   └── settings/...
```

Policies follow the convention `policies/jcr:content/<component-group-path>/<policy-name>`. The path mirrors the component's path under `/apps` so it's easy to find which policy belongs to which component.

`<policy-name>` is by convention `policy` (the default for a component group) or `policy_<purpose>` (for purpose-specific variants like `policy_landing`, `policy_article`).

## Anatomy of a Policy

A policy is just an `nt:unstructured` node with `sling:resourceType="wcm/core/components/policy/policy"` and a set of typed properties:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent">
    <{project}>
      <components>
        <text>
          <policy_landing
            jcr:primaryType="nt:unstructured"
            jcr:title="Landing Page — Text"
            jcr:description="Rich text with constrained styles"
            sling:resourceType="wcm/core/components/policy/policy"
            allowedFormats="[bold,italic,underline]"
            allowedParaformats="[h2=Heading 2,h3=Heading 3,p=Paragraph]"
            maxLength="{Long}1000"/>
        </text>
      </components>
    </{project}>
  </jcr:content>
</jcr:root>
```

Each component type has its own set of valid policy properties — there's no global catalogue. The most useful sources:

- Adobe documentation for the component (Core Components reference).
- The component's `cq:dialog`/`cq:design_dialog` — design-dialog properties are stored on the policy.
- The component's HTL — `${properties.foo}` reads from page content; `${currentStyle.foo}` reads from policy.

## Mapping Policies to Templates

The **mapping** in `templates/<name>/policies/.content.xml` connects a component instance path (as seen in the template's `structure/`) to a policy path.

```xml
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
```

- The **path** of the mapping mirrors the path in `structure/`: `root/container` here matches `structure/jcr:content/root/container`.
- The **`cq:policy` value** is the policy path under `policies/jcr:content/`, **without** the leading `policies/jcr:content/`.

So `cq:policy="{project}/components/container/policy_landing_main"` resolves to the node at:

```
/conf/{project}/settings/wcm/policies/jcr:content/{project}/components/container/policy_landing_main
```

## Common Policy Properties

### Responsive Grid (`wcm/foundation/components/responsivegrid`)

| Property | Type | Meaning |
|----------|------|---------|
| `components` | `String[]` | Allowed component `sling:resourceType` paths. If absent, **all** components are allowed. |
| `cq:styleGroups` | child nodes | Style system options (CSS class chooser). |
| `columns` | `Long` | Number of columns in the grid (default 12). |

## Style System (`cq:styleGroups`) — the authoritative node form

The inline-array form (`cq:styleGroups="[{styles=[…]}]"`) shown in some docs is lossy — it omits `cq:styleId`, which is **required** for the class to resolve at render time. **Always author `cq:styleGroups` as a child-node subtree** (this is what the design-dialog UI produces and what actually works):

```xml
<policy_landing_containers
    jcr:primaryType="nt:unstructured"
    jcr:title="Landing — Containers"
    sling:resourceType="wcm/core/components/policy/policy"
    components="[{project}/components/teaser,{project}/components/image,core/wcm/components/text/v2/text]">
  <jcr:content jcr:primaryType="nt:unstructured"/>
  <cq:styleGroups jcr:primaryType="nt:unstructured">
    <item0
        jcr:primaryType="nt:unstructured"
        cq:styleGroupLabel="Layout">
      <cq:styles jcr:primaryType="nt:unstructured">
        <item0
            jcr:primaryType="nt:unstructured"
            cq:styleClasses="cmp-container--{project}-cols-3"
            cq:styleId="20260721001"
            cq:styleLabel="3 Columns"/>
        <item1
            jcr:primaryType="nt:unstructured"
            cq:styleClasses="cmp-container--{project}-scroll-x"
            cq:styleId="20260721002"
            cq:styleLabel="Horizontal Scroll"/>
      </cq:styles>
    </item0>
  </cq:styleGroups>
</policy_landing_containers>
```

- Each style item needs **all three** of `cq:styleClasses` (the CSS class emitted), `cq:styleId` (a unique numeric ID, convention `YYYYMMDD###`), and `cq:styleLabel` (what the author sees).
- The content node that pre-applies a variant references the **numeric `cq:styleId`**, not the class name: `cq:styleIds="[20260721001]"`. A `cq:styleIds="[cmp-container--{project}-cols-3]"` (class name) will **not** resolve — AEM looks up the id and finds no match, so the class is never emitted. (Some projects use the class string as the id; pick one convention and make content match the policy.)
- A component type reachable through **one** mapping can resolve styles from **one** policy only — put every variant of that type in a single policy's `cq:styleGroups` (multiple `item*` groups are fine). See `{best-practices}/references/style-system-dom-contracts.md` §5.

### CRITICAL: where the class lands vs. what your CSS must target

**The single biggest reason a container Style-System variant is authorable but "does nothing at runtime":** AEM adds the `cq:styleClasses` value to the component's **outer decoration wrapper (the grid-column cell)** — *not* to the inner `.cmp-container` or the `.aem-Grid`. The emitted DOM is:

```html
<div class="cmp-container--{project}-cols-3 aem-GridColumn aem-GridColumn--default--12">  <!-- class lands HERE -->
  <div class="cmp-container">
    <div class="aem-Grid aem-Grid--12 …">          <!-- the real grid of children is HERE, two levels down -->
      <div class="aem-GridColumn …">child…</div>
    </div>
  </div>
</div>
```

So `.cmp-container--{project}-cols-3 { display:grid }` targets the wrapper whose **only child is `.cmp-container`** — every child stacks full-width and the layout silently does nothing (the exact "styles selected but not applied" symptom). The SCSS **must** reach down to the grid and reset the cells:

```scss
.cmp-container--{project}-cols-3 > .cmp-container > .aem-Grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    &::before, &::after { display: none; }   // neutralize the .aem-Grid float-clearfix pseudos (§2)
    > .aem-GridColumn { width: auto; }        // reset aem-GridColumn--default--12 (= width:100%)
}
```

This SCSS-selector contract lives with the component/SCSS side — see `{best-practices}/references/style-system-dom-contracts.md` §1 and §2 for the full rule (including the clearfix-pseudo trap). The policy only makes the class *available*; the SCSS is what makes it *apply*.

See [`allowed-components.md`](allowed-components.md) for the `components` property in depth.

### Text Component (`{project}/components/text`)

| Property | Type | Meaning |
|----------|------|---------|
| `allowedFormats` | `String[]` | Inline formats: `bold`, `italic`, `underline`, `subscript`, `superscript`. |
| `allowedParaformats` | `String[]` | Block formats in `tag=label` form: `h1=Heading 1`, `p=Paragraph`. |
| `tableValues` | `String[]` | Tools like `cellWidget`, `columnTools`. |
| `maxLength` | `Long` | Max characters in the rich text. |

### Image / Adaptive Image

| Property | Type | Meaning |
|----------|------|---------|
| `allowedRenditionWidths` | `Long[]` | Widths in px for srcset generation. |
| `jpegQuality` | `Long` | 0–100, JPEG encode quality. |
| `enableLazyLoading` | `Boolean` | Native `loading="lazy"` toggle. |
| `enableAssetDelivery` | `Boolean` | Use Adobe Asset Delivery (DAM/AEM Assets). |

### Teaser / Hero

| Property | Type | Meaning |
|----------|------|---------|
| `allowedHeadingElements` | `String[]` | Allowed `h*` tags. |
| `actionsDisabled` | `Boolean` | Disable CTAs. |
| `imageDelegate` | `String` | Resource type of the image delegate component. |

### Container

| Property | Type | Meaning |
|----------|------|---------|
| `components` | `String[]` | Allowed children (see above). |
| `layout` | `String` | `simple` or `responsiveGrid`. |
| `backgroundImageEnabled` | `Boolean` | Allow author to pick a bg image. |

For Core Components, the design-dialog source on GitHub (`aem-core-wcm-components`) is the canonical reference for every policy property.

## How Policies Are Resolved at Render Time

For a component at `/content/{project}/home/jcr:content/root/container/text`:

1. The renderer walks up the tree until it hits the page (`/content/{project}/home/jcr:content`).
2. From the page's `cq:template`, it finds the template path.
3. From `templates/<t>/policies/.content.xml`, it walks the same relative path (`root/container/text`) to find the `cq:policy` value.
4. The policy path is resolved against `/conf/<project>/settings/wcm/policies/jcr:content/`.
5. Properties on that policy node become `currentStyle` in HTL / `Designer` in Java.

If any step fails (template not found, mapping missing, policy node missing), the component renders with no design — typically meaning "all components allowed, no constraints".

## Reusing Policies Across Templates

Two templates can use the same policy:

```xml
<!-- templates/landing-page/policies/.content.xml -->
<root cq:policy="{project}/components/container/policy_main"/>

<!-- templates/article-page/policies/.content.xml -->
<root cq:policy="{project}/components/container/policy_main"/>
```

Both templates now share design configuration for their `root` container. Changes to the policy propagate to both.

This is the main reason policies exist — to decouple design configuration from template structure.

## Designer Fallback (Legacy)

For components that haven't been migrated to the editable-template policy system, AEM falls back to legacy **Designer** (`/etc/designs/<project>`). This is **discouraged on Cloud Service** — every component should use editable-template policies. If you see `/etc/designs/` references in policy lookups, that's a migration target.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| Mapping references a policy that doesn't exist | Component renders with default config — all components allowed. |
| Policy mapping path doesn't match structure path | Policy never applies; design is effectively unconfigured. |
| Edited the policy expecting it to apply to *new* pages only | Policies apply at render time to **all** pages — change propagates immediately. |
| Created the policy but forgot the mapping | Policy exists but is unreferenced; component still gets default config. |
| Put policy properties on the component instance in `structure/` | Doesn't work — design properties belong on the policy, not the component instance. |

## Validation

- [ ] Policy nodes have `sling:resourceType="wcm/core/components/policy/policy"`.
- [ ] Policy paths follow the component-group convention (`<project>/components/<group>/policy_<purpose>`).
- [ ] Every template's `policies/.content.xml` mapping refers to a policy that exists.
- [ ] Every container in `structure/` that authors edit has a policy mapping (otherwise allowed-components is *everything*).
- [ ] `currentStyle.foo` in HTL matches a property on the resolved policy (test with the template editor — properties panel shows what's resolved).

## See Also

- [`anatomy.md`](anatomy.md) — the three layers and how policies fit in.
- [`templates.md`](templates.md) — wiring the mapping inside a template.
- [`allowed-components.md`](allowed-components.md) — the `components` policy property in depth.
- [`recipes.md`](recipes.md) — ready-to-use policies for common component types.
- **Adobe — Editable Templates & Policies:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/full-stack/components-templates/templates>
