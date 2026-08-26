# Repoinit Grammar Reference

Compact reference for the Apache Sling Repoinit DSL as supported on **AEM as a Cloud Service**. Scripts run during repository initialization on every startup and **must be idempotent** — re-running a script is expected to produce the same end state without errors.

> Authoritative source: <https://sling.apache.org/documentation/bundles/repository-initialization.html>. This page summarises the statements you will most often use on AEMaaCS; consult the upstream grammar for edge cases.

## File Skeleton

```
# org.apache.sling.jcr.repoinit.RepositoryInitializer~<id>.cfg.json
{
  "scripts": [
    "create service user my-service-user",
    "set principal ACL for my-service-user",
    "  allow jcr:read on /content",
    "end"
  ]
}
```

- `scripts` is an **array of strings**. Each array element is a complete Repoinit script. You can split a single logical script across multiple entries or keep one large string per entry.
- Within a script, statements are **newline-terminated**. Block statements (`set ACL for ... / end`, `create path ... / end`) use `end` as a closing keyword.
- Indentation inside blocks is **optional** but improves readability; the parser ignores leading whitespace on continuation lines.
- Comments start with `#`.

## Statement Catalogue

### Users & groups

| Statement | Effect | Idempotent |
|-----------|--------|------------|
| `create service user <name>` | Creates an anonymous-password system user used by `getServiceResourceResolver`. | Yes |
| `create service user <name> with path <intermediate-path>` | Creates the user under a specific intermediate path (e.g. `/system/cq:services/myapp`). | Yes |
| `create user <name> with password <pw>` | Creates a regular user. **Avoid on production** — passwords in source. | Yes |
| `delete service user <name>` | Removes a service user. Use sparingly — see Critical Rules. | Yes |
| `disable service user <name> : "<reason>"` | Disables login without deleting. | Yes |
| `create group <name>` | Creates a group. | Yes |
| `delete group <name>` | Deletes a group. | Yes |
| `add <user> to group <group>` | Adds a member. | Yes |
| `remove <user> from group <group>` | Removes a member. | Yes |

### ACLs

| Statement | Use when |
|-----------|----------|
| `set ACL for <principal>` … `end` | **Path-based**. Requires the target path to exist when the statement runs. |
| `set principal ACL for <principal>` … `end` | **Principal-based** (preferred). Does **not** require the path to exist at install time. |
| `remove ACL for <principal>` … `end` | Removes specific ACEs. |
| `remove principal ACL for <principal>` … `end` | Removes principal-based ACEs. |

Inside an ACL block:

```
allow <privileges> on <paths> [restriction(<name>,<value>[,<value>...])]
deny  <privileges> on <paths> [restriction(<name>,<value>[,<value>...])]
```

- **Privileges:** `jcr:read`, `jcr:write`, `rep:write` (jcr:write + jcr:nodeTypeManagement), `jcr:all`, `jcr:modifyProperties`, `jcr:modifyAccessControl`, `jcr:lockManagement`, `jcr:versionManagement`, `crx:replicate`, `rep:userManagement`.
- **Paths:** comma-separated; quote when they contain spaces.
- **Common restrictions:** `rep:glob(<glob>)`, `rep:ntNames(<nodeType>[,...])`, `rep:itemNames(<propName>[,...])`, `rep:prefixes(<prefix>[,...])`.

See [`acls.md`](acls.md) for worked examples.

### Paths & nodes

| Statement | Effect |
|-----------|--------|
| `create path <path>` | Creates a path with default node type (`sling:Folder` for first segment under `/`, `nt:unstructured` otherwise). |
| `create path (<primaryType>) <path>` | Creates with explicit primary type. |
| `create path (<primaryType> mixin <mixin>[,...]) <path>` | Creates with explicit primary type + mixins. |
| `create path (<type>) <path>(<childType>)` | Different type per segment. Rarely needed. |
| `set properties on <path>` … `end` | Sets typed properties on an existing node. |

Inside a `set properties` block:

```
set sling:resourceType{String} to "myapp/components/foo"
set count{Long} to 42
set enabled{Boolean} to true
set tags{String[]} to ["a", "b", "c"]
default mode{String} to "preview"   # only sets if not already present
```

### Namespaces & node types

| Statement | Effect |
|-----------|--------|
| `register namespace (<prefix>) <uri>` | Registers a JCR namespace. |
| `register nodetypes` … `end` | Registers CND-format node types between the keywords. |
| `register privilege <name> with <abstract|aggregate of>...` | Registers a custom privilege. |

These are rarely needed in application projects; AEM ships standard namespaces and types.

### Authorisable properties

```
set authorizable property <user> to <type>=<value>
```

Sets profile properties (e.g. `profile/email`, `profile/givenName`). Useful when seeding a system user that needs metadata.

## Execution Order & Idempotency Rules

- Statements within a single `scripts[]` entry run **in order**.
- Statements across entries in the same factory PID run in array order.
- Across **different** factory PIDs, order is **not guaranteed** — design each PID to be self-contained.
- All statements are designed to be **safely re-runnable**. Repoinit re-applies scripts on every startup; it does not undo grants from other configs.

## What Repoinit Will *Not* Do

- It will **not** drop other users' ACLs unless you explicitly write a `remove ACL`.
- It will **not** create regular content (`/content/...`) — use FileVault packages for content.
- It will **not** install bundles or other OSGi configs — use sling installers / Maven for those.
- It will **not** read environment variables or secrets — use `$[secret:...]` / `$[env:...]` substitution in **OSGi configs**, not in Repoinit scripts (which run too early).

## See Also

- [`service-users.md`](service-users.md) — Creating service users + bundle mapping.
- [`acls.md`](acls.md) — Path-based vs principal-based ACLs, restrictions.
- [`groups-and-paths.md`](groups-and-paths.md) — Groups, paths, properties.
- [`validation.md`](validation.md) — Local testing and error decoding.
