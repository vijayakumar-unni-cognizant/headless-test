# Repoinit Skill

AEM as a Cloud Service authoring and review skill for **Repoinit** — the only supported mechanism for provisioning JCR-level state (service users, system users, groups, ACLs, paths, nodes) on Cloud Service.

This skill complements the existing **`best-practices`** skill: where `best-practices/references/resource-resolver-logging.md` explains the **Java side** of opening a service-bound `ResourceResolver`, this skill explains the **configuration side** (the Repoinit script that creates the user plus the `ServiceUserMapperImpl.amended` config that maps the bundle subservice to that user).

## Why This Skill Exists

The Adobe-supplied skill set covers Repoinit only as a side-effect of the resource-resolver story — a single section inside `resource-resolver-logging.md`. In practice, Repoinit is one of the most error-prone surfaces on Cloud Service:

- "Service user not found" failures show up as `LoginException` at runtime — confusing because the user *is* in the repo, just unmapped.
- "AccessDeniedException" failures show up after a successful login when the ACL doesn't cover the path actually being accessed.
- Path-based ACLs (`set ACL for`) silently fail when the target path doesn't yet exist; principal-based ACLs (`set principal ACL for`) don't.
- The factory PID file naming convention is unforgiving.
- Cloud Manager's "Build Image" step fails the whole deploy if a single Repoinit statement raises.

Treating Repoinit as a first-class skill catches these mistakes before they hit Cloud Manager.

## What's in This Skill

- **[`SKILL.md`](SKILL.md)** — Entry point, decision guide, validation checklist.
- **[`references/grammar.md`](references/grammar.md)** — Repoinit DSL statement catalogue.
- **[`references/service-users.md`](references/service-users.md)** — Service users + the mandatory `ServiceUserMapperImpl.amended` mapping.
- **[`references/acls.md`](references/acls.md)** — Path-based vs principal-based ACLs, privileges, `rep:glob` patterns.
- **[`references/groups-and-paths.md`](references/groups-and-paths.md)** — Groups, `create path`, `set properties`.
- **[`references/runmode-placement.md`](references/runmode-placement.md)** — Which `config*` folder to use; how the installer picks configs.
- **[`references/validation.md`](references/validation.md)** — Local testing and error decoding.
- **[`references/recipes.md`](references/recipes.md)** — Ready-to-use Repoinit + mapping templates.

## When This Skill Activates

This skill is registered with trigger phrases including: `repoinit`, `RepositoryInitializer`, `system user`, `service user`, `ACL grant`, `jcr:read`, `rep:write`, `rep:glob`, `ServiceUserMapper`, and the error strings `LoginException`, `AccessDeniedException`, `service user not found`. It also activates when the user is scaffolding a new OSGi component that needs a service-bound `ResourceResolver`.

## Relationship to Other Skills

| Skill | When to combine |
|-------|-----------------|
| **best-practices** | Always read `references/resource-resolver-logging.md` alongside this skill when introducing a new service-bound resolver. |
| **migration** | When migrating legacy `getAdministrativeResourceResolver` usages, this skill provides the Repoinit + mapping; `best-practices` provides the Java refactor. |
| **create-component** | When the new component needs server-side data access via a service user, generate the Sling Model first, then come here for the Repoinit + mapping. |

## Status

Beta. Validate every generated config locally against a fresh AEM SDK quickstart before pushing to Cloud Manager. The Apache Sling Repoinit grammar is the authoritative source for syntax: <https://sling.apache.org/documentation/bundles/repository-initialization.html>.

## References

- **Adobe — Service Users and Repoinit best practices:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/security/best-practices-for-sling-service-user-mapping-and-service-user-definition>
- **Adobe — Project content package structure (repo-init):** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/aem-project-content-package-structure>
- **Apache Sling — Repository Initialization (grammar):** <https://sling.apache.org/documentation/bundles/repository-initialization.html>
- **Jackrabbit Oak — Access Control:** <https://jackrabbit.apache.org/oak/docs/security/accesscontrol.html>
