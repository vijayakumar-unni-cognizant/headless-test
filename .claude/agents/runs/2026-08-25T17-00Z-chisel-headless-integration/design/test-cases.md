# Payload / Contract Test-Case Spec — Chisel Headless Integration (WB-05)

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Design (Designforge)
- **This is the executable definition of Sentinel's gate (WB-16).** It is this run's substitute for `functional-test-cases.md` + `ui-test-scenarios.md` combined — payload-only, because AD-1 (`DECISIONS.md 2026-08-25T18:15Z`) produces no rendered surface and no UI. There is no `ui-test-scenarios.md`, no `dialog-specifications.md`, no `component-specifications.md`, no `template-design.md`, no `policy-mapping.md`, and no `authoring-guidelines.md` in this run — see `design/scope-note.md` for the per-artifact reasoning.
- **Every assertion states its TIER.** Publish = this run's core acceptance evidence (GraphQL content-parity). Author = authoring-provision cases. Neither tier is `localhost:4502` or an RDE — both are the real environment recorded in `DECISIONS.md` at the WB-15 human gate.
- **Content parity is EXACT-MATCH**, per Q-005 resolution (`DECISIONS.md 2026-08-25T18:15Z`, Decision 2) — not fuzzy/normalised matching. The only permitted normalisation is whitespace in rich-text `html` output, and every instance of it must be declared in Sentinel's report, not silently applied.

```ids: prefix=TC count=34 TC-001..TC-034 (no gaps)
```

---

## 1. Content parity — Publish tier, EXACT-MATCH (core acceptance evidence)

| ID | Description | Tier | Executor | Preconditions | Test data | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|---|---|
| TC-001 | Execute `landing-page-by-path` against the real Publish environment, unauthenticated, and archive the raw JSON response as an artifact | Publish | sentinel | Real Publish URL recorded in `DECISIONS.md` (WB-15); `home` `landing-page` fragment authored (WB-11) | `path=/content/dam/headless-test/chisel/fragments/pages/home` | `GET /graphql/execute.json/headless-test/landing-page-by-path;path=<path>` unauthenticated | HTTP 200; non-empty `data.landingPageByPath.item`; raw JSON saved as an artifact (R-13 compensating control) | US-005, US-010 |
| TC-002 | Forward-direction content parity: every text value in the `landing-page-by-path` response for `home` is an EXACT-MATCH of its corresponding item in `design/source-content-inventory.md` **(r02, corrected — see note)** | Publish | sentinel | TC-001 executed | Response from TC-001; `source-content-inventory.md` r02 items SC-HOME-001..014 | Diff `seoTitle`↔SC-HOME-001 (the real `<title>` string, `Chisel — Sharper tools for the trades. Built in the trades.`), `seoDescription.html`↔SC-HOME-003 or SC-HOME-003b per the A9 choice Composer recorded (whitespace-normalised only), `hero.title`↔SC-HOME-001c (the real on-page H1, `Sharper tools for the trades.` — **NOT** the same string as `seoTitle`, per A1's resolution), `hero.eyebrow`↔SC-HOME-001b (`Built in the trades, for the trades` — now populated, not null), `hero.summary.html`↔SC-HOME-002 (corrected value), each `stats[].value/label/detail`↔SC-HOME-004/005/006 (unaffected by correction), each `sections[].heading/body`↔SC-HOME-010/011/012 as corrected (real headings `We invest in trades businesses.` / `Software that runs the business for you.` / `Investing in the people of the trades.` — **not** the r01 fabricated headings), each `pillars[].title/description/category/linkPath`↔SC-HOME-007/008/009 (unaffected by correction) | Every value matches character-for-character (rich-text HTML wrapping + declared whitespace normalisation excepted); any mismatch is itemized (field, expected, actual) in Sentinel's report, not silently passed. **If Sentinel is diffing against a cached/pre-correction copy of the inventory, that is itself a finding — re-pull `source-content-inventory.md` before running this case.** | US-003, US-010 |
| TC-003 | Reverse-direction content parity: every `source-content-inventory.md` item that Composer authored in scope for `home` appears somewhere in the response (nothing silently dropped) | Publish | sentinel | TC-001, TC-002 executed; Composer's actual authored fragment set known (from `handoffs/composer.yaml` or direct fragment inspection) | Same as TC-002 | For each authored item id, confirm its value is present in the response at the expected field | No authored inventory item is missing from the response | US-003, US-010 |
| TC-004 | `hero-by-path` content parity (both directions) for the `home-hero` fragment | Publish | sentinel | `hero-by-path` query authored (WB-12); home hero fragment authored (WB-11) | `path=/content/dam/headless-test/chisel/fragments/heroes/home-hero` | `GET /graphql/execute.json/headless-test/hero-by-path;path=<path>` | `title`/`summary.html`/`heroImageAlt` exact-match SC-HOME-001/002 + the alt text in `design/reference-assets.md`; `heroImage._path/width/height` = `/content/dam/headless-test/chisel/home-hero.png` / `1600` / `992` | US-003, US-005, US-010 |
| TC-005 | `stats-list` content parity — every returned item exact-matches its inventory source, both directions | Publish | sentinel | `stats-list` query authored; ≥3 `stat` fragments authored | none | `GET /graphql/execute.json/headless-test/stats-list` | Every `{value,label,detail}` triple exact-matches SC-HOME-004/005/006 (and, if Composer additionally authored `/platform` stats, **only** SC-PLAT-005..008 — `SC-PLAT-003`/`SC-PLAT-004` are confirmed UNSOURCED per `source-content-inventory.md` r02 and must NOT appear as an authored fragment; if either appears in the response, that is itself a content-fidelity failure to raise, not content to match against); every authored stat fragment appears; no unauthored/invented stat appears | US-003, US-005, US-010, US-011 |
| TC-006 | `pillars-list` content parity — every returned item exact-matches its inventory source, both directions, grouped correctly by `category` | Publish | sentinel | `pillars-list` query authored; ≥6 `pillar` fragments authored | none | `GET /graphql/execute.json/headless-test/pillars-list` | Every `{title,description,category,linkPath}` exact-matches its SC-* item; `category` value is one of the 9 enumerated options and matches the group the source item belongs to (e.g. SC-PLAT-016..025 → `category="role"`) | US-003, US-005, US-010, US-011 |
| TC-007 | Whitespace-normalisation declaration check — confirm Sentinel's report explicitly lists every rich-text field where whitespace-only normalisation was applied, and confirms no wording/number/punctuation change was masked by it | Publish | sentinel | TC-002, TC-004, TC-005, TC-006 executed | Sentinel's diff log | Manual/scripted review of the diff log for each `{ html }` field | Every declared normalisation is whitespace-only; zero non-whitespace diffs are present anywhere in the "matched" set | US-010 (Q-005 Decision 2) |

---

## 2. Query isolation — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-008 | Every `_path` returned by `landing-page-by-path` (item itself, `hero._path`, each `stats[]._path`, each `sections[]._path`, each `pillars[]._path`) resolves under `/content/dam/headless-test/chisel/` | Publish | sentinel | Inspect TC-001's response `_path` fields | 100% of `_path` values start with `/content/dam/headless-test/chisel/` | US-011 |
| TC-009 | Every `_path` returned by `stats-list` and `pillars-list` resolves under `/content/dam/headless-test/chisel/` | Publish | sentinel | Inspect TC-005/TC-006 responses | 100% of `_path` values start with `/content/dam/headless-test/chisel/`; the `STARTS_WITH` filter in the persisted query text is confirmed effective, not merely present in source | US-011 |
| TC-010 | No foreign fragment (a `_path` outside `chisel/`, or a pre-existing archetype path such as the sample `asset.jpg`) appears in any of the 4 query responses | Publish | sentinel | Cross-check every `_path` across TC-001, TC-004, TC-005, TC-006 against the archetype's pre-existing DAM content list | Zero foreign paths found | US-011 |

---

## 3. Asset delivery — Publish tier (§ P7 stays ACTIVE — not waived by AD-1)

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-011 | `hero.heroImage` `ImageRef` dimensions correct | Publish | sentinel | From TC-001/TC-004 response | `_path="/content/dam/headless-test/chisel/home-hero.png"`, `width=1600`, `height=992` | US-004 |
| TC-012 | `content-section.sectionImage` `ImageRef` dimensions correct (for whichever section Composer attached `home-movement.png` to, per `design/reference-assets.md § 3`) | Publish | sentinel | From TC-001 response, locate the `sections[]` entry with a non-null `sectionImage` | `width=1080`, `height=1341` | US-004 |
| TC-013 | `home-hero.png` asset `_path` is delivery-resolvable | Publish | sentinel | `GET https://<publish-host>/content/dam/headless-test/chisel/home-hero.png` unauthenticated | HTTP 200; `Content-Type` header is an image type (`image/png`) | US-004 |
| TC-014 | `home-movement.png` asset `_path` is delivery-resolvable | Publish | sentinel | `GET https://<publish-host>/content/dam/headless-test/chisel/home-movement.png` unauthenticated | HTTP 200; `Content-Type` header is an image type (`image/png`) | US-004 |

---

## 4. Accessibility-in-payload — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-015 | `heroImageAlt` non-null and non-empty wherever `heroImage` is non-null | Publish | sentinel | From TC-001/TC-004 response | `heroImageAlt` is a non-empty string matching the alt text recorded in `design/reference-assets.md § 2` | US-004, nfr.accessibility_notes |
| TC-016 | `sectionImageAlt` non-null and non-empty wherever `sectionImage` is non-null | Publish | sentinel | From TC-001 response | `sectionImageAlt` is a non-empty string matching `design/reference-assets.md § 3` | US-004, nfr.accessibility_notes |
| TC-017 | `pillar.imageAlt` non-null and non-empty wherever `pillar.image` is non-null (defensive — no pillar has an image authored this run per the inventory, but the assertion must hold if one ever is) | Publish | sentinel | From TC-006 response | Either both `image` and `imageAlt` are null, or both are non-null — never `image` non-null with `imageAlt` null | US-004, nfr.accessibility_notes |

---

## 5. SEO fields present — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-018 | `landing-page-by-path` returns `seoTitle` and `seoDescription` | Publish | sentinel | From TC-001 response | Both fields non-null for every authored `landing-page` fragment | nfr.seo |

---

## 6. Performance / cacheability — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-019 | Observe `Cache-Control` response header on all 4 persisted-query GET requests | Publish | sentinel | Inspect response headers of TC-001, TC-004, TC-005, TC-006 | Header value recorded verbatim in Sentinel's report. **If absent, this is NOT a silent pass** — raise a finding with the concrete remediation from `technical-specifications.md § 7` (dispatcher `/graphql/execute.json/*` allow + cache rule, OR a CDN rule; no `dispatcher/` module exists in this repo, Q-002) | US-007 |
| TC-020 | p75 latency for `landing-page-by-path` | Publish | sentinel | Repeat the GET ≥20 times (or per Sentinel's own sampling standard), compute p75 | < 800 ms uncached, < 200 ms cached (`nfr.performance`) — record actual measured value regardless of pass/fail | US-007 |
| TC-021 | TTFB for `landing-page-by-path` | Publish | sentinel | Measure TTFB across the same sample | < 600 ms target — record actual value | US-007 |
| TC-022 | Payload size of `landing-page-by-path` response | Publish | sentinel | Measure response byte size for the `home` page | < 150 KB soft ceiling — record actual value; a breach is a finding, not a hard fail, per `nfr.performance` | US-007 |

---

## 7. Security / anonymous-read — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-023 | All 4 persisted queries execute unauthenticated | Publish | sentinel | Repeat TC-001/TC-004/TC-005/TC-006 with no `Authorization` header | HTTP 200 for all 4 — confirms AD-5's "anonymous read, no new service user" decision holds in the real environment | US-013 |

---

## 8. Happy path / edge cases — Publish tier

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-024 | Happy path — `home` landing page returns the minimum authored set | Publish | sentinel | From TC-001 response | Non-null `hero`; `stats.length >= 3`; `sections.length >= 3`; `pillars.length >= 6` (US-003's minimum bar, checked at the delivery layer, not just the JCR layer) | US-003 |
| TC-025 | Empty/missing-path error path — `landing-page-by-path` called with a non-existent fragment path | Publish | sentinel | `GET .../landing-page-by-path;path=/content/dam/headless-test/chisel/fragments/pages/does-not-exist` | `item` is `null`; HTTP 200 (GraphQL convention — errors are in the response body, not the transport); NOT a 500 | US-010 |
| TC-026 | Malformed-parameter error path — required `$path` variable omitted | Publish | sentinel | `GET /graphql/execute.json/headless-test/landing-page-by-path` (no `;path=`) | A GraphQL validation error in the response body (missing variable), NOT a 500, NOT an empty 200 that looks like success | US-010 |

---

## 9. Authoring-provision cases — Author tier (required, per the 18:15Z entry — every assertion states its tier)

These mirror, at the level of the REAL Author-tier environment, structural checks that Auditron already performs pre-deploy on a LOCAL install (WB-13). They are listed here as their own tier-explicit cases because the 18:15Z entry requires authoring-provision cases to run against the real Author tier as part of Sentinel's non-deferrable gate — a passing local build does not by itself prove the real environment deployed correctly.

| ID | Description | Tier | Executor | Steps | Expected result | Traces to |
|---|---|---|---|---|---|---|
| TC-027 | All 5 CF Models exist, enabled | Author | sentinel | Inspect `/conf/headless-test/settings/dam/cfm/models/{hero,stat,pillar,content-section,landing-page}` on the real Author instance (crx/de or the CF Model Editor list) | All 5 present; each `jcr:content/status="enabled"` | US-001 |
| TC-028 | GraphQL schema introspection returns all 5 model types | Author | sentinel | `POST /content/_cq_graphql/headless-test/endpoint.json` `{"query":"{ __schema { types { name } } }"}` (Author only — POST/introspection is disabled on Publish by design, AD-6) | Response includes `HeroModel`, `StatModel`, `PillarModel`, `ContentSectionModel`, `LandingPageModel` | US-001 |
| TC-029 | `endpoint.schemaerrors` clean on the real Author instance | Author | sentinel | `GET /content/cq:graphql/headless-test/endpoint.schemaerrors` | No `SCHEMA_INCOMPLETE_FIELD_REMOVED` or any other error for any of the 5 models — confirms AD-4's Option B choice deployed correctly on THIS environment, not just locally | US-001 |
| TC-030 | Fragments present under `/content/dam/headless-test/chisel/fragments/`, organised by type, each referencing the correct `contentFragmentModel` | Author | sentinel | Inspect the fragment tree on the real Author instance | Matches Composer's authored set; each fragment's `contentFragmentModel` property points at the correct model path | US-003 |
| TC-031 | Minimum fragment count present on the real Author instance | Author | sentinel | Count fragments under each type folder | ≥1 `hero`, ≥3 `stat`, ≥6 `pillar`, ≥3 `content-section`, ≥1 `landing-page` for the home page | US-003 |
| TC-032 | DAM assets present with real binaries, no binary-less `dam:Asset` | Author | sentinel | Inspect `/content/dam/headless-test/chisel/home-hero.png` and `home-movement.png` on the real Author instance; confirm an original rendition exists | Both assets have a real binary; neither is a binary-less node (`composer.md § C11`) | US-004 |
| TC-033 | GraphQL endpoint node correctly configured on the real environment | Author | sentinel | Inspect `/content/cq:graphql/headless-test/endpoint`; check `/aem/graphiql.html` dropdown | `sling:resourceType="graphql/sites/components/endpoint"`, `configurationPath="/conf/headless-test"`; `headless-test` appears in the GraphiQL dropdown | US-002 |
| TC-034 | Persisted queries exist as real `persistentQueries` binary nodes on the real environment (not a `persistedQueries/*.json` artifact) | Author | sentinel | Inspect `/conf/headless-test/settings/graphql/persistentQueries/{landing-page-by-path,hero-by-path,stats-list,pillars-list}` | All 4 present as binary nodes with `sling:resourceType="graphql/persistent/query"`; no sibling `persistedQueries` folder exists anywhere in the repository | US-005 |

---

## 10. Per-track N/A disposition — carried VERBATIM from `technical-specifications.md § 7.1`

**These are not test cases to execute — they are explicit dispositions Sentinel MUST record**, each with its own AD-1-citing reason. A blanket "visual track N/A" with no per-track reason is a test-plan defect (§ P12), and running any of these tracks against a run with no rendered surface is an equally real defect in the other direction (R-09). Listed here, verbatim, so Sentinel is handed the reasons rather than an instruction to guess or silently skip:

| Track | Status | Reason (verbatim from § 7.1) | Records it |
|---|---|---|---|
| Tier-A visual diff — desktop 1440×900 | **N/A** | AD-1 produces no rendered surface, so there is no delivered output to capture. Independently, neither supplied PNG is a page screenshot (both are text-free editorial photographs), so there is no reference layout to diff against — `reference-deconstruction.md § 5` records every visual attribute as NOT OBSERVED. | sentinel |
| Tier-A visual diff — mobile 390×844 | **N/A** | Same as desktop: no rendered output at either viewport under AD-1, and no reference layout at any viewport. | sentinel |
| Browser automation / page fetch | **N/A** | AD-1 delivers no page URL. The only HTTP surface is `GET /graphql/execute.json/headless-test/<name>`, which Sentinel exercises as a direct HTTP request (§§ 1–9 above) — that is the content-parity track, not a browser track. | sentinel |
| Core Web Vitals (LCP / INP / CLS) | **N/A** | Unmeasurable without a rendered document; AD-1 produces none. Recorded as N/A, explicitly NOT as a gap or a failure. The performance obligation is redirected to the persisted-query response (TTFB, p75 latency, payload size, `Cache-Control` — §§ 6 above). | sentinel |
| Page-level accessibility scan (DOM, contrast, heading order, focus order) | **N/A** | No DOM exists under AD-1. The accessibility obligation is relocated INTO the payload — alt text must be present in the GraphQL response (§ 4 above), which Sentinel DOES assert. Relocated, not dropped. | sentinel |
| `ui.tests` Cypress→Playwright harness migration (§ 9.1 pre-deploy obligation) | **N/A under AD-1** | There is no UI to test — no rendered surface, no consumer app in this repo — so the pre-deploy harness migration is inapplicable by the same AD-1 logic that makes the visual tracks N/A. Recorded in `handoffs/pilot.yaml` (WB-14), not this document — listed here only so Sentinel does not attempt it either. | pilot (recorded), sentinel (does not attempt) |

**NOT-N/A tracks, listed alongside so nothing in scope is swept away under cover of the N/A rows above (R-09a):**

| Track | Status | Where it is covered in THIS document |
|---|---|---|
| Reference-asset provenance record | NOT N/A — required | `design/reference-assets.md` (WB-02A) — a separate artifact, not a Sentinel test case |
| DAM asset seeding + delivery resolvability (§ P7) | NOT N/A — active | §§ 3 (TC-011..014) above |
| GraphQL content parity, Publish tier | NOT N/A — core acceptance evidence | §§ 1–8 (TC-001..026) above |
| Authoring-provision cases, Author tier | NOT N/A — required | § 9 (TC-027..034) above |

---

## 11. Traceability summary

| Requirement | Test case IDs |
|---|---|
| US-001 | TC-027, TC-028, TC-029 |
| US-002 | TC-033 |
| US-003 | TC-002, TC-003, TC-004, TC-005, TC-006, TC-024, TC-030, TC-031 |
| US-004 | TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-032 |
| US-005 | TC-001, TC-004, TC-005, TC-006, TC-034 |
| US-006 | *(no TC IDs allocated in this document — CORS reachability is asserted structurally in `design/persisted-query-contracts.md § 7`; the actual cross-origin browser check is out of scope under AD-1 since no browser-based consumer exists in this repo to originate a cross-origin request. Sentinel has no CORS-specific TC here; if a consumer is later commissioned, this is the first gap to fill.)* |
| US-007 | TC-019, TC-020, TC-021, TC-022 |
| US-010 | TC-001, TC-002, TC-003, TC-007, TC-025, TC-026 |
| US-011 | TC-005, TC-006, TC-008, TC-009, TC-010 |
| US-013 | TC-023 |

**Every row above enumerates its own TC IDs — no bare "covered elsewhere" row.** US-006 is the one requirement with zero allocated TC IDs in this document; the reason and the pointer to where its structural half IS covered are stated explicitly in that row, not left as a silent gap.

---

## 12. Gate self-check (Designforge)

- ID Index block present and its count matches the body: **34 declared, 34 present (TC-001..TC-034), no gaps, no duplicates.**
- Every TC carries an `executor:` — **confirmed**, all 34 are `sentinel` (no `auditron`-executed case is defined in this document; Auditron's own build-validation checks are specified independently in `technical-specifications.md § 11` WB-13 and are not duplicated here as TC items, to avoid two documents claiming ownership of the same ID space — see § 9's note explicitly cross-referencing that overlap rather than hiding it).
- Every TC states its TIER — **confirmed** (Publish or Author throughout).
- Content parity is EXACT-MATCH, whitespace-normalisation declared explicitly — **confirmed**, TC-002, TC-007.
- No UI-test scenario, no visual-diff case, no page fetch, no Core Web Vitals case exists among the 34 TCs — **confirmed** by construction (all 34 are HTTP/JSON/JCR assertions).
- Per-track N/A rows carried verbatim from § 7.1, each with its own reason — **confirmed**, § 10.
- Every requirement traces to ≥1 TC ID, or an explicit zero-allocation reason with a pointer — **confirmed**, § 11 (US-006 is the one explicit exception, reasoned).
- **WB-02 r02 correction-pass note (added, no TC IDs added/removed/renumbered):** TC-002 and TC-005's expected-result cells were updated in place to cite the corrected `source-content-inventory.md` r02 values (`DECISIONS.md 2026-08-26T09:00Z`). No other TC changed. The 34-item ID index above is unaffected — this was a content correction to existing rows' expected values, not a scope change.
