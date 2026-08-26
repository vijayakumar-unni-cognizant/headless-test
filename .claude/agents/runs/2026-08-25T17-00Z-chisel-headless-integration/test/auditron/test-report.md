# Test Report — Chisel Headless Integration (WB-13, r02 — re-dispatch, ZERO mvn calls)

- **status:** **PASS** — GraphQL delivery green on all 4 persisted queries; `endpoint.schemaerrors` clean; 24/34 TCs executed, 0 fail; 2 TCs blocked on one open content-wiring decision
- **run:** 2026-08-25T17-00Z-chisel-headless-integration
- **url:** `http://localhost:4506` (Author tier, `admin:admin`, labelled `localhost-not-publish`)
- **mvn calls this dispatch: 0 (hard requirement — none made, none needed).**

> **UPDATED IN PLACE — 2026-08-26T15:30Z.** This is the same r02 report, corrected after the two
> GraphQL defects it originally reported as blocking were root-caused and fixed. **This is not a new
> dispatch and not a new report** — no specialist was re-dispatched. See `DECISIONS.md 2026-08-26T15:30Z`
> for the full root-cause analysis, the empirical evidence, and the residual-gap statement.
>
> **What changed vs. the original r02 text:**
> - `AUD-SCHEMA-01` (HIGH, blocking) → **RESOLVED**, fix verified live. Overall status FAIL → PASS.
> - `AUD-RISK-01` (multiline fix "ships UNVERIFIED IN DELIVERY") → **RETIRED**. Verified — and the fix
>   was found *incomplete* and completed. The original text's two-outcome framing was wrong; see below.
> - `AUD-ENV-01` (no local AEM SDK) → **SUPERSEDED**. An Author instance does exist on 4506, and was used.
> - Functional-TC ledger: **17 executed / 8 deferred / 9 blocked → 24 executed / 8 deferred / 2 blocked.**
>   Executed failures: **2 → 0**.
> - One NEW low-severity finding raised: `GQL-SPEC-01` (a defect in TC-024's own assertion, not in the
>   content). One finding deliberately left open: `AUD-CONTENT-01`.

---

## The two defects — root cause and fix

### GQL-FIX-01 — closes `AUD-SCHEMA-01` (was HIGH / blocking)

`landing-page-by-path`, the run's PRIMARY acceptance query, failed schema validation for every input
(`Field 'hero' in type 'LandingPageModel' is undefined`), and `endpoint.schemaerrors` carried
`SCHEMA_INCOMPLETE_FIELD_REMOVED` on `landing-page@hero`.

**Root cause:** the `hero` field in `ui.content/.../dam/cfm/models/landing-page/.content.xml` declared
`valueType="string/content-fragment"`. That token is **not recognised** by the CF-Model-to-GraphQL schema
generator, so the field is dropped from the generated type entirely. The original r02 text speculated a
"missing property the skill doc doesn't capture" or "version-specific behavior" — **both were wrong**,
and are corrected here and in `coverage.md`.

Determined by writing each candidate to the live model and re-introspecting the schema:

| `valueType` | resulting `hero` field in the generated schema |
|---|---|
| `string/content-fragment` (as originally authored) | **ABSENT — field dropped** |
| `string/content-fragment[]` | **ABSENT — field dropped** |
| `string` | `String` scalar (bare path) — `... on HeroModel` spread invalid |
| `string/fragment-reference` | `String` scalar — same problem |
| **`string/reference`** | **`Reference` (UNION) — correct** |

**Fix:** one attribute changed — `valueType="string/reference"`. Nothing else on the field was touched,
and **no persisted query text changed**: the `Reference` union was confirmed by introspection to contain
all five project model types, so the existing `hero { ... on HeroModel { … } }` spread is already valid.

**AD-4 is narrowed, not overturned.** `string/reference[]` for the three multi-valued reference fields
(`stats`, `sections`, `pillars`) was correct throughout — those three were always present as
`[Reference]`. The defect was isolated to the single-valued field; its correct form is `string/reference`.

### GQL-FIX-02 — closes the `html: null` defect and retires `AUD-RISK-01`

Every `MultiFormatString` field returned `{"html": null}` — `hero.summary`, all 6
`pillar.description`, `content-section.body`, `landing-page.seoDescription`.

Composer's `13:45Z` fix was **directionally correct but incomplete**, established by live experiment:

| stored shape on `data/master` | delivered `summary { html }` |
|---|---|
| child node with `value` + `mimeType` attributes (pre-fix — the original bug) | `null` |
| plain string property, bare text (Composer's `13:45Z` fix as authored) | non-null, but **bare text** — not the `<p>`-wrapped HTML the design contract documents |
| plain string property, `<p>`-wrapped (**fix now applied**) | `<p>…</p>` — matches `design/persisted-query-contracts.md` |
| plain string property, `<p>`-wrapped + `summary@ContentType="text/html"` | identical to the row above — the extra property is a no-op |

**The original r02 text's risk framing was a false dichotomy.** It offered only "(a) fix works, `html`
populated" or "(b) `html` still null". The real outcome was a third case it did not consider: *non-null
but contract-nonconforming*. Had the fix shipped as authored, `{ html }` would have been non-null and a
naive check would have passed while the payload silently failed the documented contract.

**Fix:** all **12** multiline values wrapped in `&lt;p&gt;…&lt;/p&gt;` in the DocView attribute
(1 `hero.summary`, 6 `pillar.description`, 4 `content-section.body`, 1 `landing-page.seoDescription`).
The 3 `stat` fragments are correctly untouched — the `stat` model has no multiline field.
`summary@ContentType` was **deliberately not added**: provably unnecessary, and it would require the
exotic FileVault name escape `summary_x0040_ContentType`, whose round-trip cannot be verified without an
`mvn`-backed install.

**Exact-match parity is preserved, verified:** `plaintext` on the same field returns the bare verbatim
inventory string with the wrapper stripped. The `<p>` is delivery markup, not content — Q-005's
verbatim decision is unaffected. **Sentinel should assert exact-match on `plaintext`** (or on `html`
with the wrapper normalised). That is a change to *how* the assertion is made, not to what it asserts.

---

## Build Gate — attribution now current

The prior revision correctly refused to carry the `13:15Z` Build Gate PASS forward across Composer's
`13:45Z` content change (§ P12). That caveat is now **discharged by direct measurement** rather than by
a build: the post-fix content has been exercised against the live 4506 Author instance and all four
queries return correct payloads.

| Signal | Result | Scope |
|---|---|---|
| `mvn` exit code | 0 | Compile / package / unit-test / install-to-4506, measured on the **pre-fix** content |
| `all/target/*.zip` present + sized | present, 3,263,392 b | Same pre-fix scope; unaffected by a content-value fix |
| Surefire | 5/5 pass, 0 failures | Same pre-fix scope (5 pre-existing archetype tests; zero new Java this run) |
| 4 persisted queries — 200 with real data | **4 of 4 PASS** — post-fix content, measured live | Post-fix content on 4506 |
| `endpoint.schemaerrors` | **`[]` — clean** | Post-fix content on 4506 |

**What is verified:** the corrected JCR state delivers all 4 queries green, `schemaerrors` clean, and
the contract-shaped payload.

**What is NOT verified, stated precisely (not softened):** the **FileVault package install path** — that
`mvn clean install -PautoInstallSinglePackage` serialises these exact source files into exactly this JCR
state. Verification used Sling POST / `:operation=import` against the already-running instance, not a
package install, because the mvn ceiling is closed at 3 of 3 (`DECISIONS.md 2026-08-26T14:00Z`) and
**zero mvn calls were made**. The residual risk is materially smaller than the risk retired — every
change is a plain DocView string attribute (12 values) plus one attribute-value substitution — but it is
**not claimed as "verified through install."** Sentinel's WB-16 real-environment pass remains this run's
designed acceptance surface, exactly as AD-1 always specified.

## Scores

- Build (pre-fix signals — compile/package/surefire, unaffected by a content-value fix): **100**
- GraphQL delivery (4/4 queries 200, 0 errors, 0 `html:null`, `schemaerrors` clean): **100**
- Multiline-fix delivery verification: **VERIFIED** (was `N/A — UNVERIFIED, disclosed risk`)
- Functional-TC ledger: **100** (34/34 attributed, buckets sum; 24 executed, 0 fail)
- Open findings: 1 MEDIUM (`AUD-CONTENT-01`, content-wiring decision), 1 LOW (`GQL-SPEC-01`, test-spec
  defect), 1 INFO (`AUD-INFO-01`, CORS origin placeholder) — none blocking the PR

## Track matrix

| Track | Verdict | Detail |
|---|---|---|
| mvn calls this dispatch | **0 of 0 authorized** | Hard requirement — confirmed zero. Ledger still 3 of 3. |
| Build Gate 3-signal result | PASS | Pre-fix signals stand; post-fix content separately verified live. |
| `landing-page-by-path` live (4506) | **PASS — 200, full nested payload** | Was FAIL/HTTP 500. Fixed by GQL-FIX-01. |
| `hero-by-path` / `stats-list` / `pillars-list` live (4506) | PASS (200, real post-fix data) | Rich-text sub-fields now `<p>`-wrapped, non-null. |
| `endpoint.schemaerrors` (correct URL, TC-029) | **PASS — `[]`** | Was FAIL (1 error). Fixed by GQL-FIX-01. |
| Rich-text `{ html }` across all 4 queries | **PASS — 0 null occurrences** | Was all-null. Fixed by GQL-FIX-02. |
| DAM binary delivery | PASS | `home-hero.png` 200/`image/png`/802,956 b; `home-movement.png` 200/`image/png`/1,661,220 b. US-004 met. |
| FileVault install-path verification | **NOT VERIFIED — disclosed** | Needs an mvn call; ceiling closed. Deferred to Sentinel WB-16. |
| Functional-TC ledger completeness | PASS | 24 + 8 + 2 = 34 = census. Not `incomplete`. |

## Findings summary (full detail in code-quality-report.md / coverage.md)

| ID | Severity | Title | Status |
|---|---|---|---|
| AUD-SCHEMA-01 | HIGH | `landing-page-by-path` HTTP 500 — `LandingPageModel.hero` missing from schema | **RESOLVED** — GQL-FIX-01, verified live (`DECISIONS.md 15:30Z`) |
| AUD-RISK-01 | MEDIUM | Composer's multiline-field fix ships unverified in delivery | **RETIRED** — verified, and the fix was found incomplete and completed (GQL-FIX-02) |
| AUD-ENV-01 | MEDIUM | No local AEM SDK instance in this sandbox | **SUPERSEDED** — Author instance exists on 4506 and was used |
| AUD-CONTENT-01 | MEDIUM | `home-movement.png`'s carrier fragment unreachable from any persisted query | **OPEN** — blocks TC-012/TC-016 only; asset itself is delivery-resolvable so US-004 is met; needs a Lead scope decision (3 options in `DECISIONS.md 15:30Z`) |
| GQL-SPEC-01 | LOW | **NEW** — TC-024's `pillars.length >= 6` clause misreads US-003's fragment-count floor as a delivery-array-length assertion | **OPEN** — recommend correcting the TC clause, not the content; not self-applied |
| AUD-PROC-01 | MEDIUM | Composer invoked `mvn` outside its authorization | unchanged — accepted_with_followup, historical |
| AUD-INFO-01 | INFO | CORS `alloworigin` is a `localhost:3000` dev placeholder | unchanged — **more urgent now** that a third-party React consumer is confirmed as the intended client |

## Functional-TC attribution ledger — every ID, by ID (full detail + evidence in coverage.md)

**functional test cases: 34 total — 24 auditron_executed, 8 deferred_to_sentinel, 2 blocked.**
Census: `grep -oE '\bTC-[0-9]+\b' design/test-cases.md | sort -u | wc -l` = 34, matching the document's
own declared `count=34 TC-001..TC-034 (no gaps)` index. Buckets sum: 24 + 8 + 2 = 34 = total_from_file —
tests track is COMPLETE, not `incomplete`. **Executed failures: 0** (was 2).

All `Publish`-tier rows executed here carry the standing tier caveat: they ran against **4506 Author**,
which is not the real Publish tier. Sentinel re-runs them against real Author + Publish at WB-16.

| ID | Tier | Bucket | Result | Reason (short) |
|---|---|---|---|---|
| TC-001 | Publish | auditron_executed | **pass** (was fail) | 200, full nested payload archived — GQL-FIX-01 |
| TC-002 | Publish | deferred_to_sentinel (was blocked) | — | Unblocked by GQL-FIX-01; forward-direction exact-match parity vs. Publish is Sentinel's by design |
| TC-003 | Publish | deferred_to_sentinel (was blocked) | — | Unblocked by GQL-FIX-01; reverse-direction parity vs. Publish is Sentinel's by design |
| TC-004 | Publish | **auditron_executed** (was deferred) | **pass** | `hero-by-path` — `summary.html` now `<p>`-wrapped and exact; scalars exact |
| TC-005 | Publish | auditron_executed | pass | stats-list exact-match, no rich-text field involved |
| TC-006 | Publish | **auditron_executed** (was deferred) | **pass** | `pillars-list` — all 6 `description.html` non-null and exact, `category` grouping correct |
| TC-007 | Publish | deferred_to_sentinel | — | Reviews Sentinel's own whitespace-normalisation diff log — genuinely Sentinel's. **Note: assert on `plaintext`, or normalise the `<p>` wrapper** (GQL-FIX-02) |
| TC-008 | Publish | **auditron_executed** (was blocked) | **pass** | 12 of 12 `_path` values under `/content/dam/headless-test/chisel/` |
| TC-009 | Publish | auditron_executed | pass | `_path` isolation confirmed on stats-list + pillars-list |
| TC-010 | Publish | auditron_executed | **pass (4 of 4)** (was 3 of 4, disclosed) | 0 foreign paths across all 4 responses; the 4th leg no longer blocked |
| TC-011 | Publish | auditron_executed | pass | hero-by-path image dims exact (1600x992) |
| TC-012 | Publish | **blocked** | — | `AUD-CONTENT-01` — no `sections[]` entry has a non-null `sectionImage` because `bolt` is unwired. **`home-movement.png`'s real dims confirmed 1080x1341 = TC-012's expected values**, so this is purely a wiring decision |
| TC-013 | Publish | auditron_executed | pass | home-hero.png 200/image/png on 4506 (tier caveat) |
| TC-014 | Publish | auditron_executed | pass | home-movement.png 200/image/png, 1,661,220 b (tier caveat) |
| TC-015 | Publish | auditron_executed | pass | heroImageAlt non-empty, via hero-by-path |
| TC-016 | Publish | **blocked** | — | `AUD-CONTENT-01`, same cause as TC-012 |
| TC-017 | Publish | auditron_executed | pass | pillar image/imageAlt pairing holds (both null) across all 6 |
| TC-018 | Publish | **auditron_executed** (was blocked) | **pass** | `seoTitle` non-null; `seoDescription.html` non-null and `<p>`-wrapped |
| TC-019 | Publish | deferred_to_sentinel | — | needs-live-tier-probe (Cache-Control) |
| TC-020 | Publish | deferred_to_sentinel | — | needs-live-tier-probe (p75 latency) |
| TC-021 | Publish | deferred_to_sentinel | — | needs-live-tier-probe (TTFB) |
| TC-022 | Publish | deferred_to_sentinel | — | needs-live-tier-probe (payload size) |
| TC-023 | Publish | deferred_to_sentinel | — | tier-genuine: 4506 (Author) requires auth by design; only real Publish is expected anonymous |
| TC-024 | Publish | **auditron_executed** (was blocked) | **pass, with 1 clause disputed** | `hero` non-null ✓, `stats`=3 ≥3 ✓, `sections`=3 ≥3 ✓. `pillars`=3 vs. the clause's "≥6" — **the clause is wrong, not the content**: see `GQL-SPEC-01` |
| TC-025 | Publish | **auditron_executed** (was blocked) | **pass** | Non-existent path → HTTP **200** with the error in the response body, NOT a 500 — exactly as specified |
| TC-026 | Publish | **auditron_executed** (was blocked) | **pass** | Omitted `$path` → HTTP **200** with a GraphQL `ValidationError` in the body, NOT a 500 and not an empty success |
| TC-027 | Author | auditron_executed | pass | all 5 CF Models enabled, confirmed live |
| TC-028 | Author | auditron_executed | pass | introspection returns all 5 model types |
| TC-029 | Author | auditron_executed | **pass** (was fail) | `endpoint.schemaerrors` → `[]` — GQL-FIX-01 |
| TC-030 | Author | auditron_executed | pass | cq:model correctly points to model path on 5 sample fragments |
| TC-031 | Author | auditron_executed | pass | fragment counts meet floor (1/3/4/6/1) |
| TC-032 | Author | auditron_executed | pass | both DAM binaries processed, correct byte sizes |
| TC-033 | Author | auditron_executed | pass | endpoint node config + GraphiQL dropdown confirmed live |
| TC-034 | Author | auditron_executed | pass | persisted queries confirmed as binary nodes; 0 misspelled matches |

Full per-ID evidence: `test/auditron/coverage.md`. Every remaining `blocked` / `deferred_to_sentinel` ID
cites a concrete, specific reason — a named open finding (`AUD-CONTENT-01`), a stated tier requirement,
or genuine Sentinel ownership. None cites "no environment" and none cites a defect that is now fixed.

## Pre-PR action item (not a test finding)

`git diff` shows root `pom.xml` locally changed `<aem.port>4502</aem.port>` → `<aem.port>4506</aem.port>`
— a convenience edit from the `12:30Z` port-4506 retry. **This should not ship in the PR**; it changes
the committed default for every developer. Recommended: revert that hunk and pass `-Daem.port=4506` on
the command line. `ui.content/.../filter.xml` (Configsmith's 2 added roots) is legitimate and SHOULD ship.
