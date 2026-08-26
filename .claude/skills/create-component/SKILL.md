---
name: create-component
description: |
  Creates complete AEM components with dialog, HTL template, Sling Model, unit tests, and clientlibs.
  Supports extending Core Components and project components. When a Figma design URL is provided,
  fetches the design via Figma MCP (get_design_context) and translates it into pixel-perfect HTL, CSS,
  and JS. When a reference web page URL is provided, fetches the page via WebFetch (with fallback to
  user-pasted HTML + linked CSS), decomposes it into a proposed component list, extracts design tokens
  into ui.frontend/.../_variables.scss, and scaffolds the components + a minimal editable template + a
  sample page so the rebuilt UI is previewable end-to-end. The reference URL is treated as a visual/
  design reference only — HTML, DOM, and CSS from the URL are NOT transplanted into HTL; every
  component is authored fresh against AEM as a Cloud Service patterns. Follows Adobe Experience
  League best practices for AEM Cloud Service and 6.5.
  Use this skill whenever the user mentions creating, building, generating, or scaffolding an AEM
  component, or mentions component types like teaser, card, hero, banner, accordion, tabs, carousel,
  list, navigation, breadcrumb, or any custom AEM component. Also trigger when the user wants to
  extend a Core Component, create a component dialog, add a Sling Model, convert a Figma design into
  an AEM component, or rebuild the UI of a reference web page URL as AEM components.
compatibility: Requires AEM as a Cloud Service or AEM 6.5. Maven project structure with core, ui.apps modules. Figma design integration requires the `plugin-figma-figma` MCP server to be enabled in the IDE.
license: Apache-2.0
metadata:
  author: AEM Dev Agent
  version: "1.0"
  aem_version: "6.5/Cloud Service"
---
# AEM Component Creation Skill

Creates complete AEM components following Adobe best practices.

## Configuration Gate Check — Do This First

> This configuration check needs to happen first because without it, the skill will use incorrect project paths and package names, causing every generated file to be wrong.

**First tool call**: Read `.aem-skills-config.yaml` in the **project root** (same level as `pom.xml`).

**Check**: Does the file exist and does it have `configured: true`?

| Status | Action |
| --- | --- |
| File missing or configured: false | Stop and display the error message below. Do not explore the codebase or proceed — the config values are needed for correct file paths and naming. Wait for the user to configure. |
| configured: true | Read project, package, and group values from the YAML file. Proceed with component creation. |

### If NOT configured, Display This Message and Stop:

```
Project configuration required!

Before creating components, configure your project settings in:
`.aem-skills-config.yaml` (in your project root, same level as pom.xml)

Open the file and update:
- project: Your AEM project name (e.g., 'mysite', 'wknd')
- package: Your Java package (e.g., 'com.mysite.core')
- group: Your component group (e.g., 'MySite Components')
- configured: true

After updating, ask me to create the component again.
```

### Why you should not explore the codebase when unconfigured:

Doing any of the following before configuration is set will lead to incorrect assumptions and wasted effort:

- Reading any other repository files
- Listing directories to "understand the project"
- Checking existing components for patterns
- Looking at pom.xml, Java files, or folder structures
- Inferring values from any source

The config file is the single source of truth for project values — skipping it leads to wrong paths and package names in every generated file.

## No Hallucination Rule

Only create the exact fields the user specified — adding extra fields creates authoring confusion and maintenance burden, and renaming fields breaks content contracts.

**Load reference for full rules:** `references/no-hallucination-rules.md`

## Workflow Overview

| Step | Action |
| --- | --- |
| 0 | Configuration validation (do this first — see above) |
| 1 | Extract & validate component name |
| 1.5 | Component extension decision (if extending) |
| 2 | Gather requirements & confirm dialog specification |
| 2.3 | Figma design fetch (if Figma URL provided) |
| 2.4 | URL design fetch & component decomposition (if reference page URL provided — repeats Step 3 once per proposed component) |
| 3 | Create all component files |
| 3.11 | Dependency verification (required for servlets) |
| 3.12 | Site-level token merge into `_variables.scss` (URL-design mode only) |
| 3.13 | Editable template + sample page (URL-design mode only) |
| 4 | Completion summary |

## Step 0: Configuration Validation

### 0.1 Read Configuration

1. Read `.aem-skills-config.yaml` from the project root
2. Check that `configured: true`
3. Read `project`, `package`, and `group` values

### 0.2 Validate — Use Only the Config File

Do not infer project values from the file system, existing components, Java files, pom.xml, or prior knowledge. These sources may be outdated or inconsistent — `.aem-skills-config.yaml` is the single source of truth because the user explicitly sets it.

### 0.3 Load Conventions

1. Read `references/aem-conventions.md` for file structure templates, naming conventions, and patterns

### 0.4 Project State Analysis (after configuration validated)

1. **Check Component Name Uniqueness** - Look in `/apps/[project]/components/`
2. **Check Model Class Conflicts** - Look in `core/src/main/java/[package-path]/models/`
3. **Analyze Existing Patterns** - Review 1-2 recent components for style reference

## Step 1: Extract & Validate Component Name

- Parse component name from user's message (ask if not provided)
- Normalize to lowercase kebab-case (e.g., `My Component` -> `my-component`)
- Validate: starts with letter, only letters/numbers/hyphens, no consecutive hyphens

## Step 1.4: Scope Triage — Is a new component actually needed?

**Before deciding to extend or create, classify the ask. This step prevents accidental component proliferation for what should be a small policy edit.**

| Scope of the ask | Action |
|---|---|
| CSS / theme / variation only (e.g., "dark mode title", "left-aligned hero", "compact card", "rounded button on the pricing page") | **Do NOT create a new component.** Add a Style System variation to the existing component's policy + a matching BEM modifier class in the SCSS partial. **Halt this skill.** Redirect to a policy edit + a one-class SCSS addition. |
| Behavior change, new authorable fields, new content model, new HTL structure, new Sling Model logic | Proceed to Step 1.5. |
| Author needs a new instance of an existing component on a new page | **Do NOT create a new component.** Add it to the page fixture; ensure the template policy already allows it. |

### Style System variation pattern (when triage routes here)

1. Identify the component being styled (existing project proxy or project component).
2. Add a Style System group + items in the component's policy node under `ui.content/.../wcm/policies/`:
   ```xml
   <styles jcr:primaryType="nt:unstructured" cq:styleGroupLabel="Surface">
     <item0 cq:styleClasses="cmp-title--dark"
            cq:styleLabel="Dark surface"
            jcr:primaryType="nt:unstructured"/>
   </styles>
   ```
3. Add the matching BEM modifier in `ui.frontend/src/main/webpack/components/_{component}.scss`:
   ```scss
   .cmp-title--dark .cmp-title__text { color: $cs-color-text-on-dark; }
   ```
   **Target the emitted DOM, not an assumed one.** The Style System class lands on the component's **outer decoration wrapper**, not the inner element — so layout selectors (`display:flex/grid`) usually belong on the inner `.cmp-<type>` / `.aem-Grid`, not on the `--variant` wrapper. When making `.aem-Grid` a grid/flex container, neutralize its `::before`/`::after` clearfix pseudos. For multi-variant/same-type policy consolidation, Core XF node-name modifier classes, Core Component property contracts (Button `jcr:title`), and FileVault re-seed modes, read `best-practices/references/style-system-dom-contracts.md` **before** writing the SCSS. Verify against the rendered source, not memory.
4. Done. Authors pick the variation from the dropdown in the existing dialog. No new `.html`, no new `.content.xml`, no new Sling Model.

### When to override the triage

The user may explicitly ask for a new component even for UI-only changes (e.g., to bake the styling into a name that's discoverable in the components rail). In that case proceed — but flag it back to the user: *"a Style System variation would also achieve this without a new component; confirm you want a separate component."*

## Step 1.5: Component Extension Decision

### When user says "extend {component}":

**Tier 1: Check Project Components First**

- Search `/apps/{project}/components/{component}`
- If found -> Use as `sling:resourceSuperType`

**Tier 2: Check Core Components**

Even when the user explicitly says "extend Core title" / "extend the Core teaser" / "use `core/wcm/components/...`", do NOT short-circuit Tier 1. **Always re-check Tier 1 first**: if the project already has a proxy at `/apps/{project}/components/{name}` whose `sling:resourceSuperType` points at the Core path the user named, use **the project proxy** as the new component's `sling:resourceSuperType`, not the Core path directly.

Why: project proxies are the **version-pin point**. When the underlying Core version is upgraded (`v3 → v4`), changing it in the proxy updates every downstream component in one edit. Bypassing the proxy spreads the version pin across every custom component.

Decision flow:

```
User says "extend X" (where X resolves to a Core Component path below)
     ↓
Does /apps/{project}/components/{X} exist as a proxy (sling:resourceSuperType set to a core/wcm/... path)?
     ├── YES → use sling:resourceSuperType = "{project}/components/{X}"   ← chain through proxy
     └── NO  → use the Core path from the mapping table below             ← direct to Core
              (and consider scaffolding the proxy first as a separate edit, if the project follows the proxy convention)
```

| User Says | Core path it maps to |
| --- | --- |
| image | core/wcm/components/image/v3/image |
| teaser, card | core/wcm/components/teaser/v2/teaser |
| text, richtext | core/wcm/components/text/v2/text |
| title, heading | core/wcm/components/title/v3/title |
| list | core/wcm/components/list/v4/list |
| button, cta | core/wcm/components/button/v2/button |
| navigation, nav | core/wcm/components/navigation/v2/navigation |
| container, section | core/wcm/components/container/v1/container |
| accordion | core/wcm/components/accordion/v1/accordion |
| tabs | core/wcm/components/tabs/v1/tabs |
| carousel | core/wcm/components/carousel/v1/carousel |
| embed, video | core/wcm/components/embed/v2/embed |

**Tier 3: Not Found** - Ask user for clarification.

**For extension patterns, load:** `references/extending-core-components.md`

## Step 1.6: Core Component Extension Requirements

**Required when extending with "hide", "remove", "add custom field", or "override"** (these operations need Sling Resource Merger patterns to work correctly):

**Load reference:** `references/extending-core-components.md`

| User Request | Action |
| --- | --- |
| "Add custom fields" | Create new tab OR add to existing |
| "Hide {tab}" | Use sling:hideResource="{Boolean}true" |
| "Hide {field}" | Use sling:hideResource="{Boolean}true" |
| "Override {field}" | Use sling:hideProperties + new values |

**When extending Core Components:**

- Use `@Self @Via(type = ResourceSuperType.class)` for model delegation
- Implement `ComponentExporter` interface
- Add `resourceType` to `@Model` annotation
- Use `sling:hideResource` in dialog for inherited tabs/fields

> **Note:** If the parent component is a project component (not a Core Component), use direct Java class extension (`extends ParentModel`) instead of the delegation pattern. The `@Self @Via(type = ResourceSuperType.class)` pattern is only for Core Components. Load `references/extending-core-components.md` for the decision table.

## Step 2: Gather Requirements

### 2.1 Parse Dialog Specification

Echo back EXACTLY what you understood before creating:

```
Dialog Specification Confirmed:
I will create exactly {N} fields:
| # | Field Label | Field Type | Property Name |
|---|-------------|------------|---------------|
| 1 | {label1}    | {type1}    | {name1}       |
No additional fields will be added.
Is this correct?
```

### 2.2 Mockup Image Handling

- **Both mockup AND spec provided:** Dialog spec takes precedence. Mockup for HTML/CSS only.
- **Only mockup provided:** Propose fields and ASK for confirmation.

### 2.3 Figma Design Input

**Load:** `references/figma-design-rules.md`

When user provides a Figma URL (`figma.com/design/...`, `figma.com/make/...`, or `figma.com/board/...`):

1. **Parse the URL** to extract `fileKey` and `nodeId` (see references/figma-design-rules.md Rule 1)

- Convert `-` to `:` in the `node-id` query parameter
- Use `branchKey` as `fileKey` for branch URLs

1. **Call **`get_design_context` via the `plugin-figma-figma` MCP server (see Rule 2):`{ "server": "plugin-figma-figma", "toolName": "get_design_context", "arguments": { "nodeId": "<extracted-node-id>", "fileKey": "<extracted-file-key>", "clientLanguages": "html,css,javascript", "clientFrameworks": "htl" } }`
2. **Extract design tokens** from the response — colors, fonts, sizes, spacing, layout (see Rules 3-4)
3. **Use the Figma output** for HTL structure, CSS styling, and JS behavior — **NOT** for dialog fields

**Precedence when BOTH dialog spec AND Figma URL are provided:**

- **Dialog specification** → determines dialog fields (absolute precedence, no hallucination)
- **Figma design** → determines HTML structure, CSS styling, JS behavior only

**When ONLY Figma URL is provided (no dialog spec):**

- Analyze the design and **PROPOSE** dialog fields to the user
- **ASK for confirmation** before proceeding

**Figma response handling:**

- The response is React+Tailwind — treat as a REFERENCE, not production code
- Convert JSX to semantic HTL with BEM classes (see Rule 5)
- Extract all CSS values to the `ui.frontend/src/main/webpack/components/_{name}.scss` partial (see Rule 6)
- Create JS only if interactivity is implied (see Rule 7)
- Do not hardcode Figma temporary image URLs — they expire and will break in production (see Rule 8)

### 2.4 URL Design Input

**Load:** `references/url-design-rules.md`

When the user provides a reference web page URL (e.g., `https://example.com/some-page`) and asks to rebuild its UI in AEM:

> **CRITICAL CONSTRAINT — the URL is a visual/design reference only.** The HTML, DOM, and CSS fetched from the URL must NOT be transplanted into AEM component HTL. Every new component is authored fresh against the AEM as a Cloud Service patterns codified in this skill (Sling Model + dialog + HTL + ui.frontend SCSS partial, BEM class names, Core Image embedding, etc.). The URL provides the **look** (colors, typography, spacing, breakpoints, fonts, block-level layout); this skill provides the **structure**.

1. **Fetch the page** via WebFetch. Prompt the tool to return raw HTML and inline CSS rather than a summary (see `url-design-rules.md` Rule 2). Also fetch each same-origin stylesheet referenced via `<link rel="stylesheet">` in a follow-up pass.
2. **If fetch is insufficient** (SPA, auth wall, paywall, fetch returns thin content), **STOP** and ask the user to paste the rendered HTML (post-JS) plus the contents of each linked CSS file. Do not proceed on thin content — token extraction will be wrong.
3. **Decompose the page** into a proposed component list using `url-design-rules.md` Rule 3. Echo the breakdown back as a table and ASK for confirmation before scaffolding. Tag each row with reuse intent (extend existing project component, extend Core Component, or new).
4. **Extract design tokens** per `url-design-rules.md` Rule 4 — colors, font families, font sizes, line heights, spacing scale, breakpoints, web fonts. Hold these for Step 3.12 (merge into `_variables.scss`).
5. **Loop Step 3** once per confirmed component. The SCSS partial for each component MUST reference variables from `_variables.scss` rather than re-declaring raw hex/px values.
6. **Reuse preference (Rule 5):** if a block on the URL matches a header, nav, footer, button, image, teaser, or any existing project/Core Component, **extend** it via `sling:resourceSuperType` instead of creating from scratch. See `references/extending-core-components.md`.
7. **Images (Rule 8):** never deep-link external page images into HTL. Model each as a dialog pathfield → Sling Model property → embed Core Image — same as the Figma flow.
8. **After all components are created**, run Steps 3.12 (token merge) and 3.13 (template + page).

**Precedence when BOTH dialog spec AND reference URL are provided:**

- **Dialog specification** → determines dialog fields (absolute precedence, no hallucination)
- **Reference URL** → determines visual tokens, layout, component breakdown only — never HTL structure verbatim

### 2.5 Dynamic Content Requirements

| User Indicates | Servlet Required? |
| --- | --- |
| External API integration | Yes (GET) |
| Dynamic data loading | Yes (GET) |
| Form submission | Yes (POST) |
| Search/filter | Yes (GET) |
| Static dialog content | No |

## Step 3: Create Component Files

Create ALL files in this order:

### 3.1 Component Definition

**Path:** `ui.apps/src/main/content/jcr_root/apps/[project]/components/{component-name}/.content.xml`

Load: `references/aem-conventions.md`

### 3.2 Component Dialog

**Path:** `ui.apps/.../components/{component-name}/_cq_dialog/.content.xml`

**Load:** `references/dialog-patterns.md`

**For extended components:** Load `references/extending-core-components.md` — Sling Resource Merger is required here because dialog inheritance only works through the merger; without it, parent dialog nodes won't be resolved.

### 3.2.1 Image Field Handling

When a user specifies an image or photo field:

- **Default approach:** Embed the Core Image component via `data-sly-resource` — do NOT create a fileupload dialog field with manual `<img>` rendering.
- **Fileupload is only for non-image files** (PDFs, documents, etc.). Only use `cq/gui/components/authoring/dialog/fileupload` when the user explicitly asks for a non-image file upload.
- **Load** `references/htl-patterns.md` (Image Handling section) for the correct embedding pattern.

### 3.3 HTL Template

**Path:** `ui.apps/.../components/{component-name}/{component-name}.html`

**Load:** `references/htl-patterns.md`**If Figma URL provided, ALSO load:** `references/figma-design-rules.md` (Rules 5, 8) — Convert JSX structure to semantic HTL with BEM classes. Replace static text with Sling Model expressions. Use the Figma screenshot as visual truth for element hierarchy.

**i18n check:** If the component has static display text (labels, button text, placeholder strings), use HTL i18n expressions: `${'Label Text' @ i18n}`. Do not handle static text translation in the Sling Model — keep it in HTL where translation is automatic.

### 3.4 Sling Model

**Path:** `core/src/main/java/[package-path]/models/{ComponentName}Model.java`

**Load:** `references/model-patterns.md`, `references/java-standards.md`

**For extensions:** Load `references/extending-core-components.md`

> **Cloud Service correctness check:** After writing the Sling Model, if it touches any of the following — DAM (`AssetManager`, `Asset`, `Rendition`), replication (`Replicator`), scheduling (`cq:scheduler`, `Runnable`), or JCR observation (`javax.jcr.observation.EventListener`) — load the `best-practices` skill and apply the matching `references/` transformation module before proceeding to Step 3.5. Do not advance with a deprecated API pattern in the model.

**Delegation Pattern (for Core Component extensions):**

```java
@Model(adaptables = SlingHttpServletRequest.class,
       adapters = {CustomModel.class, ComponentExporter.class},
       resourceType = CustomModel.RESOURCE_TYPE)
@Exporter(name = ExporterConstants.SLING_MODEL_EXPORTER_NAME,
          extensions = ExporterConstants.SLING_MODEL_EXTENSION)
public class CustomModel implements ComponentExporter {
    @Self @Via(type = ResourceSuperType.class)
    private com.adobe.cq.wcm.core.components.models.List coreList;
    // Use FQN for core interfaces to avoid import collision
}
```

### 3.5 Child Item Model - If Multifield

**Path:** `core/src/main/java/[package-path]/models/{ItemName}.java`

### 3.6 Unit Test

**Path:** `core/src/test/java/[package-path]/models/{ComponentName}ModelTest.java`

**Load:** `references/test-patterns.md`

### 3.7 Component Styles & JS — ui.frontend Webpack Partials

**Paths:**
- `ui.frontend/src/main/webpack/components/_{component-name}.scss` — required for every component with UI
- `ui.frontend/src/main/webpack/components/_{component-name}.js` — only if the component needs runtime interactivity

**Load:** `references/clientlib-patterns.md`

**How they reach the page:**
- `ui.frontend/src/main/webpack/site/main.scss` glob-imports `../components/**/*.scss`.
- `ui.frontend/src/main/webpack/site/main.ts` glob-imports `../components/**/*.js`.
- The webpack build bundles the result into `clientlib-site` (category `{project}.site`, declared in `ui.apps/.../clientlibs/clientlib-site/.content.xml`), which the page template already loads on every page.

**What NOT to do (changed from earlier versions of this skill):**
- Do NOT create `ui.apps/.../clientlibs/clientlib-{component-name}/` for runtime CSS/JS — the webpack flow above replaces it.
- Do NOT add `<sly data-sly-call="${clientlib.css @ categories='...'}"/>` (or the `.js` equivalent) to the component HTL — `{project}.site` already delivers the styles and scripts.
- Do NOT edit `main.scss`, `main.ts`, or `clientlib-site` to register the new partial — the glob imports pick it up automatically.

**Naming:** kebab-case with a leading underscore (`_{component-name}.scss`, `_{component-name}.js`) — matches the existing partials (`_card.scss`, `_hero.scss`, `_app-promo.scss`, `_helloworld.js`).

**If Figma URL provided, ALSO load:** `references/figma-design-rules.md` (Rules 6, 7) — extract exact colors, fonts, sizes, spacing, border-radius from the Figma response and place them into `_{component-name}.scss` using BEM naming. Create `_{component-name}.js` only if the design implies interactivity. Verify pixel-perfect fidelity against the Figma screenshot.

### 3.8 Dialog Clientlib - If Conditional Logic

**Path:** `ui.apps/.../clientlibs/clientlib-{component-name}-dialog/`

**Load:** `references/clientlib-patterns.md` (Dialog JavaScript Pattern section)

> **Why dialog clientlibs still live in `ui.apps` (and not in `ui.frontend`):** they target the AEM authoring UI, depend on `cq.authoring.dialog`, and are attached to the dialog node via `extraClientlibs`. They are not part of the publish-side webpack bundle and must remain on the AEM author runtime classpath.

### 3.9 Sling Servlet - If Dynamic Content

**Path:** `core/src/main/java/[package-path]/servlets/{ComponentName}Servlet.java`

**Load:** `references/sling-servlet-standards.md`

### 3.10 Servlet Unit Test

**Path:** `core/src/test/java/[package-path]/servlets/{ComponentName}ServletTest.java`

### 3.11 Dependency Verification — Required for Servlets

**Before completing, verify dependencies in **`core/pom.xml`**:**

- Do not hardcode versions — check parent pom.xml for version properties instead, since hardcoded versions drift out of sync and cause build conflicts
- Most common APIs included in `aem-sdk-api` (GSON, Jackson, Commons)
- Use `provided` scope for AEM runtime libraries

### 3.12 Site-Level Token Merge — URL-Design Mode Only

**Path:** `ui.frontend/src/main/webpack/site/_variables.scss`

**Load:** `references/url-design-rules.md` (Rule 4)

**Additive merge — never clobber existing tokens.**

1. **Read** the current `_variables.scss` first. Note every variable already declared (e.g., `$font-family`, `$color-foreground`, `$color-background`, `$color-link`).
2. **For each token extracted from the URL**, decide whether to:
   - **Reuse** the existing variable if the URL value is the same or within a small tolerance (e.g., `#202020` vs `#1f1f1f` — reuse).
   - **Append a new variable** below the existing section if no equivalent exists.
3. **Never delete or rename** existing variables — other partials may depend on them.
4. **Group by section** with a `//==` comment header: `//== Brand colors`, `//== Typography scale`, `//== Spacing`, `//== Breakpoints`.
5. **Web fonts:** if the URL uses a non-system font, add a single `@import url('https://fonts.googleapis.com/...')` line at the **top of `_variables.scss`** (above the first `//==` section). Do not add a `<link>` tag in HTL — keep font wiring in the SCSS source per Rule 9.
6. **Component SCSS partials must reference these variables** (`color: $color-brand-primary;`) rather than re-declaring raw hex/px values. Audit each `_{name}.scss` you generated in Step 3.7 to confirm.

### 3.13 Editable Template + Sample Page — URL-Design Mode Only

**Load:** `references/url-design-rules.md` (Rule 10)

Once all components are scaffolded and `_variables.scss` is merged, create a minimal editable template plus a sample page so the rebuilt UI is previewable end-to-end.

**Editable template path:** `ui.content/src/main/content/jcr_root/conf/[project]/settings/wcm/templates/{template-name}/`

The template should:

- Include `initial/`, `structure/`, and `policies/` subtrees per the standard editable-template layout.
- In `structure/jcr:content/root/`, place a `responsivegrid` with the rebuilt components inserted in the **same vertical order** as they appear on the reference URL.
- In `policies/jcr:content/`, register a policy that **allows the newly-created components plus the existing layout container** in the page's responsive grid. Use the `[project]` component group name from `.aem-skills-config.yaml`.
- Set `status="enabled"` on the template `jcr:content` node.

**Sample page path:** `ui.content/src/main/content/jcr_root/content/[project]/{site}/{page-name}/.content.xml`

The sample page should:

- Use `cq:Template` pointing at the editable template above.
- Include `jcr:content` of type `cq:PageContent` with `sling:resourceType` matching the project's page component.
- Carry minimal authored content per component so the page renders something on first view (titles, sample link URLs, placeholder text — keep it tight so the visual fidelity is testable).

**Coordination with `create-editable-template` skill:** if the template work is substantial (custom template type, multiple policies, restricted parsys), recommend the user invoke `create-editable-template` next instead of expanding this step. The goal here is "previewable end-to-end," not full template engineering.

## Step 4: Completion Summary

```
Component '{component-name}' created successfully!

## Files Created
- ui.apps/.../components/{component-name}/.content.xml
- ui.apps/.../components/{component-name}/_cq_dialog/.content.xml
- ui.apps/.../components/{component-name}/{component-name}.html
- core/.../models/{ComponentName}Model.java
- core/.../models/{ComponentName}ModelTest.java
- ui.frontend/src/main/webpack/components/_{component-name}.scss
- ui.frontend/src/main/webpack/components/_{component-name}.js  (only if interactivity)
[+ ui.apps/.../clientlibs/clientlib-{component-name}-dialog/ if dialog needs conditional JS]
[+ servlet files if applicable]
[+ URL-design mode only:]
[  - ui.frontend/src/main/webpack/site/_variables.scss  (additive merge — tokens appended, existing variables preserved)]
[  - ui.content/.../conf/[project]/settings/wcm/templates/{template-name}/  (editable template with policies + initial + structure)]
[  - ui.content/.../content/[project]/{site}/{page-name}/.content.xml  (sample page using the new template)]

## Dialog Fields (Exact Match)
{table matching specification}

Would you like me to add any additional fields or build the project?
```

## Quick Reference: Field Type Mapping

| User Says | Granite Resource Type |
| --- | --- |
| Textfield | granite/ui/components/coral/foundation/form/textfield |
| Textarea | granite/ui/components/coral/foundation/form/textarea |
| Richtext, RTE | cq/gui/components/authoring/dialog/richtext |
| Pathfield, Path | granite/ui/components/coral/foundation/form/pathfield |
| Image, Photo | Embed Core Image component (see references/htl-patterns.md Image Handling section). Do not use fileupload for image rendering. |
| Fileupload, File Upload | cq/gui/components/authoring/dialog/fileupload (for non-image files: PDFs, documents) |
| Multifield | granite/ui/components/coral/foundation/form/multifield |
| Checkbox | granite/ui/components/coral/foundation/form/checkbox |
| Select, Dropdown | granite/ui/components/coral/foundation/form/select |
| Numberfield | granite/ui/components/coral/foundation/form/numberfield |
| Datepicker | granite/ui/components/coral/foundation/form/datepicker |

For complete mappings: `assets/field-type-mappings.md`

## Reference Files

Load on-demand based on what you're creating:

| Creating | Load Reference |
| --- | --- |
| Any component | .aem-skills-config.yaml (project root, load first — see Configuration Gate Check), then references/aem-conventions.md |
| Dialog XML | references/dialog-patterns.md |
| HTL Template | references/htl-patterns.md |
| Sling Model | references/model-patterns.md, references/java-standards.md |
| Unit Tests | references/test-patterns.md |
| Clientlibs | references/clientlib-patterns.md |
| Extending Core Component | references/extending-core-components.md |
| Extending Core Component — worked example & checklists | references/extending-core-components-example.md (load when you need a complete worked example of extending a Core Component, unit testing patterns, or the implementation checklist) |
| Sling Servlet | references/sling-servlet-standards.md |
| Core Component patterns | references/core-components.md |
| No Hallucination rules | references/no-hallucination-rules.md |
| Figma design integration | references/figma-design-rules.md |
| URL design integration (rebuilding from a reference web page) | references/url-design-rules.md |
| Troubleshooting | references/troubleshooting.md |
| Examples | references/examples.md |

If encountering issues during or after component creation, consult `references/troubleshooting.md` for common problems and solutions.