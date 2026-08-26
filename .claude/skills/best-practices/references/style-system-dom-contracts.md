# AEM DOM, Style System & Deploy Contracts

Generic AEM as a Cloud Service truths about **how authored structure actually renders and deploys**. These are the wiring/node/property/deploy facts that must be correct for a component to work — independent of any visual/CSS fidelity target. Get these right and the only thing left is cosmetic CSS, which is cheap to tune. Get them wrong and no amount of CSS fixes the page.

**Rule of thumb:** never write a CSS selector, a policy mapping, or a content property against an *assumed* DOM. Verify the *emitted* DOM (view source of the rendered component, or a known Core Component reference) first.

---

## 1. Style System class placement — target the emitted DOM, not the assumed one

When an author applies a Style System variant, AEM adds the class from the policy's `cq:styleClasses` to the component's **outer decoration wrapper** (the grid cell / `.cmp-<type>` wrapper), **not** to the inner element you want to lay out.

Example — a Core Teaser with variant `cmp-teaser--kiln-hero`:

```html
<div class="teaser cmp-teaser--kiln-hero aem-GridColumn ...">   <!-- variant class lands HERE -->
  <div class="cmp-teaser" id="teaser-...">                       <!-- content/image live one level DOWN -->
    <div class="cmp-teaser__content">…</div>
    <div class="cmp-teaser__image">…</div>
```

- **Wrong:** `.cmp-teaser--kiln-hero { display:flex }` — its only child is the single `.cmp-teaser`, so nothing lays out side by side.
- **Right:** `.cmp-teaser--kiln-hero .cmp-teaser { display:flex }` — the flex container is the element that actually holds the children.

Same trap for container variants. A container's Style System class lands on the outer responsivegrid wrapper; the cells live at `> .cmp-container > .aem-Grid > .aem-GridColumn`:

- **Wrong:** `.cmp-container--my-row { display:grid; grid-template-columns:repeat(3,1fr) }` — the one child (`.cmp-container`) fills column 1; cards stack.
- **Right:** `.cmp-container--my-row > .cmp-container > .aem-Grid { display:grid; grid-template-columns:repeat(3,1fr) }` and reset the cells `> .aem-GridColumn { width:auto }` (AEM sets `aem-GridColumn--default--12` = width:100%).

## 2. `.aem-Grid` clearfix pseudo-elements become grid/flex items

AEM's `.aem-Grid` uses `::before` and `::after` for a float clearfix (`content:" "; display:table`). The moment you make `.aem-Grid` a **grid or flex container**, those two pseudos become **real grid/flex items** and offset every real child by one (classic symptom: an empty first cell, last item wraps to the next row).

Always neutralize them when converting `.aem-Grid` to grid/flex:

```scss
.cmp-container--my-row > .cmp-container > .aem-Grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    &::before, &::after { display: none; }   // <-- required
}
```

## 3. Core Experience Fragment v2 modifier class = the XF node name

Core XF v2 emits `cmp-experiencefragment--<xf-node-name>`, derived from the **fragment's JCR node name**, NOT a literal `--header` / `--footer`. An XF at `.../site/kiln-ember-header/master` emits:

```html
<div class="cmp-experiencefragment cmp-experiencefragment--kiln-ember-header">
```

So chrome SCSS must target `.cmp-experiencefragment--kiln-ember-header`, not `.cmp-experiencefragment--header`. A generic `--header` selector matches nothing and the header/footer render unstyled (e.g. footer on the default light background). Confirm the emitted class against the live DOM before writing chrome selectors.

## 4. Core Component authoring property contracts

Author content nodes with the property names the Core Component model actually reads, or the value is silently dropped:

| Component | Property to set | Common wrong value |
|---|---|---|
| Core **Button** (`core/wcm/components/button`) | `jcr:title` (the label) | `text` → renders an empty button |
| Core **Teaser** title heading level | policy `titleType` (per mapped policy) | per-instance `titleType` is not honored unless the dialog exposes it; two teasers sharing one policy share its heading level |
| Core **Teaser** title text | rendered directly inside `<h1 class="cmp-teaser__title">` in current CC versions | assuming a `.cmp-teaser__title-text` inner `<span>` — verify per CC version before targeting it |

When in doubt, drop the component on a test page, author a value, and view source.

## 5. Style System classes only resolve where the policy is mapped

A `cq:styleIds` on a content node only renders its class if the component's **mapped content policy** (for that template context) defines that style in `cq:styleGroups`. Consequences:

- Two variants of the **same component type** in the **same template context** must live in **ONE** policy with multiple style groups/items — you cannot map two policies to one type. (A second, unmapped policy's styles are orphaned and stripped.) See `create-editable-template` for the mapping-block details.
- Components inside an **Experience Fragment** render under the **XF's** template (`xf-web-variation`), not the consuming page's template. Style System classes and component policies from the page template do **not** apply there. Style XF chrome **structurally** (by class/hierarchy), or map the needed policies onto the XF template.

## 6. FileVault filter modes for seeded content (re-deploy gotcha)

`ui.content` mutable content is governed by `META-INF/vault/filter.xml` `mode`:

| mode | On a node that already exists in the repo |
|---|---|
| `merge` (default for mutable content) | **Does NOT overwrite** existing nodes/properties; only adds missing ones. Removed source nodes are **not** deleted. |
| `update` | Overwrites existing properties + adds new; does **not** delete siblings absent from the package. |
| `replace` | Replaces the whole filter-root subtree with package content (deletes what's not in the package). |

Implication: with `merge`, editing already-seeded sample content (page copy, XF, template, policy) in source and redeploying **has no effect** — the first install created the nodes and merge won't touch them again. To re-seed changed content on an environment where it already exists: delete the target nodes first, or do a one-off `replace`/`update` install, then restore author-safe `merge`. `/conf` (templates, policies — developer source-of-truth) is a reasonable `update`; author-owned `/content` and `/content/experience-fragments` are typically `merge`.

**Verify after install:** confirm the deployed JCR node actually reflects source (`curl .../node.json`, or grep the rendered DOM for the changed marker) — "package installed" and "BUILD SUCCESS" do **not** prove the content changed.
