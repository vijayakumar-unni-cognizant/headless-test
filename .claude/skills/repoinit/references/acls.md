# ACLs in Repoinit

This file covers ACL grant syntax for both path-based and principal-based ACLs, the privilege catalogue, and the `rep:glob` / `rep:ntNames` / `rep:itemNames` restrictions used to scope grants narrowly.

> **Default to principal-based ACLs.** Use `set principal ACL for <user>` unless you specifically need path-based semantics. Principal ACLs do not require the target path to already exist, which makes them order-independent across deploys.

## Block Form

```
set principal ACL for <principal>[, <principal>...]
  allow <privileges> on <paths> [restriction(<name>, <values>)]
  deny  <privileges> on <paths> [restriction(<name>, <values>)]
end
```

- One or more `allow` / `deny` ACEs per block.
- Multiple principals may share one block (comma-separated).
- The block must close with `end`.

The path-based variant uses `set ACL for <principal>` with the same body but **requires the target path to exist** at install time.

## Privilege Catalogue

| Privilege | Grants |
|-----------|--------|
| `jcr:read` | Read nodes and properties. The minimum useful grant. |
| `jcr:write` | Aggregate: `jcr:modifyProperties`, `jcr:addChildNodes`, `jcr:removeNode`, `jcr:removeChildNodes`. |
| `rep:write` | Aggregate: `jcr:write` + `jcr:nodeTypeManagement`. **Use this for "write" intent**, not `jcr:write` alone, because most write operations need to manage node types. |
| `jcr:modifyProperties` | Just write properties on an existing node — no node create/remove. |
| `jcr:addChildNodes` | Just add children. |
| `jcr:removeChildNodes` / `jcr:removeNode` | Remove. |
| `jcr:nodeTypeManagement` | Change primary/mixin types on existing nodes. |
| `jcr:lockManagement` | Lock/unlock. |
| `jcr:versionManagement` | Create versions, restore. |
| `jcr:readAccessControl` | Read ACL state. |
| `jcr:modifyAccessControl` | Modify ACLs. **Almost never grant to a service user.** |
| `crx:replicate` | Replication (publish/unpublish). Required for the Replicator API. |
| `rep:userManagement` | Create/modify users + groups. Avoid. |
| `jcr:all` | Everything. **Never use outside one-off ops.** |

**Rule of thumb:** for "read" use `jcr:read`. For "write" use `jcr:read,rep:write`. Anything broader needs a written justification in the PR description.

## Restrictions

Restrictions narrow a grant further than just paths. Syntax:

```
allow <privileges> on <paths> restriction(<name>, <value>[, <value>...])
```

| Restriction | Effect | Example |
|-------------|--------|---------|
| `rep:glob` | Limit the grant to paths matching a glob relative to the access-controlled node. Empty value = only the node itself, no descendants. | `restriction(rep:glob, "*/jcr:content/*")` |
| `rep:ntNames` | Limit to nodes whose primary type matches. | `restriction(rep:ntNames, cq:Page, dam:Asset)` |
| `rep:itemNames` | Limit to specific item (property) names. | `restriction(rep:itemNames, jcr:content, metadata)` |
| `rep:prefixes` | Limit to namespace prefixes. | `restriction(rep:prefixes, cq, dam)` |

Multiple restrictions on a single ACE are **AND-ed** — every restriction must match.

## `rep:glob` — The Pattern You Will Use Most

`rep:glob` matches a glob relative to the access-controlled node. A few patterns to internalise:

| Value | Matches |
|-------|---------|
| *(empty)* | Only the node itself; no descendants. Equivalent to "no inheritance". |
| `*` | Direct children of the node. |
| `*/jcr:content` | `jcr:content` child of every direct child (one page per child node pattern). |
| `*/jcr:content/*` | Anything under `jcr:content` of any direct child. |
| `/jcr:content/*` | Anything under the node's own `jcr:content`. |
| `**` | Not supported on Oak; use multiple ACEs or omit `rep:glob` to grant the full subtree. |

**Example — grant write to page content but not to page nodes themselves:**

```
set principal ACL for {project}-page-editor
  allow jcr:read on /content/{project}
  allow rep:write on /content/{project} restriction(rep:glob, "*/jcr:content/*")
end
```

This lets the user edit anything under `jcr:content` (text, images, references) without granting them the ability to delete or reorder pages.

## Common Patterns

### Read-only access to content

```
set principal ACL for {project}-content-reader
  allow jcr:read on /content, /conf
end
```

### Read content + write to a project-scoped var path

```
set principal ACL for {project}-data-writer
  allow jcr:read on /content
  allow jcr:read,rep:write on /var/{project}
end
```

### Replication permission for programmatic publishing

```
set principal ACL for {project}-publisher
  allow jcr:read on /content
  allow crx:replicate on /content
end
```

`crx:replicate` is required by `Replicator.replicate()`. Without it, `ReplicationException` is thrown.

### Tag editing only on a specific taxonomy

```
set principal ACL for {project}-tag-editor
  allow jcr:read on /content/cq:tags
  allow rep:write on /content/cq:tags/{project}
end
```

### Write to page content (`jcr:content`) but not page metadata

```
set principal ACL for {project}-content-editor
  allow jcr:read on /content/{project}
  allow rep:write on /content/{project} restriction(rep:glob, "*/jcr:content/*")
end
```

### Deny inheritance on a sensitive subtree

```
set principal ACL for {project}-content-reader
  allow jcr:read on /content
  deny  jcr:read on /content/{project}/internal
end
```

Deny ACEs are honoured but make permission audits harder. Prefer not granting at the higher level if you can.

## Path-Based ACLs (When You Actually Need Them)

There are two reasons you might choose `set ACL for <user>` instead of `set principal ACL for <user>`:

1. **You need to grant ACEs to multiple principals on a single path in one block**:
   ```
   set ACL for {project}-reader, {project}-editor
     allow jcr:read on /content/{project}
   end
   ```
2. **You're modelling permissions on existing platform paths** that ship with AEM (e.g. `/etc`, `/libs`). Those paths exist before your Repoinit runs, so the path-based form is safe.

Otherwise use principal-based.

## What ACLs Cannot Do

- **They cannot create the target path.** If a path doesn't exist and a principal ACE is stored against it, the ACE is dormant until the path is created — that's fine. But you cannot use `set ACL for` to *create* a path; use `create path` (see [`groups-and-paths.md`](groups-and-paths.md)).
- **They cannot grant permissions in another resource provider** (e.g. external content via Sling resource providers). ACLs live on the JCR.
- **They cannot grant network/transport permissions.** Dispatcher rules, IP allowlists, and IMS auth are separate concerns.

## Validation

- [ ] Used `set principal ACL` unless path-based was specifically required.
- [ ] No `jcr:all`.
- [ ] No `jcr:modifyAccessControl` / `rep:userManagement` on service users.
- [ ] `rep:write` used for "write" intent, not bare `jcr:write`.
- [ ] `rep:glob` quoted when it contains `/` characters.
- [ ] Each grant has a one-line PR-description note explaining what code consumes it.

## See Also

- [`service-users.md`](service-users.md) — How users + grants fit together.
- [`grammar.md`](grammar.md) — Full statement reference.
- [`recipes.md`](recipes.md) — Ready-to-use ACL blocks.
- Jackrabbit Oak access control docs: <https://jackrabbit.apache.org/oak/docs/security/accesscontrol.html>
