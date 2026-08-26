# Allowed Components

The **allowed components** list controls which components an author can drag into a container or responsive grid. It is configured **on the policy**, not on the structure node — a fact responsible for an outsized share of editable-template confusion.

## Where Allowed Components Live

The `components` property on a container's policy:

```xml
<!-- /conf/{project}/settings/wcm/policies/jcr:content/{project}/components/container/policy_landing_main -->
<policy_landing_main
  jcr:primaryType="nt:unstructured"
  sling:resourceType="wcm/core/components/policy/policy"
  components="[
    {project}/components/text,
    {project}/components/image,
    {project}/components/teaser,
    {project}/components/hero,
    core/wcm/components/text/v2/text,
    core/wcm/components/image/v3/image
  ]"/>
```

- Type: `String[]` (multi-value).
- Each entry is a component's full `sling:resourceType` (the path under `/apps` or `/libs`).
- Authors see the union of these components in the **insert dialog** of the responsive grid that uses this policy.
- **Empty array** (or property absent) = **all components shown** — almost never what you want.

## Wiring Allowed Components to a Container

1. Identify the container in `structure/` of your template:

   ```xml
   <container
     jcr:primaryType="nt:unstructured"
     sling:resourceType="wcm/foundation/components/responsivegrid"
     editable="{Boolean}true"/>
   ```

2. Reference a policy in `policies/.content.xml`:

   ```xml
   <root>
     <container cq:policy="{project}/components/container/policy_landing_main"/>
   </root>
   ```

3. Define the policy with the `components` list above.

The chain: `structure → mapping path → policy → components list`. Break any link and the constraint disappears.

## Component Groups vs Direct Component References

AEM also supports allowing whole **component groups**:

```xml
components="[
  group:{project} - Content,
  group:{project} - Form,
  group:.core-components,
  {project}/components/hero
]"
```

- Prefix `group:` matches the `componentGroup` property on component `.content.xml` definitions.
- Useful for evolving sets — you can add a new component to the project, set its `componentGroup` to `{project} - Content`, and it appears in the dialog without editing every policy.
- Trade-off: less explicit. Reviewing policies tells you which groups are allowed but not the precise components.

A mixed list (groups + specific components) is valid and common.

## How AEM Renders the Insert Dialog

For a responsive grid that uses a policy with `components = [...]`:

1. AEM reads the `components` list from the resolved policy.
2. For each `group:` entry, AEM resolves all components in that group.
3. For each direct resource-type entry, AEM checks that the component exists at the path.
4. The dialog displays the resulting union, **sorted** by the component's `cq:component` registry order.
5. Components are also filtered by their own `cq:disableTargeting`, `componentGroup` visibility rules, and `cq:isContainer` constraints.

## Style System

Independent of allowed components, policies can declare **style options** — CSS-class choices authors can apply to individual component instances:

```xml
<policy_landing_main
  jcr:primaryType="nt:unstructured"
  cq:styleGroups="[
    {styles=[{cssClasses=narrow, label=Narrow}, {cssClasses=wide, label=Wide}], group-title=Width}
  ]"
  components="[{project}/components/text, {project}/components/image]"/>
```

The actual structure is verbose; most projects use the design-dialog UI to author it and then commit the resulting `cq:styleGroups` subtree as XML.

Authors see a "Styles" tab in the toolbar and can toggle classes on/off; the classes are appended to the component's wrapper element.

## Allowed Components on Page Component (Top-Level)

The page-root responsive grid (`structure/jcr:content/root`) is itself a container. Its policy lives at `policies/<project>/components/page/policy_<name>` and accepts the same `components` property:

```xml
<policy_landing
  jcr:primaryType="nt:unstructured"
  components="[
    {project}/components/section,
    {project}/components/hero,
    {project}/components/text
  ]"/>
```

This controls what shows up in the **outermost** insert dialog of a page.

## Per-Template Constraints

The same component can have different allowed-component sets in different templates:

- **Landing page** allows hero, text, image, CTA.
- **Article page** allows text, image, quote, sidenote — no hero.

This is exactly the use case policies were designed for. Two policies, two mappings, one component model.

## Nested Containers

For nested containers (a `section` component that itself contains a responsive grid):

```xml
<!-- structure/.content.xml -->
<root>
  <container>
    <section>
      <subgrid sling:resourceType="wcm/foundation/components/responsivegrid"/>
    </section>
  </container>
</root>

<!-- policies/.content.xml -->
<root>
  <container cq:policy="{project}/components/container/policy_landing_main">
    <section cq:policy="{project}/components/section/policy_landing">
      <subgrid cq:policy="{project}/components/container/policy_landing_subgrid"/>
    </section>
  </container>
</root>
```

Each grid level needs its own policy mapping, and each policy needs its own `components` property. Skipping the mapping for `subgrid` makes it allow-everything.

## Common Mistakes

| Mistake | What happens |
|---------|--------------|
| `components` on the structure node, not the policy | Property is ignored. Move to the policy. |
| Forgot to map the container to a policy | Container shows all components in the insert dialog. |
| Used component **name** (`text`) instead of resource type (`{project}/components/text`) | Component doesn't appear. Use the full resource type. |
| Forgot to enable a component (`cq:component` with `disabled` true) | Component is in the policy list but doesn't render in the dialog. |
| Component is in policy list but `componentGroup="hidden"` | Doesn't appear. Set a real group like `{project} - Content`. |
| Used `/libs` path on Cloud Service | `/libs` paths work but Adobe recommends `/apps` overlays. |

## Validation

- [ ] Container in `structure/` that authors should edit has `editable="true"` (or inherits unlocked).
- [ ] Container is **mapped** to a policy in `policies/.content.xml`.
- [ ] Policy node has a non-empty `components` property.
- [ ] Each referenced component has a definition at the path (search `find ui.apps -path "*<path>/.content.xml"`).
- [ ] Each referenced component has a non-hidden `componentGroup` or appears via `group:` reference.
- [ ] After deploy, the responsive grid's insert dialog shows exactly the components in the list.

## See Also

- [`policies.md`](policies.md) — full policy structure.
- [`templates.md`](templates.md) — wiring mappings.
- [`recipes.md`](recipes.md) — pre-built `components` lists for common page types.
