---
name: repoinit
description: AEM as a Cloud Service Repoinit authoring and review. Covers service users, system users, groups, ACLs (path-based and principal-based), node/path creation, and the companion ServiceUserMapperImpl.amended OSGi config. Use whenever the user mentions repoinit, RepositoryInitializer, system user, service user, ACL grant, jcr:read/rep:write, rep:glob, ServiceUserMapper, or sees "no permission" / "AccessDeniedException" / "service user not found" / "LoginException" in AEM Cloud Service logs. Also use when scaffolding a new component that needs a service-bound ResourceResolver.
license: Apache-2.0
---

# AEM as a Cloud Service — Repoinit

Repoinit is the **only supported way** to provision JCR-level state (service users, system users, groups, ACLs, paths, nodes, namespaces) on AEM as a Cloud Service. The classic `/useradmin` UI is not available; ad-hoc edits in CRXDE are not durable across deploys.

This skill scaffolds and reviews Repoinit configs plus the companion `ServiceUserMapperImpl.amended-*.cfg.json` mapping. It complements **`best-practices/references/resource-resolver-logging.md`**, which explains the **Java side** (`getServiceResourceResolver(SUBSERVICE=...)`); read both when introducing a new service-bound resolver.

> **Beta Skill**: Verify all generated configs locally with the AEM SDK and against the Sling Repoinit Apache reference grammar before deploying.

## When to Use This Skill

- Creating, renaming, or removing a **service user** / **system user**
- Granting or revoking **ACLs** on a JCR path or set of paths (allow/deny, with or without `rep:glob`)
- Creating **groups** or adding service users to groups
- Creating **paths or nodes** with a specific primary type as part of installation
- Mapping a bundle's **subservice** name → service user via `ServiceUserMapperImpl.amended`
- Diagnosing deploy failures: `AccessDeniedException`, `LoginException`, "service user not found", "no such ACL", "could not register namespace"
- Migrating away from **`getAdministrativeResourceResolver`** (paired with `best-practices`)

## File Locations & Naming

Place all configs under a `ui.config` package (or your equivalent) in a runmode folder:

```
ui.config/src/main/content/jcr_root/apps/<project>/osgiconfig/
├── config/                 # all runmodes (default)
├── config.author/          # author tier only
└── config.publish/         # publish tier only
```

**Two file types** are created together for a typical "service user + mapping" change:

| File | Purpose | Required |
|------|---------|----------|
| `org.apache.sling.jcr.repoinit.RepositoryInitializer~<id>.cfg.json` | Repoinit script (service users, ACLs, paths, groups) | Yes |
| `org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-<id>.cfg.json` | Bundle subservice → service user mapping | When Java code calls `getServiceResourceResolver(SUBSERVICE=...)` |

The `~<id>` / `-<id>` suffix is the OSGi factory PID — it must be **unique per project** and is informational. Use a stable, descriptive id (e.g. `~{project}-content-reader`).

## Decision Guide

Pick the reference for your task:

| Task | Reference |
|------|-----------|
| Full Repoinit DSL statement list & grammar | [`references/grammar.md`](references/grammar.md) |
| Create service/system user + bundle mapping | [`references/service-users.md`](references/service-users.md) |
| ACL grants — path-based vs principal-based, `rep:glob`, restrictions | [`references/acls.md`](references/acls.md) |
| Create a group, set members, create a path/node | [`references/groups-and-paths.md`](references/groups-and-paths.md) |
| Where to place files for author/publish/all runmodes | [`references/runmode-placement.md`](references/runmode-placement.md) |
| Local validation, error messages, debugging | [`references/validation.md`](references/validation.md) |
| Copy-paste recipes (read-only, /var write, replication) | [`references/recipes.md`](references/recipes.md) |

## Critical Rules

- **READ THE REFERENCE FIRST** for the task — Repoinit grammar is unforgiving on whitespace and statement order.
- **Use principal-based ACLs (`set principal ACL for <user>`)** over path-based (`set ACL for <user>`) when granting at install time — they do **not require the path to already exist**, which makes them order-independent.
- **Always pair** a new `getServiceResourceResolver(SUBSERVICE=...)` call with: (a) `create service user` + ACLs in Repoinit, AND (b) a `ServiceUserMapperImpl.amended-*.cfg.json` mapping. Missing either side causes `LoginException` at runtime.
- **Match `<bundle-symbolic-name>`** in the mapping exactly to the Maven `<artifactId>` / `Bundle-SymbolicName` of the bundle making the call (usually the `core` module).
- **Statements are idempotent** — `create service user` is safe on every deploy. **Never** wrap with conditional logic.
- **Do not use `delete` / `disable`** statements speculatively — they can revoke grants in unexpected orders. Treat removals as conscious deploys.
- **Grant least privilege** — start with `jcr:read` only, add `rep:write` / `crx:replicate` / `jcr:lockManagement` only where required.
- **Do not edit ACLs in CRXDE** on Cloud Service — they are not persisted across re-deploys / instance recycles. Repoinit is the durable source of truth.

## Quick Snippet

A minimum-viable service user reading from `/content` and writing to `/var/{project}`:

```
# org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-content-reader.cfg.json
{
  "scripts": [
    "create service user {project}-content-reader",
    "set principal ACL for {project}-content-reader",
    "  allow jcr:read on /content",
    "  allow jcr:read,rep:write on /var/{project}",
    "end"
  ]
}
```

Paired mapping (required for any `SUBSERVICE = "{project}-content-reader"` call in `com.{project}.core`):

```
# org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-content-reader.cfg.json
{
  "user.mapping": [
    "com.{project}.core:{project}-content-reader=[{project}-content-reader]"
  ]
}
```

Java side (under the `best-practices` skill's `resource-resolver-logging.md`):

```java
private static final Map<String, Object> AUTH =
    Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "{project}-content-reader");

try (ResourceResolver resolver = factory.getServiceResourceResolver(AUTH)) {
    // work
} catch (LoginException e) {
    LOG.error("Could not open resolver for '{project}-content-reader'", e);
}
```

## Validation Checklist

- [ ] Repoinit config placed under the **correct runmode folder** for the consumer (`config`, `config.author`, `config.publish`).
- [ ] PID suffix (`~<id>` / `-<id>`) is unique within the project.
- [ ] Every `create service user <name>` has matching **ACL grants** (read at minimum).
- [ ] Every `SUBSERVICE=` in Java has a matching **`ServiceUserMapperImpl.amended-*.cfg.json`** entry.
- [ ] `<bundle-symbolic-name>` in the mapping matches the bundle making the call.
- [ ] **Principal-based** ACLs used unless there's a documented reason to use path-based.
- [ ] No `rep:write` on `/content` unless required; prefer scoped paths under `/var/<project>`.
- [ ] No `delete user` / `delete ACL` unless the removal is intentional and reviewed.
- [ ] Build/deploy verification deferred to the Build Validation Gate (Test Automation Agent, ADLC-SPEC §8.1.1). After the gate runs, `error.log` should show no Repoinit errors. This skill does NOT invoke `mvn`.

## See Also

- **Java side:** [`best-practices/references/resource-resolver-logging.md`](../best-practices/references/resource-resolver-logging.md)
- **OSGi config rules** (PID naming, runmode folders, secrets): [`migration/references/osgi-cfg-json-cloud-manager.md`](../migration/references/osgi-cfg-json-cloud-manager.md)
- **Adobe — Service users and Repoinit:** https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/security/best-practices-for-sling-service-user-mapping-and-service-user-definition
- **Apache Sling Repoinit grammar reference:** https://sling.apache.org/documentation/bundles/repository-initialization.html
