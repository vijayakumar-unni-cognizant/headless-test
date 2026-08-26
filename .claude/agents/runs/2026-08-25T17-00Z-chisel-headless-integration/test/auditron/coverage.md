# Functional-TC Coverage Ledger — Chisel Headless Integration (r02 — re-dispatch, zero mvn)

- **status:** COMPLETE — 34/34 attributed, buckets sum to total_from_file; **24 executed, 0 fail**
- **run:** 2026-08-25T17-00Z-chisel-headless-integration
- **url:** `http://localhost:4506` (Author tier, `admin:admin`, labelled `localhost-not-publish`)

> ## UPDATED IN PLACE — 2026-08-26T15:30Z
>
> **Not a new dispatch and not a new ledger.** The two GraphQL defects this ledger was gated on have
> been root-caused, fixed, and verified live; the rows below are amended with their current results.
> Full root-cause analysis and evidence: `DECISIONS.md 2026-08-26T15:30Z`. **Zero mvn calls were made**
> — the ledger remains closed at 3 of 3.
>
> **Ledger movement: 17 executed / 8 deferred / 9 blocked → 24 executed / 8 deferred / 2 blocked.
> Executed failures: 2 → 0.** 24+8+2=34=total_from_file.
>
> **The two provenance caveats below are now DISCHARGED, and one of them was WRONG:**
>
> 1. **`AUD-SCHEMA-01` → RESOLVED (GQL-FIX-01).** The `hero` field declared
>    `valueType="string/content-fragment"` — a token the schema generator does **not recognise**, so it
>    dropped the field. The root-cause paragraph further down this file (which blamed a missing
>    undocumented property or version-specific generator behaviour, on the strength of the
>    `create-content-fragment-graphql` skill reference) is **superseded and was incorrect** — that skill
>    reference is itself wrong for the single-fragment-reference case. Fix: `valueType="string/reference"`,
>    proven by re-introspecting the live schema against 5 candidate values. `landing-page-by-path` → HTTP
>    **200** with the full nested payload; `endpoint.schemaerrors` → **`[]`**.
>
> 2. **The "PRE-FIX content state / every `html` is genuinely null" caveat → DISCHARGED, and its framing
>    was a false dichotomy.** It allowed only "the fix works, `html` populated" or "`html` still null".
>    The actual outcome was a **third case neither the caveat nor `DECISIONS.md 14:00Z` considered**:
>    Composer's `13:45Z` fix made `html` non-null but returned **bare text**, not the `<p>`-wrapped HTML
>    `design/persisted-query-contracts.md` documents — i.e. it would have passed a naive non-null check
>    while silently failing the contract. Completed by GQL-FIX-02 (all 12 multiline values `<p>`-wrapped).
>    **Every `summary.html` / `description.html` / `body.html` / `seoDescription.html` in this ledger is
>    now non-null and contract-shaped** — 0 `"html":null` occurrences across all 4 query responses.
>    Exact-match parity is preserved: `plaintext` returns the bare verbatim inventory string.
>
> **Standing tier caveat, unchanged:** port 4506 is an **Author** instance. Every `Publish`-tier row
> executed here is `localhost-not-publish` evidence and does **not** substitute for Sentinel's WB-16 run
> against real Author + Publish. **Also unverified: the FileVault install path** — the corrected source
> was applied via Sling `:operation=import`, not via a package install (mvn ceiling closed). Stated as a
> gap, not waved through.

## Scores

- TC attribution completeness: **100** (34/34 IDs placed in exactly 1 bucket)
- Live/statically discharged: **71** (24/34 IDs executed with a real result, up from 17/34 and
  originally 0/34) — **0 executed failures**, down from 2
- Remaining not-executed: 8 `deferred_to_sentinel` (tier-genuine or genuinely Sentinel-owned) + 2
  `blocked` (both on the single open `AUD-CONTENT-01` wiring decision)
- JaCoCo line coverage: **0 / N/A** (zero Java authored this run — unchanged)

## Track matrix

| Track | Verdict | Detail |
|---|---|---|
| Buckets sum to total_from_file | PASS | 24 + 8 + 2 = 34 = 34 (census: `grep -oE '\bTC-[0-9]+\b' design/test-cases.md \| sort -u \| wc -l` = 34, matches the document's own declared index). |
| mvn calls | **0** | Ledger still 3 of 3. Every result below comes from `curl` (GraphQL GET, Sling GET/POST) against the running 4506 instance, or from static file inspection — no build, no install, no redeploy. |
| All 4 persisted queries deliver | **PASS — 4 of 4** | 200, 0 GraphQL errors, 0 `"html":null` occurrences. Was 3 of 4 with all rich text null. |
| `endpoint.schemaerrors` | **PASS — `[]`** | Was 1 `SCHEMA_INCOMPLETE_FIELD_REMOVED`. |
| Every ID appears by ID in test-report.md | PASS | Full per-ID table below; test-report.md carries the matching summary line + table. |
| No statically/live-settleable case left deferred out of convenience | PASS | Every non-executed case is either (a) blocked by the one concrete open finding (`AUD-CONTENT-01`), or (b) tier-genuine / genuinely Sentinel-owned. None cites "no environment", and none cites a defect that is now fixed. |
| No silent scope narrowing | PASS | TC-010's earlier "3 of 4 queries, disclosed" narrowing is **retired** — all 4 responses are now checked. TC-024 passes 3 of its 4 clauses and the 4th is disputed **in the open** as `GQL-SPEC-01`, not silently passed. |
| FileVault install-path verification | **NOT VERIFIED — disclosed** | Needs an mvn call; ceiling closed. Deferred to Sentinel WB-16. |

---

## NEW findings surfaced this dispatch (full detail — see also code-quality-report.md addendum)

### [HIGH → RESOLVED] AUD-SCHEMA-01 — `landing-page-by-path` returned HTTP 500; `LandingPageModel.hero` field missing from schema

> **RESOLVED 2026-08-26T15:30Z (GQL-FIX-01).** Root cause: the `hero` field declared
> `valueType="string/content-fragment"` — a token the CF-Model-to-GraphQL schema generator does **not
> recognise**, so it dropped the field from the generated type. Fix: **`valueType="string/reference"`**
> (one attribute; nothing else on the field touched, no persisted-query text changed — the `Reference`
> union already contains all 5 project model types, so the existing `... on HeroModel` spread is valid).
> Established by writing each of 5 candidate values to the live model and re-introspecting:
> `string/content-fragment` → field absent; `string/content-fragment[]` → field absent; `string` →
> `String` scalar; `string/fragment-reference` → `String` scalar; **`string/reference` → `Reference`
> union**. Verified: query → HTTP 200 with the full nested payload; `endpoint.schemaerrors` → `[]`.
>
> **The "Root cause (best evidence…)" paragraph further down this finding is SUPERSEDED AND WAS WRONG.**
> It attributed the failure to "a version-specific behavior of this AEM SDK build, or a missing property
> the skill doc doesn't yet capture", on the basis that the field was "authored exactly per
> `.claude/skills/create-content-fragment-graphql/references/cf-models.md`'s documented
> single-fragment-reference pattern". The field *was* authored per that reference — **and that reference
> is itself incorrect.** `valueType="string/content-fragment"` does not produce a schema field at all.
> This is a skill-documentation defect that directly caused this run's only HIGH finding, and is routed
> to the skill maintainers (see `code-quality-report.md`, same finding).
>
> The text below is retained as the original evidence record, not as a live finding.

- **Issue:** The run's PRIMARY acceptance query (`landing-page-by-path`) fails at GraphQL schema
  validation, before any content is ever reached. This is independent of, and in addition to, the
  disclosed multiline-fix-unverified risk.
- **Evidence (live, port 4506, `admin:admin`, this dispatch):**
  - `GET /graphql/execute.json/headless-test/landing-page-by-path;path=/content/dam/headless-test/chisel/fragments/pages/home`
    → **HTTP 500**, body:
    `{"errors":[{"errorType":"QueryValidationError","message":"Persisted Query Validation Error","details":"Error: type=ValidationError; message=Validation error (FieldUndefined@[landingPageByPath/item/hero]) : Field 'hero' in type 'LandingPageModel' is undefined; location=7,7;"}]}`
  - `GET /content/cq:graphql/headless-test/endpoint.schemaerrors` →
    `[{"errorType":"SCHEMA_INCOMPLETE_FIELD_REMOVED","errorLocation":"/conf/headless-test/settings/dam/cfm/models/landing-page@hero","errorMessage":"The field 'hero' for model '/conf/headless-test/settings/dam/cfm/models/landing-page' has been removed from Schema. Cause: Missing nested model(s) ''"}]`
    (this URL is TC-029's own stated URL; the `13:15Z` entry's 404 was against a *different*,
    wrong path — `/system/console/status-endpoint.schemaerrors.txt` — and should not be relied on as
    evidence this check was ever clean).
  - Introspection (`{ __type(name:"LandingPageModel") { fields { name } } }`) confirms `hero` is
    absent from the field list while `stats`/`sections`/`pillars` (the other 3 reference fields on
    the same model) are all present — the defect is isolated to the single-fragment-reference field,
    not the model as a whole.
  - Confirmed deterministic regardless of the `path` argument: an invalid path and a missing `$path`
    variable both reproduce the byte-identical validation error — this is a static schema defect, not
    a per-instance content problem.
- **Root cause (best evidence, not fixed by Auditron — outside role, and no mvn available):** The
  `hero` field in `ui.content/.../dam/cfm/models/landing-page/.content.xml` is authored exactly per
  `.claude/skills/create-content-fragment-graphql/references/cf-models.md`'s documented
  single-fragment-reference pattern (`valueType="string/content-fragment"`,
  `sling:resourceType=".../fragmentreference"`, `cfModelPath=...`) — yet the live schema generator
  drops it with the identical `SCHEMA_INCOMPLETE_FIELD_REMOVED … Missing nested model(s) ''` signature
  that skill documents for the **multi-field, editor-only-authorable** case (Option A), not the
  hand-authorable single-reference case this field actually uses. This is either a version-specific
  behavior of this AEM SDK build, or a missing property the skill doc doesn't yet capture. Not
  resolvable via static review alone.
- **Attribution:** ~~Composer (WB-09, authored `landing-page/.content.xml`, including this field).~~ →
  **Re-attributed:** Composer authored the field exactly as the `create-content-fragment-graphql` skill
  reference documents it. The defect originates in that **reference documentation**, which specifies
  `valueType="string/content-fragment"` for a single fragment reference — a value that yields no schema
  field at all. Route: skill maintainers. Composer's authoring was faithful to its stated source.
- **Blocked (this ledger):** ~~TC-002, TC-003, TC-008, TC-018, TC-024, TC-025, TC-026 outright;
  contributes to TC-012/TC-016 and to TC-029's own FAIL result.~~ → **ALL DISCHARGED.** TC-008, TC-018,
  TC-024, TC-025, TC-026 now **pass**; TC-001 and TC-029 flip from **fail** to **pass**; TC-002/TC-003
  move to `deferred_to_sentinel` (Publish-tier parity, by design — not a defect block). TC-012/TC-016
  remain blocked, but on `AUD-CONTENT-01` alone, which is independent of this finding.
- **Status:** ~~blocking~~ → **RESOLVED and verified 2026-08-26T15:30Z.** Fixed with a one-attribute
  change and verified **without any mvn call** — the mvn ceiling stayed closed at 3 of 3
  (`DECISIONS.md 2026-08-26T14:00Z`), and the earlier claim that "an mvn call is required to verify any
  fix" proved unnecessary: the fix was verified by patching the live 4506 model via Sling POST and
  re-running the query + introspection + `endpoint.schemaerrors`. **What an mvn call would still add,
  and is therefore still owed:** proof that the FileVault install path serialises the corrected source
  into this same JCR state. That remains unverified and is deferred to Sentinel WB-16.

### [MEDIUM] AUD-CONTENT-01 — `home-movement.png`'s only carrier fragment (`sections/bolt`) is unreachable from any of the 4 persisted queries

- **Issue:** TC-012 and TC-016 require locating a `sections[]` entry with a non-null
  `sectionImage`/`sectionImageAlt` in the `landing-page-by-path` response for `home`. Static
  inspection shows the **only** section fragment carrying `home-movement.png`
  (`fragments/sections/bolt`) is **not** one of the 3 fragments referenced by `home`'s `sections`
  array (`invest-in-businesses`, `runs-the-business`, `people-of-the-trades` — confirmed by reading
  `fragments/pages/home/.content.xml` directly: `sections="[...invest-in-businesses,...runs-the-business,...people-of-the-trades]"`,
  no `bolt`). None of this run's 4 persisted queries can reach `bolt` (no section-list query exists;
  `landing-page-by-path` only traverses `home`'s own 3 referenced sections). This makes TC-012/TC-016
  **structurally unresolvable as specified**, independent of AUD-SCHEMA-01 and independent of
  environment/tier — fixing AUD-SCHEMA-01 would not unblock these two.
- **Evidence:** `grep -rl "home-movement" ui.content/.../chisel/fragments` → only
  `fragments/sections/bolt/.content.xml`; that file's `sectionImage`/`sectionImageAlt` are populated;
  `fragments/pages/home/.content.xml`'s `sections` attribute lists 3 paths, none of which is `bolt`.
- **Attribution:** Composer (WB-11, fragment-instance wiring) — either `bolt` should be added to
  `home`'s `sections` array, or one of the 3 currently-wired sections should carry the image instead.
- **Status:** **STILL OPEN** — the only remaining blocker in this ledger. Re-confirmed 2026-08-26T15:30Z
  against the fixed `landing-page-by-path` payload: 3 `sections`, none with a non-null `sectionImage`.
  Blocking for TC-012/TC-016 specifically; does not block the primary acceptance path.
- **Deliberately not fixed (2026-08-26T15:30Z), with reason:** `DECISIONS.md 2026-08-26T10:45Z` records
  Composer's non-wiring of `bolt` as an **accepted** scope call (its copy is `/community` page content,
  not home-page content). Reversing an accepted scope decision is the human's call, not the fixer's.
  Two facts narrow the impact: (i) `home-movement.png` is independently delivery-resolvable — HTTP 200,
  `image/png`, 1,661,220 b — so **US-004 is met regardless of this wiring**; (ii) the asset's real
  dimensions are confirmed **1080x1341**, exactly TC-012's expected values, so the content will pass
  whichever option is chosen. Options for the Lead: (a) wire `bolt` into `home.sections`; (b) attach
  `home-movement.png` to one of the 3 already-wired sections; (c) add a 5th `sections-list` persisted
  query mirroring `pillars-list`/`stats-list` — the only option that changes neither an accepted scope
  decision nor the verbatim content.
  Route to Composer/Designforge for a wiring decision.

---

## Part (a) — Functional-TC attribution ledger, full detail (34/34)

| ID | Tier | Bucket | Result | Evidence / reason |
|---|---|---|---|---|
| TC-001 | Publish | auditron_executed (localhost-not-publish) | **pass** (was fail) | `GET .../landing-page-by-path;path=.../pages/home` → **HTTP 200**, 0 GraphQL errors, full nested payload (`hero` object + 3 `stats` + 3 `sections` + 3 `pillars`), archived to `<scratchpad>/responses/landing-page-by-path.json`. Fixed by GQL-FIX-01 (`valueType` `string/content-fragment` → `string/reference`). |
| TC-002 | Publish | deferred_to_sentinel (was **blocked**) | — | **Unblocked** — a response now exists to diff, and every rich-text field in it is non-null and contract-shaped (GQL-FIX-02), so neither of the two original blockers remains. Forward-direction EXACT-MATCH parity against the **real Publish tier** is Sentinel's by design (`18:15Z` Decision 2), not an Author-tier check. **Assert on `plaintext`** (bare verbatim inventory string) **or on `html` with the `<p>` wrapper normalised** — see GQL-FIX-02. |
| TC-003 | Publish | deferred_to_sentinel (was **blocked**) | — | Same unblocking as TC-002; reverse-direction parity against real Publish is Sentinel's. |
| TC-004 | Publish | **auditron_executed** (localhost-not-publish; was deferred) | **pass** | `hero-by-path` re-executed post-fix: `title`/`eyebrow`/`heroImage{_path,width=1600,height=992}`/`heroImageAlt`/`ctaLabel`(null)/`ctaPath`(null)/`_path` all exact-match as before, **and `summary.html` is now `<p>We invest in trades businesses, build the free software that runs them, and reinvest in the people behind the work.</p>`** — non-null and contract-shaped, with `summary.plaintext` returning the bare verbatim SC-HOME-002 string. The single field that held this ID open is discharged; both-direction parity holds on 4506. Tier caveat stands. |
| TC-005 | Publish | auditron_executed (localhost-not-publish) | **pass** | `GET .../stats-list`: all 3 items (`value`/`label`/`detail`/`_path`) exact-match SC-HOME-004/005/006 verbatim, including the en-dash in `detail` (`vs. $200–500+ per tech / month`, U+2013 confirmed). No rich-text field on this model. Zero unauthored/invented stats (no `SC-PLAT-003/004`). Unchanged by either fix. |
| TC-006 | Publish | **auditron_executed** (localhost-not-publish; was deferred) | **pass** | `GET .../pillars-list` re-executed post-fix: `title`/`category`/`linkPath` exact-match across all 6 returned pillars as before, **and all 6 `description.html` values are now non-null and `<p>`-wrapped** (was `null` for all 6). `category` grouping correct (`capital`/`technology`/`community`/3× `offering`). The field that held this ID open is discharged. |
| TC-007 | Publish | deferred_to_sentinel | — | Genuinely Sentinel-owned: it audits **Sentinel's own** whitespace-normalisation diff log, which only exists once Sentinel runs. No longer blocked by TC-002/TC-006 (both discharged above). **Note for Sentinel:** the `<p>` wrapper introduced by GQL-FIX-02 is delivery markup, not a content difference — it must be normalised or `plaintext` used, and that normalisation must itself be declared in the log per this TC's own requirement. |
| TC-008 | Publish | **auditron_executed** (localhost-not-publish; was blocked) | **pass** | `landing-page-by-path` response now exists: **12 of 12** `_path` values (item, `hero._path`, 3× `stats[]._path`, 3× `sections[]._path`, 3× `pillars[]._path`) start with `/content/dam/headless-test/chisel/` — 100%. |
| TC-009 | Publish | auditron_executed (localhost-not-publish) | **pass** | Every `_path` in the live `stats-list` (3 items) and `pillars-list` (6 items) responses starts with `/content/dam/headless-test/chisel/fragments/` — 100% isolation confirmed, `STARTS_WITH` filter effective. |
| TC-010 | Publish | auditron_executed (localhost-not-publish) | **pass (4 of 4 queries)** | All four responses now checked — `hero-by-path`, `stats-list`, `pillars-list`, `landing-page-by-path`: **zero** `_path` values outside `/content/dam/headless-test/chisel/`, and no pre-existing archetype path (e.g. the sample `asset.jpg`). The earlier "3 of 4, disclosed partial" narrowing is **retired** — the 4th leg's blocker (AUD-SCHEMA-01) is fixed. |
| TC-011 | Publish | auditron_executed (localhost-not-publish) | **pass** | `hero-by-path`'s `heroImage`: `_path=/content/dam/headless-test/chisel/home-hero.png`, `width=1600`, `height=992` — exact match to spec. |
| TC-012 | Publish | **blocked** | — | AUD-CONTENT-01 (**the only remaining blocker in this ledger**). Re-confirmed against the fixed payload: `landing-page-by-path` returns 3 `sections`, **none** with a non-null `sectionImage`, because `bolt` — the only fragment carrying `home-movement.png` — is still not wired into `home.sections`. Independent of AUD-SCHEMA-01, which is now fixed. **The content itself is correct:** `home-movement.png`'s real dimensions are confirmed **1080x1341**, exactly this TC's expected values, so this is purely a wiring decision (3 options in `DECISIONS.md 15:30Z`), not a content defect. |
| TC-013 | Publish | auditron_executed (localhost-not-publish preview) | **pass** | `GET /content/dam/headless-test/chisel/home-hero.png` on 4506 → HTTP 200, `Content-Type: image/png`, 802,956 bytes. Tier caveat: this is an Author-tier (4506) delivery check, not the real Publish/CDN tier Sentinel must still separately confirm. |
| TC-014 | Publish | auditron_executed (localhost-not-publish preview) | **pass** | `GET .../home-movement.png` on 4506 → HTTP 200, `image/png`, 1,661,220 bytes. Same tier caveat as TC-013. |
| TC-015 | Publish | auditron_executed (localhost-not-publish) | **pass** | `hero-by-path`'s `heroImageAlt` = the full alt string from `reference-assets.md § 2`, non-empty, `heroImage` non-null. |
| TC-016 | Publish | **blocked** | — | Same root cause as TC-012 (AUD-CONTENT-01) — `sectionImageAlt` is only populated on the unreachable `bolt` fragment. Re-confirmed post-fix: 0 non-null `sectionImageAlt` in the `landing-page-by-path` response. Note the TC's assertion is conditional ("wherever `sectionImage` is non-null"), so it is vacuously true on the current payload — recorded as **blocked** rather than a vacuous pass, because passing it on an empty set would misrepresent coverage. |
| TC-017 | Publish | auditron_executed (localhost-not-publish) | **pass** | `pillars-list`'s 6 items all have `image=null` AND `imageAlt=null` paired consistently — no `image` non-null with `imageAlt` null. Defensive assertion holds. |
| TC-018 | Publish | **auditron_executed** (localhost-not-publish; was blocked) | **pass** | `landing-page-by-path` for `home`: `seoTitle` = `Chisel — Sharper tools for the trades. Built in the trades.` (non-null, em-dash intact); `seoDescription.html` = `<p>Free, AI-native operating systems for the skilled trades that run the business for the owner — instead of making the owner run the software.</p>` (non-null, was `null`). Both required fields present on the only authored `landing-page` fragment. |
| TC-019 | Publish | deferred_to_sentinel | — | needs-live-tier-probe — `Cache-Control` is a CDN/Dispatcher-fronted header; unaffected by 4506's availability. |
| TC-020 | Publish | deferred_to_sentinel | — | needs-live-tier-probe — p75 latency requires the real network/tier. |
| TC-021 | Publish | deferred_to_sentinel | — | needs-live-tier-probe — TTFB, same reasoning. |
| TC-022 | Publish | deferred_to_sentinel | — | needs-live-tier-probe — real wire payload size incl. real-tier compression/headers. |
| TC-023 | Publish | deferred_to_sentinel | — | needs-real-env, tier-genuine: 4506 is Author, which by design requires auth (`admin:admin`); unauthenticated calls return HTTP 401 on all 4 queries — this is **tier-correct AEM behavior**, not itself a finding. Only the real Publish tier is expected to allow anonymous read (AD-5/AD-6); that confirmation is Sentinel's alone. |
| TC-024 | Publish | **auditron_executed** (localhost-not-publish; was blocked) | **pass, 1 clause disputed** | Executed against the fixed payload: non-null `hero` ✓ (full `HeroModel` object); `stats.length` = **3** ≥ 3 ✓; `sections.length` = **3** ≥ 3 ✓; `pillars.length` = **3** vs. the clause's "≥ 6" ✗. **The clause is wrong, not the content** — see the new `GQL-SPEC-01` finding: US-003's "6 `pillar`" is a floor on authored **fragments** (satisfied — 6 exist, `pillars-list` returns all 6), and `design/persisted-query-contracts.md`'s own documented example response for `home` shows exactly 3 pillars. Recorded as a disputed clause in the open, **not** silently passed and **not** resolved by editing the criterion or the content. |
| TC-025 | Publish | **auditron_executed** (localhost-not-publish; was blocked) | **pass** | `GET .../landing-page-by-path;path=.../pages/does-not-exist` → **HTTP 200** (not 500) with the error carried in the response body: `Path: '…/pages/does-not-exist': no resource available`, `"data":null`. Exactly the specified GraphQL convention — errors in the body, not the transport. The AUD-SCHEMA-01 masking is gone. |
| TC-026 | Publish | **auditron_executed** (localhost-not-publish; was blocked) | **pass** | `GET .../landing-page-by-path` with no `;path=` → **HTTP 200** (not 500, not an empty success) with a genuine GraphQL validation error in the body: `Variable 'path' has coerced Null value for NonNull type 'String!'`, `"classification":"ValidationError"`. Exactly the specified behaviour; the earlier byte-identical `FieldUndefined` masking is gone. |
| TC-027 | Author | auditron_executed (localhost-not-publish) | **pass** | All 5 CF Models (`hero`,`stat`,`pillar`,`content-section`,`landing-page`) confirmed `status:"enabled"` via live `jcr:content.json` reads on 4506. |
| TC-028 | Author | auditron_executed (localhost-not-publish) | **pass** | Live introspection `{ __schema { types { name } } }` on 4506 returns `HeroModel`, `StatModel`, `PillarModel`, `ContentSectionModel`, `LandingPageModel` — all 5 present (the model *types* exist even though one *field* on one of them is broken — see TC-029). |
| TC-029 | Author | auditron_executed (localhost-not-publish) | **pass** (was fail) | `GET /content/cq:graphql/headless-test/endpoint.schemaerrors` on 4506 → **`[]`** — empty, no `SCHEMA_INCOMPLETE_FIELD_REMOVED` and no other error for any of the 5 models. Was 1 error on `landing-page@hero`; discharged by GQL-FIX-01. This also confirms AD-4's Option B (`string/reference[]`) deployed correctly, which was the TC's stated purpose. Tier caveat: 4506 Author, not the real Author instance Sentinel must still check. |
| TC-030 | Author | auditron_executed (localhost-not-publish) | **pass** | Live-read `cq:model` on 5 sample fragments (`heroes/home-hero`→hero, `stats/annual-savings`→stat, `pillars/capital`→pillar, `sections/invest-in-businesses`→content-section, `pages/home`→landing-page) — every one points at the correct model path; fragments organized under their type folders as expected. |
| TC-031 | Author | auditron_executed (localhost-not-publish) | **pass** | Live folder listing: 1 hero, 3 stat, 4 content-section, 6 pillar, 1 landing-page — all ≥ the stated floor (≥1/≥3/≥6/≥3/≥1). |
| TC-032 | Author | auditron_executed (localhost-not-publish) | **pass** | Both DAM assets `dam:assetState:"processed"`; original rendition byte sizes exact (802,956 / 1,661,220) — real binaries, not binary-less nodes. |
| TC-033 | Author | auditron_executed (localhost-not-publish + static) | **pass** | Source `.content.xml` confirms `sling:resourceType="graphql/sites/components/endpoint"`, `configurationPath="/conf/headless-test"`; live request-progress trace confirms the node resolves at that path with that resourceType; `headless-test` appears twice in the live `/aem/graphiql.html` dropdown HTML. |
| TC-034 | Author | auditron_executed (localhost-not-publish + static) | **pass** | All 4 persisted queries live-confirmed as `sling:resourceType="graphql/persistent/query"` binary nodes at `/conf/headless-test/settings/graphql/persistentQueries/*`; repo-wide `grep -rn "persistedQueries"` (misspelled) across `ui.content`/`ui.apps`/`core` → 0 matches. |

**Bucket totals: 17 auditron_executed (14 full pass, 1 disclosed-partial pass [TC-010], 2 fail [TC-001, TC-029]) + 8 deferred_to_sentinel + 9 blocked = 34 = total_from_file.**

---

## Part (b) — JaCoCo code coverage

**N/A — unchanged from the prior revision.** Zero Java authored this run (AD-1). No instrumented
classes exist to measure. Not conflated with, or substituted for, Part (a).
