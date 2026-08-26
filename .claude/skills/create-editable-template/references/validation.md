# Validation & Debugging

How to verify editable templates locally, decode common error symptoms, and find out why a template, policy, or allowed-components list isn't behaving as expected.

## Local Build & Deploy

> **Maven policy (ADLC-SPEC §8.1.1):** Do NOT invoke `mvn` from this skill. The single Build Validation Gate owned by the Test Automation Agent runs one `mvn -q clean install -PautoInstallSinglePackage` for the entire ADLC run and deploys to the local SDK as a side-effect. After the Build Gate has run (or, in independent mode, after the developer has run their own build), open the **Template Console** at `http://localhost:4502/aem/templates.html/conf/<project>` and confirm:

- Your template appears under the expected folder.
- `Status` is **enabled** (not draft).
- `Allowed paths` matches what you set in `.content.xml`.

Then open the **Sites Console** at `http://localhost:4502/sites.html/content/<project>`, navigate to your test branch, and click **Create > Page**. Confirm:

- The expected templates appear in the wizard.
- Their titles and thumbnails are correct.

## Symptom → Likely Cause Table

### "My template doesn't appear in the create-page wizard"

1. **`status="draft"`** on the template. Set to `enabled`. Most common cause.
2. **Template not deployed** to the right `/conf/<project>` path. Check `crx/de.jsp` at the expected path.
3. **`allowedPaths` regex does not match** the content branch. Test the regex in your IDE.
4. **`cq:allowedTemplates` on the branch is too restrictive**. Check `/content/<branch>/jcr:content/@cq:allowedTemplates`.
5. **Template error in `.content.xml`** — check `error.log` for parse failures.
6. **`jcr:title` missing** — some wizard versions filter out untitled templates.

### "Author opened the new page but it's blank / broken"

1. **`cq:template` missing** in `initial/jcr:content`. Set it to the template path.
2. **`sling:resourceType` on `initial/jcr:content` does not exist** — check `/apps/{project}/components/page` exists.
3. **`structure/.content.xml`** missing the responsive-grid root. Authors expect `root` to be present.
4. **Policy mapping refers to a non-existent policy** — page renders with no design configuration but is otherwise fine.

### "Components I expect aren't in the insert dialog"

1. The container has **no policy mapping** — defaults to all components when no policy resolves. Add the mapping.
2. The policy `components` array is **empty** but present — same effect.
3. The component's `componentGroup` is **`hidden`** or **`.hidden`**. Update its `.content.xml`.
4. The component does **not exist** at the resource type path. Search `find ui.apps -path "*<rt>/.content.xml"`.
5. The container's policy mapping path **doesn't match** the structure path. Compare paths character-for-character.

### "Policy properties aren't applied at render"

1. Policy mapping path doesn't match structure path — `policies/.content.xml` mirror is off-by-one.
2. Policy node has the wrong **`sling:resourceType`** — must be `wcm/core/components/policy/policy`.
3. HTL reads `${properties.foo}` instead of `${currentStyle.foo}` — policy properties are exposed as `currentStyle`, not `properties`.
4. The component reads from `Designer` (legacy `/etc/designs`) — migrate to `currentStyle`.

### "Locked component appears unlocked, or vice versa"

1. `editable` value is a **string** (`"false"`) instead of **boolean** (`{Boolean}false`). Type matters.
2. Inheritance — a child node inherits from its parent's `editable`. Set explicitly on each node where intent matters.
3. The component's own `cq:disableShallowReplication` or other component-level flags override the structure setting.

### "Changes to the template don't update existing pages"

1. The change is in **`initial/`**. Existing pages were created from `initial/` once and are now disconnected. Use `structure/` for layout changes you want to propagate.
2. The change is to the **template-type**. Template types are copied to templates at creation; they do not stay linked.
3. The page has **per-page overrides** that mask the template change. Check page properties.
4. The HTL output is cached. Force a republish or check the dispatcher cache.

## CRX/DE & Template Editor Tools

| URL | What it shows |
|-----|---------------|
| `/aem/templates.html/conf/{project}` | List of all templates with status |
| `/editor.html/conf/{project}/settings/wcm/templates/<name>/structure.html` | Structure layer editor |
| `/editor.html/conf/{project}/settings/wcm/templates/<name>/initial.html` | Initial-content editor |
| `/conf/{project}/settings/wcm/policies/jcr:content/<path>.html` | Policy node properties (use Properties Editor) |
| `/crx/de.jsp` → navigate the tree | Inspect raw JCR state |
| `/sites.html/content/{project}` | Create a page to test |

## Diagnostic Script — Quick Sanity Check

A one-liner shell script to confirm a template's basic correctness:

```bash
TEMPLATE_DIR="ui.content/src/main/content/jcr_root/conf/{project}/settings/wcm/templates/landing-page"

# 1. Required files exist
for f in .content.xml initial/.content.xml structure/.content.xml policies/.content.xml thumbnail.png; do
  test -f "$TEMPLATE_DIR/$f" && echo "✓ $f" || echo "✗ MISSING: $f"
done

# 2. status is enabled (greps the root .content.xml)
grep -q 'status="enabled"' "$TEMPLATE_DIR/.content.xml" && echo "✓ status=enabled" || echo "✗ status not enabled"

# 3. cq:template is set in initial
grep -q 'cq:template=' "$TEMPLATE_DIR/initial/.content.xml" && echo "✓ cq:template set" || echo "✗ cq:template missing"
```

## Common XML / FileVault Pitfalls

- **`{Boolean}false`** is a typed value; `false` (no prefix) is parsed as a String.
- **Multi-value `[a, b, c]`** needs `String[]` type marker for non-string arrays: `components="[a,b,c]"` is `String[]` by default.
- **Namespace declarations** at the top of `.content.xml` are required (`jcr:`, `cq:`, `sling:`).
- **`_jcr_content`** is a folder; `jcr:content` is an XML element. Both mean the same JCR node — pick one form per file.
- **Trailing newline** in `.content.xml` files — required by some XML parsers; some IDEs strip it.

## After Cloud Manager Deploy

If a template works locally but fails on a Cloud Service environment:

1. Check **Cloud Manager build logs** for FileVault install warnings (`merge_properties`, `replace`, etc.).
2. Check **Sling Console > Sling > Recent Requests** on the deployed instance for template-resolution errors.
3. Check **Sites Admin > Properties** on a test page — see what `cq:template` value the page actually has.
4. Check **Template Console** on the deployed instance — confirm the template installed at the expected path and is enabled.
5. Re-run the local diagnostic script against the deployed `/conf/<project>/...` tree by exporting it.

## Validation Checklist

- [ ] Build verification deferred to the Build Validation Gate (single `mvn -q clean install` owned by Test Automation, ADLC-SPEC §8.1.1). This skill does not invoke `mvn`.
- [ ] No XML parse errors in `error.log` after install.
- [ ] Template appears in Template Console with `enabled` status.
- [ ] Template appears in create-page wizard at expected branch(es).
- [ ] Created a test page from the template — page renders, looks like a page (not blank).
- [ ] Locked elements cannot be removed in page editor.
- [ ] Unlocked containers show expected components in the insert dialog.
- [ ] Policy properties apply (test by changing one and observing the rendered output).
- [ ] `cq:allowedTemplates` constraint is respected at all expected branches.

## See Also

- [`anatomy.md`](anatomy.md) — what each layer does (most debugging traces back to this).
- [`policies.md`](policies.md) — policy resolution.
- [`recipes.md`](recipes.md) — known-good starting points to compare against.
