# Recipes

Ready-to-use Repoinit + ServiceUserMapper snippets for common scenarios. The placeholder `{project}` refers to your project name (from `.aem-skills-config.yaml`) and `com.{project}.core` to your core bundle's symbolic name — substitute both throughout when applying a recipe.

Each recipe is two files placed in the **same runmode folder** (see [`runmode-placement.md`](runmode-placement.md)):

```
ui.config/src/main/content/jcr_root/apps/{project}/osgiconfig/<runmode-folder>/
```

---

## Recipe 1 — Read-Only Content Reader (all runmodes)

**Use when:** a service needs to read pages, content fragments, or configurations from `/content` and `/conf`.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-content-reader.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-content-reader with path /system/cq:services/{project}",
    "set principal ACL for {project}-content-reader",
    "  allow jcr:read on /content",
    "  allow jcr:read on /conf",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-content-reader.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-content-reader=[{project}-content-reader]"
  ]
}
```

**Place under:** `osgiconfig/config/`

---

## Recipe 2 — Project-Scoped Var Writer (all runmodes)

**Use when:** a service needs to read content and write to a project-owned working folder under `/var`.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-data-writer.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-data-writer with path /system/cq:services/{project}",
    "create path (sling:Folder) /var/{project}",
    "set principal ACL for {project}-data-writer",
    "  allow jcr:read on /content",
    "  allow jcr:read,rep:write on /var/{project}",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-data-writer.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-data-writer=[{project}-data-writer]"
  ]
}
```

**Place under:** `osgiconfig/config/`

---

## Recipe 3 — Programmatic Publisher (author only)

**Use when:** code on author calls `Replicator.replicate()` to publish content.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-publisher.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-publisher with path /system/cq:services/{project}",
    "set principal ACL for {project}-publisher",
    "  allow jcr:read on /content",
    "  allow crx:replicate on /content",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-publisher.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-publisher=[{project}-publisher]"
  ]
}
```

**Place under:** `osgiconfig/config.author/`

---

## Recipe 4 — DAM Asset Writer (author only)

**Use when:** a service ingests assets, sets metadata, or manages asset versions.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-asset-writer.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-asset-writer with path /system/cq:services/{project}",
    "set principal ACL for {project}-asset-writer",
    "  allow jcr:read on /content/dam",
    "  allow jcr:read,rep:write,jcr:versionManagement on /content/dam/{project}",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-asset-writer.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-asset-writer=[{project}-asset-writer]"
  ]
}
```

**Place under:** `osgiconfig/config.author/`

---

## Recipe 5 — Page-Content Editor (author only)

**Use when:** a service edits `jcr:content` of pages but should not delete or reorder pages.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-page-content-editor.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-page-content-editor with path /system/cq:services/{project}",
    "set principal ACL for {project}-page-content-editor",
    "  allow jcr:read on /content/{project}",
    "  allow rep:write on /content/{project} restriction(rep:glob, \"*/jcr:content/*\")",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-page-content-editor.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-page-content-editor=[{project}-page-content-editor]"
  ]
}
```

**Place under:** `osgiconfig/config.author/`

---

## Recipe 6 — Authoring Group (author only)

**Use when:** human authors need a shared role with consistent grants.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-authors.cfg.json`

```json
{
  "scripts": [
    "create group {project}-authors",
    "set principal ACL for {project}-authors",
    "  allow jcr:read on /content, /conf, /content/dam",
    "  allow rep:write on /content/{project} restriction(rep:glob, \"*/jcr:content/*\")",
    "  allow rep:write on /content/dam/{project}",
    "end"
  ]
}
```

Add individual authors to the group via the AEM useradmin UI, or seed them via additional `add <user> to group {project}-authors` statements.

**Place under:** `osgiconfig/config.author/`

---

## Recipe 7 — Read Configurations Only (publish only)

**Use when:** a publish-tier service reads `/conf` to look up policies but never writes.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-config-reader.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-config-reader with path /system/cq:services/{project}",
    "set principal ACL for {project}-config-reader",
    "  allow jcr:read on /conf",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-config-reader.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-config-reader=[{project}-config-reader]"
  ]
}
```

**Place under:** `osgiconfig/config.publish/`

---

## Recipe 8 — Tag Manager (author only)

**Use when:** a service creates / updates tags in a specific taxonomy.

`org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-tag-manager.cfg.json`

```json
{
  "scripts": [
    "create service user {project}-tag-manager with path /system/cq:services/{project}",
    "set principal ACL for {project}-tag-manager",
    "  allow jcr:read on /content/cq:tags",
    "  allow rep:write on /content/cq:tags/{project}",
    "end"
  ]
}
```

`org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-tag-manager.cfg.json`

```json
{
  "user.mapping": [
    "com.{project}.core:{project}-tag-manager=[{project}-tag-manager]"
  ]
}
```

**Place under:** `osgiconfig/config.author/`

---

## Anti-Patterns to Avoid

The following recipes look tempting but are wrong. Do not use them.

### ❌ "Service user for everything"

```json
{
  "scripts": [
    "create service user {project}-svc",
    "set principal ACL for {project}-svc",
    "  allow jcr:all on /",
    "end"
  ]
}
```

`jcr:all on /` is a security catastrophe and will fail Cloud Manager's security audit. Always grant the minimum needed.

### ❌ Path-based ACL on a future path

```json
{
  "scripts": [
    "create service user {project}-data-writer",
    "set ACL for {project}-data-writer",
    "  allow rep:write on /var/{project}",
    "end"
  ]
}
```

`/var/{project}` does not exist on a fresh Cloud Service instance. The block fails to apply. Either `create path /var/{project}` first **or** use `set principal ACL` (which doesn't need the path to exist).

### ❌ Mapping in a different runmode

```
osgiconfig/config.author/RepositoryInitializer~{project}-publisher.cfg.json
osgiconfig/config/ServiceUserMapperImpl.amended-{project}-publisher.cfg.json
```

The publisher user only exists on author, but the mapping is global — on publish, the mapping points to a non-existent user, causing `LoginException`. Put both files in `config.author/`.

### ❌ `delete` followed by `create` in the same script

```json
{
  "scripts": [
    "delete service user {project}-content-reader",
    "create service user {project}-content-reader",
    "set principal ACL for {project}-content-reader",
    "  allow jcr:read on /content",
    "end"
  ]
}
```

Delete-then-create is **not idempotent**: every restart wipes and re-creates the user, dropping group memberships that may have been added at runtime. Just leave the `create` (it's a no-op if the user exists).

## See Also

- [`service-users.md`](service-users.md) — Why mapping + Repoinit must stay paired.
- [`acls.md`](acls.md) — Grant scope and restriction syntax.
- [`runmode-placement.md`](runmode-placement.md) — Which `config*` folder to use.
- [`validation.md`](validation.md) — Verifying recipes after install.
