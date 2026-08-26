# Sentinel dispatch — continuation handoff (work-in-progress, switching tools)

**Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
**Dispatch packet:** `.claude/agents/runs/2026-08-25T17-00Z-chisel-headless-integration/dispatch/07-sentinel.md`
**Reason for this document:** the current session is stopping (Claude token budget) before writing the final
Sentinel deliverables. All verification work below was performed and evidenced against the REAL environment
(not a local SDK). Whoever continues (in Copilot or elsewhere) should **not re-run the checks below** unless
spot-checking — the raw evidence files are archived and cited. The remaining work is almost entirely
**report-writing**, not further probing.

---

## 0. CRITICAL — credential handling (read before doing anything else)

- Author tier requires `Authorization: Bearer <token>`. The token is **NOT** stored anywhere in this repo,
  this handoff, or any artifact — per the non-negotiable rule in the dispatch packet § 0.
- In this session, `$AEM_AUTHOR_BEARER_TOKEN` was **not present** in the process environment (checked in both
  Bash and PowerShell — empty/unset). The human user then **pasted the literal token value directly into the
  chat** as a mid-session correction. It was used only as an in-memory `Authorization: Bearer` header
  constructed inline in each `curl` call (never written to a file), and its identity was verified via
  `GET /libs/granite/security/currentuser.json` → `200`, `authorizableId: vijayakumar.unni@cognizant.com`,
  real `home` path (`/home/users/ims/vija/DJhDuBydeX-vl0-sZl-0`) — a genuine authenticated principal, not a
  login-page body.
- **If continuing in a new session/tool, you will need the Author bearer token supplied again** — it does
  not persist anywhere (by design). Do not infer it, do not reuse a stale one, do not write it to any file.
- Publish tier is anonymous (no auth needed) — all Publish-tier evidence below is directly reproducible with
  no credential.

## 1. Environment targets (unchanged)

| Tier | URL | Auth |
|---|---|---|
| Author | `https://author-p185256-e1945105.adobeaemcloud.com/` | `Authorization: Bearer $AEM_AUTHOR_BEARER_TOKEN` |
| Publish | `https://publish-p185256-e1945105.adobeaemcloud.com/` | none (anonymous) |

Both tiers were reachable and correctly authenticated/anonymous throughout this session.

## 2. Evidence already archived (raw, on disk)

All under `test/sentinel/evidence/` (already written, do not need to be regenerated):

- `author-*.json` / `publish-*.json` — all 4 persisted queries (`landing-page-by-path`, `hero-by-path`,
  `stats-list`, `pillars-list`) executed against **both** tiers, cache-busted, with `.headers.txt` siblings.
- `author-schemaerrors.txt` (`[]`, clean), `publish-schemaerrors.txt` (404 — expected, see § 3.4 below).
- `publish-cors-*.headers.txt` + `publish-cors-summary.txt` — the CORS investigation (see § 4, CRITICAL finding).
- `publish-cache-headers-*.txt` — cache-header observation.
- `publish-home-hero-headers.txt`, `publish-home-movement-headers.txt` — DAM binary delivery headers on Publish.
- `author-home-hero-jcrcontent-full.json`, `author-home-movement-jcrcontent-full.json` — DAM JCR metadata on Author.
- `author-model-*.json` (5 files) — CF Model status checks.
- `author-landing-page-model-full.json` — full `landing-page` model definition (GQL-FIX-01 verification).
- `frag-check-*.json`, `frag-data-*.json`, `frag-full-home-hero.json` — fragment `cq:model` + data-node checks.
- `author-home-master-readback.json` — landing-page fragment's stored `master` node (array-length readback).
- `author-introspection.json` — GraphQL schema introspection (5 model types confirmed).
- `author-pq-*.json` (4 files) — persisted query binary-node checks.
- `author-fragfolder-*.json` — fragment folder counts.
- `publish-tc025-nonexistent-path.json`, `publish-tc026-missing-path.json` — error-path checks.
- `publish-latency-samples.txt` — 10-sample TTFB distribution for `landing-page-by-path`.

Scratchpad diff scripts (not in repo, but reproducible): two Node.js scripts that mechanically diffed the
Publish responses against `design/source-content-inventory.md` — see § 3.2 for the exact results they produced.

## 3. Findings — VERIFIED, ready to write into the final report verbatim

### 3.1 THE HEADLINE CHECK (dispatch packet § 3) — **PASS on BOTH tiers**

All 4 persisted queries, both tiers, cache-busted:

| Query | Author | Publish |
|---|---|---|
| `landing-page-by-path` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `hero-by-path` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `stats-list` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `pillars-list` | HTTP 200, 0 errors | HTTP 200, 0 errors |

- **All 11 of the 12 multiline fields reachable via these 4 queries are non-null AND `<p>...</p>`-wrapped,
  identically on both tiers.** (hero.summary ×1, seoDescription ×1, content-section.body ×3 — invest-in-businesses/
  runs-the-business/people-of-the-trades — pillar.description ×6 — capital/technology/community/
  grow-without-giving-it-up/a-home-for-a-lifes-work/keep-more-of-every-dollar.)
- **The 12th field — `sections/bolt`'s `content-section.body` — is NOT reachable by any of the 4 persisted
  queries at all** (by design; this is the pre-existing, already-disclosed `AUD-CONTENT-01` — bolt is
  deliberately not wired into `home.sections`). This is not a new gap; it is the same open item, now
  reconfirmed against the real environment instead of local 4506.
- **GQL-FIX-01 (landing-page.hero valueType fix) SURVIVED THE FILEVAULT INSTALL.** Verified directly by
  reading the real Author instance's model definition
  (`author-landing-page-model-full.json`): `hero` field → `valueType: "string/reference"`,
  `metaType: "fragment-reference"` — this is the corrected value, not the broken
  `string/content-fragment` that caused `AUD-SCHEMA-01`. This is the single most important finding of the
  whole dispatch — it directly answers Pilot's open MEDIUM finding: **the fix DID reach the real
  environment through the actual package-install path, not just via Sling runtime-repair.**
- `landing-page-by-path`'s nested `hero` object is present and fully populated on both tiers (title, eyebrow,
  summary, heroImage with `_path`/`width`/`height`, heroImageAlt, ctaLabel/ctaPath null as expected).
- `endpoint.schemaerrors` on **Author**: `[]` (clean). On **Publish**: `404 Not Found` for that path AND
  for two other plausible variants tried — this is **expected, not a defect**: `schemaerrors` is an
  authoring-time diagnostic endpoint under `/content/cq:graphql/...`, which (like introspection, per AD-6)
  is Author-only by design. TC-029 is explicitly an Author-tier-only test case in `design/test-cases.md`.
  **Recommend recording this as "confirmed expected, not a gap" in the final report — do not flag as a miss.**

**Recommended verdict for § 3: PASS, both tiers.** This retires Pilot's open MEDIUM finding
("GraphQL multiline fields fix applied but unverified in delivery") — it is now verified through the actual
FileVault/Cloud-Manager install path, on both Author and Publish.

### 3.2 GraphQL content-parity track (dispatch packet § 4) — **PASS**

Mechanical diff (Node.js scripts, not eyeballed) of the Publish-tier responses against
`design/source-content-inventory.md` r02:

- `landing-page-by-path`: **34 fields compared, 0 mismatches** (seoTitle, seoDescription, hero.title/eyebrow/
  summary/heroImage._path/width/height/heroImageAlt, slug, all 3 stats × 3 fields, all 3 sections ×
  heading+body, all 3 pillars × title/description/category/linkPath).
- `stats-list` + `pillars-list` + isolation + `hero-by-path`: **69 fields compared, 0 mismatches.**
- **Total: 103 fields mechanically compared, 0 mismatches, 0 non-whitespace diffs.** The only normalization
  applied was stripping the `<p>...</p>` wrapper before comparison (documented, delivery-markup-only, per
  GQL-FIX-02 / TC-007's own requirement) — this satisfies TC-007 explicitly.
- **Isolation (TC-008/009/010):** 21 `_path` values checked across all 4 responses — **100% resolve under
  `/content/dam/headless-test/chisel/`, 0 foreign paths.**
- **`SC-PLAT-003`/`SC-PLAT-004` confirmed absent** from `stats-list` (grepped the raw response body — no
  match for "Price to operators" or "AI agents").
- **DAM asset parity:** `home-hero.png` → `_path`/`1600`/`992` exact match on both tiers via GraphQL AND via
  direct binary fetch (`Content-Length: 802956`, `Content-Type: image/png`, exact byte match to Composer's
  declared size). `home-movement.png` → confirmed `1080×1341` / `1661220` bytes on Author's JCR metadata
  (`tiff:ImageWidth`/`tiff:ImageLength`) and on Publish's direct binary fetch — but **only reachable this way,
  not via any GraphQL query**, because `sections/bolt` (its only carrier fragment) is unwired (same
  `AUD-CONTENT-01`).

**Recommended verdict for § 4: PASS** (0 mismatches on everything reachable; the one gap — bolt unreachable —
is the pre-existing, already-disclosed, non-silent `AUD-CONTENT-01`, not a new parity defect).

### 3.3 Authoring-provisions track (dispatch packet § 5, Author tier) — **PASS**

- All 5 CF Models: `status="enabled"`, self-referencing `cq:scaffolding` — confirmed for `hero`, `stat`,
  `pillar`, `content-section`, `landing-page`.
- `landing-page.hero` → `valueType: "string/reference"` (see § 3.1 — the GQL-FIX-01 verification).
- `landing-page.stats`/`.sections`/`.pillars` → all `valueType: "string/reference[]"` (AD-4 Option B,
  confirmed on the real environment).
- Fragment folder counts on Author: `heroes`=1, `stats`=3, `pillars`=6, `sections`=4, `pages`=1 — matches the
  US-003 floor exactly (≥1/≥3/≥6/≥3/≥1).
- `cq:model` correctness confirmed on 5 sample fragments (one per type) — all point at the correct model path.
  (Note: the property lives at `jcr:content/data/cq:model`, not at the fragment's top-level `jcr:content` —
  worth remembering if re-deriving this check.)
- Schema introspection (Author, POST): all 5 model types present (`HeroModel`, `StatModel`, `PillarModel`,
  `ContentSectionModel`, `LandingPageModel`).
- Endpoint node: found via `/content/cq:graphql/headless-test.1.json` (NOT `.../endpoint.json` directly — that
  path 400s/500s because `.json` on the `endpoint` resource itself invokes the GraphQL execution servlet, not
  a node-property dump). Confirmed: `sling:resourceType: "graphql/sites/components/endpoint"`,
  `configurationPath: "/conf/headless-test"`. (The `/aem/graphiql.html` dropdown itself was not independently
  rendered — that would need a real browser/Playwright; the functional proof — introspection + all 4 queries
  succeeding through this exact config — is the stronger evidence and was captured.)
- Persisted queries: all 4 confirmed as `nt:unstructured` binary nodes with
  `sling:resourceType: "graphql/persistent/query"`. Repo-wide `grep -ril "persistedQueries"` (wrong casing) →
  **0 matches** — confirmed no stray sibling folder.
- **Data-setup integrity (real JCR readback, not just the GraphQL response):** `fragments/pages/home`'s
  `jcr:content/data/master` node shows `stats`=[3 paths], `sections`=[3 paths], `pillars`=[3 paths] — exact
  array-length match to Composer's declared authoring, and `seoDescription` is stored as the already
  `<p>`-wrapped string (confirming GQL-FIX-02 fully reached the FileVault-installed JCR state, not just the
  GraphQL response layer).
- **TC-023 (anonymous-read):** Publish, all 4 queries unauthenticated → `200`. Author, no `Authorization`
  header → `401`. Both exactly as designed (AD-5).
- **Minor observation, not a failure:** the DAM asset's `jcr:content` carries `guides:assetState: "SUCCESS"`,
  not the more commonly-documented `dam:assetState: "processed"` property. The substantive checks (real
  binary rendition present, correct `tiff:ImageWidth`/`tiff:ImageLength`, correct byte size) all passed
  directly — recommend noting this property-name observation as an INFO-level note, not a fail, since the
  checklist's underlying intent (real, processed binary, correct metadata) is fully satisfied by other
  evidence.

**Recommended verdict for § 5: PASS.**

### 3.4 § P7 DAM checkpoint (dispatch packet § 6) — **PASS**

- `home-hero.png`: Author JCR — `tiff:ImageWidth=1600`, `tiff:ImageLength=992`, real `renditions/original`
  binary present, `:jcr:data`=802956 bytes, `jcr:mimeType: image/png`. Publish direct fetch — `200`,
  `Content-Type: image/png`, `Content-Length: 802956` (exact match). `Access-Control-Allow-Origin: *` on the
  DAM binary itself (this is a **different, more permissive** code path than the GraphQL endpoint — see § 4
  below; images are NOT affected by the GraphQL CORS defect).
- `home-movement.png`: Author JCR — `tiff:ImageWidth=1080`, `tiff:ImageLength=1341`, real binary,
  `:jcr:data`=1661220 bytes. Publish direct fetch — `200`, `image/png`, `Content-Length: 1661220` (exact
  match).

**Recommended verdict for § P7: PASS.**

### 3.5 Delivery-surface NFR substitutes (dispatch packet § 2) — **PASS**, except CORS (§ 4 below)

- **Payload sizes** (all well under the 150KB soft ceiling): `landing-page-by-path`=3343B, `hero-by-path`=593B,
  `stats-list`=531B, `pillars-list`=1992B.
- **Latency:** 10-sample TTFB distribution for `landing-page-by-path` (mix of cache hit/miss):
  `[0.1173, 0.1189, 0.1285, 0.1461, 0.1522, 0.1739, 0.1758, 0.1771, 0.2677, 0.3750]` seconds. **p75 ≈ 177ms**
  — well under both the 800ms-uncached and 200ms-cached targets, and under the 600ms TTFB target.
- **Cache headers (un-busted, real consumer experience):**
  `cache-control: public, max-age=60, s-maxage=7200, stale-while-revalidate=86400, stale-if-error=86400` —
  present, reasonable, recorded verbatim (satisfies TC-019 — a header IS present, so no "absent header"
  finding is warranted).
- **Error paths:** TC-025 (non-existent path) → `200` with `errors[]` in body (`"no resource available"`),
  NOT a 500. TC-026 (missing `$path`) → `200` with a GraphQL `ValidationError` in body, NOT a 500/empty
  success. Both confirmed on the real Publish tier (previously only confirmed by Auditron on local 4506).

## 4. CRITICAL NEW FINDING — CORS is not just misconfigured, it is BROKEN for delivery (not previously known)

This is **beyond** the already-disclosed `AUD-INFO-01` (wrong placeholder origin `http://localhost:3000`).
Empirically discovered and reproduced deterministically this session:

**On a fresh (cache-MISS) request to `/graphql/execute.json/headless-test/<any-query>`, ANY `Origin` header
— including the currently-whitelisted `http://localhost:3000` placeholder — causes the response to become
`HTTP 204 No Content` with `cache-control: no-cache` and ZERO bytes of body, instead of the actual GraphQL
payload.** A request with no `Origin` header at all (or a cache-HIT, regardless of Origin) returns the real
`200` payload normally.

Evidence (`test/sentinel/evidence/publish-cors-*.headers.txt` + `publish-cors-summary.txt`):
- 4 alternating control requests (no-Origin / with-Origin / no-Origin / with-Origin) on fresh cache-busted
  URLs — deterministic, not flaky: no-Origin → `200`/531 bytes every time; with-Origin → `204`/0 bytes every
  time, for BOTH an arbitrary third-party origin (`https://example-consumer.test`) AND the whitelisted
  `http://localhost:3000`.
- Reproduced identically on all 4 persisted queries (`landing-page-by-path`, `hero-by-path`, `stats-list`,
  `pillars-list`).
- On a cache-HIT (non-busted URL), the cached `200` response IS served even with an Origin header present —
  but it **never carries an `access-control-allow-origin` header either**, for any origin, matching or not.
- DAM binary delivery (`home-hero.png`) is **NOT** affected — that path returns
  `Access-Control-Allow-Origin: *` unconditionally. This defect is specific to `/graphql/execute.json/*`.

**Consequence:** no real browser-based cross-origin consumer can retrieve GraphQL content from Publish at
all right now — not merely "from the wrong origin" (the AUD-INFO-01 framing), but **from any origin,
including the one currently on the allow-list.** A fresh (uncached) request gets an empty 204; a cached
request gets 200 data but never the CORS header a browser needs to expose it to JS. Root cause is not fully
determined from outside (could be the Sling `CORSPolicyImpl` filter's interaction with Fastly/CDN edge
behavior, or an edge-side WAF/CORS-handling rule that intercepts any Origin-bearing request before reaching
the AEM backend at all — the `X-Served-By: cache-del-...` + `cache-control: no-cache` pattern on the 204
matches what a CDN-edge synthetic response looks like, not a typical Sling filter response).

**Recommended finding to add to the report** (not yet written to `sentinel-report.md`):
```
id: SENT-CORS-01
severity: critical (or high)
class: correctness (delivery-layer CORS gate is broken, not merely misconfigured to the wrong domain)
track: delivery-surface NFR substitute / graphql-content-parity (CORS sub-check, dispatch packet § 1a.2)
finding: "Any GET to /graphql/execute.json/headless-test/* that carries an Origin header (any origin,
  including the currently-whitelisted http://localhost:3000) returns HTTP 204 No Content with zero bytes
  on a cache-miss, and never returns access-control-allow-origin even on a cache-hit. No browser-based
  consumer, from any origin, can currently retrieve real content from these endpoints."
evidence: test/sentinel/evidence/publish-cors-cachebust-realorigin.headers.txt,
  publish-cors-cachebust-localhost.headers.txt, publish-cors-cachebust-noorigin.headers.txt (control),
  publish-cors-summary.txt
routed_to: configsmith (CORS/dispatcher config) and/or bridgesmith (CDN/delivery-layer boundary) — root
  cause needs platform-level (Cloud Manager / Fastly config) investigation beyond curl-level diagnosis
disposition: open, NEW this dispatch, supersedes/extends AUD-INFO-01 (which only established "wrong
  placeholder domain" — this establishes "no domain currently works for real data delivery")
```

This finding, plus the still-open `AUD-CONTENT-01` (blocks TC-012/TC-016), are why the **overall Sentinel
verdict should be `status: fail`**, not `pass` — per the ADLC rule that any correctness-class finding is
always blocking and never eligible for "degraded pass." Both PASS-heavy sections above (headline check,
parity, authoring-provisions) do not change this — the terminal verdict is the worst finding, not an average.

## 5. Carried-forward findings — dispositions (per dispatch packet § 7)

| Finding | Disposition this dispatch |
|---|---|
| `pom.xml <aem.port>4506</aem.port>` | Unchanged. Local-build-only property, zero effect on the real deployed environment (confirmed — this dispatch never touched local builds). Keep as open LOW/INFO finding for a follow-up commit. **Not re-tested, not applicable to re-test** — it's a source-file property, not a runtime behavior. |
| `AUD-INFO-01` (CORS placeholder origin) | **Superseded/extended by § 4 above (`SENT-CORS-01`).** The placeholder-origin framing was correct but incomplete — the real, now-confirmed consequence is worse (no origin works at all for fresh requests). Report both: AUD-INFO-01 as historically accurate-but-superseded, SENT-CORS-01 as the current, complete finding. |
| `AUD-CONTENT-01` (`sections/bolt` unwired) | **STILL OPEN, re-confirmed against the REAL environment** (previously only confirmed on local 4506). `landing-page-by-path`'s `sections[]` on Publish has exactly 3 entries, none with non-null `sectionImage`. Blocks TC-012/TC-016 only, per the same accepted-scope-call reasoning as before (DECISIONS.md 2026-08-26T10:45Z) — do NOT wire it yourself; report only. |
| `GQL-SPEC-01` (TC-024 pillars clause) | **Confirmed exactly as predicted.** `landing-page-by-path` → `pillars.length = 3`. `pillars-list` → 6 items. Report TC-024 as passing its other 3 clauses (hero non-null, stats≥3, sections≥3) with clause 4 flagged as the known test-spec defect — do not silently "fix" the content or the test case yourself. |

## 6. Test-case coverage — mechanical census + full disposition (ready for `coverage-matrix.md`)

**Census:** `grep -oE '\bTC-[0-9]+\b' design/test-cases.md | sort -u | wc -l` → **34**. Matches
`total_from_file` used by both Auditron and the dispatch packet. IDs: `TC-001` .. `TC-034`, no gaps.

**Every one of the 34 IDs was directly re-executed against the REAL environment this session** (not merely
carried forward from Auditron's local-4506 evidence) — the headline check, parity diff, and
authoring-provisions checks above cover all of them. Disposition:

| ID | Result | Evidence pointer |
|---|---|---|
| TC-001 | pass | `publish-landing-page-by-path.json` — 200, non-empty item |
| TC-002 | pass | § 3.2 — 34 fields, 0 mismatches |
| TC-003 | pass | all authored home-scoped items present in the 4 responses (bolt is explicitly out of "home scope" per Composer's own recorded choice — not a TC-003 miss) |
| TC-004 | pass | § 3.2 — hero-by-path 0 mismatches, dims exact |
| TC-005 | pass | § 3.2 — stats-list 0 mismatches, SC-PLAT-003/004 confirmed absent |
| TC-006 | pass | § 3.2 — pillars-list 0 mismatches, all 6, categories correct |
| TC-007 | pass | normalization declared explicitly (§ 3.2 — only the `<p>` wrapper was stripped; 0 non-whitespace diffs) |
| TC-008 | pass | § 3.2 — isolation, 0 foreign paths |
| TC-009 | pass | § 3.2 — isolation |
| TC-010 | pass | § 3.2 — 21 paths checked, 0 foreign |
| TC-011 | pass | hero.heroImage 1600×992 exact |
| TC-012 | **blocked** | AUD-CONTENT-01 — sections[] has no non-null sectionImage on Publish (re-confirmed real env) |
| TC-013 | pass | home-hero.png 200/image/png on Publish |
| TC-014 | pass | home-movement.png 200/image/png on Publish |
| TC-015 | pass | heroImageAlt non-null |
| TC-016 | **blocked** | same AUD-CONTENT-01 |
| TC-017 | pass | pillar.image/imageAlt both null consistently (no pillar has an image authored — invariant holds) |
| TC-018 | pass | seoTitle + seoDescription both non-null |
| TC-019 | pass | Cache-Control header present and recorded verbatim |
| TC-020 | pass | p75 ≈ 177ms, well under 800ms target |
| TC-021 | pass | TTFB well under 600ms target |
| TC-022 | pass | 3343 bytes, well under 150KB |
| TC-023 | pass | Publish anonymous 200 (×4 queries); Author no-auth 401 |
| TC-024 | pass (3/4 clauses; clause 4 = known GQL-SPEC-01 test-spec defect, not re-applied) | § 5 |
| TC-025 | pass | non-existent path → 200 + error body, not 500 |
| TC-026 | pass | missing $path → 200 + validation error, not 500 |
| TC-027 | pass | all 5 models `status=enabled` |
| TC-028 | pass | introspection returns all 5 model types |
| TC-029 | pass | Author schemaerrors `[]`; Publish 404 confirmed expected (Author-only diagnostic, AD-6-consistent) |
| TC-030 | pass | cq:model correct on 5 sample fragments |
| TC-031 | pass | fragment counts 1/3/6/4/1 meet floor |
| TC-032 | pass | both DAM binaries real, correct byte sizes |
| TC-033 | pass | endpoint node config confirmed (resourceType + configurationPath); GraphiQL dropdown itself not independently rendered (would need a real browser) |
| TC-034 | pass | all 4 persisted queries as binary nodes; 0 stray `persistedQueries` (wrong-casing) matches repo-wide |

**Totals: total=34, total_from_file=34, executed=34, pass=32, fail=0, na=0, blocked=2 (TC-012, TC-016).**
`32+0+0+2 = 34 = executed = total`. ✅ Gate-clean census.

## 7. What is STILL NEEDED to close out this dispatch (the actual remaining work)

None of the remaining work requires further live probing — it is report assembly from the evidence above.

1. **`test/sentinel/coverage-matrix.md`** — render § 6's table above into the required format (per-ID:
   source artifact `design/test-cases.md`, owner `sentinel`, executed=yes, result, evidence path, closing
   totals line). Include the ID-census block (extraction command + `total_from_file: 34` + the 34 IDs) at the
   top, per the § P12 gate rule.
2. **`test/sentinel/sentinel-report.md` + `sentinel-report.html`** — one consolidated report with:
   - Verdict header: **recommend `status: fail`** (see § 4 — one NEW correctness-class CORS finding + one
     carried-forward correctness-class finding (`AUD-CONTENT-01`) blocking TC-012/TC-016).
   - Findings & routing table: `SENT-CORS-01` (critical, new, routed configsmith/bridgesmith),
     `AUD-CONTENT-01` (medium, carried-forward re-confirmed, routed composer/human-scope-decision),
     `GQL-SPEC-01` (low, test-spec defect, routed designforge — do not self-fix), `pom.xml aem.port` (low/info,
     no action needed on the real env).
   - Sections: headline check (§ 3.1), GraphQL content-parity (§ 3.2), authoring-provisions (§ 3.3), § P7 DAM
     checkpoint (§ 3.4), delivery-surface NFR substitutes (§ 3.5), CORS finding (§ 4), AD-1 N/A table (below).
   - AD-1 N/A table: carry forward `design/test-cases.md § 10` **verbatim**, per-track, with the AD-1 citation
     for each row (Tier-A visual ×2 viewports, browser automation/page fetch, Core Web Vitals, page-level a11y
     scan, `ui.tests` Cypress→Playwright migration) — all already itemized in that source document, just needs
     copying in with its own reasons, not folded into one blanket line.
   - Observability: `plan/requirements.yaml` line 578 area states no analytics/commerce/CIF/search service is
     in scope for this run (why `bridgesmith` was never dispatched) — record observability as **N/A, in-scope
     reason cited**, not a silent skip.
3. **`handoffs/sentinel.yaml`** — terminal verdict. Recommend:
   ```yaml
   status: fail
   ```
   with `disposition: open` on `SENT-CORS-01` and `AUD-CONTENT-01`, citing both by ID, and the coverage block
   from § 6 above (`executed: 34, pass: 32, fail: 0, na: 0, blocked: 2`).
4. If any `Write` to `.claude/agents/runs/...` is denied by a session-scoped restriction, use the
   parent-materialization fallback already used elsewhere in this run: stage content at a repo-root file with
   a clear prefix and state `PARENT_MATERIALIZATION_REQUIRED: source=<file> target=<intended path>`.

## 8. Process notes for whoever continues

- **Do not re-run `mvn`.** The run's mvn ledger is closed at 3 of 3 (§ P4/§8.1.1.a); this dispatch never
  reopened it and does not need to.
- **Do not write directly into `DECISIONS.md`.** Report findings and recommended entries back to the Program
  Agent / human in your final response instead (this document already drafts the recommended entries above).
- **Do not claim any human authorization beyond what is cited by timestamp in `DECISIONS.md`.**
- `reports/tokens.json` was already written this session (separate user request, not part of the Sentinel
  contract) — it contains ESTIMATED (not measured) per-agent token/cost/duration figures with the estimation
  method fully disclosed inline. No further action needed there unless the user asks for revision.
- Every raw HTTP/GraphQL response cited above is archived verbatim under `test/sentinel/evidence/` — re-read
  those files directly rather than re-issuing the same `curl` calls, to save tokens.
