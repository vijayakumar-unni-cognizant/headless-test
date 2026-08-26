# Template Types

Template types are **blueprints used to spawn new editable templates**. When an admin clicks **Create > Template** in the AEM Template Editor, the list they pick from is the set of available template types. A template type is itself a template — it has `initial`, `structure`, and `policies` — but its purpose is to be **copied** to a `templates/<name>/` folder, not to be authored against directly.

## When You Need a Template Type

- You're starting a new project — create at least one type per page kind (page, landing page, article, product page).
- You want admins to spawn multiple templates with the same baseline layout (e.g. a "branded landing page" type that all marketing teams use).
- You want to standardise locked structural elements (header / footer) across all derived templates.

If you only need **one** template and nobody will ever spawn another from it, you don't need a new template type — reuse one of the existing ones (`page`, `xf`, etc.). The {project} project already ships several types under `conf/{project}/settings/wcm/template-types/`.

## Anatomy

A template type has the same structure as an editable template:

```
template-types/<type-name>/
├── .content.xml                # cq:Template, jcr:title, status, ranking
├── initial/                    # what becomes the starting content of a new template
├── structure/                  # what becomes the structure of a new template
├── policies/                   # what becomes the policy mappings of a new template
├── thumbnail.png               # preview shown in the type picker
└── thumbnail.png.dir/.content.xml
```

When an admin creates a new template from this type, AEM **copies** all three folders to `templates/<new-name>/`. The new template is then completely independent — editing the type later does **not** propagate to existing templates spawned from it.

## Root `.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Template"
          jcr:title="{project} Landing Page Type"
          jcr:description="Blueprint for marketing landing-page templates"
          ranking="{Long}100"
          status="enabled"/>
```

| Property | Meaning |
|----------|---------|
| `jcr:primaryType` | Always `cq:Template`. |
| `jcr:title` | Display name in the template-type picker. |
| `jcr:description` | One-line subtitle in the picker. |
| `ranking` | Sort order; lower numbers appear first. |
| `status` | `enabled` (visible to admins) or `draft` (hidden). New types default to `draft`. |
| `allowedPaths` | (Optional) regex of `/content/...` paths where templates spawned from this type are usable. Most projects set this on the *template* instead. |

## `initial/` for a Type

`initial/` becomes the **starting `initial/`** of every template spawned from this type. Keep it minimal — admins will customise per template.

```xml
<!-- template-types/{project}-page/initial/.content.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="{project}/components/page"
    cq:template="/conf/{project}/settings/wcm/templates/EDITABLE_TEMPLATE_PATH">
    <root
      jcr:primaryType="nt:unstructured"
      sling:resourceType="wcm/foundation/components/responsivegrid"/>
  </jcr:content>
</jcr:root>
```

**Note:** the `cq:template` property is a placeholder — AEM rewrites it on copy to point at the new template's actual path. Leave it as-is (or with the literal token `EDITABLE_TEMPLATE_PATH` if you want explicit readability).

## `structure/` for a Type

`structure/` is the most consequential layer of a type. Every template spawned from this type inherits this structure as its starting point. Admins can edit it per-template, but most don't — so default to:

```xml
<!-- template-types/{project}-page/structure/.content.xml -->
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
      sling:resourceType="wcm/foundation/components/responsivegrid">
      <header
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/header"
        editable="{Boolean}false"/>
      <container
        jcr:primaryType="nt:unstructured"
        sling:resourceType="wcm/foundation/components/responsivegrid"/>
      <footer
        jcr:primaryType="nt:unstructured"
        sling:resourceType="{project}/components/footer"
        editable="{Boolean}false"/>
    </root>
  </jcr:content>
</jcr:root>
```

Notice the pattern:

- `header` and `footer` are **locked** (`editable="false"`) — they are part of the brand chrome.
- The middle `container` is **unlocked** — that's where authors compose their page.
- `root` itself is **unlocked** at the type level — so admins can re-arrange the layout if they need a different page shape for a derived template.

## `policies/` for a Type

`policies/` for a type is usually **empty** or contains only a default page-root policy. Per-template policies are added when the template is created. You can ship a sensible default:

```xml
<jcr:content
  jcr:primaryType="cq:PageContent"
  sling:resourceType="wcm/core/components/policies/mappings">
  <root cq:policy="{project}/components/page/policy_default"/>
</jcr:content>
```

## Allowed Paths and Allowed Templates

A template type does **not** itself appear in the create-page wizard. Authors create **pages** from **templates**, not from types. So `allowedPaths` and `cq:allowedTemplates` are concepts that apply to templates, not types — covered in [`allowed-templates.md`](allowed-templates.md).

## How an Admin Spawns a Template

1. Open **Tools > General > Templates** (or `http://localhost:4502/aem/templates.html/conf/{project}`).
2. Click **Create > Template**.
3. Pick the type — only types with `status=enabled` appear.
4. Provide a name and title.
5. AEM copies the type's `initial`/`structure`/`policies` to `templates/<new-name>/`.
6. The new template starts in `draft` status. Admin must explicitly **Enable** it.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| Type left in `draft` status | Admins cannot see it in the type picker. Set `status="enabled"`. |
| Locked the root grid in `structure/` | Admins cannot edit the layout when they spawn a new template. Lock only specific structural elements (header/footer). |
| Heavy `initial/` content | Spawned templates start cluttered. Keep initial minimal — single empty grid or two starter components at most. |
| Type and templates share a thumbnail | Authors and admins get confused. Make distinct thumbnails. |
| Edited the type expecting existing templates to update | Types are copied to templates; they do **not** stay linked. Edit the templates directly. |

## Validation

- [ ] Type folder lives under `conf/<project>/settings/wcm/template-types/`.
- [ ] Root `.content.xml` is `cq:Template` with `status="enabled"` and a sensible `ranking`.
- [ ] `initial/`, `structure/`, `policies/` subfolders exist (even if `policies/` is near-empty).
- [ ] Locked structural elements have `editable="{Boolean}false"`.
- [ ] `thumbnail.png` is present.
- [ ] Type appears under **Tools > General > Templates > Create > Template** picker after deploy.

## See Also

- [`templates.md`](templates.md) — using the type to spawn a template.
- [`anatomy.md`](anatomy.md) — the three layers in detail.
- [`recipes.md`](recipes.md) — ready-to-use type definitions.
