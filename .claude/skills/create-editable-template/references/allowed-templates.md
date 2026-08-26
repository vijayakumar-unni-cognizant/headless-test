# `cq:allowedTemplates`

`cq:allowedTemplates` is a multi-value `String` property set on a content branch (`/content/{project}/...`) that restricts **which templates** authors can use to create new child pages there.

Without `cq:allowedTemplates`, authors see **every** enabled template in the create-page wizard — even those meant for a different site or product line. Setting `cq:allowedTemplates` is one of the most-overlooked configuration steps; it's also what makes the difference between "template appears for the right team" and "any author can create a checkout page under the brand site".

## Where to Set It

On the `jcr:content` of a content page or a `cq:Page` node. Most commonly:

- **Site root** — set on `/content/{project}/jcr:content` so all pages in the site can only use site-approved templates.
- **Section root** — set on `/content/{project}/products/jcr:content` so product pages can only use product templates.
- **Per-language root** — set on `/content/{project}/us/jcr:content` for region-specific templates.

The property is **inherited down the tree** — if `/content/{project}` has `cq:allowedTemplates`, every descendant inherits it unless explicitly overridden.

## Property Format

```xml
<jcr:content
  jcr:primaryType="cq:PageContent"
  cq:allowedTemplates="[
    /conf/{project}/settings/wcm/templates/landing-page$,
    /conf/{project}/settings/wcm/templates/article-page$,
    /conf/{project}/settings/wcm/templates/.*-page$
  ]"/>
```

- Type: `String[]` (multi-value).
- Each entry is a **Java regex** matched against the candidate template path.
- The trailing `$` anchors the match — without it, `/conf/{project}/.../landing-page$` would also match `/conf/{project}/.../landing-page-v2`.
- Inverted patterns are not supported — list every allowed template explicitly, or use a permissive regex with `$` to allow a family.

## Common Patterns

### Exact list of templates

```
cq:allowedTemplates="[
  /conf/{project}/settings/wcm/templates/landing-page$,
  /conf/{project}/settings/wcm/templates/article-page$,
  /conf/{project}/settings/wcm/templates/product-page$
]"
```

Use this when you want to be explicit. Adding a new template requires updating the property.

### Family by suffix

```
cq:allowedTemplates="[
  /conf/{project}/settings/wcm/templates/.*-page$,
  /conf/{project}/settings/wcm/templates/landing-.*$
]"
```

Allows any template ending in `-page` or starting with `landing-`. Use this when you want new templates of a known kind to be automatically available.

### All {project} templates

```
cq:allowedTemplates="[/conf/{project}/settings/wcm/templates/.*]"
```

Permissive — the most common pattern at the site root for projects where {project} templates are trusted across the site.

### Multiple projects

```
cq:allowedTemplates="[
  /conf/{project}/settings/wcm/templates/.*,
  /conf/global/settings/wcm/templates/.*
]"
```

When the site uses both project-local and global (shared) templates.

## Relationship to Template `allowedPaths`

There are **two layers of restriction**, applied independently:

| Layer | Property | Where it lives | What it restricts |
|-------|----------|----------------|-------------------|
| 1 | `allowedPaths` | On the **template** | Which `/content` paths the template can be used at. |
| 2 | `cq:allowedTemplates` | On the **content branch** | Which templates can be used at this content path. |

A template appears in the create-page wizard at `/content/<x>/...` only if **both**:

- The template's `allowedPaths` regex matches `/content/<x>/...`, **and**
- The branch's `cq:allowedTemplates` regex matches the template's path.

If either side fails, the template is filtered out. This is intentional — templates declare where they want to appear; content branches declare what they want to see — and only the intersection is shown.

## Setting the Property in `ui.content`

You typically ship `cq:allowedTemplates` as part of the initial site content. In FileVault:

```xml
<!-- ui.content/src/main/content/jcr_root/content/{project}/.content.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Page">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    sling:resourceType="{project}/components/page"
    cq:allowedTemplates="[/conf/{project}/settings/wcm/templates/.*-page$]"
    jcr:title="{project}"/>
</jcr:root>
```

This sets the property on the root content node so all descendants inherit.

> **Watch the `merge` semantics.** If your FileVault filter on `/content/{project}` uses `mode="merge_properties"` or similar, your `cq:allowedTemplates` may not overwrite a runtime change. Most projects accept this — the property is initial seeding, and admins can adjust at runtime. If you want hard enforcement, ship a Repoinit script that sets the property as well (see [`repoinit`](../../repoinit/SKILL.md)).

## Setting It at Runtime

Admins can also set `cq:allowedTemplates` per-page via the **Page Properties** dialog > **Advanced** tab > **Template Settings**. Runtime changes survive re-deploy if your filter rules don't overwrite them.

## Inheritance and Override

`cq:allowedTemplates` is inherited from the closest ancestor `jcr:content` node that has the property set. To override at a deeper branch:

```
/content/{project}                 → [landing-page$, article-page$]
/content/{project}/blog            → inherits the above
/content/{project}/blog/news       → cq:allowedTemplates=[article-page$]   ← override
```

A child explicitly sets the property to narrow (or widen) the allowed list. To remove the restriction entirely on a sub-branch, set `cq:allowedTemplates="[/conf/.*]"` or similar permissive regex.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| Forgot the trailing `$` | A regex like `landing-page` matches both `landing-page` and `landing-page-v2`. |
| Wrote a glob (`*.html`) instead of regex | Doesn't match. Use Java regex syntax (`.*`). |
| Property is on `cq:Page` instead of `jcr:content` | Inheritance doesn't resolve. Place on `jcr:content`. |
| Property type is `String` instead of `String[]` | First entry works, others ignored. Always declare as `String[]`. |
| Forgot to set anywhere | Every template in the system appears in the wizard. |
| Set on a single page only | Only that page's child-create dialog is restricted; siblings still show everything. |

## Validation

- [ ] `cq:allowedTemplates` is set on `/content/<project>/jcr:content` (or a more specific branch) with the right regex patterns.
- [ ] Each regex has the right anchoring (`$` at the end for exact matches; no `$` for family suffix matches).
- [ ] Property type is `String[]` (multi-value).
- [ ] Targeted templates have a matching `allowedPaths` that includes this content branch.
- [ ] After deploy, the create-page wizard at the branch shows exactly the expected list of templates.
- [ ] At a sub-branch where an override is intended, the override property is set on the sub-branch's `jcr:content`.

## See Also

- [`templates.md`](templates.md) — the template's `allowedPaths` is the matching half of this constraint.
- [`anatomy.md`](anatomy.md) — context on how the wizard resolves templates.
- **Adobe — Templates & Allowed Paths:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/sites/authoring/page-editor/templates>
