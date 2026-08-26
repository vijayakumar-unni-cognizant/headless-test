---
name: create-editable-template
description: AEM as a Cloud Service editable templates, template types, content policies, policy mappings, allowed components, and cq:allowedTemplates. Use when scaffolding a new editable template, creating a new template type, adding or modifying content policies, restricting which components appear in which containers, wiring allowed templates onto a content tree, or debugging "template not available" / "policy not applied" / "component not in dialog" issues. Pairs with create-component for the component-side wiring.
license: Apache-2.0
---

# AEM as a Cloud Service — Editable Templates

Editable templates are the **template definitions** that authors instantiate to create new pages. Unlike static templates, they live in `/conf/<project>/settings/wcm/` and can be edited via the **Template Editor** at runtime; they are typically also shipped as initial content via `ui.content`.

This skill covers the full surface that lives *around* a component — template types, editable templates, content policies, policy mappings, allowed-components wiring, and `cq:allowedTemplates`. It complements **`create-component`**: that skill builds the component itself; this skill builds the world it lives in.

> **Beta Skill**: Validate every change against a local AEM SDK with the Template Editor open, and against page authoring before deploying to Cloud Manager.

## Step 0 — Read an Existing Project Template First (mandatory)

**Before writing any template XML, read at least one already-working template under `ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/templates/`.** Templates carry project-specific conventions that this skill's generic examples do not capture:

- `cq:Template` root `.content.xml` typically has a `<jcr:content jcr:primaryType="cq:PageContent">` child carrying `cq:templateType`, `status`, `jcr:title`, `jcr:description` — not properties on the `cq:Template` root itself.
- Structure root `sling:resourceType` is usually the project's own container component (e.g., `<project>/components/container`) with `layout="responsiveGrid"`, **not** `wcm/foundation/components/responsivegrid`.
- The unlock pattern uses `editable="{Boolean}true"` on a nested inner container the project's page component knows how to render — copying the locked/unlocked semantics from this skill's generic examples will produce a page that renders empty.
- Policy mapping `jcr:content` is `nt:unstructured` with `sling:resourceType="wcm/core/components/policies/mappings"` (plural). Each mapping node uses `wcm/core/components/policies/mapping` (singular). The skill's prior examples sometimes use `cq:PageContent` here — match what the project actually uses.

Match the existing template's `cq:templateType`, root `sling:resourceType`, `editable` markers, and policy-mapping shape **exactly**. Do not improvise generic AEM patterns when a working project template is one `find` command away.

| Command | What you'll see |
|---|---|
| `find ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/templates -maxdepth 4 -type f` | All template files; pick one that's closest to what you're building (landing page, content page, etc.). |
| `cat <template>/.content.xml` | The exact cq:Template root shape this project uses. |
| `cat <template>/structure/.content.xml` | The exact structure shape — root resourceType, editable markers. |
| `cat <template>/policies/.content.xml` | The exact policy mapping pattern. |
| `find ui.content/.../wcm/template-types -maxdepth 2 -name .content.xml` | Available `cq:templateType` references for this project. |

If no existing template exists in the project, fall through to the references below and validate aggressively with the Template Editor.

## When to Use This Skill

- Scaffolding a **new editable template** for a new page kind (landing page, product page, article)
- Creating a **new template type** so authors can spawn a family of templates
- Adding, modifying, or auditing **content policies** (the design configurations for each component instance)
- Wiring **policy mappings** so the right policy applies to the right component path inside a template
- Restricting **allowed components** in a container or responsive grid
- Setting **`cq:allowedTemplates`** on a content branch so authors can only use specific templates there
- Debugging: "Template doesn't appear in the create-page wizard", "Component is missing from the dialog", "Policy isn't applied", "Author can't move/delete this component"

## File Locations & Naming

All editable-template-related content lives in `ui.content` (the **mutable** content package) under `conf/<project>/settings/wcm/`:

```
ui.content/src/main/content/jcr_root/conf/<project>/settings/wcm/
├── template-types/<type-name>/         # blueprints used to spawn editable templates
├── templates/<template-name>/          # the actual templates authors pick from
└── policies/                           # content policies referenced by templates
```

A single editable template is a folder with this structure:

```
templates/<template-name>/
├── .content.xml                # cq:Template node + metadata (title, status, ranking)
├── initial/                    # starting content for new pages
│   ├── .content.xml
│   └── jcr_content/...
├── structure/                  # locked/unlocked structure visible to authors
│   ├── .content.xml
│   └── jcr_content/...
├── policies/                   # policy mappings (component-path → policy-path)
│   └── .content.xml
├── thumbnail.png               # preview image shown in the wizard
└── thumbnail.png.dir/          # FileVault binary descriptor
```

**Naming convention:** use `kebab-case` for folder names; the folder name becomes the template ID and appears in URLs like `/conf/{project}/settings/wcm/templates/landing-page`. The display title comes from `jcr:title` inside `.content.xml`, not the folder name.

## Decision Guide

Pick the reference for your task:

| Task | Reference |
|------|-----------|
| Understand what's inside a template (initial / structure / policies) | [`references/anatomy.md`](references/anatomy.md) |
| Create or modify a **template type** | [`references/template-types.md`](references/template-types.md) |
| Create or modify an **editable template** | [`references/templates.md`](references/templates.md) |
| Create, modify, or audit a **content policy** | [`references/policies.md`](references/policies.md) |
| Restrict which **components** appear in a container | [`references/allowed-components.md`](references/allowed-components.md) |
| Restrict which **templates** can be used on a content branch | [`references/allowed-templates.md`](references/allowed-templates.md) |
| Debug "template missing", "policy not applied", "component locked" | [`references/validation.md`](references/validation.md) |
| Copy-paste recipes (page template, fragment template, locked footer) | [`references/recipes.md`](references/recipes.md) |

## Critical Rules

- **READ AN EXISTING PROJECT TEMPLATE FIRST** (see Step 0 above) — the skill's generic examples are starting points, but every project's editable template has conventions (root `cq:PageContent` child with `cq:templateType`, project-specific container resource type for the structure root, editable-marker conventions) that you must match. Skipping this step produces pages that build cleanly but render empty.
- **READ THE REFERENCE FIRST** — editable templates have three independent layers (initial / structure / policies) and a mistake in any one breaks authoring in a different way.
- **`/conf/<project>` is mutable content.** Author teams may edit templates and policies at runtime through the Template Editor. Treat your `ui.content` shipment as **initial seeding only**; do not assume re-deploys will overwrite author changes (they won't — FileVault `merge` semantics preserve runtime edits).
- **Template `status`** must be `enabled` (not `draft`) for the template to appear in the create-page wizard. New templates default to `draft`.
- **Policies are referenced by path**, not by name. The mapping in `templates/<t>/policies/` is brittle to component renames; always update mappings when you rename a component.
- **Locked components in `structure`** cannot be edited or removed by authors. Be conservative — over-locking forces template changes for trivial requests.
- **Self-populating structural components are design-driven, not defaults.** Every node in `structure/` (and `initial/`) renders on EVERY page built from the template. Several Core Components emit visible output even when the author leaves them empty, because they fall back to page properties or the content hierarchy — e.g. **Title** → page `jcr:title` (an `<h1>`), **Breadcrumb** and **Navigation** → the content tree, **Language Navigation** → language roots. Placing any such component in the structure means it appears on every page regardless of the design. Include one ONLY when the design calls for it on every page. The archetype's structural `<title>` is the common trap: kept when the design has no standalone page heading, it renders a second `<h1>{pageTitle}</h1>` above the real hero heading (a fidelity mismatch and a "one H1 per page" a11y breach). A content policy can change a component's variant (e.g. Title `type=h2`) but CANNOT suppress a page-property fallback — only omitting the structural node removes the output.
- **Reusing a template? Audit its `structure/` against the new design FIRST, and respect the blast radius.** A template's `structure/` renders on every page already built on it. Before reusing, `Read structure/.content.xml` and confirm each default-rendered node (chrome EFs, any self-populating component per the rule above, locked components) matches the new page's design. If it doesn't, do NOT edit the shared template's structure to fit one page — that mutates every existing consumer. Create a new template/variant, or resolve it in page-scoped content.
- **Initial content is a starting point, not a contract.** Authors edit pages after creation; do not rely on initial content paths being stable on a live page.
- **Allowed components** are configured per container, on the **policy** of that container — not on the container node itself. This is the single most-misunderstood part of editable templates.
- **DO NOT** edit templates in `/libs` — that's read-only. Override and customise under `/apps` (component side) and `/conf/<project>` (template side).
- **DO NOT** ship full content trees (`/content/<project>/...`) in `ui.content` unless you've coordinated with content authors — overwrites cause data loss on re-deploy.

## Quick Sketch — Minimum Viable Template

For a single landing-page template:

```
ui.content/src/main/content/jcr_root/conf/{project}/settings/wcm/templates/landing-page/
├── .content.xml                        # cq:Template, jcr:title="Landing Page", status="enabled"
├── initial/.content.xml                # cq:Page with jcr:content → cq:PageContent
├── structure/.content.xml              # cq:Page with locked top-level elements
├── policies/.content.xml               # mapping component-path → policy-path
└── thumbnail.png                       # 320×200 preview
```

With this in place, authors see "Landing Page" in the create-page wizard at any branch where `cq:allowedTemplates` allows `/conf/{project}/.../landing-page` (see [`allowed-templates.md`](references/allowed-templates.md)).

## Validation Checklist

- [ ] Step 0 done: at least one existing project template was read and its `cq:templateType`, root `sling:resourceType`, `editable` markers, and policy-mapping shape were matched.
- [ ] **Structural-fidelity decision recorded:** every self-populating structural component (Title, Breadcrumb, Navigation, Language Navigation, …) in `structure/` was checked against the design and kept only where the design wants it on every page — NOT copied from the archetype by reflex. In particular the structural `<title>` was kept (design has a standalone page heading) or omitted (design leads with a hero/eyebrow/teaser). If reusing an existing template, its `structure/` was audited against the new design and no shared-template structure edit was made to satisfy a single page.
- [ ] Template folder is `kebab-case` and matches the URL fragment authors will see.
- [ ] `.content.xml` at the template root has `jcr:primaryType="cq:Template"` with a `<jcr:content jcr:primaryType="cq:PageContent">` child holding `cq:templateType`, `status="enabled"`, `jcr:title`, and `jcr:description`.
- [ ] `thumbnail.png` exists (≈ 320×200) and is committed.
- [ ] `initial/jcr:content` has a sensible `sling:resourceType` and a `cq:template` property pointing back at the template path.
- [ ] `structure/jcr:content/root` is a responsive grid. **Do NOT put `editable="{Boolean}true"` on `<root>`** — root MUST be structural (no `editable` attribute). Do NOT put `editable="{Boolean}false"` OR `decoration="{Boolean}false"` on `<experiencefragment-header>` / `<experiencefragment-footer>` — the archetype's working templates omit these attributes, and adding them has been observed to suppress rendering. `editable="{Boolean}true"` belongs ONLY on the innermost author-editable parsys nodes (the inner `<container>`, and a deeply-nested `<title>` only when the design calls for one — see the design-driven rule above) — never on structural chrome.
- [ ] Structure follows the archetype pattern: `<root>` (structural, responsiveGrid) → `<experiencefragment-header>` (structural) + `<container>` (structural, containing the innermost `<container editable="true" layout="responsiveGrid"/>` author parsys) + `<experiencefragment-footer>` (structural). **The archetype's `<title editable="true"/>` inside that container is DESIGN-CONDITIONAL, not mandatory — see the "structural `<title>` is design-driven" Critical Rule below.** Include it ONLY when the page design has a standalone page-title heading above the content; OMIT it when the design leads with a hero/eyebrow/teaser (a kept Title emits an unwanted second `<h1>` via the page-title fallback).
- [ ] **`policies/jcr:content` (the top-level `<jcr:content>` node itself) has a `cq:policy` attribute pointing at a `<project>/components/page/policies/<name>` node — this is what loads the site clientlibs on every page created from the template. Without it, deployed pages render with NO CSS or JS.** Verify the referenced policy node exists in the consolidated `/conf/<project>/settings/wcm/policies/.content.xml` under `<project>/components/page/policies/` (or directly under `<project>/components/page/`) and declares `clientlibs="[<project>.dependencies,<project>.site]"` (or the project's canonical clientlib categories).
- [ ] `policies/jcr:content/root` contains a `cq:policy` reference for the page root AND a **matching mapping tree** for every structural child of `<root>` in structure (header EF, inner container(s), footer EF) — the mapping tree in policies MUST mirror the node paths in structure exactly.
- [ ] **Every inner container child of `root` (the editable regions authors drop components into) has its OWN `cq:policy` mapping in `policies/jcr:content/root/<container-name>` — otherwise the editable region has no allowed-components list.** If structure has nested containers (`root/container/container`), the policies file must have the same nesting.
- [ ] Any container that authors can drag components into has an **allowed-components** list in its policy (otherwise authors see *all* components).
- [ ] Sample-page content authored under `/content/<project>/**/.content.xml` places components at the SAME node depth as the template's innermost editable parsys (typically `root/container/container/*`) — NOT directly under `<root>`. Content placed at the wrong depth still renders individual components but disconnects them from the template's editable region and defeats the Style System / policy mapping.
- [ ] **The innermost editable container's policy mapping contains a `<{project}><components>...</components></{project}>` block** with `<type cq:policy="{project}/components/<type>/policies/<name>"/>` entries for every component type authors can drop into that region. Without this block, Style System variants on component-level policies are orphaned — authors see no "Style" dropdown on any component. This block is what wires design policies (which carry Style System variants) to specific component types in the parsys.
- [ ] Each component type in the mapping block references **exactly one** design policy. If a component has multiple Style System variants (e.g., teaser Hero + CTA), those variants MUST be consolidated into a SINGLE policy with all variants in `cq:styleGroups/item0/cq:styles/*` — not split across two policies (only one is reachable via the mapping, so the other's `cq:styleIds` are silently orphaned). See `{best-practices}/references/style-system-dom-contracts.md` §5.
- [ ] **Container layout variants use the full three-part contract** ([Recipe 7](references/recipes.md#recipe-7--container-layout-style-variants-cqstylegroups)): (1) the policy has a `cq:styleGroups` **child-node subtree** (not the lossy inline-array form) with `cq:styleClasses` + numeric `cq:styleId` + `cq:styleLabel` on every item; (2) content `cq:styleIds` references the matching **numeric** id; (3) the SCSS targets `.cmp-container--{variant} > .cmp-container > .aem-Grid` (never the bare variant class) with the clearfix-pseudo reset. Presence of the styleGroups alone is NOT sufficient — a variant that's authorable but whose SCSS targets the wrong element renders nothing (the "selected but not applied" defect).
- [ ] **Single-`<h1>` heading baseline** ([Recipe 8](references/recipes.md#recipe-8--seo--single-h1-heading-baseline-mandatory-for-any-sites-page)): exactly one component instance (the hero teaser) owns the page `<h1>` via a policy with `titleType="h1"`; every other teaser policy is `titleType="h2"|"h3"`; every Title policy is `type="h2"` with `allowedTypes` excluding h1. A page with multiple unpinned Teaser/Title components emits multiple `<h1>` — the recurring SEO-H1 defect.
- [ ] Experience Fragment SCSS targets the class Core XF v2 **actually emits**: `cmp-experiencefragment--<xf-node-name>` (derived from the fragment's JCR node name — e.g. a fragment at `.../site/kiln-ember-header/master` emits `cmp-experiencefragment--kiln-ember-header`). **Verify the emitted class on the live DOM before writing chrome selectors** — do NOT assume a generic `--header`/`--footer` (that only appears if the node is literally named `header`/`footer`), and do NOT assume a `<header>`/`<footer>` element selector will match (the wrapper is a `<div>` unless `cq:styleDefaultElement="header"` is set in the policy). Also note components inside an XF render under the XF's own template (`xf-web-variation`), so page-template Style System/component policies do NOT apply there — style XF chrome structurally. See `{best-practices}/references/style-system-dom-contracts.md` §3 and §5.
- [ ] `cq:allowedTemplates` on the parent content branch references this template (`/conf/<project>/.../<template-name>$`).
- [ ] Build verification is **deferred to the Build Validation Gate** owned by the Test Automation Agent (ADLC-SPEC §8.1.1) — this skill does NOT invoke `mvn`. After the Build Gate runs, the template should appear at `http://localhost:4502/aem/templates.html/conf/<project>` with status **enabled**.
- [ ] Create-page wizard at `/content/<project>/...` lists the new template (verifiable after Build Gate).

## See Also

- **Component side:** [`create-component`](../create-component/SKILL.md) — building the components that templates contain.
- **Repoinit / permissions for `/conf`:** [`repoinit/references/acls.md`](../repoinit/references/acls.md) — grants for authoring service users.
- **Adobe — Editable Templates:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/full-stack/components-templates/templates>
- **Adobe — Page Templates - Editable (authoring):** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/sites/authoring/page-editor/templates>
