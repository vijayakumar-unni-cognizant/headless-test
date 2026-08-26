# Creating Editable Templates

This file covers creating an editable template **as code in source control** — the typical pattern when you ship templates as initial seeding via `ui.content`. For the runtime workflow (admin clicks "Create Template" in the Template Editor), see [`template-types.md`](template-types.md).

> Most enterprise projects ship templates in source so they're reviewable, branchable, and reproducible across environments. The Template Editor still works at runtime; treat your `ui.content` shipment as the canonical version and instruct admins not to edit shipped templates in production.

## Step 0 — Read an Existing Project Template (mandatory)

Before writing template XML from these examples, **read at least one existing template** in the project:

```bash
find ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/templates -maxdepth 4 -type f
```

Pick the working template closest to your use case and read its `.content.xml`, `structure/.content.xml`, `initial/.content.xml`, `policies/.content.xml`. The examples below show **canonical AEMaaCS shape**; the project may have project-specific overrides (e.g., its own container component as the structure root, a specific `cq:templateType` reference). Match the project's actual shape rather than copying the examples verbatim.

The most common project-specific conventions to look for:

- **Root `.content.xml`**: properties on a `<jcr:content jcr:primaryType="cq:PageContent">` child carrying `cq:templateType`, **not** on the `cq:Template` root itself.
- **Structure root `sling:resourceType`**: the project's own container component (e.g., `<project>/components/container`), **not** `wcm/foundation/components/responsivegrid`.
- **Editable markers**: the project may use `editable="{Boolean}true"` on a nested inner container to mark the parsys, with no `editable="false"` on outer locked containers (they inherit lock from layout).
- **Policy mapping `jcr:content`**: usually `nt:unstructured` with `sling:resourceType="wcm/core/components/policies/mappings"`, not `cq:PageContent`.

## Template Folder Skeleton

```
ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/templates/<template-name>/
├── .content.xml
├── initial/
│   ├── .content.xml
│   └── _jcr_content/
│       └── ...
├── structure/
│   ├── .content.xml
│   └── _jcr_content/
│       └── ...
├── policies/
│   └── .content.xml
├── thumbnail.png
└── thumbnail.png.dir/
    └── .content.xml
```

Note the FileVault convention: a literal child node named `jcr:content` is written as the folder `_jcr_content/`. Properties on `jcr:content` go in the parent folder's `.content.xml` under a `<jcr:content>` element. Both forms appear in real templates; either is fine.

## Root `.content.xml` — The Template Definition

The properties that drive template behaviour go on a **`<jcr:content jcr:primaryType="cq:PageContent">` child** of the `cq:Template` node — not on the root itself. The `cq:templateType` reference is the load-bearing piece: without it, the template doesn't inherit the chrome it needs to render.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:Template">
    <jcr:content
        cq:lastModified="{Date}2026-06-12T14:00:00.000+00:00"
        cq:lastModifiedBy="admin"
        cq:templateType="/conf/<project>/settings/wcm/template-types/page"
        jcr:description="Marketing landing page with hero, content blocks, and footer"
        jcr:primaryType="cq:PageContent"
        jcr:title="Landing Page"
        status="enabled"/>
</jcr:root>
```

> The `allowedPaths` property — when needed — also lives on the `<jcr:content>` child, not on the `cq:Template` root. Many projects manage allowed paths elsewhere (e.g., on `cq:allowedTemplates`) and omit it here entirely. Check Step 0's reference template before adding.

| Property | Required | Location | Meaning |
|----------|----------|----------|---------|
| `jcr:primaryType="cq:Template"` | yes | root | Identifies the node as an editable template. |
| `jcr:content/jcr:primaryType="cq:PageContent"` | yes | child | Hosts template metadata as page content. |
| `jcr:content/cq:templateType` | yes | child | Path to the template type that supplies chrome and edit policies. Look for it under `conf/<project>/settings/wcm/template-types/`. |
| `jcr:content/jcr:title` | yes | child | Display name in the create-page wizard. |
| `jcr:content/jcr:description` | recommended | child | One-line subtitle in the wizard. |
| `jcr:content/status` | yes | child | `enabled` to appear in the wizard. `draft` to hide it during development. |
| `jcr:content/ranking` | no | child | Sort order in the wizard (lower = earlier). |
| `jcr:content/allowedPaths` | optional | child | Multi-value regex (`[regex1, regex2]`) of `/content/...` paths where this template can be used. Many projects omit this and use `cq:allowedTemplates` on the content branch instead. |

**`allowedPaths` examples:**

```xml
allowedPaths="[/content/{project}(/.*)?]"
allowedPaths="[/content/{project}/us(/.*)?, /content/{project}/global(/.*)?]"
```

Each entry is a Java regex matched against the candidate parent path. The terminal `$` is implicit; use `(/.*)?` to allow descendants.

## `initial/.content.xml`

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
      sling:resourceType="wcm/foundation/components/responsivegrid">
      <hero
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/hero"/>
      <text
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/text"
        text="&lt;p&gt;Replace this placeholder text.&lt;/p&gt;"
        textIsRich="{Boolean}true"/>
    </root>
  </jcr:content>
</jcr:root>
```

- `sling:resourceType` on `jcr:content` is the **page component** (typically `<project>/components/page`).
- `cq:template` is **required** — points back at this template's path so structure/policies resolve at render time.
- Children under `root/` are the starter components authors see on a brand-new page.

## `structure/.content.xml`

The structure layer's root almost always uses the **project's own container component** with `layout="responsiveGrid"` (look for `<project>/components/container` under `apps/`), not `wcm/foundation/components/responsivegrid`. The project page component is wired to render through this container, and substituting the foundation responsivegrid produces a page that renders empty.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:deviceGroups="[mobile/groups/responsive]"
        cq:template="/conf/<project>/settings/wcm/templates/<template-name>"
        jcr:primaryType="cq:PageContent"
        sling:resourceType="<project>/components/page">
        <root
            jcr:primaryType="nt:unstructured"
            sling:resourceType="<project>/components/container"
            layout="responsiveGrid">
            <!-- Optional locked chrome (e.g., experience-fragment header) goes here -->
            <container
                jcr:primaryType="nt:unstructured"
                sling:resourceType="<project>/components/container"
                editable="{Boolean}true"
                layout="responsiveGrid"/>
            <!-- Optional locked chrome (e.g., experience-fragment footer) goes here -->
        </root>
        <cq:responsive jcr:primaryType="nt:unstructured">
            <breakpoints jcr:primaryType="nt:unstructured">
                <phone   jcr:primaryType="nt:unstructured" title="Smaller Screen" width="{Long}768"/>
                <tablet  jcr:primaryType="nt:unstructured" title="Tablet"         width="{Long}1200"/>
            </breakpoints>
        </cq:responsive>
    </jcr:content>
</jcr:root>
```

**Pattern:**

- The structure root uses the project's container component — this is what the project page component knows how to render. Substituting `wcm/foundation/components/responsivegrid` will produce a page that renders empty.
- An **inner `<container>` marked `editable="{Boolean}true"`** is the unlocked parsys authors edit. This is the canonical unlock signal in modern AEM projects — not absence of an `editable` flag.
- Outer containers without `editable="{Boolean}true"` are effectively locked chrome; children placed there at the structure level appear on every page using the template and cannot be moved by authors.
- Chrome (header / footer) is often included as **locked siblings** of the editable container at the same depth — typically experience-fragment references rather than concrete components, so site-wide chrome can change without touching the template.

## `policies/.content.xml`

The policy mapping is a **separate node type tree**, not a clone of structure. `jcr:content` is `nt:unstructured` with `sling:resourceType="wcm/core/components/policies/mappings"` (plural). Each mapping node is also `nt:unstructured` with `sling:resourceType="wcm/core/components/policies/mapping"` (singular).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:policy="<project>/components/page/policy"
        jcr:primaryType="nt:unstructured"
        sling:resourceType="wcm/core/components/policies/mappings">
        <root
            cq:policy="<project>/components/container/<page-root-policy-id>"
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/core/components/policies/mapping">
            <container
                cq:policy="<project>/components/container/<page-content-policy-id>"
                jcr:primaryType="nt:unstructured"
                sling:resourceType="wcm/core/components/policies/mapping"/>
        </root>
    </jcr:content>
</jcr:root>
```

- Each `cq:policy` value is a **relative path** under `/conf/<project>/settings/wcm/policies/`. The policy nodes live in the workspace's `wcm/policies/.content.xml`.
- The mapping's structure mirrors the **structure layer** — the path `root/container` in this mapping refers to the component at the same path in `structure/`.
- A container without a mapping inherits no design configuration — authors see all components (which is rarely what you want).
- **Reuse existing policy IDs where possible.** Most projects already define policies like "Page Root" and "Page Content" that allow the right component groups. `grep -r 'jcr:title="Page' ui.content/.../wcm/policies/` will surface them. Inventing new policies is fine, but reuse keeps the policy surface manageable.

See [`policies.md`](policies.md) for what to put in the policy nodes themselves.

## `thumbnail.png`

A 320×200 PNG (or larger; AEM will downscale). Plain enough to be recognisable in the wizard; doesn't need to be a screenshot. Common pattern: a stylised silhouette of the layout (header bar, content area, footer bar).

The companion FileVault descriptor:

```xml
<!-- thumbnail.png.dir/.content.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          jcr:primaryType="nt:file">
  <jcr:content
    jcr:primaryType="nt:resource"
    jcr:mimeType="image/png"/>
</jcr:root>
```

## How AEM Resolves a Template at Render Time

For a page at `/content/{project}/home`:

1. AEM reads `jcr:content/@cq:template` to find the template path.
2. The page's `sling:resourceType` is resolved (typically inherited from initial).
3. The template's `structure/jcr:content` is merged with the page's `jcr:content`:
   - Locked nodes from structure **always** appear on the page.
   - Unlocked nodes from structure are present only as empty containers; page content fills them.
4. For each component instance, the path is matched against `policies/.content.xml` to find the `cq:policy`.
5. The policy node's properties are applied as the component's design.

## When You Touch `templates/<name>/` After It's Live

- **Edits to `structure/`** affect every existing page using the template (locked-layout edits are immediate).
- **Edits to `policies/.content.xml`** affect every existing page (policies are referenced, not copied).
- **Edits to `initial/`** affect only **new** pages created after the edit; existing pages are unchanged.
- **Renaming a component path** in `structure/` requires re-mapping in `policies/.content.xml`.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| Forgot `cq:template` in `initial/jcr:content` | Pages render with no template behaviour; structure/policies are ignored. |
| `status="draft"` left on a finished template | Authors don't see it in the wizard. |
| `allowedPaths` missing | Template appears at every `/content/...` branch — confusing for global rollouts. |
| Locked the only unlockable container | Authors cannot add anything to the page. |
| Mapping policy path doesn't exist | Component renders with no design config; allowed-components defaults to all. |
| Mapping structure mismatches actual structure | Policies don't apply where authors expect. |

## Validation

- [ ] Root `.content.xml` is `cq:Template` with `status="enabled"` and `jcr:title`.
- [ ] `allowedPaths` is set to a narrow regex.
- [ ] `initial/jcr:content` sets `cq:template` and uses the project page component.
- [ ] `structure/jcr:content/root` exists; locked elements have `editable="{Boolean}false"`.
- [ ] At least one unlocked container is present so authors can compose content.
- [ ] `policies/.content.xml` mirrors the structure paths and references valid policy paths.
- [ ] `thumbnail.png` and `thumbnail.png.dir/.content.xml` are committed.
- [ ] After deploy, template appears at `http://localhost:4502/aem/templates.html/conf/{project}` with **enabled** status.
- [ ] After deploy, create-page wizard at an allowed `/content/{project}/...` path lists the template.

## See Also

- [`anatomy.md`](anatomy.md) — what the three layers do.
- [`template-types.md`](template-types.md) — types as blueprints.
- [`policies.md`](policies.md) — design configuration for components.
- [`allowed-templates.md`](allowed-templates.md) — restricting templates via `cq:allowedTemplates`.
- [`recipes.md`](recipes.md) — ready-to-use template definitions.
