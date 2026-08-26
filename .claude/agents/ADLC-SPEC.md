# AEM as a Cloud Service — Agentified Delivery Life Cycle (ADLC)

**Multi-level agent orchestration specification for any AEMaaCS project.**

> Throughout this spec, `<project>`, `<package>`, and `<group>` are placeholders resolved at session start from `.aem-skills-config.yaml`:
> - `<project>` — the project slug (e.g., the value of the `project:` key).
> - `<package>` — the Java root package (e.g., the value of the `package:` key, such as `com.example.core`).
> - `<group>` — the component group label (e.g., the value of the `group:` key).
>
> Specialists MUST read `.aem-skills-config.yaml` first and substitute these values verbatim. No agent infers project identifiers from the file system.

This document defines the AEM Program Agent and a catalog of 9 specialist agents that together cover the full delivery lifecycle for AEM as a Cloud Service. Each specialist owns a stage, draws on one or more domain skills, produces a structured artifact, and surfaces validation gates before downstream specialists pick up its output.

> **History.** This spec replaces the prior 17-agent decomposition. The 17 legacy agent files are archived under `docs/agents-legacy/` for forensic reading of historical runs only — they are not dispatched in new runs. The new run folder layout (`plan/ design/ implement/ integrate/ test/ deploy/`) and specialist names (`strategist`, `designforge`, `blockwright`, `configsmith`, `bridgesmith`, `composer`, `auditron`, `sentinel`, `pilot`) apply to every new run; historical runs under `.claude/agents/runs/` are preserved as-is and remain interpretable via the legacy archive.

---

## 1. Executive Summary

The Agentified Delivery Life Cycle (ADLC) is the multi-agent analogue of a traditional SDLC. Instead of a single linear handoff between human roles, work flows through a directed graph of specialized agents under the supervision of one orchestrator. Each agent owns a stage, draws on one or more domain skills, produces a structured artifact, and surfaces validation gates before downstream agents pick up its output.

The model is built around two invariants:

- **Skills are the unit of capability**, not agents. Skills (the files under `.claude/skills/`) encode AEMaaCS conventions, patterns, and guardrails. Agents are thin coordinators that load the right skill at the right moment and produce artifacts that conform to skill output contracts.
- **The Program Agent owns no domain knowledge directly.** It owns *which specialist runs next*, *which artifact must exist before that specialist runs*, and *what counts as "done"* for the current stage. Domain knowledge lives in the specialists.

This separation keeps the orchestration logic stable while skills evolve underneath it.

The 9 specialists map to 6 lifecycle stages:

| Stage | Specialists |
|---|---|
| **Plan** | `strategist` |
| **Design** | `designforge` |
| **Implement** | `blockwright`, `configsmith` |
| **Integrate** | `bridgesmith`, `composer` |
| **Test (pre-release)** | `auditron` |
| **Release** | `pilot` (raises the PR, then the flow pauses) |
| **Test (post-deploy)** | `sentinel` (**LAST** — runs against the real environment after the Lead's manual deploy) |

> **Ordering note (current flow).** The two Test specialists are split across the pause: `auditron` runs pre-release (build + tests), then `pilot` raises the PR and the flow **suspends** for the Lead's manual merge + real-environment deploy, then `sentinel` runs **last** against that real environment. Pilot no longer deploys and is no longer the last stage; the real deploy is the Lead's manual, out-of-ADLC step. See §5.1 / §5.1.a / §8.3.

---

## 2. Skill Inventory (this repository)

### Local skills (`.claude/skills/`)

| Skill | Scope | Primary owner specialist |
|---|---|---|
| `aem-rde` | Adobe I/O CLI plugin `@adobe/aio-cli-plugin-aem-rde`. Deploy, inspect, log-tail, snapshot, troubleshoot RDE. | `pilot` |
| `aem-workflow` | Workflow model design, custom process steps, launchers, triggering, debugging, triaging, Sling Job/Granite Workflow diagnostics. Sub-skills: `workflow-model-design`, `workflow-launchers`, `workflow-triggering`, `workflow-debugging`, `workflow-triaging`, `workflow-orchestrator`. | `blockwright` (build). Debugging / triaging sub-skills are currently **un-owned** by any agent after Pilot's scope narrowed to RDE only — invoke the skill directly if needed. |
| `best-practices` | AEMaaCS Java/OSGi guardrails, deprecated API replacements, BPA-style fixes, HTL lint, scheduler / EventListener / DAM AssetManager / Replicator transformations. | `strategist` (validation), `blockwright`, `bridgesmith` |
| `content-distribution` | Replication API, distribution events, Sling Distribution. Sub-skills: `replication`, `sling-distribution`. | `bridgesmith` (replication-driven outbound). Operations use of these sub-skills is **un-owned** after Pilot's scope narrowed to RDE only. |
| `create-component` | Components with HTL, dialog, Sling Model, unit test, ui.frontend SCSS partial, optional dialog clientlib. Figma + reference-URL flows supported. | `blockwright` |
| `create-content-fragment-graphql` | CF Model authoring (admin + JCR), persisted queries, GraphQL endpoint config, Java-side query execution. | `composer` |
| `create-editable-template` | Editable templates, template types, content policies, allowed components, `cq:allowedTemplates`. | `blockwright` |
| `dispatcher` | Dispatcher config authoring, technical advisory, incident response, performance tuning, security hardening, lifecycle orchestration. Sub-skills cover each. | `configsmith` (build). Incident-response sub-skill is **un-owned** by any agent after Pilot's scope narrowed to RDE only — invoke the skill directly if needed. |
| `ensure-agents-md` | Bootstrap AGENTS.md + CLAUDE.md for the workspace. Idempotent — never overwrites. | `strategist` (kickoff), Program Agent |
| `migration` | Legacy AEM (6.x / AMS / on-prem) → AEMaaCS migration. BPA / CAM target discovery, one-pattern-per-session workflow, OSGi config scan to Cloud Manager. | `blockwright` |
| `repoinit` | Service users, system users, groups, ACLs (path + principal), node/path creation, `ServiceUserMapperImpl.amended`. | `configsmith` |

### Platform skills (Claude Code plugins)

| Skill | Scope | Primary owner specialist |
|---|---|---|
| `init` | Initialize a new CLAUDE.md file with codebase documentation. | `strategist` (kickoff) |
| `review` | Review a pull request — diff analysis, convention checks. | `auditron` (run-level review) |
| `security-review` | Security review of pending changes on the current branch. | `configsmith` |
| `claude-api` | Build/debug Anthropic SDK apps. Not part of the AEM delivery cycle; available for any custom tooling the program needs to write. | (Optional) Custom-tooling builds |

### Project metadata

Specialists resolve these values from `.aem-skills-config.yaml` at session start:

- Project name: `<project>` — from the `project:` key.
- Java package: `<package>` — from the `package:` key (e.g., `com.<project>.core`).
- Component group: `<group>` — from the `group:` key.
- Frontend module: `ui.frontend` with webpack-driven SCSS/TS partials globbed into `clientlib-site` (category `<project>.site`).

All specialists in this spec are expected to read `.aem-skills-config.yaml` first and respect those values verbatim. No agent infers project identifiers from the file system.

---

## 3. AEM Program Agent (Primary Orchestrator)

### Purpose

Coordinate the full ADLC for an AEMaaCS engagement on the workspace's project. The Program Agent does not author code, write components, or change configs directly. It plans stages, dispatches specialists, enforces quality gates, brokers handoffs between specialists, and promotes work across environments.

### Responsibilities (summary)

- Lifecycle planning: translate intake into a stage-ordered execution plan grounded in §5.1 / §5.1.a (both are current authoritative flows — §5.1 vertical / compact, §5.1.a swimlane / detailed).
- Specialist dispatch: spawn each specialist with the inputs its contract requires (§4).
- Dependency management: hold the artifact graph in memory; block forward motion if an upstream artifact is missing or fails validation.
- Quality gate enforcement (§8): reject and re-dispatch when a gate fails; never silently advance.
- Release + environment promotion (§8.3): dispatch `pilot` to raise the release PR once Auditron passes, then suspend the run; resume into `sentinel` (against the real env) only after the human records the real-environment validation approval. The real deploy (merge → Adobe Git → Cloud Manager) is the Lead's manual, out-of-ADLC step; Pilot's RDE track is an optional sandbox.
- Cross-specialist conflict resolution: defer to `best-practices` when AEMaaCS correctness is at stake.
- Operational telemetry: maintain the per-run ledger described in §10.
- Human-in-the-loop checkpoints: pause for explicit human confirmation at named gates (architecture approval, dialog spec confirmation, and — after Pilot raises the PR — the **real-environment validation approval / resume** gate where the human supplies the real env URL + auth before Sentinel runs). Never bypass. Raising the PR is automatic (not a checkpoint); the real deploy itself lives in the external, Lead-driven process.

The full Program Agent contract — workflow steps, always-on stages, session-close verification gate, co-orchestration fallback, resumability rules — lives at `.claude/agents/aem-program-agent.md`. Treat that file as the canonical operating procedure; this section is the reference summary.

### Decision authority

| Decision | Owner |
|---|---|
| Stage order, specialist assignment, parallel vs serial | Program Agent (final) |
| Gate pass/fail at any stage boundary | Program Agent (final) |
| Conflicting recommendations between two specialists | Program Agent reconciles; defers to skill `best-practices` for AEMaaCS correctness |
| Architectural pattern choice (headless vs SSR, etc.) | `strategist` proposes; Program Agent accepts or escalates to human |
| Component reuse vs new component | `blockwright` proposes; Program Agent accepts |
| Raising the release PR | `pilot` raises it automatically once Auditron passes; Program Agent then suspends the run. |
| Real-environment deploy + production promotion | **Out of ADLC scope.** The human Lead manually merges the PR, syncs to Adobe Git, and deploys via Cloud Manager. The ADLC only resumes (into Sentinel) once the Lead approves and provides the real env URL. |
| Destructive operations (force push, package replace mode, content-tree deletion) | Program Agent escalates to human — never autonomous |

### Handoff format (Program Agent → human, at session close)

```yaml
run_id: 2026-06-29T18-09Z-<feature-slug>
intake: "Rebuild this URL as an AEM landing page: https://…"
stages_executed:
  - stage: plan
    agent: strategist
    status: pass
    artifact: runs/{run-id}/handoffs/strategist.yaml
  - stage: design
    agent: designforge
    status: pass
    artifact: runs/{run-id}/handoffs/designforge.yaml
  - stage: implement
    agents: [blockwright, configsmith]
    status: pass
    artifacts:
      - runs/{run-id}/handoffs/blockwright.yaml
      - runs/{run-id}/handoffs/configsmith.yaml
  - stage: integrate
    agents: [bridgesmith, composer]
    status: pass
    artifacts:
      - runs/{run-id}/handoffs/bridgesmith.yaml
      - runs/{run-id}/handoffs/composer.yaml
  - stage: test-pre-release
    agent: auditron
    status: pass
    artifact: runs/{run-id}/handoffs/auditron.yaml
  - stage: release
    agent: pilot
    status: awaiting_lead_approval  # raised the PR, then the flow suspended
    artifact: runs/{run-id}/handoffs/pilot.yaml
    pr_url: https://github.com/<owner>/<repo>/pull/<n>
  - stage: test-post-deploy
    agent: sentinel                 # LAST — runs on resume, against the real env
    status: pass
    artifact: runs/{run-id}/handoffs/sentinel.yaml
human_checkpoints:
  - gate: architecture_review
    decision: approved
    decided_by: <user>
    timestamp: 2026-06-29T18:25Z
  - gate: real_environment_validation_approval   # the resume gate (Lead approval + real env URL + auth)
    decision: approved
    decided_by: <lead>
    real_environment_url: https://<program>-<env>.adobeaemcloud.com
    auth_mode: none                 # none | bearer-token | credentials (secret passed out-of-band, never stored here)
    timestamp: 2026-06-29T20:10Z
  # Conditional third checkpoint — present only when Sentinel returned status: fail:
  # - gate: sentinel_remediation_approval
  #   decision: confirmed | declined   # confirmed → remediation cycle; declined → failures accepted as known gaps, go to reports
  #   decided_by: <user>
  #   timestamp: ...
  # Note: the real deploy (merge → Adobe Git → Cloud Manager) is the Lead's manual,
  # out-of-flow step — NOT an ADLC agent action.
final_artifacts:
  components: [...]
  templates: [...]
  pages: [...]
  release_pr: https://github.com/<owner>/<repo>/pull/<n>
  validated_environment: https://<program>-<env>.adobeaemcloud.com   # the real env Sentinel tested
reports:
  skills:    runs/{run-id}/reports/skills.md
  tokens:    runs/{run-id}/reports/tokens.json
  demo:      runs/{run-id}/reports/demo-script.md
```

---

## 4. Specialist Catalog

Each specialist follows the same 9-field schema (Purpose, Responsibilities, Inputs, Outputs, Tools/Skills, Decision Authority, Dependencies, Validation Criteria, Example Tasks). The catalog entries below are summaries — the full operating contracts live in the per-specialist `.md` files under `.claude/agents/`.

### 4.1 Strategist — Plan stage

- **Purpose.** Convert messy intake into a structured `requirements.yaml`, then translate it into a target AEMaaCS architecture and a sequenced work breakdown.
- **Responsibilities.** Functional + non-functional requirements identification; domain classification (Sites, Headless, Forms, Integration, Migration, Ops); acceptance criteria surfacing; architectural pattern selection (server-rendered Sites / headless CF+GraphQL / hybrid / Universal Editor); Core Components vs custom selection; integration touchpoint identification; NFR risk flagging; work breakdown with specialist assignments.
- **Inputs.** Program intake (text, ticket, URL, Figma URL); `.aem-skills-config.yaml`; optional `AGENTS.md` / `CLAUDE.md`; existing project structure.
- **Outputs.** `plan/requirements.yaml` + `plan/technical-specifications.md` + work breakdown.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`, `WebFetch`. Skills: `ensure-agents-md` (kickoff), `init` (kickoff), `best-practices`.
- **Decision authority.** Requirements classification; architectural pattern; reuse-vs-new at strategy level; sequencing of downstream specialists.
- **Dependencies.** None upstream (this is stage 1). Downstream: every other specialist.
- **Validation criteria.** Every requirement has ≥1 acceptance criterion; every requirement traces to ≥1 work-breakdown item; no deprecated AEM API recommended; every NFR has a mitigation owner.
- **Full contract.** `.claude/agents/strategist.md`.

### 4.2 Designforge — Design stage

- **Purpose.** Convert Strategist output and UX inputs into implementation-ready design documents and test specifications. **Design-only — never writes source code.**
- **Responsibilities.** Component contracts (Sling Model accessors, HTL semantic structure, BEM class names); per-component dialog specifications; template structure + content policy design; authoring guidelines; content-model design when headless is in scope; functional test case set traced to acceptance criteria; Playwright-ready UI-test scenarios (framework-neutral descriptions). Echoes every dialog spec to the human (or Strategist) for confirmation before downstream scaffolding begins.
- **Inputs.** `plan/requirements.yaml` + `plan/technical-specifications.md`; `.aem-skills-config.yaml`; existing component / template / CF Model inventory; optional Figma or reference web page URL.
- **Outputs.** Markdown specs under `design/`: `component-specifications.md`, `dialog-specifications.md`, `template-design.md`, `policy-mapping.md`, `authoring-guidelines.md`, `functional-test-cases.md`, `ui-test-scenarios.md`, `reference-assets.md` (the manifest of every reference URL / image / asset fixture in the run input, or `sources: none`), `source-content-inventory.md` (the **verbatim** content extracted from every `content-source-of-truth` reference, one row per target field with a `verbatim | derived | invented-by-necessity` fidelity marking — required whenever a reference source carries content), `authoring-test-cases.md` (AEM authoring-provision + data-setup cases — required when the run creates/changes an authoring surface, N/A stub otherwise), plus `content-fragment-models.md` when headless is in scope (which must carry **content-mapping** rows — which source value lands in which field and what that field renders as — not only a structural field table).
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`. **No `Bash`. No `Skill` invocation** — skills (`create-component`, `create-editable-template`, `create-content-fragment-graphql`, `best-practices`) are read as conventions reference only.
- **Decision authority.** Component contract shape; dialog field selection and tab layout; template structure; policy composition; functional test case derivation; UI-test (Playwright) scenario scope per page / journey.
- **Dependencies.** `strategist` (required).
- **Validation criteria.** Every component in the work breakdown has a spec + dialog spec; dialog spec confirmed for every component; every parsys area in `policy-mapping.md` lists explicit components or groups — no `*`; every requirement ID maps to ≥1 test case; every visual / user-journey requirement has a UI-test scenario; output directory contains markdown only.
- **Full contract.** `.claude/agents/designforge.md`.

### 4.3 Blockwright — Implement stage (code/build branch)

- **Purpose.** Engineer reusable AEM blocks — components, editable templates, OSGi services, schedulers, OSGi event handlers, workflow models + process steps, BPA migrations.
- **Responsibilities (by track).**
  - Components: HTL + dialog + Sling Model + unit test + ui.frontend SCSS partial; optional dialog clientlib.
  - Templates: editable templates, template types, content policies, `cq:allowedTemplates`.
  - Services: OSGi services, schedulers, OSGi event handlers (NOT JCR EventListener), utility classes, deprecated-API refactors — **internal AEM logic only**, no external boundary.
  - Workflows: workflow model XML, process step Java classes, launcher OSGi configs.
  - Migration: one BPA pattern per session (scheduler, ResourceChangeListener, replication, EventListener, EventHandler, DAM AssetManager, HTL lint, OSGi configs to Cloud Manager).
  - **UI tests (PRE-DEPLOY):** owns the `ui.tests` Playwright harness — use-as-is / **migrate-from-Cypress** / scaffold-if-missing (once per project) — and authors one `*.spec.js` per Designforge scenario ID, parameterized for the author + publish tiers. Validates statically via `npx playwright test --list` (no live env, no `mvn`). **Does not execute the suite** — that is Sentinel's, post-deploy. This must land before the PR so Cloud Manager's Custom UI Testing step runs Playwright rather than the archetype's Cypress.
- **Inputs.** Designforge handoff (component / dialog / template / policy specs); `.aem-skills-config.yaml`; optional Figma URL, reference web page URL, BPA CSV.
- **Outputs.** Component files under `ui.apps/.../components/`, `core/.../models/`, `ui.frontend/.../components/`; templates under `ui.content/.../conf/[project]/settings/wcm/templates/`; services under `core/.../services/`; workflows under `ui.apps/.../conf/global/settings/workflow/models/` + `core/.../workflow/`; migration plan + diffs under `runs/{run-id}/implement/blockwright/`.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`, `WebFetch`. Skills: `create-component`, `create-editable-template`, `best-practices`, `aem-workflow`, `migration`.
- **Decision authority.** Component name canonicalization, dialog field names (within Designforge spec envelope), HTL structure, SCSS class naming; template locking strategy, policy composition; class naming + package layout; workflow model shape, launcher conditions; migration pattern selection per session.
- **Dependencies.** `designforge` (required).
- **Validation criteria.** `.aem-skills-config.yaml` is `configured: true`; dialog spec already confirmed by Designforge (no re-prompt); no HTL file embeds runtime clientlibs; no per-component runtime clientlib folder under `ui.apps/.../clientlibs/`; SCSS partial uses BEM + `_variables.scss` tokens (URL-design mode); no deprecated AEM API survived `best-practices` re-scan; configs land in `ui.config`, not `ui.apps`; no `loginAdministrative`; one migration pattern per session. **Build verification deferred to `auditron`. This specialist does not invoke `mvn`.**
- **Full contract.** `.claude/agents/blockwright.md`.

### 4.4 Configsmith — Implement stage (config/hardening branch)

- **Purpose.** Own the project's operational config + hardening surface — authorization (repoinit + service users + ACLs + secret handling + security review) and Dispatcher + CDN configuration.
- **Responsibilities (by track).**
  - Security: repoinit scripts; `ServiceUserMapperImpl.amended` configs; secret externalization (`$[secret:NAME]` / `$[env:NAME]`); pre-deploy security review; ACL audit; `AccessDeniedException` / `LoginException` triage.
  - Dispatcher: Apache HTTPD + Dispatcher module configuration under `dispatcher/src/`; `cdn.yaml`; filter rules, vanity URLs, cache TTLs, header allowlists; Dispatcher SDK validation; 5xx incident response.
- **Inputs.** Service-user provisioning requests from `blockwright` or `bridgesmith`; change intent or incident packet for dispatcher work; current `dispatcher/src/` tree; branch diff for security review.
- **Outputs.** repoinit scripts under `ui.config/...`; `ServiceUserMapperImpl.amended.cfg.json`; security review report under `runs/{run-id}/implement/configsmith/security-review.md`; dispatcher configs under `dispatcher/src/`; CDN config (`cdn.yaml`) when applicable; validator log.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`. Skills: `repoinit`, `security-review`, `dispatcher` (+ sub-skills).
- **Decision authority.** Service-user naming; principal-based vs path-based ACL choice; `rep:glob` scoping; severity classification of security findings; filter rule order and scope; cache TTL strategy; vanity vs canonical URL; CDN rule placement.
- **Dependencies.** Receives service-user requests from `blockwright` and `bridgesmith`. Dispatcher / security incidents are no longer auto-escalated by `pilot` (post-deploy operations are out of ADLC scope); incident invocation is now human-driven in independent mode.
- **Validation criteria.** Zero high-severity security findings (or each accepted in `DECISIONS.md`); every service user has a `ServiceUserMapper` entry; all secrets externalized; no `loginAdministrative` in the diff; Dispatcher SDK validator passes; no deny-all default rule relaxed without documented reason; cache headers honor the AEMaaCS CDN baseline.
- **Full contract.** `.claude/agents/configsmith.md`.

### 4.5 Bridgesmith — Integrate stage (external boundaries)

- **Purpose.** Design and implement inbound and outbound integrations for AEMaaCS — REST, GraphQL, SOAP, webhooks, IDP, MarTech connectors, replication-event-driven flows.
- **Routing rule.** Activate only when the work item crosses a system boundary. Internal AEM logic routes to `blockwright` (services track) instead.
- **Responsibilities.** Pattern selection (Sling Servlet vs Scheduler vs Event Handler vs Sling Job); auth design (service users via repoinit, OAuth, mTLS); retry / timeout / circuit-breaker / idempotency policy; secret externalization; integration-design markdown.
- **Inputs.** Integration touchpoints from Strategist's `technical-specifications.md`; integration contract intent; optional external API spec (OpenAPI, WSDL, sample payloads).
- **Outputs.** `runs/{run-id}/integrate/bridgesmith/integration-design-{name}.md` per integration; Java classes under `core/.../servlets/`, `core/.../services/`, or `core/.../events/`; OSGi configs under `ui.config/.../config/<package>.{integration}.cfg.json`; service-user request packet handed off to `configsmith`.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`. Skills: `best-practices`, `content-distribution`, `repoinit` (indirect — request via `configsmith`).
- **Decision authority.** Integration pattern; auth scheme; retry / timeout / backoff topology; idempotency key strategy.
- **Dependencies.** `strategist` (integration map); coordinates with `configsmith` for credentials.
- **Validation criteria.** Auth approach defined and secrets externalized; retry + timeout + idempotency policy stated; no deprecated pattern; service-user request handed to `configsmith` when applicable.
- **Full contract.** `.claude/agents/bridgesmith.md`.

### 4.6 Composer — Integrate stage (content orchestration)

- **Purpose.** Orchestrate content — Content Fragment Models + persisted GraphQL queries + GraphQL endpoint configuration + Sling Models that surface CF data to components, AND sample-page authoring + DAM asset seeding that makes a deployed page actually render with content.
- **Responsibilities (by track).**
  - Headless: CF Model authoring (admin or JCR); CF instance seeding when requested; persisted GraphQL query authoring; GraphQL endpoint configuration; Sling Models that call the GraphQL client.
  - Content-seeding: sample-page authoring under `ui.content/.../content/<project>/<region>/...`; DAM asset fixture upload (or fixture manifest emission when external assets are required); smoke-render request to `pilot`.
- **Inputs.** Designforge's `content-fragment-models.md` (when headless); Designforge's `template-design.md` + `authoring-guidelines.md` (for content seeding); local fixtures folder or Figma asset export for DAM seeding.
- **Outputs.** CF Models under `ui.content/.../conf/[project]/settings/dam/cfm/models/{model}/`; persisted queries under `.../graphql/persistentQueries/`; GraphQL endpoint config; Sling Models that surface CF data; authored pages under `ui.content/.../content/<project>/...`; DAM fixtures under `ui.content/.../content/dam/<project>/...`; `runs/{run-id}/integrate/composer/dam-fixture-manifest.yaml` + `content-seeding-report.md`.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`. Skills: `create-content-fragment-graphql`.
- **Decision authority.** CF Model shape (fields, datatypes, references, cardinality); persistence (persisted query vs ad-hoc); GraphQL endpoint scoping; sample-page structure and component placement within Designforge's authoring guidelines; which assets are scaffolded locally vs flagged in the fixture manifest.
- **Dependencies.** `designforge` (CF Model spec + authoring guidelines); `blockwright` (components + templates that seeded pages reference); hands smoke-render request to `pilot`.
- **Validation criteria.** CF Model fields and Sling Model accessor names match exactly; persisted queries resolve; endpoint config present and scoped; every seeded page references a real template + components; every DAM asset reference either resolves or is tracked in the fixture manifest; seeded content respects the immutable/mutable split (`ui.content/`, never `ui.apps/`).
- **Full contract.** `.claude/agents/composer.md`.

### 4.7 Auditron — Test stage (code quality + build/test gate)

- **Purpose.** Implementation quality gate. Run a unified cross-file review across every file written in the run, aggregate upstream specialists' static checks, and own the single Build Validation Gate + unit + integration tests. **Playwright UI tests are NOT Auditron's — Sentinel owns them.**
- **Responsibilities (by track).**
  - Review: changed-file inventory across all upstream handoffs; run `Skill: review` at run level; aggregate upstream findings; cross-file consistency checks (HTL `data-sly-use` ↔ Sling Model, BEM ↔ SCSS, policy allowlist ↔ existing components, `cq:allowedTemplates` regex ↔ actual templates, dialog fields ↔ `@ValueMapValue`, no orphan files, Composer-seeded pages resolve); lightweight lint (eslint, tsc); dead-code + TODO scan. **Playwright spec lint is Sentinel's.**
  - Build Gate: single `mvn -q clean install -PautoInstallSinglePackage` — compiles, runs unit tests, packages, deploys to local AEM SDK. **mvn call #1 of 2.** Local URL + `build_hash` handed to Sentinel.
  - Tests: author + execute unit (wcm.io AEM Mocks / sling-mock) and integration (AEM Testing Clients, **mvn call #2 of 2**). Playwright UI tests are Sentinel's, not Auditron's.
- **Inputs.** All upstream handoff packets under `runs/{run-id}/handoffs/`; Designforge's `functional-test-cases.md`; `requirements.yaml` (back-reference for coverage); `.aem-skills-config.yaml`; `pom.xml`; project lint configs. `ui-test-scenarios.md` is passed through to Sentinel — Auditron does not consume it. **Auditron is the designated consumer of `functional-test-cases.md` and MUST attribute every `TC-###` ID** into `auditron_executed` / `deferred_to_sentinel` / `blocked`, by ID, in both `test-report.md` and its handoff. Leaving the set uncounted hands Sentinel an ambiguity it has previously resolved by zeroing the artifact.
- **Outputs.** `runs/{run-id}/test/auditron/code-quality-report.md`; `runs/{run-id}/test/auditron/changed_files.txt`; new unit + integration test classes under `core/src/test/` + `it.tests/src/main/`; `runs/{run-id}/test/auditron/test-report.md`; **`runs/{run-id}/test/auditron/coverage.md` — the functional-TC attribution ledger (one row per `TC-*` ID + bucket + evidence), ALWAYS emitted in orchestrated mode, independent of whether unit tests were authored.** Playwright specs are Sentinel's output.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Skill`. Skills: `review`.
- **Decision authority.** Severity classification of cross-file findings; refactor recommendations; TODO-blocking decisions; test scope per change set; flake tolerance; quarantine policy.
- **Dependencies.** All code-producing specialists (`blockwright`, `configsmith`, `bridgesmith`, `composer`) must have emitted their handoff packets first.
- **Validation criteria.** Zero severity ≥ `high` findings (or each accepted in `DECISIONS.md`); all cross-file consistency checks pass; `BUILD SUCCESS`; zero unit / integration test failures; coverage threshold met (**a code-coverage metric that discharges no functional test case**); **the functional-TC attribution gate passes — `total == total_from_file` and `auditron_executed + deferred_to_sentinel + blocked == total`, emitted whether or not unit tests were authored**; Auditron owns every case not marked `executor: sentinel` (silence in the design doc means Auditron-owned, never unowned); **at most 2 `mvn` calls during the entire run** (§8.1.1). Playwright pass/fail is validated by Sentinel, not Auditron.
- **Full contract.** `.claude/agents/auditron.md`.

### 4.8 Sentinel — Test stage (NFR enforcement) — **LAST stage of the ADLC flow**

- **Purpose.** Enforce non-functional standards against the **real AEMaaCS environment** — performance, accessibility critical violations, SEO hygiene, observability baseline — plus authoring-provision correctness, and, on headless / hybrid runs, GraphQL content parity (the endpoint delivers the source images + CF content the upstream agents produced) and SPA-integration render verification. **Requires TWO tier URLs: Author and Publish.** Authoring-provisions run against **Author** (the only tier with an authoring UI); UI tests, GraphQL content-parity, SPA-integration, and every NFR track run against **Publish** (the only tier that exercises the CDN + Dispatcher). Neither URL is derived from the other; a missing tier yields `blocked_missing_url`, never `not_applicable`. **Executes** the Playwright specs Blockwright authored pre-deploy — it does not create or migrate the harness. **Position: LAST.** Sentinel runs after Auditron passes, after Pilot raises the release PR, and after the human Lead manually merges + deploys to the real environment — against the real env URL the human supplies at the resume checkpoint. Its consolidated report is the terminal acceptance verdict; no agent stage runs after it.
- **Responsibilities (by track).**
  - Performance: Lighthouse against deployed URLs; LCP / INP / CLS / TTFB; site clientlib bundle weight regression; responsive image delivery (AVIF/WebP); render-blocking script flagging.
  - SEO: `<title>`, `<meta description>`, canonical, OpenGraph core tags, Twitter Card (when in scope), JSON-LD parseability, `robots.txt`, sitemap.
  - A11y-critical: cross-page axe sweep filtering for `critical` + `serious` impact (the in-spec `@axe-core/playwright` covers the per-component rule set).
  - Observability: Adobe Launch / Analytics tag presence, `_satellite.track` references, Cloud Manager app analytics hooks (when in scope per `requirements.yaml`).
  - GraphQL content-parity (headless / hybrid only): first enforce **query isolation** — only this run's own persisted queries produce the verdict, one per source, by-path + reference-traversal scoped, no unfiltered list on a shared model, every delivered `_path` inside this run's content root, responses diffed per query and never pooled; a prior-run query may be executed as a clearly-labelled **non-contributing regression check**. Then execute each query against the deployed endpoint and diff the response against the source Content Fragments + seeded DAM assets and the run input (never against a doc authored by the agent under test) — every source field present, non-null, and **value-exact** (character-level scalars + matching array cardinality, diffed mechanically over the full response; a qualitative similarity judgement is never a verdict), every source image reference delivered as a resolvable `ImageRef`/`DocumentRef` (SVG → `DocumentRef`), delivered `_path` matching the authored `fileReference`, and — whenever `design/reference-assets.md` declares a reference — supplied reference URLs fetched + extracted and delivered content/images diffed per item against them. Missing / broken / mismatched content is blocking and routed to Composer (content / query shape / seeded DAM), Blockwright (Sling-Model / consumer mapping), or Bridgesmith / Configsmith (endpoint / dispatcher / CDN delivery). Skips cleanly on server-rendered-only runs.
  - Authoring provisions (whenever the run created or changed an authoring surface): model→editor field parity, multi-value authorability (a true schema list, not just a `multiple` widget flag), required-field enforcement, **data-setup integrity verified by reading the stored node back** (per-element values + array lengths; separator-escaping in serialized multi-value properties), reference integrity, redeploy-update semantics (a correction actually reaches the instance), edit round-trip, and publish/activation state. Sourced from Designforge's `authoring-test-cases.md`. This closes the "delivered content is right but nobody can author it, or it is silently corrupt at the storage layer" gap.
  - Test-coverage completeness: execute **100%** of Designforge's `ui-test-scenarios.md` + `authoring-test-cases.md` (and the Sentinel-owned share of `functional-test-cases.md`), and emit `test/sentinel/coverage-matrix.md` with per-ID evidence and `executed == total`. **`total` is established by a mechanical ID census of each artifact (`total_from_file`), never by a declared or inherited number — `total != total_from_file` is a gate failure, and `total: 0` against a non-empty artifact is the canonical instance of it.** Reviewing scenarios is not executing them; a blanket track-level `not_applicable` is a gate failure, and an undeployed-but-runnable consumer is served locally and tested (labelled `localhost-not-publish`) rather than skipped.
- **Inputs.** The **real environment URL(s) + auth mode** supplied by the human at the resume checkpoint (recorded in `DECISIONS.md` — NOT from `pilot`, NOT a local SDK URL); NFRs from `requirements.yaml`; Auditron's changed-file inventory + Designforge's `ui-test-scenarios.md` (for spec authoring) + `authoring-test-cases.md` (authoring track) + `functional-test-cases.md` (coverage attribution) + `reference-assets.md` (a non-empty manifest makes reference-parity + Visual mandatory); on headless/hybrid runs, `handoffs/composer.yaml → headless.persisted_queries` **for this run-id** (the isolated query set — prior-run queries are regression-only); optional prior baseline measurements.
- **Outputs.** ONE consolidated report: `runs/{run-id}/test/sentinel/sentinel-report.md` + `sentinel-report.html` — one section per track (UI, Performance, Best Practices, A11y, SEO, Observability, Visual, and the Visual Iteration Loop when it ran). **Does NOT emit per-track report files** (`performance-report.md`, `seo-report.md`, `a11y-report.md`, `observability-report.md`, `reference-diff-report.md` are legacy Cypress-era artifacts — folded into the consolidated report's sections). Plus two required evidence artifacts: `coverage-matrix.md` (per-ID execution record across all Design-stage test artifacts, with `executed == total`) and `reference-extract-<slug>.md` (the concrete extraction from each reference URL, making reference parity auditable and re-runnable). Machine artifacts for drill-down only: `lighthouse-{slug}.json`, `axe-{slug}.json`, `graphql-<query-name>.json`, `screenshots/`, `visual-iteration-log.md` (working log for the loop), and `ui.tests/test-module/results/results.xml` (JUnit).
- **Tools / skills.** `Read`, `Write`, `Bash`, `WebFetch`. No skills; uses `lighthouse`, `@axe-core/cli`, and `WebFetch` directly.
- **Decision authority.** Whether a regression is blocking vs documented-and-accepted; bundle weight baseline updates (after human approval); severity classification of SEO / a11y findings; observability scope per run.
- **Dependencies.** `pilot` (raised the PR, upstream) + human Lead (manual merge + deploy to the real env) + human resume block (provides the real env URL + auth). Sentinel is the **LAST stage** — no downstream agent.
- **Validation criteria.** LCP / INP / CLS / TTFB within NFR targets; bundle weight regression ≤ 10%; no raw DAM originals on mobile; SEO required tags present and within bounds; zero `critical` a11y findings; observability hooks present when in scope; **on headless / hybrid runs, GraphQL content parity holds** — every persisted query resolves (200, no `errors[]`), every source field is delivered non-null, every source image resolves as a matching `ImageRef`/`DocumentRef` with a live DAM binary, and any reference-image mismatch is zero-critical (or accepted in `DECISIONS.md`).
- **Full contract.** `.claude/agents/sentinel.md`.

### 4.9 Pilot — Release stage (raise PR → pause; optional RDE)

- **Purpose.** Raise the release **Pull Request** from the run's feature branch to the repository's default branch (`master`) in the **current codebase** (this GitHub repo), then **suspend the ADLC flow** so a human Lead can manually merge, sync to Adobe Git, and deploy to the real environment. Retains an optional RDE sandbox deploy on explicit request.
- **Position.** After Auditron, **before Sentinel.** Pilot is **no longer the last stage** — Sentinel is. The ADLC flow's active phase ends at Pilot's PR; it then pauses for the Lead and resumes into Sentinel.
- **Responsibilities.**
  - Verify Auditron passed (3-signal build success) — the only precondition for raising the PR. **Raising the PR does not require a separate human approval** (the Lead's PR review is the approval).
  - Confirm the working tree is clean and `HEAD` is the feature branch (not `master`); push the branch to `origin`.
  - Open the PR (`gh pr create --base master --head <feature-branch>`) with a reviewer-facing body (run summary, Auditron evidence, an explicit "not yet NFR-validated" note, and the post-merge Lead checklist). **If `gh` is unavailable, Pilot still creates the PR itself** via `POST /repos/{owner}/{repo}/pulls` using a `repo`-scoped token (env var or Git Credential Manager) — see `pilot.md` §4b. A printed compare URL is the last resort only when both automated paths are unavailable, and the reason must be recorded.
  - Resolve `owner/repo` canonically from the API, not from the `origin` URL — a renamed/transferred repo leaves `origin` stale, so pushes succeed while un-redirected API calls return `301`.
  - Return `status: awaiting_lead_approval` and suspend — never merge, deploy, wait, or poll.
  - **Optional:** RDE snapshot / install / smoke / rollback (`aem-rde`, BETA) as a separate sandbox target on explicit request — decoupled from the main flow.
- **Inputs.** `handoffs/auditron.yaml` (`status: pass`); the run's feature branch + clean working tree; the default branch + `origin` remote. (Optional RDE track: built `all/target/*.zip`, RDE `.aio` config, Composer's smoke-render URLs.)
- **Outputs.** `runs/{run-id}/deploy/pr-request.md` + `pr-body.md` — PR URL/number, branch, base, build hash, run summary, Lead checklist. This is the terminal artifact of the flow's **active** phase (the run suspends after it). `deploy-rde.md` only when the optional RDE track ran.
- **Tools / skills.** `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `PowerShell`, `Skill`. `git` + `gh` for the PR, or `git` + `curl` against the GitHub REST API when `gh` is absent; skill `aem-rde` (BETA) only for the optional RDE track. **Run `git` / `gh` / `curl` via the Bash tool** — on Windows they are often absent from the PowerShell PATH but present in Git Bash.
- **Decision authority.** PR title + body; whether the working tree is clean enough to open a PR; refusing to open a PR against a red build or from the default branch; RDE snapshot/rollback within the snapshot envelope (optional track).
- **Decisions escalated / out of scope.** Merging the PR; pushing to Adobe Git; deploying to the real environment; Cloud Manager Dev / Stage / Prod pipeline triggers; rollback beyond RDE; any post-deployment incident; postmortem authoring; local install (Auditron's). Requests in these categories return `status: out_of_scope`.
- **Dependencies.** `auditron` (upstream — its PASS is the sole precondition). Downstream (after the manual, out-of-flow Lead deploy): the human resume checkpoint → `sentinel`.
- **Validation criteria.** Auditron `status: pass`; PR opened from the feature branch against `master` via `gh` or the REST API (compare URL only when both are unavailable, with `pr_tool_fallback_reason` recorded); `status: awaiting_lead_approval` returned; flow suspended without merge/deploy. (Optional RDE track: `installed: true`, clean 60s tail, smoke 200, snapshot recorded.)
- **Full contract.** `.claude/agents/pilot.md`.

> **Ownership gap notice.** The **real deployment is out of ADLC scope** — the human Lead manually merges the PR, syncs to Adobe Git, and deploys via Cloud Manager. Not owned by any specialist: Cloud Manager Dev / Stage / Prod pipeline triggering, Stage / Prod human-approval enforcement, post-deploy incident triage (workflow / replication / dispatcher / perf / auth), `docs/postmortems/` authoring, cross-environment rollback coordination, and recurring-incident escalation. The underlying skills (`dispatcher` incident-response, `aem-workflow` debugging/triaging, `content-distribution` replication/sling-distribution) still exist under `.claude/skills/` and can be invoked directly. Local install is owned by `auditron` as a Build Validation Gate side-effect; the optional RDE sandbox is Pilot's `aem-rde` track.

---

## 5. Orchestration Model

### 5.1 Stage graph — compact vertical view (current flow)

Two diagrams describe the same current ADLC flow at different levels of detail: §5.1 (vertical, stage-boxed, compact — good for briefings) and §5.1.a (swimlane, per-specialist columns, artifact arrows — good for orchestration). Both reflect **current** agent capabilities; both are authoritative.

Every specialist listed in §4 appears in both diagrams. Gate boundaries (dialog-spec confirmation, Build Gate, NFR gate, Human Approval) appear in both. If a specialist's capabilities in §4.x drift, both diagrams must be updated in lockstep.

```
                    ┌──────────────────────────┐
                    │  Program Agent (intake)  │
                    └────────────┬─────────────┘
                                 ▼
   ═══════════════════════════ PLAN ══════════════════════════════════
                    ┌──────────────────────────┐
                    │       strategist         │   ◀── human checkpoint
                    │  (requirements +         │       (architecture review)
                    │   solution architecture) │
                    └────────────┬─────────────┘
                                 ▼
   ══════════════════════════ DESIGN ═════════════════════════════════
                    ┌──────────────────────────┐
                    │       designforge        │   ◀── gate: dialog spec confirmed,
                    │  (design pack + test     │       least-privilege policies,
                    │   scenarios + UI-test    │       every requirement has a test case,
                    │   scenarios — NO code)   │       UI-test scenarios for visual journeys
                    └────┬─────────┬────┬──────┘
   ═════════════════ IMPLEMENT + INTEGRATE ══════════════════════════
      ┌──────────────┘         │    └──────────────┬───────────────┐
      ▼                        ▼                   ▼               ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  blockwright │   │  configsmith │   │  bridgesmith │   │   composer   │
│              │   │              │   │              │   │              │
│  components  │   │  service     │   │  external    │   │  CF models   │
│  + editable  │   │  users, ACLs │   │  integrations│   │  + persisted │
│  templates + │   │  via repoinit│   │  (REST /     │   │  GraphQL     │
│  policies +  │   │  + ServUsrMap│   │  GraphQL /   │   │  queries +   │
│  OSGi svcs + │   │  + secrets   │   │  SOAP /      │   │  GraphQL     │
│  schedulers +│   │  externaliz. │   │  webhooks /  │   │  endpoint    │
│  event       │   │  + security  │   │  IDP /       │   │  config +    │
│  handlers +  │   │  review +    │   │  MarTech /   │   │  Sling Models│
│  workflows + │   │  dispatcher  │   │  replication │   │  for CF data │
│  migrations +│   │  + CDN       │   │  events)     │   │  + sample    │
│  ui.frontend │   │              │   │              │   │  page auth + │
│  SCSS        │   │              │   │              │   │  DAM seeding │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       └──────────────┬───┴──────────┬───────┴───────────┬──────┘
                      ▼              ▼                   ▼
   ═══════════════════════ TEST (pre-release) ═══════════════════════
                    ┌──────────────────────────┐
                    │        auditron          │   ◀── gate: zero high findings,
                    │  (code-quality review +  │       cross-file consistency green,
                    │   Build Gate + unit +    │       BUILD SUCCESS, ≤2 mvn calls.
                    │   integration tests)     │       Playwright is NOT here — Sentinel
                    │                          │       owns it.
                    │  mvn -PautoInstall       │       Auditron's mvn -PautoInstall
                    │  → local SDK deployed    │       installs to localhost:4502 for
                    │  (build validation only) │       BUILD VALIDATION ONLY — Sentinel
                    │                          │       no longer measures it. Hands
                    │                          │       changed_files.txt to sentinel.
                    └────────────┬─────────────┘
                                 ▼
   ═════════════════════════ RELEASE ════════════════════════════════
                    ┌──────────────────────────┐
                    │         pilot            │   ◀── auto-runs once Auditron is green
                    │  (raise PR: feature      │       (no human approval needed to open
                    │   branch → master, in    │       the PR). Pushes branch + gh pr
                    │   the CURRENT repo)       │       create → default branch. Optional
                    │                          │       RDE sandbox on request. NOT the
                    │                          │       last stage; does NOT deploy to real.
                    └────────────┬─────────────┘
                                 ▼
                          pr-request.md  (PR opened)
                                 ▼
   ═══════════ ADLC FLOW PAUSES — awaiting Lead (manual) ═════════════
     Lead (human, OUTSIDE the agent flow): review PR → merge →
     sync to Adobe Git → deploy to the REAL environment (Cloud Manager).
   ═══════════════════════════════════════════════════════════════════
                                 ▼
   ═════ RESUME — Real-environment validation approval (human) ═══════
                    ┌──────────────────────────┐
                    │  Lead approval + REAL     │   ◀── recorded in DECISIONS.md.
                    │  env URL + auth mode      │       Program Agent asks for, and the
                    │  (none/bearer/creds)      │       human supplies, the real env URL +
                    │                          │       auth. Only then is Sentinel
                    │                          │       dispatched. Never auto-resume;
                    │                          │       never fabricate a URL.
                    └────────────┬─────────────┘
                                 ▼
   ═══════════════ TEST (post-deploy) — LAST STAGE ══════════════════
                    ┌──────────────────────────┐
                    │        sentinel          │   ◀── gate: every NFR track PASS
                    │  (Playwright UI +        │       against the REAL env URL +
                    │   Performance + SEO +    │       Visual Verification Tier A.
                    │   A11y + Observability + │       Authors specs from designforge's
                    │   GraphQL content-parity │       ui-test-scenarios.md. On headless
                    │   [headless/hybrid] +    │       runs, diffs GraphQL endpoint
                    │   Visual Verification)   │       delivery vs source CF + DAM images.
                    └────────────┬─────────────┘       Terminal acceptance verdict.
                                 ▼
                    ┌──────────────────────────┐
                    │  Visual Iteration Loop   │   ◀── stage 06.5 — sentinel-owned. Runs
                    │  (sentinel-owned;        │       iff Tier A reports critical gaps vs
                    │  active only when Tier A │       the reference AND no accepted
                    │  found critical gaps)    │       deviation. On the real-env flow,
                    │                          │       remediation re-enters via a NEW PR
                    │                          │       cycle (fix → auditron → PR → Lead
                    │                          │       re-deploy → sentinel); cap = 5.
                    └────────────┬─────────────┘
                                 ▼
                         sentinel-report (PASS)
   ═════════════════ END OF ADLC AGENT FLOW ══════════════════════════
   The REAL deploy (merge → Adobe Git → Cloud Manager) and post-deploy
   operations (incident triage, rollback, postmortems) are handled
   OUTSIDE the ADLC agent set — by the human Lead / an external
   pipeline / SRE process. AEM Forms / Adaptive Forms are NOT
   currently supported by any specialist (see §4 gap notice).
```

### 5.1.a Stage graph — current authoritative flow (swimlane)

The ADLC agent flow is a swimlane-style pipeline where each specialist owns one column and produces artifacts consumed by the next. **Pilot runs before Sentinel now:** after Auditron passes, Pilot raises the release PR and the flow **pauses** for the Lead's manual merge + real-environment deploy; then, on resume with the real env URL, **Sentinel runs last** against that real environment. Pilot no longer deploys and is no longer the last stage.

```
strategist   designforge   blockwright   configsmith   bridgesmith   composer     auditron       pilot          sentinel
    │             │              │              │             │            │            │              │              │
requirements +    │              │              │             │            │            │              │              │
solution arch     │              │              │             │            │            │              │              │
    │             │              │              │             │            │            │              │              │
    └────────────►│              │              │             │            │            │              │              │
                  │              │              │             │            │            │              │              │
              design pack        │              │             │            │            │              │              │
              (component +       │              │             │            │            │              │              │
               dialog specs,     │              │             │            │            │              │              │
               template design,  │              │             │            │            │              │              │
               test cases,       │              │             │            │            │              │              │
               UI-test scenarios)│              │             │            │            │              │              │
                  │              │              │             │            │            │              │              │
                  ├─────────────►│              │             │            │            │              │              │
                  ├────────────────────────────►│             │            │            │              │              │
                  ├──────────────────────────────────────────►│            │            │              │              │
                  ├──────────────────────────────────────────────────────► │            │              │              │
                                 │              │             │            │            │              │              │
                              components +  service      external       CF models +     │              │              │
                          editable          users, ACLs, integrations   persisted       │              │              │
                          templates +       repoinit,    (REST,         GraphQL         │              │              │
                          policies +        ServUsrMap,  GraphQL,       queries +       │              │              │
                          OSGi services +   secrets      SOAP,          GraphQL         │              │              │
                          schedulers +      external.,   webhooks,      endpoint        │              │              │
                          event handlers +  security     IDP,           config +        │              │              │
                          workflows +       review +     MarTech,       Sling Models    │              │              │
                          migrations +      dispatcher   replication    for CF data +   │              │              │
                          ui.frontend       + CDN        events)        sample page     │              │              │
                          SCSS                                          authoring +     │              │              │
                                                                        DAM seeding     │              │              │
                                 │              │             │            │           │              │              │
                                 └──────────────┴─────────────┴────────────┴──────────► │              │              │
                                                                                        │              │              │
                                                                                 ┌──────┴──────┐       │              │
                                                                                 │ code review │       │              │
                                                                                 │  + Build    │       │              │
                                                                                 │    Gate     │       │              │
                                                                                 │  + unit     │       │              │
                                                                                 │  + integr'n │       │              │
                                                                                 │             │       │              │
                                                                                 │ (Playwright │       │              │
                                                                                 │  is         │       │              │
                                                                                 │  Sentinel's)│       │              │
                                                                                 │             │       │              │
                                                                                 │ mvn #1: -P- │       │              │
                                                                                 │ autoInstall │       │              │
                                                                                 │ Single Pkg  │       │              │
                                                                                 │ (local SDK  │       │              │
                                                                                 │  deployed   │       │              │
                                                                                 │  as side-   │       │              │
                                                                                 │  effect)    │       │              │
                                                                                 └──────┬──────┘       │              │
                                                                                        │              │              │
                                                                                (code green,           │              │
                                                                                 changed_files.txt,    │              │
                                                                                 build_hash;           │              │
                                                                                 local install =       │              │
                                                                                 build-validation only)│              │
                                                                                        │              │              │
                                                                                        │  handoff to  │              │
                                                                                        │  pilot       │              │
                                                                                        └─────────────►│              │
                                                                                                       │              │
                                                                                                ┌──────┴──────┐       │
                                                                                                │ raise PR    │       │
                                                                                                │ push branch │       │
                                                                                                │ gh pr create│       │
                                                                                                │ feature →   │       │
                                                                                                │   master    │       │
                                                                                                │ (auto after │       │
                                                                                                │  Auditron)  │       │
                                                                                                └──────┬──────┘       │
                                                                                                       │              │
                                                                                                 pr-request.md        │
                                                                                                 (status:             │
                                                                                                  awaiting_lead_      │
                                                                                                  approval)           │
                                                                                                       │              │
                              ═════════════════════════════════════════════════════════════════════════▼═══════════════════════════════════
                                    ADLC FLOW PAUSES — Lead (human, OUTSIDE the flow): review PR → merge → sync to Adobe Git →
                                    deploy to the REAL environment (Cloud Manager). Then RESUME with a "real-environment validation
                                    approval" block in DECISIONS.md: Lead approval + REAL env URL + auth mode (none/bearer/creds).
                              ═════════════════════════════════════════════════════════════════════════┬═══════════════════════════════════
                                                                                                       │              │
                                                                                                       │  dispatch    │
                                                                                                       │  sentinel    │
                                                                                                       │ (real env    │
                                                                                                       │  URL + auth) │
                                                                                                       └─────────────►│
                                                                                                                      │
                                                                                                               ┌──────┴──────┐
                                                                                                               │ NFR tracks  │
                                                                                                               │ (LAST STAGE)│
                                                                                                               │  Playwright │
                                                                                                               │  Perf / SEO │
                                                                                                               │  A11y crit  │
                                                                                                               │  Observ.    │
                                                                                                               │  GraphQL    │
                                                                                                               │  parity     │
                                                                                                               │  Visual     │
                                                                                                               │ vs REAL env │
                                                                                                               └──────┬──────┘
                                                                                                                      │
                                                                                                                (NFR gate:
                                                                                                                 ALL tracks
                                                                                                                 PASS)
                                                                                                                      │
                                                                                                                      ▼
                                                                                                             sentinel-report
                                                                                                            ═══════════════════
                                                                                                            END OF ADLC FLOW
                                                                                                    (real deploy = Lead's manual,
                                                                                                     out-of-flow step)
```

Legend:
- `│` vertical bar = a specialist's swimlane.
- `─►` horizontal arrow = handoff from one specialist to the next.
- `═══` heavy horizontal bar = the synchronous PAUSE gate. After Pilot raises the PR the flow suspends; it resumes into Sentinel only when the human records the "real-environment validation approval" block (Lead approval + real env URL + auth).
- Auditron's `mvn -PautoInstallSinglePackage` installs to the local AEM SDK as a **build-validation side-effect only** — Sentinel no longer measures the local SDK; it measures the **real environment** the Lead deploys to.
- The real deploy (merge → Adobe Git → Cloud Manager) is the Lead's manual, out-of-ADLC step and is **not depicted** as an agent action. Pilot's optional RDE sandbox is likewise not on the main flow.

### 5.1.b Capability coverage — what each specialist actually does today

Both diagrams above are compact by design. Full capability lists per specialist are below — use this table to verify neither diagram silently loses a capability during future edits. Every row here MUST appear (at least by reference) in both §5.1 and §5.1.a.

| Specialist | Currently supported capabilities | Full contract |
|---|---|---|
| `strategist` | Requirements canonicalization (`requirements.yaml`), solution architecture, work-breakdown authoring, NFR risk flagging, `best-practices` validation of proposals, domain classification (Sites / Headless / Forms* / Integration / Migration / Ops — *Forms is a classifier only, no downstream Forms specialist exists). Triggers `init` + `ensure-agents-md` when missing. | §4.1 |
| `designforge` | Component specs, dialog specs, template design, policy mapping, authoring guidelines, functional test cases, UI-test scenarios, CF Model design (when headless). **Markdown only — no code artifacts.** | §4.2 |
| `blockwright` | Components (HTL + dialog + Sling Model + unit test + ui.frontend SCSS partial), editable templates + policies (`cq:allowedTemplates`, allowed-components lists), OSGi services, schedulers, OSGi event handlers, workflow models + process steps + launchers, legacy → Cloud-Service migrations (one BPA pattern per session), Style System variants (S5/S6 reuse triage), Core Teaser default for teaser-pattern components, **the `ui.tests` Playwright harness (use-as-is / migrate-from-Cypress / scaffold) + one spec per Designforge scenario ID, authored PRE-DEPLOY and validated via `playwright test --list` — execution belongs to `sentinel`**. | §4.3 |
| `configsmith` | Service users + system users + groups, ACLs (path-based + principal-based), `repoinit` scripts, `ServiceUserMapperImpl.amended.cfg.json`, secret externalization (`$[secret:…]` / `$[env:…]`), pre-deploy `security-review`, Dispatcher configuration (`dispatcher/src/`), CDN configuration (`cdn.yaml`, vanity URLs, filter rules, cache TTLs, header allowlists), Dispatcher SDK validation. | §4.4 |
| `bridgesmith` | Inbound + outbound external integrations — REST, GraphQL, SOAP, webhooks, IDP / SSO, MarTech connectors, replication-event-driven flows. Picks pattern (Sling Servlet, scheduled job, OSGi Event Handler, async worker), specifies auth (service users via repoinit → configsmith, OAuth, mTLS), defines retry / timeout / circuit-breaker policies. Boundary rule: activates only when work crosses a system boundary. | §4.5 |
| `composer` | Content Fragment Models, persisted GraphQL queries, GraphQL endpoint configuration, Sling Models that surface CF data to components, sample-page authoring under `ui.content/`, DAM asset seeding (or fixture-manifest emission for external assets), smoke-render URL list for Pilot. | §4.6 |
| `auditron` | Code-quality review across all specialists' output (Java, HTL, dialog XML, SCSS/TS, dispatcher rules, OSGi configs), cross-file consistency checks, Build Validation Gate (mvn #1: `mvn -q clean install -PautoInstallSinglePackage` → local SDK install as side-effect), unit tests, integration tests via AEM Testing Clients (mvn #2), changed-file inventory for Sentinel, coverage enforcement (JaCoCo). **Owns the 2-mvn budget.** **Does NOT run Playwright UI tests** — that's Sentinel. | §4.7 |
| `sentinel` | **Executes** Playwright UI tests (mandatory per dispatch; cross-browser Chromium/Firefox/WebKit + mobile; holistic per-spec coverage — render, content-mapping, Style-System classes, computed style, a11y, visual) — harness + specs come from Blockwright pre-deploy; **dual-tier targeting** (authoring-provisions → Author; everything else → Publish); **authoring-provisions** track; **SPA-integration** render verification against the publish host; one **Lighthouse NFR baseline** covering all four categories (Performance LCP/CLS/TTFB/bundle, Accessibility, **Best Practices**, SEO), deep a11y via axe (`@axe-core/playwright` + CLI — authoritative, + one-`<h1>` gate), deep SEO via WebFetch (OG / JSON-LD / `robots.txt` / `sitemap.xml`), Observability (Adobe Launch / `_satellite.track`). Bootstraps the Playwright `ui.tests` harness (scaffold-if-missing / migrate-if-Cypress). Emits ONE consolidated report. **Runs LAST — after Pilot's PR and the Lead's manual real-environment deploy — against the REAL environment URL + auth the human supplies at the resume checkpoint (NOT a local SDK URL).** Adapts pre-probe / Playwright login / WebFetch to the auth mode (none / bearer-token / credentials). Authors new Playwright specs from Designforge's `ui-test-scenarios.md`. **Headless / hybrid runs add a GraphQL content-parity track** — executes each persisted query against the deployed endpoint and diffs the delivered fields + image references against the source Content Fragments + seeded DAM assets (and the intake reference image when present); missing / broken / mismatched content is blocking and re-routed to Composer / Blockwright / Bridgesmith / Configsmith. | §4.8 |
| `pilot` | **Raises the release PR** (`git push` + `gh pr create`, feature branch → default branch `master`) in the current GitHub repo after Auditron passes, writes the PR body + `pr-request.md`, then returns `awaiting_lead_approval` and **suspends the flow**. Retains an **optional** RDE sandbox track (`aem-rde`: snapshot / install / 60s tail / smoke / rollback) on explicit request. **NOT the last stage** (Sentinel is). Does NOT merge, deploy to the real env, or push to Adobe Git — those are the Lead's manual steps. | §4.9 |

**Not currently supported by any ADLC specialist (gaps):**

- AEM Forms / Adaptive Forms — Strategist can classify a requirement as `domain: forms`, but no downstream specialist scaffolds AF components, AF templates, Form Data Models, submit actions, or AF UI-test scenarios. Route Forms work to human.
- Cloud Manager Dev / Stage / Prod pipeline triggering + human-approval enforcement — external process.
- Post-deploy operations — incident triage, rollback beyond RDE, workflow debugging in production, replication queue triage, dispatcher 5xx incident response, `docs/postmortems/` authoring, recurring-incident escalation. The underlying skills (`dispatcher` incident-response, `aem-workflow` workflow-debugging / workflow-triaging, `content-distribution` replication / sling-distribution) still exist under `.claude/skills/` and are invocable directly.
- Local install by Pilot — moved to Auditron; Pilot returns `status: out_of_scope` on Local requests.

Any capability listed in the "Currently supported" column above but missing from §5.1 or §5.1.a is a diagram bug. Any capability shown in either diagram but not in the "Currently supported" column above is likewise a bug.

### 5.2 Parallelism rules

- **Designforge runs as a single serial stage between Strategist and the implementation fan-out.** It cannot be parallelized with downstream creation specialists — those depend on its design pack as their authoritative input. The dialog-spec confirmation gate inside Designforge is the project-wide commit point for component contracts.
- **The four creation specialists run in parallel where possible** — `blockwright`, `configsmith`, `bridgesmith`, `composer` typically fan out from Designforge. Sequencing applies when one renders another's output (e.g., a `blockwright` component renders Composer's CF data → Blockwright waits for Composer's CF Model handoff).
- **Auditron runs serially after all code-producing stages and before the release PR.** It needs the complete changed-file inventory from every upstream handoff to perform cross-file consistency checks. It does the review track first (no `mvn`), then the Build Validation Gate (mvn #1), then tests (integration uses mvn #2). The 2-mvn-per-run budget (§8.1.1) lives here.
- **Pilot runs AFTER Auditron and BEFORE Sentinel.** Once Auditron passes, Pilot raises the release PR (feature branch → default branch `master`) **automatically — no human approval needed to open the PR** — and the flow suspends. Pilot no longer deploys in the main flow (RDE is an optional side-path).
- **The flow PAUSES after the PR.** The Program Agent suspends the run while the human Lead manually reviews/merges the PR, syncs to Adobe Git, and deploys to the real environment (Cloud Manager). It resumes only when the human records the "real-environment validation approval" block (Lead approval + real env URL + auth). Never auto-resume; never fabricate a URL.
- **Sentinel runs LAST**, on resume, against the **real environment URL** the human supplies (NOT a local SDK URL). This inverts the previous ordering (which had Sentinel measure a local URL, then Pilot deploy). Sentinel's consolidated report is the terminal acceptance verdict — no agent stage runs after it. Sentinel remediation re-enters via a **new PR cycle** (fix → Auditron → PR → Lead re-deploy → Sentinel).
- **Local install is Auditron's build-validation side-effect only.** `mvn -PautoInstallSinglePackage` installs on `http://localhost:4502` to validate the build; **Sentinel no longer measures the local SDK** — it measures the real environment. The real deploy and any post-deploy operations are the Lead's / an external process's, out of ADLC scope.

### 5.3 Iteration loops

- A failed gate **never** advances. The Program Agent re-dispatches the failing specialist with the gate evaluator's notes in its input packet.
- Re-dispatch is bounded — after 3 failed iterations on the same stage, the Program Agent escalates to human.
- **A `sentinel` (LAST-stage) failure does NOT auto-re-dispatch.** Because remediation now re-enters a full new PR cycle (fix → Auditron → PR → Lead re-deploy → Sentinel) and costs another manual Lead deploy, the Program Agent first stops at the **Sentinel remediation approval** human checkpoint (`aem-program-agent.md § P10`): it surfaces the findings + proposed routing and waits. **Confirm** → run the remediation cycle (the 3-iteration cap still applies within it; the Visual Iteration Loop cap is 5). **Decline** → record the failures as accepted/known gaps in `DECISIONS.md` and proceed to final run reports — no specialist is re-invoked. This human-approval-before-fix rule is specific to Sentinel; upstream gate failures keep the standard auto-re-dispatch behavior above.
- **`pilot` and `sentinel` are non-deferrable** (`aem-program-agent.md § P11`). Neither may be skipped, marked out of scope, or dropped because no environment is available: Pilot's only precondition is Auditron's PASS (a PR needs a git remote, not a deployed instance), and Sentinel is at most *pending* via the § P9 pause. A run whose last executed stage is Auditron is **PAUSED, not COMPLETE** — Auditron's build gate is never the terminal acceptance verdict.
- **On remediation confirm, the loop runs to a re-verification — not to the fixing specialist's own claim of success.** One `remediation approval` covers the whole cycle up to the iteration cap: route → fix → Auditron → (re-deploy if the fix must reach the real env) → **re-dispatch Sentinel and re-verify the same finding, plus the full manifest for regressions**. A cycle that ends on the fixer's self-report is not closed.
- A scope change mid-cycle re-enters at `strategist`, not at the current stage; existing artifacts are preserved and changes are applied incrementally.

---

## 6. Specialist Operating Modes

Every specialist operates in one of two modes, governed by the same skill contract.

### 6.1 Independent mode

- **Trigger.** A human invokes the specialist directly with a self-contained task (e.g., "build a hero from this Figma URL" dispatches `blockwright`).
- **Input source.** The human prompt + any explicit references the human attaches.
- **Output destination.** The repository directly, plus a handoff packet written next to the artifacts (e.g., `.claude/agents/handoffs/blockwright-{timestamp}.yaml`).
- **Skill loading.** The specialist loads only the skill(s) it needs, on demand, per the skill's own gate-check rules.
- **Gates.** Internal validation gates fire (e.g., dialog spec confirmation inside the `create-component` skill — by the specialist itself when there's no upstream Designforge handoff). External program-level gates **do not** fire — there is no Program Agent in this mode.
- **Permissions.** Same as orchestrated-mode permissions. Independent mode does *not* grant broader authority.

### 6.2 Orchestrated mode

- **Trigger.** The Program Agent dispatches the specialist with a structured input packet.
- **Input source.** The previous stage's handoff packet + the Strategist work breakdown + any specific instructions in the Program Agent's dispatch payload.
- **Output destination.** Repository (artifacts) + the structured handoff packet returned to the Program Agent (`runs/{run-id}/handoffs/{specialist}.yaml`).
- **Skill loading.** Same skill choices, same on-demand rules.
- **Gates.** Internal gates fire **and** the Program Agent applies the external stage-boundary gate (§8) before advancing.
- **Permissions.** Same as Independent mode. Orchestration does not implicitly elevate.

### 6.3 Mode invariants

- A specialist's authored artifacts are byte-identical between modes for the same input — orchestration changes *who reads the handoff*, not *what gets produced*.
- A specialist must never silently merge or skip its skill's gate checks because the Program Agent is calling it. The skill's `configured: true` requirement, dialog-spec confirmation, and "one pattern per session" rules apply uniformly.
- The Program Agent **never** writes to the specialist's output paths directly. All artifacts in a specialist's territory are produced by that specialist.

---

## 7. Skill ↔ Specialist Mapping Matrix

| Skill | Primary owner specialist | Secondary consumers | Mode notes |
|---|---|---|---|
| `aem-rde` | `pilot` | — | Independent mode allowed for one-off RDE pushes |
| `aem-workflow` | `blockwright` (model + step authoring) | — | Debugging / triaging sub-skills are un-owned by any agent (invoke skill directly) |
| `best-practices` | `strategist` (validation) | `blockwright`, `bridgesmith` | Consulted on every change-to-deprecated-API path |
| `content-distribution` | `bridgesmith` (replication-event integrations) | — | Operations sub-skills un-owned (invoke skill directly) |
| `create-component` | `blockwright` | `designforge` (read-only conventions reference) | Sole owner of the file-creation workflow; Designforge reads only |
| `create-content-fragment-graphql` | `composer` | `designforge` (read-only conventions reference) | Sole owner of the file-creation workflow; Designforge reads only |
| `create-editable-template` | `blockwright` | `designforge` (read-only conventions reference) | Sole owner; Blockwright's components track must run first so the policy references real components |
| `dispatcher` | `configsmith` (build) | — | Incident-response sub-skill un-owned by any agent (invoke skill directly) |
| `ensure-agents-md` | Program Agent | `strategist` | Runs once per workspace at first orchestration |
| `init` | `strategist` | Program Agent | Runs when CLAUDE.md is missing or stale |
| `migration` | `blockwright` | `strategist` (advisory only) | One pattern per session — strict |
| `repoinit` | `configsmith` | `bridgesmith` (indirect — requests provisioning) | Service-user requests routed to Configsmith |
| `review` | `auditron` (run-level owner) | — | Auditron runs it across the union of changed files |
| `security-review` | `configsmith` | Program Agent (at release gate) | Runs before Pilot raises the release PR; also mandatory before any out-of-ADLC Cloud Manager promotion |
| `claude-api` | (Optional) | — | Reserved for custom tooling; not part of the AEM delivery cycle |

---

## 8. Validation, Quality Gates, and Promotion

### 8.1 Per-stage gates

| Stage | Gate (must all be true) |
|---|---|
| Plan (strategist) | No open question marked `blocking`. Each requirement has ≥1 acceptance criterion. Every requirement traces to a work-breakdown item. No deprecated AEM API in the proposed approach. **When intake includes a reference image: `plan/reference-deconstruction.md` is present** (per strategist § S9). Human checkpoint signed (architecture review). |
| Design (designforge) | All required design docs present under `design/` (`component-specifications.md`, `dialog-specifications.md`, `template-design.md`, `policy-mapping.md`, `authoring-guidelines.md`, `functional-test-cases.md`, `ui-test-scenarios.md`, `reference-assets.md`, and `authoring-test-cases.md` when the run creates/changes an authoring surface — N/A stub otherwise; plus `content-fragment-models.md` when headless). Every UI scenario and authoring case carries a stable ID. **Each of `functional-test-cases.md` / `ui-test-scenarios.md` / `authoring-test-cases.md` opens with an ID Index block (prefix + declared count + explicit ID list) matching its body, and every case carries an `executor: auditron | sentinel` marking. A requirement deferred to another artifact enumerates the specific IDs affected — a bare "covered by `<artifact>`" row fails this gate, because it has been read downstream as retiring the entire artifact.** `reference-assets.md` lists every reference URL / image / asset fixture named in the intake (or explicitly `sources: none`). **When a reference source carries content: `source-content-inventory.md` exists, was built from an actual fetch of the source (not from the intake's description of it), enumerates every countable set the source exposes (nav, pillar/section names + taglines, stat values + labels, footer headings + links, copyright, CTA labels), and marks each field `verbatim` / `derived` / `invented-by-necessity`.** Every reference-sourced field has a content-mapping row naming its exact source value **and its rendered role in the consumer** (mandatory on reused models, whose field names were chosen for another feature). A design pack that specifies field *shape* but carries no source content values fails this gate. No artifact declares a downstream stage deferred (§ P11). **When intake includes a design tokens source: `design/design-token-audit.md` present** (per designforge § D14). **Every component in `component-specifications.md` has a Pixel-Verified Acceptance Criteria table** (per designforge § D15). Dialog spec confirmed for every component. Every parsys area in `policy-mapping.md` has explicit allowlists — no `*`. Every requirement ID traces to ≥1 test case. Every visual / user-journey requirement has a UI-test scenario. No code artifacts (`.java`, `.html`, `.xml`, `.spec.js`, `.cy.js`, `.scss`, `.json`, `.js`) produced. |
| Implement — Blockwright | All paths conform to `create-component` / `create-editable-template` outputs. Designforge dialog spec honored — no field drift. No runtime clientlib in `ui.apps`. No `${clientlib.css}` in HTL. SCSS partial uses `_variables.scss` tokens (URL-design mode). Policy mappings cover exactly the components the template needs. `cq:allowedTemplates` wired. Code conforms to package layout; tests sit beside production class. No deprecated API survived `best-practices` re-scan. Configs land in `ui.config`, not `ui.apps`. No `loginAdministrative`. Workflow process steps idempotent; launchers don't fire on system edits. Exactly one migration pattern per session; BPA finding cleared. **Build verification deferred to Build Gate.** **When local SDK is reachable and a reference image is in the intake: `runtime_style_system_classes: verified` in handoff** (per blockwright § B8 — curl the deployed page, assert every expected `cmp-<type>--<variant>` class is emitted on the DOM). |
| Implement — Configsmith | Zero high-severity `security-review` findings (or each accepted in `DECISIONS.md`). Service users have minimum-required ACLs; every service user has a `ServiceUserMapper` entry. All secrets externalized. No `loginAdministrative`. Dispatcher SDK validator green. Filter order preserved. Cache headers honor the AEMaaCS CDN baseline. |
| Integrate — Bridgesmith | Retry + timeout + idempotency specified. Secrets externalized. Service user request handed to Configsmith. No deprecated event-listener pattern. |
| Integrate — Composer | CF Model fields match the Sling Model accessor names exactly. Persisted queries resolve. GraphQL endpoint config present and project-scoped. Every seeded page references a template + components scaffolded by Blockwright. Every DAM asset reference either resolves in the seeded tree OR is tracked in the fixture manifest. Seeded content under `ui.content/`, never `ui.apps/`. **Query isolation (headless):** each source this run delivers has its own NEW persisted query, scoped by path + reference traversal inside this run's content root; no unfiltered `<model>List` on a model shared with another feature; no prior-run query reused for a new source; every delivered `_path` resolves inside this run's root. **Data-setup integrity:** the STORED value is read back and matches intent, including per-element values and array lengths (values containing the serialization array-separator character are escaped in source); the covering package filter's import mode updates existing nodes rather than add-only, verified by post-deploy read-back; no dangling or unintended cross-feature references. |
| Test — Auditron | **No verification oracle is agent-authored.** Content checks diff against `design/source-content-inventory.md` + the authored content on disk — never against an "expected payload" doc written by the specialist that authored the content (a closed loop that cannot detect invented, paraphrased, or mis-placed content; reporting "zero diffs" from it is a false green and a high-severity finding). Content checks assert **field placement**, not just value presence. Zero severity ≥ `high` findings (or each `high` accepted in `DECISIONS.md`). All cross-file consistency checks pass (HTL `data-sly-use` ↔ Sling Model, BEM ↔ SCSS, policy allowlist ↔ existing components, `cq:allowedTemplates` regex ↔ actual templates, dialog fields ↔ `@ValueMapValue`, no orphan files, Composer-seeded pages resolve). Optional lint (`eslint --max-warnings 0`, `tsc --noEmit`) passes when its module was touched. No new `TODO` / `FIXME` without a tracking-ticket reference. Single full `mvn -q clean install -PautoInstallSinglePackage` returns `BUILD SUCCESS`. Local SDK has new package installed. Unit, integration, UI suites all green. Coverage threshold met (default 80% line, 70% branch) — **note this is a code-coverage gate and discharges no functional test case**. **Functional-TC attribution gate passes: `test/auditron/coverage.md` records a bucket + evidence for EVERY `TC-*` ID in `design/functional-test-cases.md`, `total == total_from_file`, and `auditron_executed + deferred_to_sentinel + blocked == total`.** Auditron owns every case not marked `executor: sentinel` — silence in the design doc means Auditron-owned, never unowned. `deferred_to_sentinel` is admissible only for cases genuinely needing the real deployed tier; deferring a statically-settleable case is a HIGH self-finding. The ledger is owed **whether or not any unit test was authored** — a zero-Java run does not exempt it. Buckets that don't sum ⇒ tests track `incomplete`, and **`incomplete` is never reported as `pass`**. Any self-imposed scope narrowing is disclosed in `test-report.md` with its count and reason. **At most 2 `mvn` calls during the entire run.** |
| Local install (Auditron side-effect) | Owned by `auditron`, not Pilot. `mvn -q clean install -PautoInstallSinglePackage` returns BUILD SUCCESS; package present on local AEM SDK (`http://localhost:4502`). **Build-validation only — Sentinel no longer measures this URL** (Sentinel measures the real env). |
| Release — Pilot (raise PR) | `handoffs/auditron.yaml` reports `status: pass` (3-signal build success). Working tree clean; `HEAD` is the feature branch (not `master`). Branch pushed; `compare/<base>...<head>` reports `ahead_by > 0`; `owner/repo` resolved canonically from the API (not the possibly-stale `origin`); PR opened via `gh pr create --base master` **or** `POST /repos/{owner}/{repo}/pulls` with a `repo`-scoped token — the compare URL is acceptable only when both automated paths are unavailable and `pr_tool_fallback_reason` is recorded. Pilot returns `status: awaiting_lead_approval` and does NOT merge/deploy. **Auto-runs once Auditron is green — no human approval to open the PR.** |
| ═══ PAUSE + Real-environment validation approval (resume) | **BLOCKING — flow suspended.** The run pauses while the human Lead manually merges the PR, syncs to Adobe Git, and deploys to the real env. Resumes only on a valid "real-environment validation approval" block in `runs/{run-id}/DECISIONS.md`: Lead approver + timestamp, merged build hash, and **BOTH tier URLs with their auth modes** — **Author URL** (`bearer-token` / `credentials`; author is never anonymous) and **Publish URL** (usually `none`); secrets passed out-of-band. Program Agent must not dispatch Sentinel without both, must ask for a missing tier, and must never fabricate a URL or derive one tier's host from the other. |
| Test — Sentinel — **LAST stage** | Runs against **BOTH real environment URLs** from the resume block (NOT a local SDK): authoring-provisions on **Author**; ui-tests, graphql-content-parity, spa-integration, and all NFR tracks on **Publish**. Each tier pre-probed independently with its own auth; a track run on the wrong tier is a **method error** (result void, track `incomplete`). A missing tier URL yields `blocked_missing_url` and an **incomplete** run — never `not_applicable`, never a derived or substituted host. `ui.tests` is verified to be Playwright on entry (Blockwright's pre-deploy responsibility); still-Cypress/missing is a `blockwright`-routed finding, not something Sentinel migrates. **SPA-integration** (when a front-end consumer exists): the publish host is mapped into the app via its externalized config (uncommitted, run-local), the app is built/served, and Playwright asserts payload values render in their **mapped slots** with every delivered image genuinely loading (`naturalWidth > 0`), zero console errors, no CORS failure. Coverage: **baseline dispatch `executed == total`**; a **remediation re-dispatch is scoped** to prior failures + the fix's blast radius, with the remainder `carried-forward` carrying its dispatch + build-hash provenance. LCP / INP / CLS / TTFB within NFR targets. Bundle weight regression ≤ 10%. No raw DAM originals on mobile viewports. No render-blocking third-party scripts unless accepted in `DECISIONS.md`. SEO required tags present per URL (title, description, canonical, OG core, JSON-LD parseable). `robots.txt` reachable; sitemap present and contains target URLs. Zero `critical` impact a11y findings. Observability hooks present where required. **Visual Verification Tier A (reference-alignment diff): zero `critical` findings, or each critical finding recorded as an "acceptable deviation" in DECISIONS.md** (per sentinel § Visual Verification track). **On headless / hybrid runs, GraphQL content-parity passes** — **query isolation holds** (each query under test belongs to this run, covers one source, is by-path + reference-traversal scoped, and delivers no `_path` outside this run's content root; prior-run queries are non-contributing regression checks only), every persisted query resolves (HTTP 200, no `errors[]`, non-null item), every source CF field is delivered non-null **and value-exact** (character-level scalars + matching array cardinality, diffed mechanically over the full response — a qualitative "close enough" assessment is never a verdict), every source image reference resolves as a matching `ImageRef`/`DocumentRef` backed by a live DAM binary (SVG → `DocumentRef`; dimension assertions apply only where the source asset actually carries `tiff:ImageWidth`/`tiff:ImageLength` — a packaged-binary asset legitimately has none), **every delivered value sits in its MAPPED field** (a value present but in the wrong field is a defect, not a pass — see the content-mapping rows in `content-fragment-models.md`), and any reference mismatch is zero-critical (or accepted in `DECISIONS.md`); misses are re-routed to Composer / Blockwright / Bridgesmith / Configsmith (per sentinel § GraphQL content-parity track). Skipped (`not_applicable`) on server-rendered-only runs. **Reference parity + Visual may NOT be reported `not_applicable` when `design/reference-assets.md` declares a source** — supplied reference URLs are fetched + extracted and diffed per item. **Authoring provisions pass** (when the run touched an authoring surface): model→editor parity, multi-value authorability (true schema list), required fields populated, stored-value/data-setup integrity, reference integrity, redeploy-update semantics, edit round-trip, publish state. **Test-coverage completeness:** `test/sentinel/coverage-matrix.md` shows `executed == total` for `ui-test-scenarios.md`, `authoring-test-cases.md`, and the Sentinel-owned share of `functional-test-cases.md`; every `not_applicable` is per-ID with a concrete reason (a blanket track-level N/A fails the gate). **The matrix opens with an ID census per artifact (extraction command + `total_from_file` + enumerated IDs) and `total == total_from_file` holds for each; a declared total that disagrees with the artifact's own ID count fails this gate regardless of the executed/total ratio, since `0 == 0` otherwise passes trivially.** **Any scope reduction attributed to a human decision cites `DECISIONS.md` or verbatim dispatch-packet text — Sentinel receives no mid-dispatch user messages, so an uncited "per user direction" claim is a fabricated-authorization incident and fails the gate on its own.** **Correctness-class findings** (parity / isolation / asset-resolution / authoring / content-mapping) are always blocking; a human-deferred correctness finding closes the run `fail (accepted gap)`, never `pass` or "degraded pass" — only threshold-class findings (perf / a11y / SEO / visual) may close a run as a documented-gap pass. Sentinel's report is the **terminal acceptance verdict** of the ADLC run. |
| Stage 06.5 — Visual Iteration Loop (sentinel-owned) | Proposed iff Tier A produced critical findings AND no "acceptable deviation" is recorded — but **gated by the Sentinel remediation approval human checkpoint (§8.1 "Sentinel remediation approval" / `aem-program-agent.md § P10`); it does NOT auto-activate.** On **confirm**, the loop routes findings to Blockwright / Composer / Designforge; each pass counts against that specialist's iteration cap (§5.3); exits when Tier A passes OR human records acceptable deviation OR the loop counter hits 5. On **decline**, the criticals are recorded as accepted gaps and the run proceeds to final reports without the loop. On the real-env flow, an approved remediation re-enters via a **new PR cycle** (fix → Auditron → PR → Lead re-deploy → Sentinel), not an in-place local rebuild. Skipped entirely when no reference image is in the intake. |
| Sentinel remediation approval (on Sentinel `fail`) | **BLOCKING human checkpoint before any fix.** When `handoffs/sentinel.yaml` is `status: fail` on any track (or Tier A critical), the Program Agent surfaces the findings + proposed routing and MUST NOT auto-re-dispatch. **Confirm** → record a `remediation approval` row in `DECISIONS.md` and run the remediation cycle (new PR cycle on the real-env flow). **Decline** → record a `remediation declined` row accepting the failures as known gaps and proceed to final run reports. A bare Sentinel `fail` with neither decision recorded is not a terminal state. (Per requirement: no auto-redirect to fixing agents.) |
| Optional — Pilot RDE sandbox | Only when the RDE track was explicitly requested (decoupled from the main flow). `aio aem rde install` returns `installed: true`; 60s error-log tail clean; smoke test HTTP 200 on homepage + Composer-seeded URLs; snapshot ID recorded before install. Not a gate on the ADLC flow. |
| Deploy — Cloud Manager (Dev/Stage/Prod) | **Out of ADLC scope.** Cloud Manager pipeline triggers, human-approval enforcement, Stage soak, and Prod promotion are handled by a human or external pipeline process — not by any ADLC agent. |
| Post-deploy Operations | **Out of ADLC scope.** Incident triage, rollback beyond RDE, postmortems, and recurring-incident escalation are handled by a human or external SRE / on-call process. The `dispatcher` / `aem-workflow` / `content-distribution` operations sub-skills can be invoked directly if needed. |

### 8.1.1 Maven invocation budget (token policy)

Maven output is the single largest source of tool-result tokens in an ADLC run. To keep runs efficient, the spec enforces:

- **Maximum 2 `mvn` invocations per run** (under normal scope):
  1. Build Validation Gate — `mvn -q clean install -PautoInstallSinglePackage` (Auditron, step 9). Builds + runs unit tests + deploys to local SDK.
  2. Integration tests — `mvn -q -pl it.tests verify -Pintegration-tests ...` (Auditron, step 12).
- **All other stages (Blockwright, Configsmith, Bridgesmith, Composer, Designforge, Strategist) MUST NOT invoke `mvn`.** They validate via static checks (`Read`, `Grep`, `Glob`) only.
- **Every `mvn` invocation MUST use `-q`** and route output through `tail -30` (or to a log file with only the tail read back) so a single call never adds more than ~3K tokens to context.
- **Exceptions** (each requires an explicit note in `DECISIONS.md`):
  - A best-practices fix that *requires* re-compilation to verify (`mvn -q clean compile -pl core`) — still uses `-q | tail -30`.
  - A Pilot hot-fix loop after Auditron passed but a smoke test regressed.

Hooks may be used to defer the Build Gate to local bash (output never enters context) — see project `AGENTS.md` for hook configuration.

### 8.1.2 Raw-artifact ingestion policy (token policy)

After Maven, the next largest token sink is **reading raw tool artifacts into model context**. These are often enormous — a Lighthouse JSON is commonly **300–450 KB (~100–150K tokens)**; axe JSON, JUnit XML, `npm`/Playwright logs, and `package-lock.json` are also large. **No agent may `Read` a raw tool artifact into context.** Instead:

- **Parse and extract only the values you need** with `node -e`, `jq`, or `grep` — e.g. `node -e '…JSON.parse…category.score…'`, `grep -c`, `xmllint`. Pull the handful of numbers/lines into context, never the file.
- **Tail long command output**: `cmd > /tmp/x.log 2>&1; tail -30 /tmp/x.log` (mvn, `npm test`, `lighthouse`, `axe`).
- **Applies to:** `lighthouse-*.json`, `axe-*.json`, `results.xml`, `*.log`, `package-lock.json`, `node_modules/**`, minified clientlibs, and any generated report over ~2 KB.
- **Generate reports, don't hand-write them**: Sentinel (and any report-producing agent) emits a **compact JSON** and runs `.claude/agents/references/render-report.mjs` to produce the HTML+MD — the model never emits hundreds of lines of markup (see `sentinel.md § Consolidated report rendering`).
- **Prefer targeted reads**: `Grep` or `Read` with `offset`/`limit` over full-file reads of large `.content.xml`, Sling Models, and policy files.

Rule of thumb: if a file is machine output or > ~400 lines, reach for parse-and-extract, not `Read`.

#### 8.1.1.a Budget extension protocol

The 2-mvn cap is a token-management contract, not an iteration cap. When a run legitimately needs more than 2 mvn invocations — e.g., an environmental failure (Windows file lock, transient network) or a scoped surgical remediation that needs one more Build Gate to verify — the Program Agent MAY request a one-time budget extension from the human. Rules:

- **Every extension requires explicit human authorization.** A natural-language "go ahead" is enough, but the extension MUST be recorded in `runs/{run-id}/DECISIONS.md` as a dated row with:
  - Row id (e.g., `2026-06-30T-mvn-budget-extension-authorized`).
  - Original budget vs extended budget (e.g., "2 → 3").
  - Reason (environmental failure, scoped surgical remediation, missing intermediate cq:Page discovered late, etc.).
  - Token-cost estimate for the additional invocation (typical `-q + tail -30` = ~3K tokens per call).
  - Failure branch: if the extended invocation also fails, is another extension considered, or does the run hard-escalate?
- **Cumulative extensions are permitted but visible.** Every extension is a separate `DECISIONS.md` row. A run that has consumed 4 mvn invocations under two extensions has two extension rows on record.
- **Never extend silently.** Never round-trip a "let me just try one more mvn" past the user without recording it.
- **Failure iteration cap still applies** (§5.3): three failed iterations on the same stage escalate to the human regardless of budget state. Extended budget does not create additional iteration slots.

#### 8.1.1.b Build-success 3-signal detection (canonical gate contract)

The Build Validation Gate result is NOT determined by mvn exit code alone. `-q` mode suppresses the reactor summary, so early-phase failures produce logs with only ERROR lines and no reactor context, and partial-successes-followed-by-downstream-failures (e.g., `{project}.all` built cleanly but `ui.tests` npm lint failed) exit non-zero even though the deployable exists.

**Every Build Validation Gate MUST verify all THREE signals and record all three in the handoff:**

1. **Signal 1 — mvn exit code.** Canonical Maven contract: exit 0 = success, non-zero = failure. Record `mvn_exit_code: <int>`.
2. **Signal 2 — `all/target/*.zip` artifact presence and non-zero size.** The deployable artifact from the `{project}.all` module is proof the reactor advanced through the `package` phase on every module up to and including `all`. Record `all_zip_present: true|false` and `all_zip_size_bytes: <int>`.
3. **Signal 3 — Surefire XML with 0 failures.** Parseable `core/target/surefire-reports/TEST-*.xml` with `<failures>0</failures> <errors>0</errors>` is proof unit tests ran and passed inside `{project}.core`'s `test` phase. Record `surefire_all_pass: true|false` and `surefire_summary: "Tests run: N, Failures: 0, Errors: 0"`.

**Combined verdict table** (see `.claude/agents/auditron.md` for the full matrix):

| Exit | Zip | Surefire | Verdict |
|---|---|---|---|
| 0 | present | pass | **BUILD_SUCCESS** — advance |
| 0 | present | fail | BUILD_PARTIAL — fail gate, attribute to Blockwright |
| non-0 | present | pass | **BUILD_DOWNSTREAM_FAIL** — trigger §8.2.1 escalation |
| non-0 | absent | any | BUILD_HARD_FAIL — fail gate, attribute per failing plugin |

The `BUILD_DOWNSTREAM_FAIL` state triggers the P1 external-attribution escalation in `.claude/agents/aem-program-agent.md` § "P1 — External-attribution gate failures". The Program Agent surfaces the decision to the human rather than auto-proceed OR auto-block.

#### 8.1.1.c User out-of-band mvn invocations do NOT consume the ADLC budget

The 2-mvn-per-run cap is a token-cost containment mechanism for `mvn` output routed through Claude Code sub-agent context. If the human runs `mvn clean install -PautoInstallSinglePackage` themselves in a separate shell (out-of-band), that output never enters model context and does NOT consume the budget. Record the user's out-of-band build in `DECISIONS.md` with build hash + result, but the internal ADLC budget accounting remains unchanged.

### 8.2 Cross-cutting gates

#### 8.2.1 External-attribution gate-failure escalation

When Auditron's Build Validation Gate returns FAIL under §8.1.1.b's 3-signal detection, but the failing signal is `mvn_exit_code != 0` AND the `all/target/*.zip` deployable IS present AND `surefire_all_pass: true` (i.e., `BUILD_DOWNSTREAM_FAIL`), the Program Agent MUST NOT auto-proceed and MUST NOT auto-block. Instead:

1. Identify the failing module from Auditron's tail-30 log.
2. Determine attribution: is the failing module owned by a specialist in this run's scope, or by a specialist whose files were not touched in this run (e.g., pre-existing lint in `ui.tests` that is Sentinel-scope)?
3. Surface the decision to the human in a single message with two explicit options:
   - **Accept-and-proceed**: deployable exists; route the failing module to a follow-up run for its owner specialist; Pilot proceeds to raise the PR on the current build.
   - **Strict FAIL**: open a remediation run to fix the failing module before Pilot raises any PR.

Never resolve external-attribution failure autonomously. The human's judgment is the escalation. See `.claude/agents/aem-program-agent.md` § "P1 — External-attribution gate failures" for the full protocol.

#### 8.2.2 Auditron static pre-flight checks (permanent)

Beyond the standard review checks in §4.7, Auditron's WB-T-A-01 review track MUST run 5 permanent static pre-flight checks that catch defect classes which previously cost multiple mvn iterations to discover dynamically. Each check is Grep-based, seconds to run, and catches a class of defect the mvn build would otherwise fail on. Full check specifications live in `.claude/agents/auditron.md` § "Permanent WB-T-A-01 static checks (Checks 13–17)". Summary:

- **Check 13** — Protected JCR properties (`jcr:created`, `jcr:createdBy`, `jcr:uuid`, etc.) on `dam:Asset` or `cq:Page` root nodes. High-severity if any match.
- **Check 14** — Prefix-namespace parity. Every `<prefix>:*` attribute on descendants must have a matching `xmlns:prefix` on `<jcr:root>`.
- **Check 15** — Intermediate content-path segments must be `cq:Page` (not `nt:folder`). Missing intermediate `.content.xml` = high severity.
- **Check 16** — Template header/footer must use Experience Fragment pattern (not locked-component chrome), unless Designforge documents a deviation.
- **Check 17** — Parsys / root containers must use `<project>/components/container` (not `wcm/foundation/components/responsivegrid`).

These checks are enforced regardless of run scope — they don't get bypassed for "small" changes.

- **Cloud Service correctness.** Any change touching deprecated APIs, schedulers, listeners, replication, DAM AssetManager, or HTL must pass through `best-practices` references before merge.
- **Mutable/immutable separation.** `ui.apps` holds code and component XML; `ui.config` holds OSGi configs; `ui.content` holds mutable content (including Composer's seeded pages and DAM fixtures). The Program Agent flags any artifact written to the wrong module.
- **Filter.xml hygiene.** Any change to `ui.content/META-INF/vault/filter.xml` is reviewed against the spec rule "filter mode change is meaningful — never accidental."

### 8.3 Environment promotion

The ADLC agent flow ends at a **PR** and pauses; the real deploy is the human Lead's manual, out-of-ADLC step; then **Sentinel validates the real environment last**. Cloud Manager Dev / Stage / Prod promotion is out of ADLC scope.

```
Local (mvn -PautoInstallSinglePackage — owned by Auditron, not Pilot)
   │  installed to http://localhost:4502 as a Build Gate side-effect
   │  BUILD VALIDATION ONLY — Sentinel does NOT measure this URL anymore
   ▼
Auditron PASS (3-signal build success)
   ▼
Pilot — raise PR (feature branch → master, current GitHub repo)  ── auto once Auditron is green
   │  git push -u origin <feature-branch>
   │  gh pr create --base master --head <feature-branch>
   │  → status: awaiting_lead_approval
   ▼
═══════════════ ADLC FLOW PAUSES — Lead (human, manual) ════════════
  OUTSIDE the agent flow, the Lead:
    • reviews + merges the PR
    • syncs the merge to Adobe Git
    • deploys to the REAL environment via Cloud Manager
════════════════════════════════════════════════════════════════════
   │
   ▼
═══════════ RESUME — Real-environment validation approval ══════════
  Recorded in runs/{run-id}/DECISIONS.md with:
    • Lead approver identity + timestamp
    • Merged build hash
    • REAL environment URL
    • Auth mode (none | bearer-token | credentials; secret out-of-band)
  Missing/malformed → Program Agent does NOT dispatch Sentinel (never fabricates a URL)
════════════════════════════════════════════════════════════════════
   │
   ▼
Sentinel NFR gate (against the REAL environment URL)  ── LAST STAGE
   │  Playwright + Performance + SEO + A11y-critical + Observability
   │  (+ GraphQL content-parity on headless / hybrid runs) + Visual
   │  MUST all return pass  → terminal acceptance verdict
   ▼
═══════════════════ END OF ADLC AGENT FLOW ═════════════════════════

The real deploy + Cloud Manager promotion are handled outside the ADLC
agent set — by the human Lead / an external pipeline / SRE process.
NOT owned by any ADLC agent:
  - Merging the PR + syncing to Adobe Git
  - Cloud Manager pipeline execution triggers (`aio cloudmanager pipeline-execution`)
  - Stage / Prod human-approval enforcement + Stage soak validation
  - Cross-environment rollback coordination
  - Post-deploy incident triage, postmortems
(Pilot's optional RDE sandbox — snapshot/install/smoke/rollback — is a
 side-path, not the real-environment path Sentinel validates.)
```

Rollback / re-validation rules within ADLC scope:

- **Sentinel FAIL against the real env:** route findings to the owning specialists; remediation re-enters as a **new PR cycle** (fix → Auditron → new/updated PR → Lead re-deploy → Sentinel). There is no in-place agent rollback of the real environment — that is the Lead's call.
- **Optional RDE sandbox:** Pilot-initiated rollback via `aio aem rde snapshot restore <id>` stays available for the RDE side-path only.
- **Anything on the real environment (rollback, hotfix-in-place):** out of ADLC scope — the Lead / external process.

**Local rebuilds during a run:** if the code changes after Auditron's install (e.g., a pre-PR fix), the Program Agent re-dispatches Auditron (mvn budget permitting) to rebuild + reinstall locally before Pilot re-raises/updates the PR. Once the PR is merged + deployed, any further change is a new PR cycle. Pilot never installs to Local directly.

---

## 9. Implementation Notes & Bridges

### 9.1 UI test framework — Playwright

**Playwright is the mandated UI test framework for this project.** All UI specs — existing and new — live in `ui.tests/`. No alternate UI runner (Cypress, Selenium, WebdriverIO, TestCafe) is permitted in the ADLC pipeline. Cloud Manager's Custom UI Testing step is framework-agnostic — it builds the `ui.tests` Docker image and evaluates the run **solely on the JUnit XML** written to `REPORTS_PATH` (exit code ignored) — so Playwright is fully supported (Cypress was the archetype default).

- **`ui.tests/`** — the single Playwright suite. ADLC-authored specs are written under `ui.tests/test-module/tests/` as `*.spec.js` files. Specs run across Chromium, Firefox, WebKit, and a device-emulated mobile project, and continue to run in Cloud Manager Custom UI Testing.
- **`blockwright` owns the harness + the spec source, and does that work PRE-DEPLOY** (Implement stage). On each run it checks the module state and bootstraps **once per project**: use as-is if already Playwright, **migrate if still Cypress**, or scaffold if missing — per `references/playwright-ui-test-module.md`. It authors one spec per Designforge scenario ID and validates them without a live environment via `npx playwright test --list` (parse + discovery proof). It does NOT execute the suite and does NOT introduce any other UI runner.

  > **Why pre-deploy.** Cloud Manager's *Custom UI Testing* step builds the `ui.tests` Docker image from whatever is committed and judges the run on the JUnit XML. So the module must already be Playwright **when the PR is raised and the Lead deploys** — otherwise the first pipeline run executes the archetype's default **Cypress** harness (or fails), and this run's specs don't exist yet. Migrating after deploy is too late: the pipeline has already run. Order: **Blockwright (harness + specs) → Auditron (build) → Pilot (PR) → Lead deploy (CI/CD runs Playwright) → Sentinel (execute).**

- **`sentinel` owns execution only** (post-deploy, against the real environment). It verifies the harness is Playwright and executes the suite; if the module is still Cypress or missing at that point, it raises a `blockwright`-routed finding rather than migrating it — migrating there would be too late to help the pipeline and would hide the miss. It never modifies the harness, `pom.xml`, or `assembly-ui-test-docker-context.xml`.
- Authentication uses a `global-setup.js` that logs into AEM author and shares the session cookie (`storageState`); accessibility is asserted in-spec via `@axe-core/playwright`. **Specs are parameterized for both tiers** — base URLs come from env (`AEM_AUTHOR_URL` / `AEM_PUBLISH_URL`) with Playwright projects for anonymous-publish and authenticated-author, so the same suite serves a headful (server-rendered) build on either tier. No spec hard-codes a host or credential.

### 9.2 Skill execution surface

All skills in this repo are invoked via the Claude Code `Skill` tool. The Program Agent does not call shell commands like `claude run skill X`; it issues `Skill` tool calls with the exact skill name, optionally with an `args` string. Specialists do the same when delegated.

### 9.3 Repository layout for agent state

```
.claude/
├── agents/
│   ├── ADLC-SPEC.md                    # this file
│   ├── aem-program-agent.md            # Program Agent contract
│   ├── strategist.md                   # Plan-stage specialist
│   ├── designforge.md                  # Design-stage specialist
│   ├── blockwright.md                  # Implement-stage (code/build)
│   ├── configsmith.md                  # Implement-stage (config/hardening)
│   ├── bridgesmith.md                  # Integrate-stage (external boundaries)
│   ├── composer.md                     # Integrate-stage (content orchestration)
│   ├── auditron.md                     # Test-stage (quality + build/test)
│   ├── sentinel.md                     # Test-stage (NFR enforcement)
│   ├── pilot.md                        # Deploy-stage (Local + RDE only)
│   └── runs/
│       └── {run-id}/
│           ├── PLAN.md                 # stage plan + work breakdown
│           ├── DECISIONS.md            # irreversible calls
│           ├── plan/                   # strategist outputs
│           │   ├── requirements.yaml
│           │   └── technical-specifications.md
│           ├── design/                 # designforge outputs (markdown only)
│           ├── implement/
│           │   ├── blockwright/        # migration plans, etc.
│           │   └── configsmith/        # security-review.md, validator.log
│           ├── integrate/
│           │   ├── bridgesmith/        # integration-design-{name}.md
│           │   └── composer/           # content-seeding-report.md, dam-fixture-manifest.yaml
│           ├── test/
│           │   ├── auditron/           # code-quality-report.md, test-report.md
│           │   └── sentinel/           # sentinel-report.md + .html (consolidated), coverage-matrix.md,
│           │                           # reference-extract-<slug>.md, lighthouse/axe JSON, screenshots/,
│           │                           # visual-iteration-log.md (working log)
│           ├── deploy/
│           │   ├── pr-request.md         # Pilot's release-PR summary (PR URL, branch, build hash, Lead checklist)
│           │   ├── pr-body.md            # the PR body submitted to `gh pr create`
│           │   └── deploy-rde.md         # ONLY if the optional RDE sandbox track ran
│           │                           # (real deploy = Lead's manual step; no incidents/ — post-deploy ops out of ADLC scope)
│           ├── handoffs/               # one YAML per specialist + program
│           │   ├── strategist.yaml
│           │   ├── designforge.yaml
│           │   ├── blockwright.yaml
│           │   ├── configsmith.yaml
│           │   ├── bridgesmith.yaml
│           │   ├── composer.yaml
│           │   ├── auditron.yaml
│           │   ├── sentinel.yaml
│           │   └── pilot.yaml
│           └── reports/                # BLOCKING session-close gate (§10.3 / program-agent § P13)
│               ├── skills.md           # skill usage report
│               ├── tokens.json         # token + cost + duration ledger (populated totals)
│               ├── final-report.md     # execution summary + total token usage + findings ledger
│               └── demo-script.md      # auto-generated presenter walkthrough
├── skills/                             # unchanged — skill definitions
└── settings.local.json
docs/
└── agents-legacy/                      # 17 predecessor agent files (historical reference only;
                                        # not dispatched in new runs)
```

`{run-id}` uses an ISO timestamp + slug (e.g. `2026-06-29T18-09Z-<feature-slug>`) so multiple concurrent runs don't collide.

### 9.4 Independent mode discovery

Specialists in independent mode are surfaced as Claude Code sub-agent types once their `.md` files exist under `.claude/agents/`. Until then, humans invoke them by reading the relevant SKILL.md directly and issuing the prompt manually. Both paths must produce the same artifacts (mode invariant — §6.3).

---

## 10. Skill, Token, Duration & Cost Report

This section is split into four parts:

1. Model pricing reference (§10.1).
2. Per-run planning model (§10.2).
3. Telemetry capture format (§10.3).
4. Session-close reports (§10.4).

### 10.1 Model pricing

| Model | Default for | Input ($/M) | Output ($/M) | Cache read ($/M) | Cache write ($/M) |
|---|---|---|---|---|---|
| `claude-opus-4-7` | Strategist | $15.00 | $75.00 | $1.50 | $18.75 |
| `claude-sonnet-4-6` | Program Agent, Designforge, Blockwright, Configsmith, Bridgesmith, Composer, Auditron, Sentinel | $3.00 | $15.00 | $0.30 | $3.75 |
| `claude-haiku-4-5` | Pilot | $0.80 | $4.00 | $0.08 | $1.00 |

> **Cost formula:** `cost_usd = (input_tokens × input_rate + output_tokens × output_rate + cache_read_tokens × cache_read_rate + cache_write_tokens × cache_write_rate) / 1_000_000`
>
> Cache reads substantially cut cost in long runs — the 5-minute prompt-cache TTL means specialists called within 300 s of each other save 40–60% on input costs.

### 10.2 Planning model (per ADLC run)

**Per-specialist budgets (moderate-scope run: 1 feature, ~5 components, 1 template, no migration, no incident):**

| Specialist | Model | Skills loaded | Token range | Est. duration | Est. cost (USD) |
|---|---|---|---|---|---|
| Program Agent | sonnet-4-6 | `ensure-agents-md` once + coordination overhead | 8K – 15K | 1 – 3 min | $0.02 – $0.05 |
| Strategist | opus-4-7 | `init`, `ensure-agents-md`, `best-practices` | 12K – 28K | 2 – 5 min | $0.14 – $0.47 |
| Designforge | sonnet-4-6 | — (skills consulted read-only, not invoked) | 15K – 45K (scales with component count) | 3 – 8 min | $0.13 – $0.55 |
| Blockwright | sonnet-4-6 | `create-component` × N + `create-editable-template` + `best-practices` (+ `aem-workflow` / `migration` when in scope) | 20K – 320K (5 components + 1 template) | 12 – 45 min total | $0.30 – $4.00 |
| Configsmith | sonnet-4-6 | `repoinit`, `security-review`, `dispatcher` | 18K – 45K | 2 – 5 min | $0.06 – $0.20 |
| Bridgesmith | sonnet-4-6 | `best-practices`, `content-distribution` | 13K – 28K | 2 – 4 min | $0.04 – $0.12 |
| Composer | sonnet-4-6 | `create-content-fragment-graphql` + content-seeding (no skill yet) | 12K – 30K | 2 – 5 min | $0.10 – $0.27 |
| Auditron | sonnet-4-6 | `review` + build + tests | 18K – 55K + build time | 5 – 15 min (incl. 2 `mvn` calls) | $0.06 – $0.25 |
| Sentinel | sonnet-4-6 | — (uses `lighthouse`, `axe-core/cli`, `WebFetch`) | 8K – 20K per URL × N URLs | 3 – 10 min | $0.08 – $0.30 |
| Pilot | haiku-4-5 | `aem-rde` only (Local + RDE scope only; no operations track) | 8K – 20K | 1 – 4 min | $0.01 – $0.02 |

**Estimated per-run totals:**

| Run scope | Token range | Duration range | Estimated cost |
|---|---|---|---|
| Moderate scope (1 feature, ~5 components, 1 template, no migration) | 150K – 550K | 25 – 70 min | $2.00 – $7.50 |
| Wide scope (URL rebuild + migration + multi-component + RDE deploy + content seeding) | 550K – 1.3M | 70 – 140 min | $7.50 – $16.00 |
| **Note:** Cloud Manager Stage/Prod promotion and post-deploy incident work are out of ADLC scope — no ADLC token budget covers them. | — | — | — |

### 10.3 Telemetry capture format

**These reports are a BLOCKING session-close gate, not a nice-to-have.** No run — pass, fail, or paused — is reportable-complete until all four files exist under `runs/{run-id}/reports/`: `tokens.json`, `skills.md`, `final-report.md`, `demo-script.md` (see `aem-program-agent.md § P13`). They are written **before** the human-handoff packet, and every path is referenced from it. Two standing rules:

- **Write them on every terminal state**, including a § P9 paused run and a `fail (accepted gap)` close-out. On a paused run, `final-report.md` records what ran, what is outstanding, and the resume instruction.
- **Never present a token/cost figure that was not measured.** Use the harness's actual per-agent usage. Where a value is genuinely unavailable, emit `null` plus a `measurement_gap` note — never substitute the §10.2 *planning estimates* and report them as actuals. §10.2 is for forecasting a run; §10.3 is for recording one.

For every actual run the Program Agent writes two files:

**`reports/tokens.json`** — machine-readable, full token + cost + duration ledger:

```json
{
  "run_id": "2026-06-29T18-09Z-<feature-slug>",
  "model_default": "claude-sonnet-4-6",
  "totals": {
    "input_tokens": 0,
    "output_tokens": 0,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "total_cost_usd": 0.00,
    "wall_clock_duration_ms": 0
  },
  "by_agent": {
    "program-agent": {
      "model": "claude-sonnet-4-6",
      "in": 0, "out": 0, "cache_read": 0, "cache_write": 0,
      "cost_usd": 0.00,
      "started_at": "2026-06-29T18:09:00Z",
      "ended_at":   "2026-06-29T18:12:30Z",
      "duration_ms": 210000
    },
    "strategist":   { "model": "claude-opus-4-7",   "skill_invocations": ["best-practices"], "...": "..." },
    "designforge":  { "model": "claude-sonnet-4-6", "skill_invocations": [],                  "...": "..." },
    "blockwright":  { "model": "claude-sonnet-4-6", "skill_invocations": ["create-component","create-editable-template","best-practices"], "...": "..." },
    "configsmith":  { "model": "claude-sonnet-4-6", "skill_invocations": ["repoinit","security-review","dispatcher"], "...": "..." },
    "bridgesmith":  { "model": "claude-sonnet-4-6", "skill_invocations": ["best-practices","content-distribution"], "...": "..." },
    "composer":     { "model": "claude-sonnet-4-6", "skill_invocations": ["create-content-fragment-graphql"], "...": "..." },
    "auditron":     { "model": "claude-sonnet-4-6", "skill_invocations": ["review"], "mvn_invocations": 2, "...": "..." },
    "sentinel":     { "model": "claude-sonnet-4-6", "skill_invocations": [], "...": "..." },
    "pilot":        { "model": "claude-haiku-4-5",  "skill_invocations": ["aem-rde"], "...": "..." }
  }
}
```

**`reports/skills.md`** — human-readable per-specialist summary, skill-by-skill breakdown, and notes on cache behaviour. Generated by the Program Agent at session close from the `tokens.json` ledger.

**`reports/final-report.md`** — the run's **execution summary + final metrics**, and the one document a reviewer should be able to read alone. Required sections:

1. **Terminal verdict** — `pass` / `fail (accepted gap)` / `paused`, with the deciding artifact named.
2. **Stage execution table** — one row per dispatched specialist: stage · specialist · status · iterations used (vs the §5.3 cap) · artifacts produced. Non-dispatched always-on stages are listed explicitly as outstanding (never silently absent).
3. **Total metrics** — total input / output / cache-read / cache-write tokens, `total_cost_usd`, wall-clock duration, per-agent token subtotals, and Auditron's `mvn_invocations` vs its budget (plus any §8.1.1.a extension rows).
4. **Gate outcomes** — every stage gate with pass/fail and, on any fail, the iteration that resolved it.
5. **Test coverage** — the `coverage-matrix.md` totals per Design-stage artifact (`total / executed / pass / fail / na`).
6. **Findings ledger** — every finding across all stages with severity, class (correctness / threshold), owner, and final disposition (fixed / accepted gap / outstanding).
7. **Human checkpoints** — each checkpoint, decider, timestamp, and decision.
8. **Outstanding work** — what a follow-up run must pick up, including any deferred correctness defect.

### 10.4 Demo readiness report

In addition to the two reports above, the Program Agent auto-generates `reports/demo-script.md` at session close — a one-page presenter walkthrough drawing from:

- The deployed env URL (from `handoffs/pilot.yaml`).
- The components scaffolded (from `handoffs/blockwright.yaml`).
- The seeded pages + DAM fixture manifest (from `handoffs/composer.yaml`).
- The dialog specs (from `design/dialog-specifications.md`) — for "show the editor experience" beats.
- The NFR results (from `handoffs/sentinel.yaml`) — performance, SEO, a11y numbers to mention live.
- Known gaps / accepted findings (from `DECISIONS.md`).

---

## 11. Adoption Notes

### 11.1 Migration from the legacy 17-agent model

The 9-specialist model replaces the prior 17-agent decomposition (`aem-requirements-discovery`, `aem-solution-architect`, `aem-technical-design`, `aem-component-creation`, `aem-template-creation`, `aem-content-architecture`, `aem-integration-architect`, `aem-implementation`, `aem-workflow-agent`, `aem-security-permissions`, `aem-migration`, `aem-dispatcher-cdn`, `aem-code-quality`, `aem-test-automation`, `aem-performance-validation`, `aem-release-deployment`, `aem-operations-support`). Mapping:

| Legacy agent | New specialist |
|---|---|
| `aem-requirements-discovery` | `strategist` |
| `aem-solution-architect` | `strategist` |
| `aem-technical-design` | `designforge` |
| `aem-component-creation` | `blockwright` |
| `aem-template-creation` | `blockwright` |
| `aem-implementation` | `blockwright` |
| `aem-workflow-agent` | `blockwright` (authoring). Debugging / triaging = **un-owned** (out of ADLC scope after Pilot narrowed to Local + RDE). |
| `aem-migration` | `blockwright` |
| `aem-security-permissions` | `configsmith` |
| `aem-dispatcher-cdn` | `configsmith` (build). Incident-response = **un-owned** (out of ADLC scope after Pilot narrowed to Local + RDE). |
| `aem-integration-architect` | `bridgesmith` |
| `aem-content-architecture` | `composer` (+ new content-seeding capability) |
| `aem-code-quality` | `auditron` |
| `aem-test-automation` | `auditron` |
| `aem-performance-validation` | `sentinel` (+ new SEO / a11y-critical / observability tracks) |
| `aem-release-deployment` | `pilot` (Local + RDE only). Cloud Manager Dev / Stage / Prod promotion = **un-owned** (external process). |
| `aem-operations-support` | **Un-owned** (out of ADLC scope). Post-deploy incident triage, rollback beyond RDE, postmortems, and recurring-incident escalation are handled by a human or external SRE / on-call process. |

Legacy files are preserved at `docs/agents-legacy/` for forensic reading of historical runs (which still reference the old names in their `PLAN.md`, `handoffs/`, and dispatch packets). New runs MUST use the 9 new specialist names.

### 11.2 Pilot adoption checklist

1. **Pick a low-risk feature** (e.g., add one new component from a Figma reference). Have the Program Agent orchestrate end-to-end with the new specialist roster.
2. **Verify each handoff packet** lands at the expected path under `runs/{run-id}/handoffs/` (one YAML per specialist).
3. **Verify the new folder layout** — `plan/`, `design/`, `implement/{blockwright,configsmith}/`, `integrate/{bridgesmith,composer}/`, `test/{auditron,sentinel}/`, `deploy/`.
4. **Verify the always-on stages** all emit artifacts: strategist → designforge → auditron → sentinel → pilot. Composer's content-seeding track must produce at least one authored page + fixture manifest.
5. **Confirm the 2-mvn budget** holds (`tokens.json.by_agent.auditron.mvn_invocations == 2`).
6. **Confirm the demo-script.md** is auto-generated at session close.

---

## 12. Reference Modules

### 12.1 Dialog field type reference (Blockwright's components track)

| Dialog field purpose | Granite resource type | Property name convention |
|---|---|---|
| DAM image / logo | `form/pathfield` with `rootPath=/content/dam` | `{semantic}Reference` (e.g., `logoImageReference`) |
| Image alt text | `form/textfield` | `{semantic}Alt` (e.g., `logoAlt`) |
| Internal page link | `form/pathfield` with `rootPath=/content` | `{semantic}Link` |
| Short label / title | `form/textfield` | `{semantic}` (e.g., `title`, `ctaLabel`) |
| Long copy / description | `form/textarea` | `{semantic}` (e.g., `description`) |
| Rich text | `form/richtext` | `{semantic}Text` |
| Boolean toggle | `form/checkbox` | `{semantic}` (e.g., `openInNewTab`) |
| Repeating items | `form/multifield` (composite) | `{semantic}Items` (e.g., `navItems`) |
| Colour token select | `form/select` | `{semantic}Variant` |

**Common anti-patterns:**

| Anti-pattern | Correct approach |
|---|---|
| Logo as `textfield` | DAM `pathfield` (`logoImageReference`) + alt `textfield` (`logoAlt`) |
| `${clientlib.css}` in HTL | Clientlib goes into the page template or `ui.apps` clientlib inclusion — never in component HTL |
| No `__container` on full-width section | Add `__container` with `max-width: $layout-max-width; margin: 0 auto` |
| `__list` without `flex-direction` | Always declare `display: flex; flex-direction: column` on list wrappers |
| Inline SVG in Sling Model | Inline SVGs belong in HTL; the model provides only data |
| `loginAdministrative` in Sling Model | Service user via `ResourceResolverFactory` + repoinit (route to `configsmith`) |

### 12.2 CF Model field type reference (Composer's headless track)

| Content type | CF Model field type |
|---|---|
| Single-line text | `text-single` |
| Multi-line / rich text | `text-multi` |
| Integer | `integer` |
| Decimal | `decimal` |
| Boolean | `boolean` |
| Date + time | `calendar` |
| DAM asset reference | `content-reference` scoped to `/content/dam` |
| Another CF | `fragment-reference` with allowed models list |
| Enumeration (select) | `enumeration` |
| Tags | `tags` |

**Content-modelling decisions:**

| Question | Guidance |
|---|---|
| Simple vs structured? | Use structured CF for content with typed fields. Use simple CF only for long-form text pages. |
| Persisted vs ad-hoc query? | Always use persisted queries in production — ad-hoc queries are disabled on AEMaaCS publish by default. |
| Java GraphQL client vs JSON endpoint? | Use the Java GraphQL client (`AEMHeadlessClient`) when components render on the server. Use the JSON endpoint when a SPA / headless consumer fetches from the browser. |
| One endpoint or many? | One endpoint per `conf` path is the convention. Share a single `{project}` endpoint unless isolation is required. |

### 12.3 Integration design template (Bridgesmith)

Every `integration-design-{name}.md` MUST include these sections:

- **Contract** — endpoint, payload shape, direction, frequency.
- **Payload** — request / response examples.
- **Auth** — scheme (service user / OAuth client credentials / mTLS); secret placeholder syntax.
- **Reliability** — retry policy (max attempts, backoff scheme); timeout (connect + read ms); circuit-breaker thresholds; idempotency key strategy.
- **Error handling** — failure modes + recovery + dead-letter behaviour.
- **Service users required** — name, paths, permissions (passed to `configsmith` for repoinit).
- **OSGi config placeholders** — explicit `$[secret:NAME]` / `$[env:NAME]` listing.

### 12.4 Component reuse decision tree (Blockwright + Strategist)

```
1. Does a matching component already exist in the project?
      YES → Can it be extended via Sling Resource Merger (add a field, hide a field)?
              YES → Extend. Document the hidden fields in blockwright.yaml.
              NO  → Sub-type with sling:resourceSuperType pointing to the existing component.
       NO → Does Core Components offer a suitable base?
              YES → Extend Core Component (HTL overlay + dialog Sling Resource Merger).
              NO  → Create a net-new component.
```

### 12.5 Rendering pattern decision matrix (Strategist)

| Authoring model | Data model | Recommended pattern |
|---|---|---|
| Authors edit page layout in Sites | JCR-backed properties | Server-rendered Sites (HTL components) |
| Authors manage structured content items | Content Fragments | Headless CF + GraphQL → components render via Sling Model + persisted query |
| Both page layout and structured content | CF + JCR | Hybrid: template + HTL components that fetch CF data via GraphQL client |
| Non-technical editors, in-context editing | Any | Universal Editor (add `data-aue-*` instrumentation to components) |

---

**End of ADLC-SPEC.md.** For per-specialist operational detail, read the individual `.md` files under `.claude/agents/`. For legacy (pre-9-agent) contracts, see `docs/agents-legacy/`.
