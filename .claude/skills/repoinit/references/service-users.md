# Service Users & Bundle Mapping

Service users are the **only** supported identity for backend code that needs JCR access on AEM as a Cloud Service. Every `factory.getServiceResourceResolver(SUBSERVICE = "<name>")` call requires three things wired up consistently:

1. **Service user** created by Repoinit.
2. **ACL grants** for that user on the paths it needs.
3. **Bundle → subservice → service user mapping** in `ServiceUserMapperImpl.amended`.

Missing or mismatched: `LoginException` at runtime.

## Step 1 — Create the Service User

```
# org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-content-reader.cfg.json
{
  "scripts": [
    "create service user {project}-content-reader",
    "set principal ACL for {project}-content-reader",
    "  allow jcr:read on /content",
    "  allow jcr:read on /conf",
    "end"
  ]
}
```

**Naming convention:**

- Use `kebab-case`.
- Prefix with the project name to avoid collisions with platform users: `{project}-content-reader`, not `content-reader`.
- Name by **role**, not by consumer (`{project}-content-reader` reads content; `{project}-asset-publisher` publishes assets) so multiple bundles can reuse one user when their grants overlap.

**Where users live:** by default, `/home/users/system/`. To group them, use `with path`:

```
create service user {project}-content-reader with path /system/cq:services/{project}
```

`/system/cq:services/<project>` is the Adobe-recommended location for project service users.

## Step 2 — Grant the Minimum Necessary ACLs

Use **principal-based** ACLs unless you have a documented reason to use path-based:

```
set principal ACL for {project}-content-reader
  allow jcr:read on /content
  allow jcr:read,rep:write on /var/{project}
end
```

Reasoning:

- Path-based ACLs (`set ACL for <user>`) require the target path to **already exist** at the moment Repoinit runs. If the path lives in a FileVault content package that installs later, your Repoinit fails.
- Principal-based ACLs (`set principal ACL for <user>`) are stored on the user and applied when the path is visited — order-independent across packages.

See [`acls.md`](acls.md) for full ACL syntax, `rep:glob`, and restriction examples.

## Step 3 — Map the Bundle Subservice

```
# org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-content-reader.cfg.json
{
  "user.mapping": [
    "com.{project}.core:{project}-content-reader=[{project}-content-reader]"
  ]
}
```

**Format:** `<bundle-symbolic-name>:<subservice-name>=[<system-user>]`

- `<bundle-symbolic-name>` = the Maven `<artifactId>` / `Bundle-SymbolicName` of the bundle making the call. For this project that's typically `com.{project}.core` (the `core` module).
- `<subservice-name>` = the string you pass as `ResourceResolverFactory.SUBSERVICE` in Java.
- `<system-user>` in brackets = the service user created by Repoinit. **Brackets are required** — they distinguish service-user mappings from principal-name mappings.

Place this file in the **same runmode folder** as the Repoinit config (typically `osgiconfig/config`). If the subservice is needed on only one tier, put both files under `osgiconfig/config.author` or `osgiconfig/config.publish`.

## Step 4 — Java Side

Detailed pattern lives in **[`best-practices/references/resource-resolver-logging.md`](../../best-practices/references/resource-resolver-logging.md)**. Quick recap:

```java
import java.util.Collections;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.apache.sling.api.resource.LoginException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(service = ContentService.class)
public class ContentService {

    private static final Logger LOG = LoggerFactory.getLogger(ContentService.class);

    @Reference
    private ResourceResolverFactory factory;

    public String readSomething(String path) {
        try (ResourceResolver resolver = factory.getServiceResourceResolver(
                Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "{project}-content-reader"))) {
            // work
            return resolver.getResource(path).getName();
        } catch (LoginException e) {
            LOG.error("Could not open resolver for '{project}-content-reader'", e);
            return null;
        }
    }
}
```

## One Service User per Concern

Resist the temptation to create a single `{project}-svc` user with broad grants. Prefer one user per **purpose**:

| Purpose | Suggested user | Typical grants |
|---------|----------------|---------------|
| Read public content | `{project}-content-reader` | `jcr:read` on `/content`, `/conf` |
| Write to a project-owned var path | `{project}-data-writer` | `jcr:read,rep:write` on `/var/{project}` |
| Publish content programmatically | `{project}-publisher` | `jcr:read` on `/content`, `crx:replicate` on `/content`, `rep:write` on `/var/{project}/publish-log` |
| Modify DAM assets | `{project}-dam-writer` | `jcr:read,rep:write,jcr:versionManagement` on `/content/dam/{project}` |

When two purposes have identical grants and identical risk profiles, it's fine to share — but document the reuse in a comment on both bundle mappings.

## When to Avoid Service Users

- **Frontend client-side calls** — those use the request user (cookie / IMS token).
- **Workflow process steps** — already run with the workflow's session; don't open a service resolver inside a process step unless you need a privilege the workflow user lacks.
- **`SlingHttpServletRequest`-driven code** — use the request's `resourceResolver`; do not open a new one.

## Validation

- [ ] `create service user <name>` present, kebab-case, project-prefixed.
- [ ] At least one `allow` ACE for the user (`jcr:read` minimum).
- [ ] No grants broader than necessary (`jcr:all` on `/` is a red flag).
- [ ] `ServiceUserMapperImpl.amended-*.cfg.json` exists in the same runmode folder.
- [ ] `<bundle-symbolic-name>` matches the bundle making the call.
- [ ] `<subservice-name>` matches the string passed in Java.
- [ ] Brackets present around the system-user list.
- [ ] Build verification deferred to the Build Validation Gate (Test Automation Agent, ADLC-SPEC §8.1.1). This checklist does NOT invoke `mvn`.

## See Also

- [`acls.md`](acls.md) — ACL grant syntax.
- [`recipes.md`](recipes.md) — Ready-to-use service-user templates.
- [`best-practices/references/resource-resolver-logging.md`](../../best-practices/references/resource-resolver-logging.md) — Java side.
- Adobe documentation: <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/security/best-practices-for-sling-service-user-mapping-and-service-user-definition>
