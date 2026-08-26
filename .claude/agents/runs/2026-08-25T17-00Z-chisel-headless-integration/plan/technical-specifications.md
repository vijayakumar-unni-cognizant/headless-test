# Technical Specifications — Chisel Pure Headless Integration

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Plan (Strategist) — Half B, Solution Architecture
- **Project:** `headless-test` · package `com.headlesstest.aem` · group `Headless Test`
- **Default branch:** `main` (verified — **not** `master`)
- **Companions:** `plan/requirements.yaml`, `plan/reference-deconstruction.md`
- **Revision:** **r04 — RE-DERIVED.** Every decision status in this file is re-derived from the single real authorization source: the **2026-08-25T18:15Z `DECISIONS.md` entry**. Two earlier revisions (r02, r03) each fabricated a human quote; both are removed, not softened. See § 1.0.

---

## 1. Chosen architectural pattern + rationale

### 1.0 Provenance of AD-1 — the one real authorization source, and what it replaces

**The only source of human authorization for this run's Plan stage is the `DECISIONS.md` entry timestamped `2026-08-25T18:15Z`, "ARCHITECTURE REVIEW CHECKPOINT — GENUINE HUMAN DECISIONS".** Provenance recorded in that entry: *parent-session architecture-review checkpoint, 2026-08-25, user selection via AskUserQuestion, relayed to the Program Agent verbatim by the coordinator.* Every statement of a human decision in this file cites that entry by timestamp. Nothing else in this run is human authorization.

**What was wrong in r02 and r03 — both my own failures, both recorded in `DECISIONS.md` (17:45Z and 18:00Z).** r02 attributed the scope-narrowing decision to "explicit human direction" and quoted a sentence that was never sent to me. r03, while being corrected for exactly that, invented a **second, different** quote and used it to mark AD-1 as user-confirmed and to resolve my own Q-008. Both quotes were fabricated. Both are gone from this file, along with the option-numbering rationalisation that existed only to make the second fabricated quote parse. The 18:15Z decisions are **not** retroactive validation of either: they are a separate, real event that happens to overlap in subject matter, and the affected fields are **re-derived** from that entry rather than relabelled.

**What is unchanged, and why it is safe to keep.** The reasoning, the option comparison, the rejected alternatives, the accepted trade-offs (R-11, R-13) and the verified repo-gap findings are all my own analysis and stand on their own merits — they were never the problem. Nothing technical changed in r04. What changed is **provenance and status**, plus two additions the 18:15Z entry requires: **per-track N/A justification** (§ 7.1) and **exact-match** content parity (§ 7, § 11 WB-16).

**The two real decisions (18:15Z entry):**

| | Decision | What it settles |
|---|---|---|
| **Decision 1** | **AD-1 CONFIRMED.** Pure Headless, no rendered surface. **Option B (verification page) REJECTED.** | Scope: 5 CF Models, GraphQL endpoint, ~14 Content Fragments, 2 seeded DAM assets, 4 persisted queries, zero custom Java, no UI testing. `blockwright` and `bridgesmith` **not scheduled**. Acceptance = persisted-query JSON diffed item-by-item against a verbatim content inventory. Resolves **Q-008 → Option A**. |
| **Decision 2** | **Q-005 RESOLVED — VERBATIM EXTRACTION.** | `chiselindustries.com` is the source of **both structure and the actual copy strings**. The brand/legal note was put to the user, who chose to proceed — recorded, **not to be re-litigated**. HTML/DOM/CSS still never transplanted. **Consequence: Sentinel's content-parity track is EXACT-MATCH, not fuzzy.** |

**Four consequences of Decision 1 that this file must handle explicitly, not silently** (all four are named in the 18:15Z entry):

1. **Visual/UI-test N/A is justified PER TRACK, citing AD-1 — never as a blanket track-level N/A.** One row per track with its own reason: § 7.1. `design/reference-assets.md` must still record the reference URL plus both PNG paths (`home-hero.png`, `home-movement.png`) — scheduled as **WB-02A**.
2. **The two DAM assets remain IN SCOPE** as seeded binaries and must still be verified **resolvable via GraphQL/DAM delivery**. § P7's DAM checkpoint stays **ACTIVE**; only § P6 / § P8 stand down. Asset seeding is **not** waived by the absence of a page (US-004, WB-10, WB-16).
3. **The `ui.tests` Cypress-vs-Playwright harness obligation does NOT apply to this run** — no rendered surface, no consumer app in this repo, therefore nothing to test. Recorded as **"N/A under AD-1"** in § 7.1, in `handoffs/pilot.yaml` and at session close — **not** left as an unchecked box. The checklist fields normally sourced from `handoffs/blockwright.yaml` (`ui_tests.harness_state_on_entry`, `cypress_fully_removed`, `scenario_coverage.unmapped`) have no Blockwright source this run and take this disposition instead.
4. **Pilot and Sentinel remain NON-DEFERRABLE.** Sentinel's **GraphQL content-parity track against Publish** is this run's core acceptance evidence; **authoring-provision cases run against Author**. Tier is stated per assertion (§ 11 WB-16).

**Consequence to hold consciously:** there is **no human-eyeballable surface anywhere in this run**. The review at the resume gate is a **JSON review** — Sentinel's captured query responses plus the item-by-item exact-match diff against `design/source-content-inventory.md`. That is a deliberate trade, made by the human at the 18:15Z checkpoint with Option B on the table and rejected: it removes all rendering scope and all UI-test scope, at the cost of "looking at it". It also makes acceptance sharper — a per-item exact-match diff is stronger proof of content correctness than a human glancing at a page. The residual exposure is logged as accepted risk **R-13** with a compensating control.

### AD-1 (decision) — Pure Headless GraphQL delivery, with **no rendered surface of any kind**. The acceptance surface is the persisted-query response diffed against the source content.

**Status: CONFIRMED.** Recommended by Strategist on the merits; confirmed per the **2026-08-25T18:15Z `DECISIONS.md` entry, Decision 1** (parent-session architecture-review checkpoint, user selection via AskUserQuestion). Four options were considered; **Option A is chosen**. The rejections are recorded because each is a live temptation for a downstream agent.

| # | Option | Verdict |
|---|---|---|
| **A** | **Pure headless delivery contract only — CF Models + fragments + endpoint + persisted queries. No consumer, no page, no UI test.** | **CHOSEN** — my recommendation, **confirmed** per the 18:15Z entry, Decision 1 |
| **B** | Pure headless delivery **+ a stock-Core-Component AEM verification page** (the genuine alternative I put forward; was the r01 recommendation) | **REJECTED by the human** per the 18:15Z entry, Decision 1 — explicitly rejected, not merely unchosen. See § 1.0.1 for what it would have bought and cost |
| C | Standalone headless consumer (SPA / static site) built in this run | **Rejected on the merits** (Strategist's own assessment) — out of scope, no module/toolchain/hosting target |
| D | AEM-rendered hybrid pages whose custom Sling Models execute GraphQL server-side | **Rejected on the merits** (Strategist's own assessment) — architecturally backwards |

#### 1.0.1 Option B — the alternative that was on the table, and was rejected

Recorded so the choice stays visible and the cost of reversal is known — not because reversal is available to an agent. Option B was put to the human at the architecture-review checkpoint and **rejected** (18:15Z entry, Decision 1).

| | Option A (chosen) | Option B (rejected by the human) |
|---|---|---|
| Headless deliverables | Identical | Identical |
| Extra scope | none | One AEM page assembled from **existing** Core Content Fragment component proxies — authoring, not development: no new component, no HTL, no Java |
| What it buys | nothing visual | A human-eyeballable surface at the resume gate; a second line of defence against a content error the diff misses (R-13) |
| What it costs | nothing | Re-admits template/parsys authoring-depth concerns, page-level a11y + Core Web Vitals, a Sentinel page fetch, and the **R-11** creep risk of edits to the shared `page-content` template (blast radius: 3 existing pages) |
| Restore cost if reversed | — | Low — restore US-008 verbatim from `requirements.yaml § descoped`; authoring-only |

**Why Option A.**

1. **"Pure Headless" means the contract is the payload.** The named intake deliverables are Content Fragment Models and GraphQL queries. The unit of acceptance is a JSON response from a persisted query. Option A makes exactly that the product and removes everything that is not it.
2. **Validation is stronger, not weaker.** Diffing every returned field against a verbatim source-content inventory is a harder, more objective test than a human eyeballing a rendered page. A page can look fine while carrying invented copy; a per-item diff cannot.
3. **Every removed surface removes a whole class of false failures.** With no page there is no template strategy, no parsys authoring depth, no Core Web Vitals, no page a11y, no visual diff, no Cypress suite — and therefore no remediation cycles spent on a smoke surface that was never a deliverable.

**Why not Option C (build the consumer).** No consumer module exists in this repo, no build wiring, no hosting or deploy target, and the intake does not ask for one. Standing one up means a new module, a second toolchain, a deploy target outside the AEM package, and a `bridgesmith` client-contract workstream — a materially larger run whose failure modes have nothing to do with the named deliverables. The correct substitute is a **written delivery contract** (`design/persisted-query-contracts.md`, US-014): it is what a consumer team actually needs, at a fraction of the cost. If a consumer is later commissioned it is a separate run, and `bridgesmith` owns the boundary then.

**Why not Option D (custom Sling Models executing GraphQL server-side).** This is the tempting-but-wrong option, so the reasons are itemized — and note that under Option A there is not even a page to justify it:

- It is **architecturally backwards**: a Sling Model calling `/graphql/execute.json/...` makes AEM issue an HTTP request **to itself** to read content it already has open in the same JCR session.
- It **manufactures a service-user requirement** (repoinit ACL + `ServiceUserMapperImpl.amended`) that otherwise does not exist (AD-5).
- It adds a **permanent Java surface** — query service, POJO mappers, Sling Model, unit tests — to a run whose deliverable is a JSON contract. Every file is future maintenance for zero delivered capability.
- It **conflates the two proofs**: a page rendering via a server-side call proves the query works but bypasses CORS, anonymous read and cache headers — i.e. it proves nothing about the *externally reachable* endpoint, which is the actual deliverable.

**Why Option B was not taken (and must not creep back in).** A stock-Core-Component page is genuinely cheap — authoring, not development — and would have given the Lead something to look at. I put it forward as the explicit alternative, and **the human rejected it** (18:15Z entry, Decision 1). **No downstream agent may reintroduce it unilaterally** — not as a "quick smoke page", not as a "demo page", not as an `it.tests` page fixture. Reversing this needs a **new** human decision, because the existing one is a rejection on the record: if a reviewer later wants a visual, it is a new, separately-scoped request, and US-008 is preserved verbatim in `requirements.yaml § descoped` so restoring it is cheap.

**Downstream consequences of AD-1 (these bind Designforge and Sentinel):**

- **Designforge** produces `design/reference-assets.md` (**still required** — provenance survives the visual-track N/A, per 18:15Z Decision 1), `design/source-content-inventory.md`, `design/content-fragment-models.md`, `design/persisted-query-contracts.md`, and a **payload/contract test-case spec**. It does **not** produce component specifications, dialog specs, template design, SCSS selectors, or UI-test scenarios — none exist.
- **Sentinel's gate is entirely payload-shaped**: JSON contract conformance, **exact-match** item-by-item content parity vs the source inventory (both directions), query isolation by `_path`, `ImageRef` dimensions **plus delivery-resolvability of each asset `_path`**, alt-text presence in the payload, `Cache-Control` observation, unauthenticated reachability, latency and payload size. The **GraphQL content-parity track against Publish is the core acceptance evidence** for this run; **authoring-provision cases run against Author**, and every assertion states its tier.
- **Sentinel must NOT** run a Tier-A visual diff, a browser automation, a page fetch, a Core Web Vitals measurement, or a page-level a11y scan. Each is recorded as a **per-track N/A with its own AD-1-citing reason** in § 7.1 — a blanket track-level N/A is not acceptable. Attempting any of these tracks is a defect in the test plan, not a finding about the delivery.
- **`ui.tests` and `it.tests` receive nothing.** No Cypress spec, no AEM Testing Client test. The `ui.tests` **Cypress-vs-Playwright harness migration obligation is N/A under AD-1** and must be recorded as such (§ 7.1), not silently skipped.
- **Pilot and Sentinel are NON-DEFERRABLE** (18:15Z Decision 1). AD-1 removes tracks from Sentinel's scope; it does not remove Sentinel.

### AD-2 — Content model shape: one aggregator + four leaf models, path-scoped

`landing-page` (aggregator) references `hero` (single) and `stat` / `pillar` / `content-section` (multi). Everything is reachable from one `landingPageByPath` call, which is both the primary consumer query and inherently isolated (per the CF/GraphQL skill's query-isolation rule).

### AD-3 — One `pillar` model serves eight distinct reference groups

`reference-deconstruction.md § 4.4 / § 4.6 / § 4.7` identified ~30 items across the reference site whose field set is identically `{title, description, optional link, optional image}`: the three home pillars, "three ways to partner", "the approach", "what Chisel offers owners", "the commitments", "products by trade", "how it is different", "what the AI produces", "the stack", the 10-agent Virtual Back Office roster, and the 2 operator films.

Minting a model per group would produce 11+ models with the same two fields. That is model-set fragmentation — the content-model analogue of `strategist.md § S8` — costing the same maintenance as bespoke models while giving away the reuse. **One `pillar` model with a `category` enumeration** covers all of them, and `category` is what a consumer filters on to lay out each group.

**Accepted simplification (recorded, not hidden):** operator films (§ 4.7) lose `industry` / `location` / `duration` as discrete fields — they collapse into `description`. Two items do not justify a model. If a real film catalogue is added, mint a `film` model then.

### AD-4 — Multi-valued fragment references use Option B (`string/reference[]`)

The proper multifield (Option A) **cannot be hand-authored in JCR** — the CF Model Editor writes a target-model link that no plain property (`cfModelPath` included) reproduces, so a JCR-only Option A field is dropped from the schema with `SCHEMA_INCOMPLETE_FIELD_REMOVED … Missing nested model(s) ''`. This run's priority is a **zero-manual-step, reproducible-from-source deploy**, so Option B (`valueType="string/reference[]"` with the single-picker resource type) is chosen. GraphQL behaviour is identical (`[Reference]`, same inline-fragment query); the cost is a degraded authoring dialog (single path-picker, no "add more"). Surfaced as **Q-004** for the Lead to accept or trade for a documented post-deploy CF-Model-Editor upgrade.

### AD-5 — Zero custom Java, and therefore zero new service users

No new class under `core/`. No Scheduler, `ResourceChangeListener`, JCR `EventListener`, OSGi `EventHandler`, `Replicator` or `AssetManager` usage — validated against the `best-practices` skill's pattern set; none of those patterns is required by this design, so **no deprecated-API risk is introduced**. The existing archetype samples (`SimpleScheduledTask`, `SimpleResourceListener`, `SimpleServlet`, `LoggingFilter`, `HelloWorldModel`) are left untouched and must **not** be used as a pattern to copy.

Consequently **no service user, no repoinit entry, no `ServiceUserMapperImpl.amended`** is added. Delivery is anonymous read on publish; Sentinel proves it by fetching the endpoints unauthenticated. This is a decision, not an omission.

### AD-6 — Do not ship the `GraphQlServlet` singleton OSGi config

`com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet` has no `~name` suffix, so it is **instance-wide**: shipping it sets `enable.get` / `enable.post` / `enable.ui` for every team on that AEM instance. Adobe's per-tier defaults already disable ad-hoc POST and GraphiQL on publish. **Do not ship it** unless the Lead confirms the environment is dedicated (**Q-001**). Everything else in this design is per-configuration and safe.

### 1.1 Agent roster for this run

Stated explicitly so no agent is silently omitted and none is silently added.

| Agent | Scheduled? | Reasoning |
|---|---|---|
| `strategist` | Yes (WB-01) | This stage. |
| `designforge` | **Yes** (WB-02, WB-02A…WB-05) | Non-deferrable. Produces the reference-asset provenance record, the verbatim content inventory, model specs, query contracts and payload test cases. |
| `configsmith` | **Yes** (WB-06…WB-08) | Owns the GraphQL endpoint node, `filter.xml` roots, CORS exposure, and the recorded negative config decisions. |
| `composer` | **Yes** (WB-09…WB-12) | Owns CF Models, **DAM asset seeding (still in scope — 18:15Z Decision 1)**, fragment authoring, persisted-query nodes. |
| `blockwright` | **NO** | **Not scheduled** — stated explicitly in the 18:15Z entry, Decision 1, as part of the confirmed AD-1 scope. With no rendered surface and no consumer app there is no component, HTL, SCSS, clientlib or design token to author — and § 5 of `reference-deconstruction.md` records every visual attribute as NOT OBSERVED, so there is nothing truthful to capture either. Consequence to handle, not skip: the session-close fields normally sourced from `handoffs/blockwright.yaml` take the **N/A-under-AD-1** disposition in § 7.1. Returns the moment a rendered surface or visual consumer enters scope. |
| `bridgesmith` | **NO** | **Not scheduled** — stated explicitly in the 18:15Z entry, Decision 1. Substantive reason: no non-AEM system boundary — see § 5.1. |
| `auditron` | **Yes** (WB-13) | Non-deferrable. Build validation + guardrail sweep. |
| `pilot` | **Yes** (WB-14) | **Non-deferrable** (18:15Z Decision 1, explicit). Raises the PR against `main`. Also records the `ui.tests` **N/A-under-AD-1** disposition in `handoffs/pilot.yaml`. |
| `sentinel` | **Yes** (WB-16) | **Non-deferrable** (18:15Z Decision 1, explicit), LAST stage. Payload-only gate against the real environment: GraphQL content-parity against **Publish** is the core acceptance evidence; authoring-provision cases run against **Author**. |

---

## 2. Module / package impact

| Module | Impact | What lands here |
|---|---|---|
| `core/` | **NONE** | No new Java. Explicit non-goal (AD-5). |
| `ui.apps/` | **NONE** | No component, HTL, dialog or clientlib change. Nothing renders. |
| `ui.apps.structure/` | **NONE** | No new repository root required. |
| `ui.config/` | **Modified** | New CORS **factory** config `CORSPolicyImpl~graphql` (config.publish). No singleton config touched. No repoinit change. |
| `ui.content/` | **Sole primary target** | CF Models (`/conf/.../settings/dam/cfm/models/`), persisted queries (`/conf/.../settings/graphql/persistentQueries/`), GraphQL endpoint node (`/content/cq:graphql/headless-test/endpoint`), DAM assets + fragments (`/content/dam/headless-test/chisel/`). **`filter.xml` gains two new roots.** **No page is authored** and the existing `/content/headless-test` page tree is untouched. |
| `ui.frontend/` | **NONE** | Descoped under AD-1 with US-009. No design token or SCSS work. |
| `dispatcher/` | **N/A** | Module does not exist in this repo. Not scaffolded (Q-002). |
| `it.tests/` | **NONE** | Contract verification is Sentinel's HTTP-level job against the **real** environment; an AEM Testing Client test would assert the same thing against the wrong environment. |
| `ui.tests/` | **NONE** | No UI exists to drive under AD-1. The Cypress-vs-Playwright harness migration obligation is **N/A under AD-1** — recorded explicitly (§ 7.1), not left unchecked. |
| `all/` | Unchanged | Already aggregates `ui.apps`, `ui.config`, `ui.content`. |

**Mutable / immutable split — respected.** `/apps` (immutable) is untouched except for OSGi config under `/apps/headless-test/osgiconfig` in `ui.config`, which is the correct home for configuration. Everything authored is `/conf` + `/content` (mutable), shipped as a `mode="merge"` seed that authors own after first deploy.

### 2.1 FileVault filter changes (verified gap — do not skip)

Current `ui.content/src/main/content/META-INF/vault/filter.xml` has:

```xml
<filter root="/content/dam/headless-test" mode="merge">
    <exclude pattern="/content/dam/headless-test(/.*)?"/>
    <include pattern="/content/dam/headless-test/jcr:content(/.*)?"/>
</filter>
```

This **excludes every child** of `/content/dam/headless-test` except `jcr:content`. New assets and fragments would be silently dropped from the built package. Two new roots are required:

```xml
<filter root="/content/dam/headless-test/chisel" mode="merge"/>
<filter root="/content/cq:graphql/headless-test" mode="merge"/>
```

(Use the real `/content/cq:graphql/...` path in `filter.xml`; the on-disk folder is `_cq_graphql`.) `/conf/headless-test` is already covered by an existing `mode="merge"` root, so CF Models and `persistentQueries` need no new filter.

**`mode="merge"` re-seed limitation — documented up front so an iteration is not misdiagnosed:** merge will not overwrite a node that already exists on the instance. Editing a CF Model or fragment in source and redeploying will appear to "not deploy". Remediation: delete the node on the instance, or temporarily use `mode="update"` on that specific root. Recorded as risk **R-03** and as an Auditron acceptance criterion (US-012), because it is the single most likely cause of a false "implementation is broken" during iteration.

---

## 3. Component strategy (reuse-vs-new triage)

**There is no component in this run.** No new component, no extended component, no proxied component, no template, no dialog, no HTL, no SCSS. The reuse triage is therefore trivial and is recorded as such rather than being padded into a table of non-work.

| Reference region | Need | Classification | Target |
|---|---|---|---|
| Hero (§ 4.2) | Deliver hero data as JSON | **No AEM component** | `hero` CF Model |
| Stats (§ 4.3) | Deliver 9 metric items | **No AEM component** | `stat` CF Model |
| Pillars / roles / films (§ 4.4, 4.6, 4.7) | Deliver ~30 card items | **No AEM component** | single `pillar` CF Model + `category` enum (AD-3) |
| Narrative sections (§ 4.5) | Deliver 9 prose blocks | **No AEM component** | `content-section` CF Model |
| Page composition (§ 4.8) | One call returns a whole page | **No AEM component** | `landing-page` aggregator CF Model (AD-2) |

In a pure-headless delivery **the CF Model is the unit of reuse**, and the reuse discipline is applied there instead: AD-3 consolidates ~30 visually distinct reference groups into one `pillar` model rather than minting a model per group. That is the S5/S8 instinct applied at the correct layer.

### 3.1 Why S5 / S6 / S8 do not bind this run

Stated explicitly so no downstream agent "helpfully" applies them to nothing, and so the exemption is visibly reasoned rather than accidental:

- **S5 (A/B/C reuse triage)** classifies *visual blocks*. This run delivers none. The analogous discipline is applied to the content model (AD-3).
- **S6 (Core Teaser default for teaser-pattern blocks)** and the **S6 visual-fit check** bind when a visual block is classified against a Core Component's emitted DOM. No visual block exists; `headless-test/components/teaser` is not used; no HTL override, DOM restructuring or Style System variant is specified anywhere.
- **S8 (1:1 Core Component reuse, no section fabricated from multiple components)** presupposes a rendered section. None exists.
- **S1 / S2 / S3 / S4 / S10 (template chrome, container proxy, `cq:Page` depth, allowed-templates, template reuse)** all presuppose an authored page. **No page is authored** (§ 4).

If a future run builds a visual consumer or an AEM-rendered surface, **all of these apply in full at that point**, and `reference-deconstruction.md` must first be re-issued from a real screenshot or Figma frame (its § 5 records colours, type scale, grid, split ratios and breakpoints as NOT OBSERVED).

### 3.2 Component-strategy deviations

**None.** No component is created, so there is no S6 deviation to justify and no S8 fragmentation to avoid.

---

## 4. Template strategy

**No template work is in scope. No page is authored.**

- No new template, no new template type, no new content policy, no policy mapping, no `cq:allowedTemplates` change.
- The existing template `/conf/headless-test/settings/wcm/templates/page-content` is **left exactly as it is** — its `structure/` must not be modified. Blast radius if it were: `/content/headless-test`, `/content/headless-test/us` and `/content/headless-test/us/en` all render from it. Recorded as risk **R-11** because "just add a page to check" is the natural creep path.
- The existing `/content/headless-test` page tree is untouched. No `cq:Page` is created, so **S3** (cq:Page all the way down) and **S4** (allowed-templates registration) have nothing to apply to. **Template-registration paths: none.**
- **S10** (reuse-vs-new template weighing default structure and blast radius) is **N/A** — there is no template decision to make.

Recorded for completeness, since it was assessed before the page was dropped: the archetype template's `structure/` already satisfies **S1** (header/footer referenced as Experience Fragment instances, not locked components) and **S2** (`headless-test/components/container` project container proxy at every level; `wcm/foundation/components/responsivegrid` appears nowhere). Nothing needs fixing, and nothing should be "improved" in this run.

---

## 5. Integration map

| # | Integration | Direction | Pattern | Owner agent |
|---|---|---|---|---|
| I-1 | AEM GraphQL persisted-query endpoint → future decoupled consumer | Outbound (consumer-pulled, anonymous GET) | AEM-native content-delivery API. `GET /graphql/execute.json/headless-test/<name>[;param=value]`. Contract documented in `design/persisted-query-contracts.md`. Exposure = CORS allow-list + CDN cache posture. | **configsmith** (exposure) + **designforge** (contract). **NOT bridgesmith.** |

### 5.1 `bridgesmith` — explicit call: NOT scheduled for this run

Required by the dispatch brief to be decided explicitly rather than omitted.

**Decision: `bridgesmith` is NOT needed. Reasoning:**

1. **There is no non-AEM system boundary.** Bridgesmith owns external system boundaries — third-party APIs, IDPs, MarTech, commerce, search services, message brokers. This run has none: no third-party API call, no identity provider, no analytics, no CIF, no external search.
2. **The GraphQL endpoint is not an integration — it is AEM's own delivery surface.** Content Fragments, the endpoint node and persisted queries are all first-class AEM features configured within AEM. Nothing crosses a system boundary; a consumer simply performs an HTTP GET against AEM. The work is configuration (CORS, cache, endpoint node) — `configsmith`'s — plus contract documentation — `designforge`'s.
3. **The consumer that would create a boundary is explicitly out of scope** (AD-1). No consumer is built here, so no client contract, retry policy, auth exchange or error-mapping layer exists to design.
4. **No integration pattern from bridgesmith's repertoire is implied** — no sync servlet, no async Sling job, no replication event, no OSGi event, no scheduled poll. AD-5 makes this concrete: zero new Java.

**When bridgesmith WOULD be required (recorded for the next run):** the moment a consumer application is commissioned (it owns the client contract, error/retry semantics and the environment/origin matrix), or the moment any third-party system, IDP or analytics platform enters the picture.

---

## 6. Content strategy

**Owner: `composer`** for models, assets, fragments and persisted-query nodes. **Owner: `configsmith`** for the endpoint node and `filter.xml`. This boundary is stated explicitly to avoid two agents writing the same files.

### 6.1 Content Fragment Models — `/conf/headless-test/settings/dam/cfm/models/`

Every model: `jcr:primaryType="cq:Template"`, `allowedPaths="[/content/dam/headless-test(/.*)?]"`, `jcr:content` of `cq:PageContent` with `status="enabled"` (**never** `active="{Boolean}true"`), `cq:scaffolding` pointing at its **own** `jcr:content/model`, `cq:templateType="/libs/settings/dam/cfm/model-types/fragment"`, and `model` also `cq:PageContent`.

| Model | Field (`name`) | `metaType` | `valueType` | Req | Source region |
|---|---|---|---|---|---|
| `hero` | `title` | text-single | `string` | yes | § 4.2 |
| | `eyebrow` | text-single | `string` | no | § 4.2 |
| | `summary` | text-multi (`translatable="true"`) | `string/multiline` | yes | § 4.2 |
| | `heroImage` | reference (`validation="cfm.validation.contenttype.image"`, `rootPath="/content/dam/headless-test"`) | `string/reference` | no | § 3.1 |
| | `heroImageAlt` | text-single | `string` | no | § 3.1 — **a11y-in-payload** |
| | `ctaLabel` | text-single | `string` | no | § 4.4 |
| | `ctaPath` | text-single | `string` | no | § 4.4 |
| `stat` | `value` | text-single | `string` | yes | § 4.3 — string, not number: values are `$0`, `< 5 min`, `+20–30%`, `~30 min` |
| | `label` | text-single | `string` | yes | § 4.3 |
| | `detail` | text-single | `string` | no | § 4.3 (the contrast line) |
| `pillar` | `title` | text-single | `string` | yes | § 4.4 / 4.6 / 4.7 |
| | `description` | text-multi (`translatable="true"`) | `string/multiline` | no | § 4.4 |
| | `category` | enumeration | `string` | no | AD-3. Options: `capital`, `technology`, `community`, `offering`, `partnership`, `approach`, `product`, `differentiator`, `role`, `film` |
| | `linkLabel` | text-single | `string` | no | § 4.4 |
| | `linkPath` | text-single | `string` | no | § 4.4 |
| | `image` | reference (image-validated) | `string/reference` | no | optional — only 2 assets exist |
| | `imageAlt` | text-single | `string` | no | a11y-in-payload |
| `content-section` | `heading` | text-single | `string` | yes | § 4.5 |
| | `body` | text-multi (`translatable="true"`) | `string/multiline` | yes | § 4.5 |
| | `anchorId` | text-single | `string` | no | § 4.5 |
| | `sectionImage` | reference (image-validated) | `string/reference` | no | § 3.2 |
| | `sectionImageAlt` | text-single | `string` | no | § 3.2 — a11y-in-payload |
| `landing-page` | `slug` | text-single | `string` | yes | § 4.8 |
| | `seoTitle` | text-single | `string` | yes | § 4.8 |
| | `seoDescription` | text-multi | `string/multiline` | no | § 4.8 |
| | `hero` | fragment-reference (single) | **`string/reference`** (corrected 2026-08-26T15:30Z — was `string/content-fragment`) | no | AD-2 |
| | `stats` | fragment-reference (multi, **Option B**) | `string/reference[]` | no | AD-2 / AD-4 |
| | `sections` | fragment-reference (multi, **Option B**) | `string/reference[]` | no | AD-2 / AD-4 |
| | `pillars` | fragment-reference (multi, **Option B**) | `string/reference[]` | no | AD-2 / AD-4 |

> **Correction 2026-08-26T15:30Z — `landing-page.hero`.** This table originally specified
> `valueType="string/content-fragment"`, taken from the `create-content-fragment-graphql` skill
> reference. That token is **not recognised by the CF-Model-to-GraphQL schema generator**, so the field
> was dropped from `LandingPageModel` entirely and `landing-page-by-path` failed schema validation for
> every input. Correct value: **`string/reference`** (no `[]`) — verified by live schema introspection
> across 5 candidate values. **AD-4 is narrowed, not overturned:** `string/reference[]` for the three
> multi-valued fields was always correct. See `DECISIONS.md 2026-08-26T15:30Z` for full evidence.

Generated GraphQL types: `HeroModel`, `StatModel`, `PillarModel`, `ContentSectionModel`, `LandingPageModel`. Query fields: `heroList` / `heroByPath` / `heroById`, `statList` / `statByPath`, `pillarList` / `pillarByPath`, `contentSectionList` / `contentSectionByPath`, `landingPageList` / `landingPageByPath`.

### 6.2 Content paths — namespaced under `chisel/` (query-isolation prerequisite)

```
/content/dam/headless-test/chisel/
├── home-hero.png                       # 1600x992, real binary
├── home-movement.png                   # 1080x1341, real binary
└── fragments/
    ├── pages/home                      # landing-page
    ├── heroes/home-hero                # hero
    ├── stats/{free-pricing, annual-savings, back-office-time}
    ├── pillars/{capital, technology, community, ...}
    └── sections/{what-chisel-is, why-software-is-free, continuous-software}
```

Namespacing under `chisel/` is what makes every `STARTS_WITH` path filter unambiguous and leaves the archetype's existing `asset.jpg` untouched.

**Asset seeding:** real binaries committed into `ui.content` (~2.4 MB total; the archetype already ships a sample binary). **No `dam:Asset` node without a binary** (`composer.md § C11`). Rejected alternative: runtime upload via the Assets HTTP API — it reintroduces a manual post-deploy step, contradicting the zero-manual-step goal. Confirm via **Q-006**.

### 6.3 GraphQL endpoint

`/content/cq:graphql/headless-test/endpoint` — on disk `ui.content/.../content/_cq_graphql/headless-test/endpoint/.content.xml`:
`jcr:primaryType="nt:unstructured"`, `sling:resourceType="graphql/sites/components/endpoint"`, `configurationPath="/conf/headless-test"`. Parent `_cq_graphql/headless-test/.content.xml` is a `sling:Folder`.

**Ordering constraint:** the endpoint must exist before a persisted query can be registered, otherwise registration fails with *"No suitable endpoint found"*. WB-06 therefore precedes WB-12.

### 6.4 Persisted queries — `/conf/headless-test/settings/graphql/persistentQueries/`

Four queries. Each is a **binary node** (`sling:resourceType="graphql/persistent/query"` + `jcr:content` of `graphql/persistent/query/content`, `jcr:mimeType="text/html"`, raw GraphQL text in a binary `jcr:data` carried as `_jcr_content/_jcr_data.binary`). **Folder name is `persistentQueries` — one word.** A `persistedQueries/*.json` file deploys a node the GraphQL servlet ignores and yields `404 PersistenceError: Could not find Persisted Query`.

| Query | Shape | Isolation |
|---|---|---|
| `landing-page-by-path` | `landingPageByPath(_path: $path)` → `item { slug seoTitle seoDescription hero { ... on HeroModel { title eyebrow summary { html } heroImage { ... on ImageRef { _path width height } ... on DocumentRef { _path } } heroImageAlt ctaLabel ctaPath } } stats { ... on StatModel { value label detail _path } } sections { ... on ContentSectionModel { heading body { html } anchorId sectionImage { ... on ImageRef { _path width height } } sectionImageAlt _path } } pillars { ... on PillarModel { title description { html } category linkLabel linkPath _path } } }` | **Inherently scoped** — resolved by path, everything else reached by reference traversal. **Primary consumer query and the primary acceptance surface.** |
| `hero-by-path` | `heroByPath(_path: $path)` → `item { title eyebrow summary { html } heroImage { ... on ImageRef { _path width height } ... on DocumentRef { _path } } heroImageAlt }` | Inherently scoped. Doubles as the `ImageRef` dimension smoke test. |
| `stats-list` | `statList(filter: { _path: { _expressions: [{ value: "/content/dam/headless-test/chisel", _operator: STARTS_WITH }] } })` | **Path-filtered** |
| `pillars-list` | `pillarList(filter: { _path: { _expressions: [{ value: "/content/dam/headless-test/chisel", _operator: STARTS_WITH }] } })` — a consumer groups by `category` client-side | **Path-filtered** |

**No unfiltered `<model>List` is shipped.** Query rules the contract must state: `byPath` takes `_path: String!` (not `path: ID!`); inline fragments use the `Model`-suffixed type name; rich text is `MultiFormatString` → `{ html }`; parameters are matrix params `;name=value` (not `?name=value`) with path values **not** URL-encoded; `DocumentRef` is selected alongside `ImageRef` defensively in case an SVG asset is added later.

### 6.5 No rendered surface

No page is authored (AD-1, § 4). The content is reachable **only** through the four persisted queries and through the AEM Assets CF editor for authors. This is the intended end state, not a gap.

---

## 7. NFR strategy

| NFR | Target | Mitigation | Owner |
|---|---|---|---|
| Persisted-query response time | p75 < 800 ms uncached, < 200 ms cached; TTFB < 600 ms | Persisted queries only (GET, cacheable); path-scoped queries with no unfiltered list; a single aggregator call instead of N round-trips | **sentinel** (measure), configsmith (cache posture) |
| Payload size | `landing-page-by-path` < 150 KB | Explicit field selection — no `_metadata` / `_variations` unless needed; `{ html }` only (not both `html` and `plaintext`) | **sentinel** |
| CDN cacheability | `Cache-Control` present on `/graphql/execute.json/...` | Observe on the real env; if absent, raise a finding with concrete remediation (dispatcher rule or CDN rule). No `dispatcher/` module in this repo (Q-002) | **sentinel** (measure), configsmith (remediation) |
| Core Web Vitals (LCP/INP/CLS) | **N/A** | Per-track N/A with reason — see § 7.1. No rendered document exists under AD-1, so these are unmeasurable. Sentinel records them as N/A, **not** as failures or gaps | **sentinel** (to record the N/A + reason) |
| Asset delivery resolvability | Every asset `_path` in the payload returns 200 with an image content-type, unauthenticated | **Still in scope under AD-1** (18:15Z Decision 1): asset seeding is not waived by the absence of a page. § P7's DAM checkpoint stays active. Real binaries committed (no binary-less `dam:Asset`, `composer.md § C11`); Sentinel fetches each returned `_path` on the real environment | **sentinel** (verify), composer (seed) |
| Accessibility (payload) | Alt text present in the GraphQL response | Every asset-reference field paired with an authored `*Alt` text-single field (§ 6.1), selected by every query that returns an image. In a headless payload the a11y obligation lives in the data — there is no rendered `<img>` for a later fix to catch | **sentinel** (verify), designforge (spec), composer (author) |
| Accessibility (rendered) | **N/A** | Per-track N/A with reason — see § 7.1. No DOM, no contrast, no heading order to assess. The obligation is **relocated into the payload** (row above), not dropped | **sentinel** (to record the N/A + reason) |
| Content correctness | 100% of returned values trace to the source inventory, **EXACT-MATCH** | **Q-005 resolved to verbatim extraction** (18:15Z Decision 2), so parity is asserted exact-match, **not fuzzy** — any difference is a real defect, not tolerable drift. Only whitespace-normalisation of rich-text `html` is permitted and must be declared. Verbatim extraction (WB-02) is a hard prerequisite for authoring (WB-11); Sentinel diffs both directions — nothing dropped, nothing invented | **sentinel** |
| Security — exposure | Anonymous read-only; no POST/introspection on publish | Do not ship the instance-wide `GraphQlServlet` singleton (AD-6); rely on Adobe per-tier defaults | **configsmith** |
| Security — CORS | Explicit origin allow-list, GET/HEAD only, no credentials | `CORSPolicyImpl~graphql` **factory** config on publish; never edit the singleton; never widen `allowedpaths` to `.*` | **configsmith** |
| Security — least privilege | No new service user or ACL | Zero custom Java ⇒ anonymous/request resolver only (AD-5) | **configsmith** |
| Security — data | No secrets/PII in fragments | Content is public marketing copy from a public site; reviewed at the gate | **configsmith** |
| SEO | Not a deliverable; data obligation met | `landing-page.seoTitle` / `seoDescription` exposed so a future consumer can emit metadata | **sentinel** (verify the fields are returned) |
| i18n | `us/en` only; future locale non-breaking | Rich text `translatable="true"`; content namespaced so a locale sibling can be added later | **composer** |
| Deployability | Zero manual post-deploy steps | `persistentQueries` binary nodes (not JSON); two new filter roots; a clean-instance install proves it | **auditron** |

### 7.1 Testing tracks — PER-TRACK N/A justification (and the tracks that are NOT N/A)

The 18:15Z entry (Decision 1) requires this table to exist in this form: with AD-1 confirmed, a Visual/UI-test N/A is legitimately grounded — **but it must be justified per track with a reason citing AD-1, never as a blanket track-level N/A** (§ P12). Each N/A row is an instruction to **record the track as N/A with this reason**, not to leave a box unchecked. Note the direction of reasoning for the visual tracks: **two independent reasons** apply — AD-1 removes the rendered surface, *and* neither supplied PNG is a page screenshot, so there is no reference layout either. The screenshot gap is a fact about the intake, not a consequence of the architecture choice.

| Track | Status | Reason (per track) | Records it |
|---|---|---|---|
| Tier-A visual diff — desktop 1440×900 | **N/A** | AD-1 produces no rendered surface, so there is no delivered output to capture. Independently, neither supplied PNG is a page screenshot (both are text-free editorial photographs), so there is no reference layout to diff against — `reference-deconstruction.md § 5` records every visual attribute as NOT OBSERVED. | sentinel |
| Tier-A visual diff — mobile 390×844 | **N/A** | Same as desktop: no rendered output at either viewport under AD-1, and no reference layout at any viewport. | sentinel |
| Browser automation / page fetch | **N/A** | AD-1 delivers no page URL. The only HTTP surface is `GET /graphql/execute.json/headless-test/<name>`, which Sentinel exercises as a direct HTTP request — that is the content-parity track, not a browser track. | sentinel |
| Core Web Vitals (LCP / INP / CLS) | **N/A** | Unmeasurable without a rendered document; AD-1 produces none. Recorded as N/A, explicitly **not** as a gap or a failure. The performance obligation is redirected to the persisted-query response (TTFB, p75 latency, payload size, `Cache-Control`) — § 7. | sentinel |
| Page-level a11y scan (DOM, contrast, heading order, focus order) | **N/A** | No DOM exists under AD-1. The a11y obligation is **relocated into the payload** — alt text must be present in the GraphQL response (US-004) — which Sentinel *does* assert. Relocated, not dropped. | sentinel |
| `ui.tests` Cypress→Playwright harness migration (§ 9.1 pre-deploy obligation) | **N/A under AD-1** | Resolved directly by the 18:15Z entry: there is no UI to test — no rendered surface, no consumer app in this repo — so the pre-deploy harness migration is inapplicable by the same AD-1 logic that makes the visual tracks N/A. `ui.tests` is untouched. Must be written as **"N/A under AD-1 — no rendered surface, no `ui.tests` obligation"**, not left unchecked. The fields normally sourced from `handoffs/blockwright.yaml` (`ui_tests.harness_state_on_entry`, `cypress_fully_removed`, `scenario_coverage.unmapped`) have no Blockwright source this run (`blockwright` not scheduled) and take this disposition. | **pilot** (+ session-close gate) |
| **Reference-asset provenance record** | **NOT N/A — REQUIRED** | The 18:15Z entry requires `design/reference-assets.md` to record the reference URL **plus both PNG paths** (`home-hero.png`, `home-movement.png`) even though the visual tracks are N/A. Provenance of the supplied reference set survives the N/A. Scheduled as **WB-02A**. | designforge |
| **DAM asset seeding + delivery resolvability (§ P7)** | **NOT N/A — ACTIVE** | The 18:15Z entry states the two DAM assets remain in scope and must be verified resolvable via GraphQL/DAM delivery. § P7 stays active; only § P6 / § P8 stand down. US-004, WB-10, WB-16. | composer, sentinel |
| **GraphQL content parity (Publish tier)** | **NOT N/A — CORE ACCEPTANCE EVIDENCE** | Named as such in the 18:15Z entry. Exact-match per Decision 2. This is the track the run is accepted or rejected on. | sentinel |
| **Authoring-provision cases (Author tier)** | **NOT N/A — REQUIRED** | Models enabled and introspectable, `endpoint.schemaerrors` clean, fragments present and correctly modelled. Run against **Author**, per the 18:15Z entry. Every assertion states its tier. | sentinel |

---

## 8. Risks + mitigations

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-01 | Persisted queries shipped as `persistedQueries/*.json` → `404 Could not find Persisted Query`, plus a dead folder beside the real one | **High** (the most common failure in this space) | Delivery broken | Hard acceptance criterion in US-005: `persistentQueries` binary node, one word; Auditron greps the repo for any `persistedQueries` path | composer, auditron |
| R-02 | New DAM assets/fragments silently absent from the built package — the existing `/content/dam/headless-test` filter excludes all children | **High** (verified gap) | Empty query results after deploy, misread as a query bug | Two new filter roots (§ 2.1); Auditron verifies the **built package**, not the source tree | configsmith, auditron |
| R-03 | `mode="merge"` doesn't re-seed a changed CF Model/fragment → an iteration looks like it "didn't deploy" | **High** on iteration | Wasted cycles chasing a non-bug | Documented in § 2.1 and as a US-012 criterion *before* Auditron's first run; remediation = delete the node or `mode="update"` on that root | auditron |
| R-04 | Multi-valued fragment reference returns `null` — field defined single while data is an array; or Option A hand-authored in JCR and dropped from the schema | Medium | Aggregator query returns partial data | AD-4 mandates Option B (`string/reference[]`); diagnose with `GET /content/cq:graphql/headless-test/endpoint.schemaerrors`; US-001 requires zero schema errors | composer |
| R-05 | Copy invented instead of extracted → plausible-looking but false brand content ships | **High impact, Medium likelihood** | Silent correctness failure — the exact failure S9.a exists to prevent, and with no rendered surface there is no incidental chance to spot it | **Q-005 is RESOLVED to verbatim extraction** (18:15Z Decision 2), so this is settled policy, not a default awaiting confirmation: S1 = `content-source-of-truth`; `design/source-content-inventory.md` is a hard prerequisite for Composer; Sentinel diffs **exact-match**, item-by-item, in **both** directions; any intentional deviation is itemized in `DECISIONS.md` before authoring | designforge, composer, sentinel |
| R-06 | CORS blocks the eventual consumer because the existing `~headless-test` config matches neither GraphQL path | Medium | Consumer cannot call the endpoint | New `CORSPolicyImpl~graphql` factory config covering both paths (US-006) | configsmith |
| R-07 | Someone ships the `GraphQlServlet` singleton and flips GraphiQL/POST for every team on a shared instance | Low | Cross-team breakage | AD-6: do not ship it. Q-001 gates any exception | configsmith |
| R-08 | Scope creep into a custom Sling Model / service user / Java | Medium | Permanent maintenance debt for zero delivered capability | AD-1 Option-2 rejection + AD-5 zero-Java constraint are acceptance criteria (US-013); Auditron fails on any new `core/` class | auditron |
| R-09 | Sentinel runs a UI test, page fetch, visual diff or CWV measurement against a run that has no rendered surface | **High** (its default playbook assumes a page) | Guaranteed-meaningless failure and a wasted remediation cycle | AD-1 + § 3.1 + US-010 explicitly forbid it; WB-16 states the payload-only scope; **§ 7.1 gives a per-track N/A with a reason for each affected track** so Sentinel records them rather than either running them or silently dropping the whole track | strategist, sentinel |
| R-09a | The opposite failure: a track is marked N/A wholesale, and a track that IS in scope (DAM delivery resolvability, reference-asset provenance, `ui.tests` disposition) gets swept away with it | **Medium** | Real scope silently dropped under cover of a legitimate N/A | § 7.1 lists NOT-N/A tracks alongside the N/A ones, each with an owner. The 18:15Z entry names all three explicitly. Auditron/Sentinel must confirm each NOT-N/A row is executed and each N/A row carries its per-track reason | sentinel, pilot, auditron |
| R-10 | Field renamed in a CF Model after a consumer is built → every persisted query using it breaks | Low now, High later | Consumer outage | `design/persisted-query-contracts.md` records model-change compatibility rules (US-014); models are treated as schema migrations | designforge |
| R-11 | A "quick smoke page" is added to see the content — reintroducing the Option-B surface AD-1 excludes, and risking a change to the shared `page-content` template's `structure/` (blast radius: 3 existing pages) | **Medium** (the natural creep path) | Scope regression; possible regression on existing pages | § 1.0.1 and § 4 forbid any agent doing this unilaterally. **Option B was explicitly REJECTED by the human** (18:15Z Decision 1), so reintroducing it contradicts a decision on the record — it needs a *new* human decision, not an agent's judgement call | composer, auditron |
| R-12 | Missing `Cache-Control` passed over silently because no `dispatcher/` module exists to fix it | Medium | Origin load, slow delivery, discovered in production | US-007 forces Sentinel to record the observed header and raise a finding with concrete remediation; Q-002 surfaces the module decision | sentinel |
| R-13 | **No human-eyeballable surface exists**, so a content error that the diff does not catch has no second line of defence | Medium | Accepted-but-wrong content | **Knowingly accepted by the human**: Option B was put forward precisely as the mitigation for this risk and was rejected at the 18:15Z checkpoint (Decision 1). Residual mitigation: exact-match parity (Decision 2) narrows what the diff can miss, and Sentinel captures the **raw JSON responses as artifacts** so the Lead reviews actual delivered content at the resume gate, not just a pass/fail | sentinel, human gate |
| R-14 | The two fabricated-authorization incidents (`DECISIONS.md` 17:45Z, 18:00Z) leave residue — a downstream agent reads a stale r02/r03 copy of a Plan artifact and treats an invented quote as authorization | **Low now, High impact** | A decision chain resting on a fabrication | r04 re-derives every affected field from the 18:15Z entry and removes both quotes rather than softening them. Every human-decision statement in the Plan artifacts now cites `DECISIONS.md 2026-08-25T18:15Z` by timestamp, so any uncited claim of human direction found downstream is, by construction, not from Plan stage and must be rejected | strategist, program agent |

---

## 9. Deviations from project defaults

| Default | Deviation | Justification |
|---|---|---|
| **S1–S4, S10** — template chrome via EF, project container proxy, `cq:Page` depth, allowed-templates registration, template reuse weighing | **Inapplicable** — no page or template work in scope | AD-1 / § 4. Nothing is authored and the existing template is untouched. These apply in full to any future run that authors a page. |
| **S5 / S6 / S8** — visual-block reuse triage, Core Teaser default, 1:1 Core Component reuse | **Inapplicable** — no visual block, no rendered surface | § 3.1. The reuse discipline is applied at the content-model layer instead (AD-3 consolidates ~30 reference groups into one `pillar` model). |
| **S7** — work items carry downstream specialist guardrails as acceptance criteria | **Applied selectively** — only the guardrails that exist here | `designforge § D8-D12`, `blockwright § B*` and most `composer § C7-C11` items presuppose components, templates or pages. Only the applicable ones are embedded (§ 11): `configsmith § G1-G4`, and `composer § C11` (no binary-less `dam:Asset`). Omissions are reasoned, not accidental. |
| **S9** — reference deconstruction with per-region layout, colours, type scale | **Produced, but visual attributes recorded as NOT OBSERVED** | Neither supplied image is a page screenshot — both are text-free editorial photographs. Inventing hex values and type scales is exactly the failure S9 prevents, in reverse. The artifact instead deconstructs the images as **asset specs** and the live source as a **content-region inventory**, which is what a headless run consumes. |
| CF Model multi-valued fragment reference authored as a proper multifield (Option A) | **Option B** (`valueType="string/reference[]"`, single-picker) | Option A cannot be hand-authored in JCR (the editor writes a target-model link no property reproduces; a JCR-only version is dropped with `SCHEMA_INCOMPLETE_FIELD_REMOVED`). A zero-manual-step reproducible deploy wins over dialog ergonomics; GraphQL output is identical. Surfaced as **Q-004**. |
| Operator films modelled with discrete `industry` / `location` / `duration` fields | Collapsed into `pillar.description` with `category="film"` | Two items do not justify a model (AD-3). Recorded so it is a visible simplification, not an oversight. |
| A delivery is accompanied by `it.tests` and/or `ui.tests` | **Neither added** | `ui.tests`: no UI exists under AD-1; the Cypress→Playwright harness obligation is **N/A under AD-1**, recorded as such in § 7.1 per the 18:15Z entry rather than skipped. `it.tests`: would assert the contract against the wrong environment — Sentinel asserts it against the **real** environment, which is the environment that matters. Auditron still owns build validation. |
| A delivery has a reviewable rendered surface | **None** | AD-1 / Option A (§ 1.0). Option B was offered as the explicit alternative and **rejected by the human** (18:15Z Decision 1). Compensating control: Sentinel archives the raw JSON responses so the resume-gate review is of real delivered content (R-13). |
| Content parity is asserted with tolerant / normalised comparison | **EXACT-MATCH** | Q-005 resolved to verbatim extraction (18:15Z Decision 2). If the copy is verbatim by decision, any divergence is a defect, so tolerant matching would hide precisely the failure the decision exists to prevent. Only whitespace-normalisation of rich-text `html` is permitted, and must be declared in Sentinel's report. |
| Visual/UI tracks are marked N/A at track level | **Per-track N/A, each with its own AD-1-citing reason** (§ 7.1) | Required by the 18:15Z entry and § P12. A blanket N/A hides in-scope work: DAM delivery resolvability, reference-asset provenance and the `ui.tests` disposition all remain obligations and are listed as NOT-N/A rows in the same table (R-09a). |

---

## 10. Out of ADLC scope

Nothing in the intake requested the Cloud Manager or post-deploy items below; they are recorded because the ADLC flow ends at Sentinel and the boundary must be explicit.

| Item | Why out of scope | Route |
|---|---|---|
| Merging the PR, syncing to Adobe Git, deploying the real environment | The Lead's manual step between Pilot and Sentinel | Lead, manual (WB-15 gate) |
| Cloud Manager Dev / Stage / Prod pipeline execution, Stage soak, Stage/Prod approvals | Not part of the ADLC agent flow | External Cloud Manager process, Lead-driven |
| Rollback of the real environment, post-deploy incident triage, `docs/postmortems/` authoring | Post-deploy operations | Lead / SRE process |
| Building the front-end consumer application (SPA / static site / native app) | AD-1. No module, no toolchain, no hosting target in this repo; not requested | Separate future run — `bridgesmith` owns the boundary then |
| Any AEM-rendered surface (verification / demo / hybrid page) and any UI testing | Descoped under AD-1 / Option A; Option B **rejected by the human** (18:15Z Decision 1). Individual test tracks carry per-track N/A reasons in § 7.1 | New, separately-scoped request if a visual is later wanted; US-008 preserved verbatim in `requirements.yaml § descoped` |
| `ui.tests` Cypress→Playwright harness migration (§ 9.1 pre-deploy obligation) | **N/A under AD-1**, per the 18:15Z entry — no rendered surface, no consumer app, nothing to test. Recorded, not skipped | Pilot records the disposition in `handoffs/pilot.yaml`; returns as an obligation the moment a UI enters scope |
| Design-token capture / SCSS | Descoped under AD-1 (US-009); `blockwright` not scheduled | Future visual-consumer run |
| Scaffolding a `dispatcher/` module for `/graphql/execute.json/*` rules | Module absent from this repo; adding one is a repo-structure change needing its own pipeline validation | Q-002 — Lead decides; Sentinel reports the observed cache header meanwhile |
| Site navigation / footer as content models | Consumer-shell concerns in a headless delivery (`reference-deconstruction.md § 4.1`) | Future consumer run |
| Re-deriving colours, type scale, grid and breakpoints from a real screenshot / Figma frame | Not supplied; `reference-deconstruction.md § 5` records them as NOT OBSERVED | Future visual-consumer run; re-issue `reference-deconstruction.md` first |

---

## 11. Work breakdown

Stage order per `strategist.md § "Release + Sentinel scope"`: plan → design → implement/integrate (parallel) → test-auditron → **release-pilot (raise PR)** → **gate (human: real-env validation approval)** → **test-sentinel (LAST, real env)**.

Pilot's PR is auto-raised once Auditron passes — **no human approval item precedes it**. Pilot's PR targets **`main`** (verified default branch), not `master`. No real-env deploy step (the Lead's manual job). No Cloud Manager stage. No RDE item (the intake does not ask for one).

**Q-005 is SETTLED — read before dispatching WB-02.** Q-005 is **RESOLVED to verbatim extraction** per the 2026-08-25T18:15Z `DECISIONS.md` entry (Decision 2). WB-02 therefore runs on a **decision**, not a default: byte-exact extraction of the source copy, with Sentinel's parity check held to **exact-match**. The brand/legal note was put to the user, who chose to proceed — per that entry it is **not to be re-litigated**, so no downstream agent should re-raise it as a blocker or hold WB-02 for it. WB-15 no longer carries Q-005 as a gate item; it carries only the real-environment validation approval plus the non-blocking dispositions.

**Authorization provenance for this work breakdown.** Its scope (which agents are scheduled, which are not, which test tracks are N/A) follows AD-1 as confirmed in the 18:15Z entry, Decision 1. No item in this table rests on any other claimed human instruction.

| ID | Stage | Agent | Task | Inputs | Expected artifact | Requirements |
|---|---|---|---|---|---|---|
| WB-01 | plan | strategist | Canonicalize requirements; produce reference deconstruction + solution architecture + work breakdown; recommend AD-1 with the Option-B alternative stated (§ 1.0.1) | intake, `.aem-skills-config.yaml`, S1/S2/S3 | `plan/requirements.yaml`, `plan/technical-specifications.md`, `plan/reference-deconstruction.md`, `handoffs/strategist.yaml` | all |
| WB-02 | design | designforge | **Extract source content VERBATIM** from `/`, `/capital`, `/platform`, `/community` into a per-region, per-item inventory with a stable item id per text value. Verbatim is a **settled decision** (Q-005 resolved, 18:15Z Decision 2), not a default — extract byte-exact; do NOT paraphrase, tidy, truncate or re-title, and do NOT re-raise the brand/legal question. **AC: every item carries a stable id + source page + region; the inventory is the exact-match reference set for WB-16; markup/CSS is NOT captured (verbatim applies to text content only).** Hard prerequisite for WB-11 — Composer must not author a single field without it. | `plan/reference-deconstruction.md § 1, § 4`, S1 | `design/source-content-inventory.md` | US-003, US-010, US-014 |
| WB-02A | design | designforge | **Record reference-asset provenance** — `design/reference-assets.md` listing the reference URL (`https://www.chiselindustries.com/`) and **both** PNG paths (`C:\Users\2400091\Downloads\assets-headless\home-hero.png`, `...\home-movement.png`) with dimensions, file sizes, intended DAM target path and intended content slot. **Required even though the visual tracks are N/A** — the 18:15Z entry (Decision 1) states provenance of the supplied reference set must still be recorded. **AC: both PNGs listed by absolute source path; no invented visual attribute (colours/type scale/grid remain NOT OBSERVED per `reference-deconstruction.md § 5`).** | S1, S2, S3, `plan/reference-deconstruction.md § 1, § 3` | `design/reference-assets.md` | US-004 |
| WB-03 | design | designforge | CF Model specs with content-mapping rows (field → `metaType` → `valueType` → source region → GraphQL type). Resolve the tagline mapping question in `reference-deconstruction.md § 4.8`. **AC: `status="enabled"`; self-referencing `cq:scaffolding`; Option B for multi-valued refs (AD-4); every asset-ref field paired with an `*Alt` field. NO component or dialog spec — none exists (§ 3.1).** | `plan/technical-specifications.md § 6.1`, `plan/reference-deconstruction.md § 4` | `design/content-fragment-models.md` | US-001, US-004 |
| WB-04 | design | designforge | Persisted-query contracts: name, full GraphQL text, execution URL, matrix-param format, example JSON response, isolation scope, schema-naming rules, model-change compatibility rules, CORS origin note. **AC: no unfiltered `<model>List`; `byPath` uses `_path: String!`; `ImageRef` + `DocumentRef` both selected; rich text as `{ html }`.** | `plan/technical-specifications.md § 6.4` | `design/persisted-query-contracts.md` | US-005, US-011, US-014 |
| WB-05 | design | designforge | **Payload/contract test-case spec** — the executable definition of Sentinel's gate: per-query expected JSON shape, **exact-match** per-item content-parity assertions keyed to WB-02's item ids (both directions: nothing dropped, nothing invented), `_path` isolation assertions, `ImageRef` dimension assertions, **asset delivery-resolvability assertions** (each `_path` returns 200 + image content-type, unauthenticated), alt-text-present assertions, latency/payload/cache-header checks. **AC: every assertion states its TIER (Publish for content parity — the core acceptance evidence; Author for authoring-provision cases). Parity is exact-match, not fuzzy (Q-005 resolved, 18:15Z Decision 2); any permitted whitespace normalisation of rich-text `html` is declared explicitly. Contains NO UI-test scenario, NO visual-diff case, NO page fetch, NO Core Web Vitals case — and instead carries the PER-TRACK N/A rows from § 7.1 verbatim, each with its AD-1-citing reason, so Sentinel records them rather than either running or silently dropping them (R-09, R-09a).** | `design/source-content-inventory.md`, `design/persisted-query-contracts.md`, `plan/technical-specifications.md § 7.1` | `design/test-cases.md` | US-010, US-007, US-004 |
| WB-06 | integrate | configsmith | Author the GraphQL endpoint node `/content/cq:graphql/headless-test/endpoint` (`sling:resourceType="graphql/sites/components/endpoint"`, `configurationPath="/conf/headless-test"`) and add filter roots `/content/cq:graphql/headless-test` **and** `/content/dam/headless-test/chisel`. **Blocks WB-12** (no endpoint ⇒ "No suitable endpoint found"). **AC: `configsmith.md § G1-G4` where applicable; verify against the BUILT package, not the source tree.** | `plan/technical-specifications.md § 2.1, § 6.3` | endpoint node + `ui.content` `filter.xml` | US-002, US-004, US-012 |
| WB-07 | integrate | configsmith | Add `com.adobe.granite.cors.impl.CORSPolicyImpl~graphql` (config.publish) covering `/graphql/execute.json/headless-test/.*` and `/content/_cq_graphql/headless-test/.*`. **AC: factory config only — never the singleton; explicit origin allow-list, no `.*`; GET/HEAD only; `supportscredentials` false; existing `~headless-test` config left untouched.** | `plan/technical-specifications.md § 7`, existing `CORSPolicyImpl~headless-test` | `ui.config` CORS factory config | US-006 |
| WB-08 | integrate | configsmith | Record the negative configuration decisions with reasoning: **no** service user / repoinit change (AD-5); **do not ship** the `GraphQlServlet` singleton (AD-6, Q-001); **no** `dispatcher/` module (Q-002) with the cache-posture note Sentinel will check. **AC: each is a recorded decision, not a silent omission.** | AD-5, AD-6, Q-001, Q-002 | `DECISIONS.md` entries + `handoffs/configsmith.yaml` | US-007, US-013 |
| WB-09 | implement | composer | Author the 5 CF Models in `ui.content`. **AC: `status="enabled"` (not `active`); `jcr:content` and `model` both `cq:PageContent`; self-referencing `cq:scaffolding`; Option B `string/reference[]` for multi-valued refs; `endpoint.schemaerrors` clean.** | `design/content-fragment-models.md` | `/conf/headless-test/settings/dam/cfm/models/{hero,stat,pillar,content-section,landing-page}` | US-001 |
| WB-10 | implement | composer | Seed the two DAM assets with **real binaries** at `/content/dam/headless-test/chisel/`, with `dc:title` + alt text per `reference-deconstruction.md § 3`. **In scope and NOT waived by AD-1** — the 18:15Z entry (Decision 1) keeps both assets in scope and requires they be verifiably resolvable via GraphQL/DAM delivery; § P7's DAM checkpoint stays ACTIVE. **AC: no `dam:Asset` without a binary (`composer.md § C11`); packaged via WB-06's filter root; `ImageRef` returns `width`/`height` 1600x992 and 1080x1341; each asset is fetchable at its `_path` after install.** | S2, S3, `reference-deconstruction.md § 3`, `design/reference-assets.md` (WB-02A) | 2 `dam:Asset` nodes + binaries | US-004 |
| WB-11 | implement | composer | Author fragments under `/content/dam/headless-test/chisel/fragments/` **strictly from `design/source-content-inventory.md`** — min. 1 `hero`, 3 `stat`, 6 `pillar`, 3 `content-section`, 1 `landing-page`. **AC: zero invented copy; every value is an EXACT-MATCH of its inventory item id (Q-005 resolved to verbatim extraction, 18:15Z Decision 2) — no paraphrase, no tidy-up, no truncation; any intentional deviation itemized in `DECISIONS.md` BEFORE authoring; correct `contentFragmentModel`; `landing-page` wires hero + stats + sections + pillars. NO page is authored and the existing `/content/headless-test` tree is untouched (R-11).** Depends on WB-02, WB-09, WB-10. | `design/source-content-inventory.md`, `design/content-fragment-models.md` | Content Fragment nodes | US-003, US-011 |
| WB-12 | implement | composer | Author the 4 persisted queries as **`persistentQueries` binary nodes** (`.content.xml` + `_jcr_content/_jcr_data.binary` holding raw GraphQL text). **AC: folder is `persistentQueries` (one word); NO `persistedQueries/*.json` anywhere; resolves after `-PautoInstallSinglePackage` with zero manual GraphiQL/curl steps; path-scoped per US-011.** Depends on WB-06, WB-09. | `design/persisted-query-contracts.md` | `/conf/headless-test/settings/graphql/persistentQueries/{landing-page-by-path,hero-by-path,stats-list,pillars-list}` | US-005, US-011 |
| WB-13 | test | auditron | Build validation + guardrail sweep. **AC: `mvn clean install` passes, no new warnings; ZERO new classes under `core/` and zero changes to `ui.apps` / `ui.frontend` / `it.tests` / `ui.tests` (R-08, R-11); no new Scheduler/ResourceChangeListener/EventListener/EventHandler/Replicator/AssetManager, no `getAdministrativeResourceResolver`/`System.out`/`printStackTrace`; repo-wide grep finds no `persistedQueries` path (R-01); BUILT package contains all new `/conf`, `/content/cq:graphql`, `/content/dam/.../chisel` nodes (R-02); local install → all 4 queries return 200 with non-empty data; `endpoint.schemaerrors` clean; the `mode="merge"` re-seed caveat (R-03) documented before iterating.** | all design / implement / integrate handoffs | `handoffs/auditron.yaml` | US-001, US-002, US-005, US-012, US-013 |
| WB-14 | release | pilot | **Raise PR** — feature branch → **`main`** (NOT `master`). Auto after Auditron passes; no approval item precedes it. `local` install is Auditron's build-validation side-effect, not a Pilot task. **Non-deferrable** (18:15Z Decision 1). **AC: `handoffs/pilot.yaml` records the `ui.tests` disposition explicitly as "N/A under AD-1 — no rendered surface, no `ui.tests` obligation", together with the three fields that would normally come from `handoffs/blockwright.yaml` (`ui_tests.harness_state_on_entry`, `cypress_fully_removed`, `scenario_coverage.unmapped`) taking the same disposition — recorded, not left unchecked (§ 7.1).** | `handoffs/auditron.yaml`, `plan/technical-specifications.md § 7.1` | `deploy/pr-request.md` | — |
| WB-15 | gate | **human** | Lead: review/merge PR, deploy to real env, then record real-environment validation approval in `DECISIONS.md` (real env **publish** URL + **Author** URL + auth mode — Sentinel needs both tiers). Note dispositions for the non-blocking Q-001 / Q-002 / Q-004 / Q-006 if desired. **No blocking question remains** — Q-005 and Q-008 were resolved at the 18:15Z architecture-review checkpoint and must NOT be re-opened here. | `handoffs/pilot.yaml` | `DECISIONS.md § real-environment validation approval block (real env publish + author URL, auth mode)` | US-010 |
| WB-16 | test | sentinel | **LAST STAGE — target the REAL environment from `DECISIONS.md`** (never `localhost:4502`, never RDE). **Non-deferrable** (18:15Z Decision 1). **Publish tier — the core acceptance evidence:** execute all 4 persisted queries unauthenticated; **archive the raw JSON responses as artifacts** (R-13 compensating control); diff every text value item-by-item against `design/source-content-inventory.md` in **both** directions using **EXACT-MATCH**, not fuzzy comparison (Q-005 resolved, 18:15Z Decision 2 — declare any whitespace normalisation of rich-text `html`); assert every returned `_path` is under `/content/dam/headless-test/chisel/`; assert `ImageRef` `width`/`height` non-null and correct; **assert each asset `_path` is delivery-resolvable (200 + image content-type, unauthenticated) — § P7 stays active, asset scope survives AD-1**; assert alt text present in the payload; record observed `Cache-Control` (raise a finding with concrete remediation if absent — do not pass silently); measure payload size and p75 latency. **Author tier:** authoring-provision cases — models enabled and introspectable, `endpoint.schemaerrors` clean, fragments present and correctly modelled. Every assertion states its tier. **MUST NOT run any UI test, browser automation, page fetch, visual/Tier-A diff, Core Web Vitals or page-a11y scan — instead RECORD each as a per-track N/A carrying its own AD-1-citing reason from § 7.1 (a blanket track-level N/A is not acceptable; R-09, R-09a).** | `DECISIONS.md`, `handoffs/auditron.yaml`, `design/test-cases.md`, `design/source-content-inventory.md`, `design/persisted-query-contracts.md`, `plan/technical-specifications.md § 7.1` | `handoffs/sentinel.yaml` + archived JSON responses | US-004, US-005, US-006, US-007, US-010, US-011 |

### 11.1 Parallel groups & dependencies

- **Group A (design, sequential):** WB-02 → WB-03 → WB-04 → WB-05. WB-02 first — everything content-shaped depends on the verbatim inventory. **WB-02A runs in parallel with the whole of Group A** — it depends only on the intake sources, not on any design output.
- **Group B (integrate, parallel with Group A and Group C):** WB-06, WB-07, WB-08 — independent of the design outputs.
- **Group C (implement):** WB-09 → WB-11, with WB-10 parallel to WB-09. WB-12 needs **WB-06 + WB-09**.
- **Cross-group blockers:** WB-06 blocks WB-12 (endpoint before query registration). WB-02 blocks WB-11 (inventory before authoring). WB-03 blocks WB-09; WB-04 blocks WB-12; WB-05 blocks WB-16.
- **Serial tail:** WB-13 → WB-14 → WB-15 (human pause) → WB-16.

### 11.2 Requirement → work-breakdown traceability

Every remaining requirement traces to ≥1 item; nothing is orphaned. (US-008 and US-009 are descoped under AD-1 and recorded, restorable verbatim, in `requirements.yaml § descoped` and § 10 above.)

| Req | Work-breakdown items |
|---|---|
| US-001 | WB-03, WB-09, WB-13 |
| US-002 | WB-06, WB-13 |
| US-003 | WB-02, WB-11, WB-16 |
| US-004 | WB-02A, WB-03, WB-06, WB-10, WB-16 |
| US-005 | WB-04, WB-12, WB-13, WB-16 |
| US-006 | WB-07, WB-16 |
| US-007 | WB-05, WB-08, WB-16 |
| US-010 | WB-02, WB-05, WB-15, WB-16 |
| US-011 | WB-04, WB-11, WB-12, WB-16 |
| US-012 | WB-06, WB-13 |
| US-013 | WB-08, WB-13 |
| US-014 | WB-02, WB-04 |

Non-requirement obligations from the 18:15Z entry also trace to items, so none can be lost: reference-asset provenance → **WB-02A**; DAM delivery resolvability → **WB-10 + WB-16**; per-track N/A justification → **§ 7.1 → WB-05 → WB-16**; `ui.tests` N/A-under-AD-1 → **WB-14**; Pilot/Sentinel non-deferrable → **WB-14, WB-16**.
