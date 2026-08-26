# Runmode Placement

Repoinit configs are OSGi factory configurations. They install into the right environment based on which **runmode folder** they live in. Getting placement wrong is one of the most common sources of "service user not found" / "AccessDeniedException" errors on Cloud Service.

## The Folder Convention

In a standard AEM as a Cloud Service project, Repoinit configs live under the `ui.config` module:

```
ui.config/src/main/content/jcr_root/apps/<project>/osgiconfig/
├── config/           ← all runmodes (author + publish + preview)
├── config.author/    ← author tier only
├── config.publish/   ← publish tier only
└── config.dev/       ← dev environment only  (rarely needed)
```

The folder name **after the dot** is the runmode. A config in `config.author` is installed only on author instances. A config in plain `config` is installed everywhere.

### What goes where

| Repoinit content | Folder |
|------------------|--------|
| Service user used on **both** tiers | `config/` |
| ACLs on a path that exists on **both** tiers (e.g. `/content`, `/conf`) | `config/` |
| User that only reads on **publish** | `config.publish/` |
| User that publishes (calls `crx:replicate`) | `config.author/` (Replicator runs on author) |
| Editorial groups (`{project}-authors`, etc.) | `config.author/` |
| Path under `/var/<project>` used by a service running everywhere | `config/` |

When in doubt, place in `config/`. Splitting only buys you a smaller blast radius if a config has an error — it does not improve security.

## Companion File Goes With Repoinit

The `ServiceUserMapperImpl.amended-*.cfg.json` mapping **must live in the same runmode folder** as the Repoinit script that creates the service user. If they're separated, the user exists but cannot be looked up by the bundle, or vice versa.

```
osgiconfig/config/
  org.apache.sling.jcr.repoinit.RepositoryInitializer~{project}-content-reader.cfg.json
  org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-content-reader.cfg.json
```

Keep the suffix consistent (`~{project}-content-reader` and `-{project}-content-reader`) so a reviewer can see at a glance which Repoinit owns which mapping.

## Multiple Runmodes

Runmode names can be combined with `.`. For example, `config.author.dev` installs only on instances that have **both** the `author` runmode and the `dev` runmode. Use sparingly — only when you have environment-specific configs (typically only relevant for OSGi configs in `ui.config`, not for Repoinit, which should generally be environment-independent).

| Folder | When it installs |
|--------|------------------|
| `config` | Always |
| `config.author` | Only on author instances |
| `config.publish` | Only on publish instances |
| `config.preview` | Only on the preview tier (rare) |
| `config.author.dev` | Only on author + dev environment |
| `config.publish.stage` | Only on publish + stage environment |

**For Repoinit specifically: prefer `config`, `config.author`, or `config.publish`.** Environment-specific Repoinit is almost always a mistake — service users and ACLs should be identical across environments.

## How the Cloud Service Installer Picks Configs

1. Adobe Cloud Manager builds the package and pushes it to the tier.
2. The Sling installer scans `config` and `config.<active-runmode>` folders.
3. For each factory PID (`...RepositoryInitializer~...`), the installer picks the **most specific** matching folder.
4. Configs are applied in factory-PID-name order; ordering across PIDs is **not guaranteed**.

This means **specificity wins**: a config in `config.author` shadows one in `config` for the author tier. Don't write conflicting Repoinit scripts in two folders for the same PID; you'll get hard-to-debug differences between environments.

## Verifying Placement Locally

After the Build Validation Gate (Test Automation Agent, ADLC-SPEC §8.1.1) has built and deployed, start the local SDK with the right runmode (`-Dsling.run.modes=author,dev`). This skill does NOT invoke `mvn` directly.

To confirm a Repoinit config landed at the right place after install, check:

- Felix Console → Configurations → search for `RepositoryInitializer` — your factory instances should show up with the script body visible.
- Felix Console → System Information → "sling.run.modes" — confirm the runmodes that resolved.

If a Repoinit factory does **not** appear in the console after install, the most common cause is the file is in the wrong runmode folder for the local instance.

## Where Repoinit Configs Do **Not** Go

- **Not in `ui.apps/jcr_root/apps/<project>/install`** — that path is for OSGi bundles, not configs. Cloud Service rejects this layout.
- **Not in `ui.content`** — that module is for mutable content; configs go in `ui.config`.
- **Not directly under `apps/<project>/config`** without the `osgiconfig` intermediate — modern AEM project structure uses `osgiconfig/config*` to make runmode discovery explicit.
- **Not in `/libs`** — that's read-only Adobe-managed code.

## Validation

- [ ] Repoinit file is under `ui.config/.../osgiconfig/config*/`.
- [ ] Repoinit file name starts with `org.apache.sling.jcr.repoinit.RepositoryInitializer~`.
- [ ] PID suffix is unique in the project (search `grep -r "RepositoryInitializer~" ui.config`).
- [ ] Companion `ServiceUserMapperImpl.amended-*.cfg.json` is in the **same** runmode folder.
- [ ] Service user used on both tiers → `config/`, not `config.author/` or `config.publish/`.
- [ ] No environment-specific runmode (`.dev`, `.stage`, `.prod`) for Repoinit unless documented.

## See Also

- [`service-users.md`](service-users.md) — Pairing Repoinit with the mapping config.
- [`validation.md`](validation.md) — Verifying configs land correctly.
- [`migration/references/osgi-cfg-json-cloud-manager.md`](../../migration/references/osgi-cfg-json-cloud-manager.md) — Runmode rules for OSGi configs in general.
