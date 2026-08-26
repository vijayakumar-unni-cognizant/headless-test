# Troubleshooting — Common AEM Component Issues

Quick-reference for diagnosing and fixing the most frequent AEM component development problems.

---

## 1. Model Returns Null

**Cause:** Sling Model not registered — missing `@Model` annotation, wrong `adaptables`, or missing `resourceType`.

**Fix:** Verify the `@Model` annotation specifies correct `adaptables` and includes the `resourceType` matching your component's `.content.xml`.

```java
// ✅ Correct
@Model(adaptables = SlingHttpServletRequest.class,
       adapters = MyComponentModel.class,
       resourceType = "myproject/components/my-component",
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class MyComponentModel { ... }

// ❌ Wrong — missing resourceType, wrong adaptable
@Model(adaptables = Resource.class)
public class MyComponentModel { ... }
```

---

## 2. Dialog Fields Not Saving

**Cause:** Missing `./` prefix on the field `name` property. Without it, the value is not stored relative to the component's JCR node.

**Fix:** All dialog field names must start with `./` (e.g., `./title`, not `title`).

```xml
<!-- ✅ Correct -->
<title jcr:primaryType="nt:unstructured"
       sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
       fieldLabel="Title"
       name="./title"/>

<!-- ❌ Wrong — missing ./ prefix -->
<title ... name="title"/>
```

---

## 3. Component Styles / JS Not Loading

**Cause:** Runtime CSS/JS for a component lives in `ui.frontend/src/main/webpack/components/_{component-name}.scss` (and `_{component-name}.js` if needed) and is bundled into `{project}.site` by the webpack build. Common causes when nothing renders:

- The partial filename is missing the leading underscore (`{name}.scss` instead of `_{name}.scss`) — Sass partials without `_` may be emitted as separate files and skipped by the glob importer.
- The partial sits in a subdirectory instead of directly under `ui.frontend/src/main/webpack/components/` — the glob in `site/main.scss` is `../components/**/*.scss` but the existing layout is flat; verify the file is at the expected depth.
- The `ui.frontend` module wasn't rebuilt after adding the partial. The Build Validation Gate (Test Automation Agent, ADLC-SPEC §8.1.1) will refresh the webpack bundle in `clientlib-site` as a side-effect. For frontend-only iteration loops outside the ADLC, `cd ui.frontend && npm run build` is the fast path. This troubleshooting page does NOT instruct you to invoke `mvn`.
- A per-component clientlib in `ui.apps/.../clientlibs/clientlib-{component-name}/` was left over from the old pattern — delete it; nothing should be loading runtime CSS from there.
- The HTL still has a leftover `<sly data-sly-call="${clientlib.css @ categories='{project}.components.{component-name}'}"/>` block from the old pattern — remove it; the styles are delivered via `{project}.site` site-wide.

**Dialog clientlib not loading (separate case):** verify the dialog category name matches `extraClientlibs` on the dialog root, and that the dialog clientlib declares `dependencies="[cq.authoring.dialog]"`.

```xml
<!-- Dialog clientlib's .content.xml -->
<jcr:root jcr:primaryType="cq:ClientLibraryFolder"
          categories="[{project}.{component-name}.dialog]"
          dependencies="[cq.authoring.dialog]"/>

<!-- _cq_dialog/.content.xml — attach via extraClientlibs -->
<jcr:root sling:resourceType="cq/gui/components/authoring/dialog"
          extraClientlibs="[{project}.{component-name}.dialog]"/>
```

---

## 4. Component Not Appearing in Sidekick / Insert Menu

**Cause:** Missing or wrong `componentGroup` in `.content.xml`, or the template policy doesn't allow it.

**Fix:** Check `.content.xml` has a `componentGroup` that matches the site's allowed component groups. Also verify the template's policy includes the group.

```xml
<!-- .content.xml -->
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          jcr:primaryType="cq:Component"
          jcr:title="My Component"
          componentGroup="MySite Components"/>
```

---

## 5. HTL Shows Raw Variable Names (e.g., `${model.title}`)

**Cause:** `data-sly-use` points to a wrong or non-existent model class, or the Sling Model is not properly registered.

**Fix:** Verify the `data-sly-use` identifier resolves to a valid, registered Sling Model. Check the fully-qualified class name and confirm the model's `@Model` annotation is correct (see Issue #1).

```html
<!-- ✅ Correct -->
<sly data-sly-use.model="com.myproject.core.models.MyComponentModel"/>
<h2>${model.title}</h2>

<!-- ❌ Wrong — typo in class path -->
<sly data-sly-use.model="com.myproject.core.model.MyComponentModel"/>
```

---

## 6. Multifield Items Not Saving

**Cause:** Composite multifield misconfigured — missing `composite=true` or child field names lack `./` prefix.

**Fix:** Set `composite="{Boolean}true"` on the multifield node and ensure each child field uses `./` names.

```xml
<items jcr:primaryType="nt:unstructured"
       sling:resourceType="granite/ui/components/coral/foundation/form/multifield"
       composite="{Boolean}true"
       fieldLabel="Links"
       name="./links">
  <field jcr:primaryType="nt:unstructured"
         sling:resourceType="granite/ui/components/coral/foundation/container">
    <items jcr:primaryType="nt:unstructured">
      <linkText jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                fieldLabel="Link Text"
                name="./linkText"/>
    </items>
  </field>
</items>
```

---

## 7. Unit Test NPE on Model Instantiation

**Cause:** Test context resource not created with required properties, or model class not registered in the AEM mock context.

**Fix:** Use `context.create().resource()` with the correct properties map, and register the model with `context.addModelsForClasses()`.

```java
@ExtendWith(AemContextExtension.class)
class MyComponentModelTest {
    private final AemContext context = new AemContext();

    @BeforeEach
    void setUp() {
        // ✅ Register the model class
        context.addModelsForClasses(MyComponentModel.class);
        // ✅ Create resource with properties
        context.create().resource("/content/test",
            "title", "Test Title",
            "sling:resourceType", "myproject/components/my-component");
        context.currentResource("/content/test");
    }
}
```

---

## 8a. Dialog Opens Empty — No Tabs, No Fields

**Cause:** A `sling:resourceType` in the dialog does not resolve in the target AEM instance
(invalid, misremembered, or a string copied unverified from a spec or another run). Sling
renders an unresolvable resource type as nothing, so the affected node — and everything nested
under it — silently disappears. If the bad type is on a structural node (the dialog container,
the tabs node, a column), the whole dialog opens blank. This is not caught by the Maven build
or unit tests, because a dialog is content, not compiled code.

**Fix:** Verify every `sling:resourceType` in `_cq_dialog/.content.xml` against
`assets/field-type-mappings.md` and `references/dialog-patterns.md`. Confirm each one resolves
on the instance before relying on it — e.g. `curl -u admin:admin http://localhost:4502/libs/<resourceType>.json`
returns 200, not 404. Render the dialog the way the editor does and confirm fields appear:

```bash
# 200 with fields in the output = healthy; empty <div class="cq-dialog-content"></div> = a bad resourceType
curl -su admin:admin \
  "http://localhost:4502/mnt/overlay/<app>/components/<name>/cq:dialog.html/<path-to-a-component-instance>" \
  | grep -c 'name="\./'
```

---

## 8. Extended Component Dialog Shows No Tabs

**Cause:** Sling Resource Merger path is wrong — `sling:resourceSuperType` doesn't match the parent component's path exactly.

**Fix:** Verify `sling:resourceSuperType` matches the parent path character-for-character. When overriding properties, use `sling:hideProperties` or `merge:replaceProperties` carefully.

```xml
<!-- .content.xml — sling:resourceSuperType must be exact -->
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Component"
          jcr:title="Custom Teaser"
          sling:resourceSuperType="core/wcm/components/teaser/v2/teaser"
          componentGroup="MySite Components"/>
```

If you need to hide an inherited tab in the dialog:
```xml
<inheritedTab jcr:primaryType="nt:unstructured"
              sling:hideResource="{Boolean}true"/>
```

---

## 9. CSS Not Applying

**Cause:** BEM class names in the SCSS partial don't match what the HTL template renders, or the partial wasn't picked up by the webpack glob import (see Issue #3 — `ui.frontend/src/main/webpack/components/_{component-name}.scss`).

**Fix:** Compare the class names in `_{component-name}.scss` against the actual HTL output. Verify the partial is in the expected location with a leading underscore, then rebuild `ui.frontend` and confirm the styles are present in the bundled `{project}.site` clientlib.

```html
<!-- HTL must output the exact BEM classes your CSS targets -->
<div class="cmp-my-component">
  <h2 class="cmp-my-component__title">${model.title}</h2>
</div>
```
```css
/* CSS must match exactly */
.cmp-my-component { ... }
.cmp-my-component__title { font-size: 1.5rem; }

/* ❌ Wrong — class mismatch */
.cmp-mycomponent__title { ... }
```

---

## 10. JS Initialization Not Firing

**Cause:** Missing `data-cmp-is` attribute on the component root element, or JS is querying the wrong selector.

**Fix:** Add `data-cmp-is="component-name"` to the component's root element in HTL. The JS must query `[data-cmp-is="component-name"]`.

```html
<!-- HTL -->
<div class="cmp-my-component" data-cmp-is="my-component">
  ...
</div>
```
```javascript
// JS initialization
(function() {
    'use strict';
    function init(element) {
        // Component logic here
    }
    // Query by data-cmp-is attribute
    document.querySelectorAll('[data-cmp-is="my-component"]').forEach(init);
})();
```

---

## 11. Embedded Component CSS Breaks During Page Editor Editing

**Cause:** CSS class is on the same element as `data-sly-resource`. The page editor replaces this element during inline editing (cropping, drag-and-drop), removing the CSS class until page refresh.

**Fix:** Use a wrapper div — put your CSS class on an outer `<div>`, and put `data-sly-resource` on an inner `<div>`. The outer div's CSS class survives page editor interactions.

```html
<!-- ❌ Wrong — CSS class and data-sly-resource on the same element -->
<div class="cmp-hero__image" data-sly-resource="${'image' @ resourceType='core/wcm/components/image/v3/image'}"></div>

<!-- ✅ Correct — wrapper div keeps CSS class safe from editor replacement -->
<div class="cmp-hero__image">
    <div data-sly-resource="${'image' @ resourceType='core/wcm/components/image/v3/image'}"></div>
</div>
```
