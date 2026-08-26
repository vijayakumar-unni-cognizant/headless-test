# Validation & Debugging

How to verify Repoinit configs locally, decode common errors, and find out why a service user isn't behaving as expected.

## Local SDK Build & Deploy

> **Maven policy (ADLC-SPEC §8.1.1):** Do NOT invoke `mvn` from this skill. The single Build Validation Gate owned by the Test Automation Agent runs one `mvn -q clean install -PautoInstallSinglePackage` for the entire ADLC run and deploys to the local SDK as a side-effect.

After the Build Validation Gate runs (typically against `localhost:4502`), check the SDK's `error.log` — Repoinit failures appear there with the exact failing statement.

Search log for:

```
grep -E "(RepoInit|repoinit|RepositoryInitializer|SlingRepositoryInitializer)" crx-quickstart/logs/error.log
```

A clean install logs lines like:

```
Executing RepoInitParser script: create service user {project}-content-reader ...
RepositoryInitializerFactory ~{project}-content-reader: 4 statements executed in 12ms
```

Any line containing `ERROR` or `Exception` related to a Repoinit script is a hard failure — it must be fixed before pushing. Cloud Manager will fail the **Build Image** step if Repoinit cannot apply.

## Verifying What Actually Got Applied

### Felix Console

`http://localhost:4502/system/console/configMgr` — search for `RepositoryInitializer`. Each factory PID instance shows the script body. If a config you wrote is missing here, it's a placement issue (see [`runmode-placement.md`](runmode-placement.md)).

### Service users

`http://localhost:4502/system/console/jmx` → search for `RepositoryInitializerFactory` → invoke `getStatistics()` to see the count of executed scripts.

`http://localhost:4502/crx/explorer/index.jsp` → navigate to `/home/users/system/...` (or your `with path` location) to confirm the user node exists.

### ACLs

`http://localhost:4502/useradmin` shows users and groups. The "Permissions" tab on a user shows the effective grants — useful for sanity-checking that ACEs landed.

Or programmatically:

```java
AccessControlManager acm = session.getAccessControlManager();
AccessControlPolicy[] policies = acm.getEffectivePolicies(path);
```

This returns the effective policies at a path, including those granted via principal-based ACEs that weren't visible until the path was created.

## Common Errors and Fixes

### `LoginException: Cannot derive user name for bundle <name>`

The Java side called `getServiceResourceResolver(SUBSERVICE="x")` but no `ServiceUserMapperImpl.amended-*.cfg.json` maps `<bundle>:x` to a system user.

Fix: add the mapping config in the same runmode folder.

### `LoginException: Cannot lookup principal: <user>`

The mapping config points to a user that doesn't exist in the repository. Either the Repoinit `create service user` is missing, or it lives in a different runmode folder than the mapping.

Fix: ensure both files are in the same runmode folder, and the user name matches exactly (case-sensitive).

### `AccessDeniedException: <path>`

The service user logged in successfully but is missing the privilege it tried to use.

Fix: check the Repoinit script for the user and verify:

- The ACE covers the **exact path** being accessed (no typo).
- The privilege is **the right one** — `jcr:read` for read, `rep:write` for write, `crx:replicate` for replication.
- A higher-up `deny` is not overriding the `allow`. Path-based deny ACEs take precedence over principal-based allow ACEs.

### `RepoInitParsingException: ... at line N, column M`

Repoinit script has a syntax error. The line/column refers to the script body inside `scripts[i]`. Common causes:

| Mistake | Fix |
|---------|-----|
| Missing `end` after a block | Add `end` to close the `set ACL` / `create path` block. |
| `rep:glob` value not quoted | Quote: `restriction(rep:glob, "*/jcr:content/*")`. |
| Trailing comma in path list | Remove the comma. |
| Mixing `set ACL` and `set principal ACL` in one block | They are separate statements; pick one. |
| Privilege name typo (`jcr:reads`, `rep:writes`) | Privileges are case-sensitive and exact. |

### `Repoinit script failed: path /content/... does not exist`

A path-based ACL block (`set ACL for ...`) ran before its target path existed.

Fix: switch to principal-based: `set principal ACL for ...`. Principal-based ACEs are stored on the user and applied when the path is created, eliminating the ordering problem.

### "User is created but has no permissions" / Empty `useradmin` view

Repoinit ran (user exists) but ACLs are empty. Likely causes:

- The ACL block sits in a **different** factory PID than the `create service user`, and the PIDs ran out of order across separate Repoinit configs.
- The ACL block used path-based syntax against a path that didn't exist yet, so the block silently no-op'd (newer Repoinit versions raise an error; older ones may not).

Fix: keep `create service user` and `set principal ACL for <same user>` in the **same** `scripts[]` array, in the same config file.

### Cloud Manager: "Build Image" step fails with Repoinit error

The Cloud Service installer applied your Repoinit at startup and one statement raised. Check the **Build Image** logs for the exact statement.

Most common at this stage:

- Path-based ACL on a path that doesn't yet exist on a fresh Cloud Service instance.
- Privilege typo that worked locally because of a different repository state.
- A `delete service user <x>` followed by a `set principal ACL for <x>` — you deleted then granted.

## Sanity-Check Checklist

Before merging a Repoinit change:

- [ ] Local install passes — no Repoinit errors in `error.log`.
- [ ] Service user appears in `/home/users/system/...` via CRX/DE or useradmin.
- [ ] Mapping appears in Felix Console under `ServiceUserMapperImpl.amended`.
- [ ] Code that uses `getServiceResourceResolver(SUBSERVICE="x")` does not throw `LoginException` when called.
- [ ] On a path the user is supposed to read, the call returns a non-null `Resource`.
- [ ] On a path the user is **not** supposed to access, an attempt is correctly denied (no over-grant).
- [ ] All Repoinit scripts in the change are **idempotent** — re-running the install does not produce errors.

## See Also

- [`grammar.md`](grammar.md) — Statement reference.
- [`service-users.md`](service-users.md) — Mapping configs.
- [`runmode-placement.md`](runmode-placement.md) — Placing files in the right folder.
- Felix Console: `/system/console/configMgr` (locally).
- Cloud Manager Build Image logs: Cloud Manager UI → pipeline → "Build Image" step.
