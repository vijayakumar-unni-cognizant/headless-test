# Template Anatomy — The Three Layers

An editable template is **not a single document**. It's three independent JCR subtrees that interact at runtime to produce the authored page experience. Understanding these three layers is the foundation for everything else in this skill.

> **Read an existing project template before relying on the shapes below.** The diagrams and examples here capture the canonical AEMaaCS pattern, but the project may use its own container component as the structure root, its own template type reference, and its own policy mapping style. See SKILL.md → "Step 0".

```
templates/landing-page/                  ← cq:Template (the template itself)
├── .content.xml                         ← Metadata: title, status, ranking, type ref
├── initial/                             ← LAYER 1 — starting content for new pages
├── structure/                           ← LAYER 2 — locked/unlocked layout authors see
├── policies/                            ← LAYER 3 — design configurations (per component)
├── thumbnail.png                        ← preview image
└── thumbnail.png.dir/.content.xml       ← FileVault binary descriptor
```

When an author creates a page from this template:

1. **`initial`** is **copied** to the new page (one-time, at creation).
2. **`structure`** is **merged-in** at render time — locked parts cannot be changed by the author and update whenever the template changes.
3. **`policies`** are **referenced** at render time — design configurations apply to component instances by mapping.

This three-way relationship is what makes editable templates powerful — and why they're often misunderstood.

## Layer 1 — `initial/`

**Purpose:** The starting content for a brand-new page.

```
initial/
├── .content.xml                         ← cq:Page node
└── jcr_content/                         ← jcr:content (cq:PageContent)
    ├── .content.xml                     ← page-level properties
    └── root/                            ← responsive-grid root
        └── ...                          ← starter components
```

- Created **once**, when an author chooses "Create > Page > [this template]".
- After creation, the page is **disconnected** from `initial/` — editing `initial/` later does **not** affect existing pages.
- This is where you put "headline + paragraph + image" placeholders so authors don't stare at a blank canvas.

**What goes here:**

- Default `sling:resourceType` on the page (typically the template's page component).
- A `cq:template` property pointing back at the template path — required so the page can resolve `structure` and `policies` at render time.
- A `root` container with a starter set of components (optional but author-friendly).

**What does NOT go here:**

- Anything that needs to update on existing pages after the template changes — put that in `structure/` (if it's layout) or `policies/` (if it's design config).
- Site-wide chrome (header, footer, nav) — use experience fragments referenced from `structure/`.

## Layer 2 — `structure/`

**Purpose:** The locked-and-unlocked layout that authors see when editing a page.

```
structure/
└── jcr_content/
    └── root/                            ← responsive grid; this IS the page layout
        ├── header                       ← typically locked (editable="false")
        ├── responsivegrid               ← unlocked authoring area
        └── footer                       ← typically locked
```

- Rendered **live** on every page that uses the template.
- Editing `structure/` updates **all** existing pages immediately — no republish required for layout changes.
- A node with `editable="false"` is **locked** — authors cannot move, delete, or replace it (only the policy is editable, if the policy allows).
- A node without `editable="false"` (or with `editable="true"`) is **unlocked** — authors can add, remove, and reorder components.

**The "unlock" rule:**

- For a child container to be unlockable independently, the parent **structure** node needs `editable="false"` to lock the parent layout while leaving a specific inner grid open.
- Conversely, leaving the top-level grid unlocked makes the entire page editable.

**Locked node template:**

```xml
<header
  jcr:primaryType="nt:unstructured"
  sling:resourceType="<project>/components/header"
  editable="{Boolean}false"/>
```

**Unlocked container (the project-container pattern):**

```xml
<container
  jcr:primaryType="nt:unstructured"
  sling:resourceType="<project>/components/container"
  editable="{Boolean}true"
  layout="responsiveGrid"/>
```

> Use the **project's own container component** (e.g., `<project>/components/container`) as the structure root and the unlocked container, with `layout="responsiveGrid"`. Substituting `wcm/foundation/components/responsivegrid` will compile and deploy but the project page component won't render through it — the page comes up blank. Always check the project's existing templates first (Step 0 in SKILL.md) to confirm the resource type before authoring new structure XML.

## Layer 3 — `policies/`

**Purpose:** Mapping of component instances inside the template to **content policies** (design configurations).

```
policies/
└── .content.xml                         ← cq:Page with mapping table
```

The mapping `.content.xml` looks like this. Note `jcr:content` is `nt:unstructured` (not `cq:PageContent`); each mapping node uses `wcm/core/components/policies/mapping` (singular) while `jcr:content` uses `mappings` (plural).

```xml
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
```

- Each `cq:policy` attribute is a **relative path** (under `/conf/<project>/settings/wcm/policies/`) to a policy node.
- The policy itself contains design properties: allowed components, allowed text styles, allowed image sizes, etc.
- The same policy can be reused across multiple templates — that's its main value. Most projects already have "Page Root" and "Page Content" policies that allow the right component groups; grep the policy registry before inventing new ones.

See [`policies.md`](policies.md) for the policy structure and the most common policy properties.

## How the Layers Combine at Render Time

When an author opens a page:

1. **Page content** is read from `/content/<site>/<page>/jcr:content`.
2. The renderer resolves the `cq:template` property to find the template path.
3. **`structure/jcr:content`** is merged into the page render — locked nodes win; unlocked nodes are overlaid by page content.
4. For each component instance, the renderer looks up the policy via `policies/.content.xml/jcr:content/<path>@cq:policy`.
5. The policy is then applied as the component's design configuration (allowed components, style options, defaults).

**The order matters:** structure is layout, content is what's inside, policy is how it's configured.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| Put author chrome (header/footer) in `initial/` | Header doesn't update when you change the template — every existing page is stuck on the old version. Fix: move to `structure/` (locked). |
| Forget to set `editable="false"` on structural elements | Authors can drag the header away. Fix: lock it in `structure/`. |
| Put design config (e.g., text alignment defaults) in `structure/` | Cannot reuse across templates. Fix: move to a policy. |
| Reference a policy that doesn't exist | Component renders with default (all-allowed) config — authors see all components. Fix: create the policy or remove the mapping. |
| Forget `cq:template` in `initial/jcr:content` | Page cannot resolve structure/policies; renders broken. Fix: set `cq:template="/conf/.../templates/<name>"`. |

## Validation

- [ ] `initial/jcr:content` has a valid `sling:resourceType` and `cq:template` reference.
- [ ] `structure/jcr:content/root` exists and contains the responsive grid (or whatever container the page component expects).
- [ ] Locked structural elements have `editable="{Boolean}false"`.
- [ ] `policies/.content.xml` exists and maps every container that needs a policy.
- [ ] `thumbnail.png` exists at the template root.

## See Also

- [`template-types.md`](template-types.md) — how the type that spawns templates fits in.
- [`templates.md`](templates.md) — how to create the template folder above.
- [`policies.md`](policies.md) — the design configuration layer in detail.
- [`recipes.md`](recipes.md) — ready-to-use templates.
