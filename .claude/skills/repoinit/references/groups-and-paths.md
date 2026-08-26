# Groups, Paths & Node Properties

## Groups

Repoinit can create groups, add and remove members, and delete groups. Groups are typically used to bundle a set of grants for human authors; service users rarely need group membership.

```
create group {project}-authors
add {project}-content-reader to group {project}-authors
add some-other-user to group {project}-authors
```

To set ACL grants on a group, treat the group name as a principal in any `set principal ACL` block:

```
set principal ACL for {project}-authors
  allow jcr:read on /content
  allow rep:write on /content/{project} restriction(rep:glob, "*/jcr:content/*")
end
```

To remove a group:

```
delete group {project}-authors
```

Group deletion is allowed but **does not cascade to members** — members keep direct ACEs if any exist.

## Creating Paths

Repoinit can create JCR paths during initialisation. This is useful for application paths under `/var/<project>` that need to exist before code writes to them, or for setting up taxonomies, root nodes for content fragments, and similar.

**Important:** Repoinit is **not** the right place to create content. Use FileVault content packages for `/content` trees, sites, pages, templates, and editable templates. Use Repoinit for **structural / system** paths only.

### Default primary type

```
create path /var/{project}
create path /var/{project}/cache
create path /var/{project}/cache/jobs
```

When the primary type is not specified:

- The **first segment under `/`** defaults to `sling:Folder`.
- **Subsequent segments** default to `nt:unstructured`.

### Explicit primary type

```
create path (sling:Folder) /var/{project}
create path (sling:Folder) /var/{project}/cache
create path (nt:unstructured) /var/{project}/cache/jobs
```

Use `sling:Folder` for everything under `/var/<project>` unless you have a reason to differ — it's the type AEM expects for application-managed folder trees.

### With mixins

```
create path (sling:Folder mixin mix:created) /var/{project}/audit
```

### Mixed types in one statement

For nested paths where each segment should be a specific type:

```
create path /apps/{project}(sling:Folder)/components(sling:Folder)
```

Each segment's type can be specified in parentheses immediately after the segment name. Use sparingly — separate `create path` statements are usually clearer.

### When `create path` runs

`create path` is idempotent: if the path already exists with the same primary type, the statement is a no-op. If the path exists with a **different** primary type, the statement raises an error.

## Setting Properties

Use `set properties on <path>` to set typed properties on an existing node. The path must already exist (created earlier in the same script, or shipped by AEM, or installed via FileVault).

```
set properties on /var/{project}/config
  set sling:resourceType{String} to "{project}/services/config"
  set enabled{Boolean} to true
  set maxRetries{Long} to 3
  set tags{String[]} to ["{project}", "config"]
  default mode{String} to "preview"
end
```

### Type qualifiers

| Type | Form | Example |
|------|------|---------|
| String | `{String}` (default — omit) | `set name to "{project}"` |
| Boolean | `{Boolean}` | `set enabled{Boolean} to true` |
| Long | `{Long}` | `set max{Long} to 100` |
| Double | `{Double}` | `set ratio{Double} to 0.75` |
| Date | `{Date}` | `set created{Date} to "2024-01-01T00:00:00.000Z"` |
| Reference | `{Reference}` | `set ref{Reference} to "/content/{project}"` |
| Path | `{Path}` | `set link{Path} to "/content/{project}/home"` |
| Multi-value | append `[]` to type | `set tags{String[]} to ["a","b"]` |

### `set` vs `default`

| Verb | Behaviour |
|------|-----------|
| `set` | Always overwrites the current value. |
| `default` | Only sets if the property is not already present. |

Use `default` for values that may have been customised at runtime by authors or admins — `set` would clobber their change on every deploy.

## When Not to Use `create path` / `set properties`

- **Site content** — `/content/{project}/...` belongs in FileVault content packages (`ui.content` module).
- **Component definitions** — `/apps/{project}/components/...` belongs in `ui.apps`.
- **Page templates and policies** — those ship in `ui.apps` (template definitions) and `ui.content` (template-types, mutable content).
- **OSGi configurations** — those are separate `.cfg.json` files installed by sling-installer.
- **Sling Mappings** — use OSGi config for `org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl`.

Repoinit's job is **infrastructure** (users, ACLs, structural folders, namespaces). Application code and content live elsewhere.

## Validation

- [ ] Group names follow the `<project>-<role>` convention (e.g. `{project}-authors`).
- [ ] Service users are not added to broad platform groups (like `dam-users` or `workflow-users`) without justification.
- [ ] `create path` is used only for structural folders, not for content.
- [ ] `set properties` paths exist either from `create path` earlier in the script or from another package.
- [ ] `default` (not `set`) is used for properties that authors might customise.

## See Also

- [`grammar.md`](grammar.md) — Full DSL reference.
- [`acls.md`](acls.md) — Granting ACLs to groups and principals.
- [`recipes.md`](recipes.md) — Common path + property setups.
