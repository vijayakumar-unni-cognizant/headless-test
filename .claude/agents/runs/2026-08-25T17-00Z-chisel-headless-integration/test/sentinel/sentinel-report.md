# Sentinel Report - Chisel Headless Integration

- Run ID: `2026-08-25T17-00Z-chisel-headless-integration`
- Agent: `sentinel`
- Stage: Test (post-deploy, final ADLC stage)
- Dispatch packet: `dispatch/07-sentinel.md`
- Source test cases: `design/test-cases.md`
- Coverage matrix: `test/sentinel/coverage-matrix.md`
- Evidence root: `test/sentinel/evidence/`
- Generated: `2026-08-26T15:12:28Z`
- Sentinel status: `fail`
- Program-Agent P10 remediation checkpoint: `remediation_declined`
- ADLC terminal status: `fail (accepted gap)`

## Verdict

Sentinel status is `fail`. This is the terminal Sentinel acceptance verdict. The Program Agent P10 checkpoint was later satisfied by human remediation decline, so the ADLC run closes as `fail (accepted gap)`.

The primary GraphQL delivery contract passed on both real tiers: all 4 persisted queries returned HTTP 200 with no GraphQL errors, the multiline rich-text delivery fix survived FileVault deployment, content parity on reachable Publish payloads is exact, Author provisioning is intact, and both DAM binaries are present and delivery-resolvable.

The terminal status is still `fail` because the dispatch has open correctness-class blockers:

1. `SENT-CORS-01` - new critical delivery finding: any fresh Publish GraphQL GET with an `Origin` header returns HTTP 204 with no body, and cache-hit responses still omit `access-control-allow-origin`.
2. `AUD-CONTENT-01` - carried-forward medium content wiring gap: `sections/bolt`, the only carrier of `home-movement.png`, is not wired into `home.sections`, blocking TC-012 and TC-016.

## Environment

| Tier | URL | Auth | Result |
|---|---|---|---|
| Author | `https://author-p185256-e1945105.adobeaemcloud.com/` | `Authorization: Bearer $AEM_AUTHOR_BEARER_TOKEN` | Reachable and authenticated during the archived run; token was not persisted. |
| Publish | `https://publish-p185256-e1945105.adobeaemcloud.com/` | none | Reachable anonymously; all 4 persisted queries returned data without auth. |

## Coverage Summary

| Metric | Count |
|---|---:|
| `total_from_file` | 34 |
| `executed` | 34 |
| `pass` | 32 |
| `fail` | 0 |
| `blocked` | 2 |
| `not_applicable` | 0 |

Arithmetic check: `32 + 0 + 2 + 0 = 34`. See `test/sentinel/coverage-matrix.md` for the per-ID matrix and evidence pointers.

## Track Summary

| Track | Verdict | Evidence |
|---|---|---|
| Headline multiline/schema check | pass | `author-*.json`, `publish-*.json`, `author-landing-page-model-full.json`, `author-schemaerrors.txt` |
| GraphQL content parity | pass | `publish-landing-page-by-path.json`, `publish-hero-by-path.json`, `publish-stats-list.json`, `publish-pillars-list.json` |
| Authoring provisions | pass | `author-model-*.json`, `author-introspection.json`, `author-endpoint-config.json`, `author-fragfolder-*.json`, `author-pq-*.json` |
| P7 DAM checkpoint | pass | `author-home-hero-jcrcontent-full.json`, `author-home-movement-jcrcontent-full.json`, `publish-home-hero-headers.txt`, `publish-home-movement-headers.txt` |
| Delivery NFR substitutes | fail | Latency, payload size, and cache headers pass; CORS fails under `SENT-CORS-01`. |
| Browser-rendered tracks | N/A | AD-1 confirmed Pure Headless: no rendered surface, no page URL, no UI harness obligation. Per-track rows are below. |

## Findings And Routing

| ID | Severity | Track | Finding | Disposition | Route |
|---|---|---|---|---|---|
| `SENT-CORS-01` | critical | Delivery CORS | Publish GraphQL delivery is unusable from browser-based cross-origin consumers. Fresh requests with any `Origin` header return HTTP 204 and no body; cache-hit responses return data but omit `access-control-allow-origin`. | open, blocking | `configsmith`, `bridgesmith`, platform/CDN owner |
| `AUD-CONTENT-01` | medium | Content wiring / DAM reachability through GraphQL | `sections/bolt`, the only carrier of `home-movement.png`, is not referenced by `home.sections`; TC-012 and TC-016 remain blocked. | open, blocking only TC-012/TC-016 | `composer`, Program Agent / human scope decision |
| `GQL-SPEC-01` | low | Test specification | TC-024 expects `landing-page-by-path.pillars.length >= 6`, but the home page intentionally references 3 pillars; `pillars-list` returns all 6. | open, non-blocking content defect; spec correction needed | `designforge` |
| `POM-PORT-OBS` | low/info | Local build config | `pom.xml` carries `<aem.port>4506</aem.port>`. This is local-build-only and had no effect on the real deployed environment validation. | open, non-blocking follow-up | Program Agent / repo maintainer |

## Headline Multiline And Schema Check

Verdict: pass on Author and Publish.

All 4 persisted queries were executed against both tiers with cache busting:

| Query | Author | Publish |
|---|---|---|
| `landing-page-by-path` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `hero-by-path` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `stats-list` | HTTP 200, 0 errors | HTTP 200, 0 errors |
| `pillars-list` | HTTP 200, 0 errors | HTTP 200, 0 errors |

All 11 multiline fields reachable through these 4 queries are non-null and `<p>...</p>` wrapped on both tiers: `hero.summary`, `landing-page.seoDescription`, 3 reachable `content-section.body` values, and 6 `pillar.description` values.

The 12th expected multiline value, `sections/bolt.content-section.body`, is not reachable through the 4 persisted queries because `sections/bolt` is not wired into `home.sections`. This is the already-known `AUD-CONTENT-01` and not a new multiline regression.

`GQL-FIX-01` survived FileVault deployment. The real Author model definition in `author-landing-page-model-full.json` shows `landing-page.hero` as `valueType: "string/reference"` and `metaType: "fragment-reference"`, not the broken `string/content-fragment` value.

Author `endpoint.schemaerrors` is clean (`[]`) in `author-schemaerrors.txt`. Publish returns 404 for the diagnostic path, which is expected because the schemaerrors endpoint is Author-only.

## GraphQL Content Parity

Verdict: pass.

The Publish responses were mechanically compared against `design/source-content-inventory.md` r02:

- `landing-page-by-path`: 34 fields compared, 0 mismatches.
- `stats-list`, `pillars-list`, isolation, and `hero-by-path`: 69 fields compared, 0 mismatches.
- Total: 103 fields compared, 0 mismatches, 0 non-whitespace diffs.
- Rich-text normalization was limited to stripping the delivery `<p>...</p>` wrapper before comparing plaintext.
- Query isolation: 21 `_path` values checked across all 4 responses; all resolve under `/content/dam/headless-test/chisel/`.
- `SC-PLAT-003` and `SC-PLAT-004` are absent from `stats-list`, as required.

DAM parity also passed for delivered assets:

- `home-hero.png`: GraphQL ImageRef and direct binary delivery match `/content/dam/headless-test/chisel/home-hero.png`, 1600x992, `image/png`, 802956 bytes.
- `home-movement.png`: Author JCR metadata and Publish binary delivery confirm 1080x1341, `image/png`, 1661220 bytes. It is not reachable through the 4 GraphQL queries because of `AUD-CONTENT-01`.

## Authoring Provisions

Verdict: pass.

- All 5 CF Models are present and enabled: `hero`, `stat`, `pillar`, `content-section`, `landing-page`.
- `landing-page.hero` uses `string/reference`; `stats`, `sections`, and `pillars` use `string/reference[]`.
- Author fragment counts meet the floor exactly or better: heroes=1, stats=3, pillars=6, sections=4, pages=1.
- Sample fragments have correct `jcr:content/data/cq:model` values.
- Author GraphQL introspection includes `HeroModel`, `StatModel`, `PillarModel`, `ContentSectionModel`, and `LandingPageModel`.
- Endpoint node config is correct: `sling:resourceType="graphql/sites/components/endpoint"` and `configurationPath="/conf/headless-test"`.
- All 4 persisted queries exist as binary nodes with `sling:resourceType="graphql/persistent/query"`.
- Stored `landing-page` master node data confirms arrays of 3 stats, 3 sections, and 3 pillars; `seoDescription` is stored as the `<p>` wrapped string.
- Publish anonymous reads return HTTP 200 for all 4 persisted queries; Author no-auth returns 401.

Info observation: the DAM asset metadata uses `guides:assetState: "SUCCESS"` rather than `dam:assetState: "processed"`. This is not treated as a failure because the binaries, dimensions, MIME type, and Publish delivery all passed.

## P7 DAM Checkpoint

Verdict: pass.

| Asset | Author metadata | Publish delivery |
|---|---|---|
| `home-hero.png` | 1600x992, original binary, 802956 bytes, `image/png` | HTTP 200, `Content-Type: image/png`, `Content-Length: 802956` |
| `home-movement.png` | 1080x1341, original binary, 1661220 bytes, `image/png` | HTTP 200, `Content-Type: image/png`, `Content-Length: 1661220` |

DAM binary CORS is permissive (`Access-Control-Allow-Origin: *`) and is not affected by the GraphQL CORS failure.

## Delivery-Surface NFR Substitutes

Verdict: fail because of CORS. Non-CORS measurements pass.

| Check | Result | Evidence |
|---|---|---|
| Payload size | pass: `landing-page-by-path`=3343B, `hero-by-path`=593B, `stats-list`=531B, `pillars-list`=1992B | archived JSON and headers |
| Latency / TTFB | pass: samples `[0.1173, 0.1189, 0.1285, 0.1461, 0.1522, 0.1739, 0.1758, 0.1771, 0.2677, 0.3750]`; p75 approximately 177 ms | `publish-latency-samples.txt` |
| Cache headers | pass: `cache-control: public, max-age=60, s-maxage=7200, stale-while-revalidate=86400, stale-if-error=86400` | `publish-cache-headers-1.txt`, `publish-cache-headers-2.txt` |
| Error paths | pass: non-existent path and missing `$path` return GraphQL error bodies, not 500s | `publish-tc025-nonexistent-path.json`, `publish-tc026-missing-path.json` |
| CORS | fail: see `SENT-CORS-01` | `publish-cors-*.headers.txt`, `publish-cors-summary.txt` |

Observability is N/A for external analytics/commerce/CIF/search service integrations because `plan/requirements.yaml` records that no third-party or non-AEM system integration is in scope and this is why `bridgesmith` was not scheduled. Basic HTTP reachability, status, and error-path sanity were covered by the persisted-query and error-path probes above.

## Detailed Findings

### SENT-CORS-01 - Critical - Open

Issue: Any fresh GET to `/graphql/execute.json/headless-test/*` on Publish that carries an `Origin` header returns `HTTP 204 No Content` with zero bytes instead of the GraphQL payload. This includes the placeholder allow-list origin `http://localhost:3000` and an arbitrary third-party origin.

Evidence:

- `test/sentinel/evidence/publish-cors-cachebust-realorigin.headers.txt`
- `test/sentinel/evidence/publish-cors-cachebust-localhost.headers.txt`
- `test/sentinel/evidence/publish-cors-cachebust-noorigin.headers.txt`
- `test/sentinel/evidence/publish-cors-summary.txt`

Observed behavior:

- No `Origin`, cache-busted: HTTP 200 with JSON body.
- `Origin: https://example-consumer.test`, cache-busted: HTTP 204, zero bytes.
- `Origin: http://localhost:3000`, cache-busted: HTTP 204, zero bytes.
- Same behavior reproduced on all 4 persisted queries.
- Cache-hit requests can return HTTP 200 with data, but still omit `access-control-allow-origin`, so browser JavaScript cannot read the response cross-origin.
- DAM binary delivery is not affected.

Impact: No browser-based cross-origin consumer can reliably retrieve Publish GraphQL content. This supersedes the earlier `AUD-INFO-01` framing that only called out the placeholder origin; the actual delivery behavior is worse because no origin currently works.

Recommended fix: Investigate the Publish-tier CORS policy and CDN/Fastly behavior for `/graphql/execute.json/headless-test/*` and `/content/_cq_graphql/headless-test/*`. Ensure `Origin` requests reach the correct handler, return the normal GraphQL response body, and emit a matching `access-control-allow-origin` for the approved consumer origins. Keep credentials disabled unless a future auth design changes that requirement.

Route: `configsmith` for AEM CORS configuration, `bridgesmith` or platform/CDN owner if the 204 is produced at the edge.

Status: open, blocking.

### AUD-CONTENT-01 - Medium - Open

Issue: The `sections/bolt` content-section fragment, which carries `home-movement.png`, is authored but not referenced by `fragments/pages/home` under `home.sections`.

Evidence:

- `test/sentinel/evidence/publish-landing-page-by-path.json`
- `test/sentinel/evidence/frag-data-fragments-sections-bolt.json`
- `test/sentinel/evidence/publish-home-movement-headers.txt`

Impact: `home-movement.png` is a valid, delivered DAM binary, but the section ImageRef is unreachable through `landing-page-by-path`. This blocks TC-012 and TC-016 only.

Recommended fix: Make an explicit human/product scope decision: wire `sections/bolt` into `home.sections`, reattach the image to one of the 3 already-wired sections, or add a dedicated sections query if the fragment should remain outside the home page payload.

Route: `composer`, Program Agent / human scope decision.

Status: open, blocking TC-012 and TC-016.

### GQL-SPEC-01 - Low - Open

Issue: TC-024 expects `landing-page-by-path.pillars.length >= 6`, but the persisted-query contract and authored home page return 3 selected home pillars. The separate `pillars-list` query returns all 6 authored pillars.

Evidence:

- `test/sentinel/evidence/publish-landing-page-by-path.json`
- `test/sentinel/evidence/publish-pillars-list.json`

Impact: This is a test-spec defect, not a content defect. TC-024 passes the other three clauses: non-null hero, at least 3 stats, and at least 3 sections.

Recommended fix: Update `design/test-cases.md` so TC-024 checks the home page contract (`pillars.length >= 3`) and relies on TC-006 for the all-6 pillar census.

Route: `designforge`.

Status: open, non-blocking for content delivery.

### POM-PORT-OBS - Low/Info - Open

Issue: `pom.xml` has `<aem.port>4506</aem.port>`.

Impact: This is local-build-only and did not affect the real AEM Cloud Service validation.

Recommended fix: Review the local AEM SDK convention in a follow-up commit and set the property to the intended local Author port if needed.

Route: Program Agent / repo maintainer.

Status: open, non-blocking.

## AD-1 Per-Track N/A Disposition

These rows are recorded individually, not as a blanket visual/UI N/A. AD-1 is the confirmed Pure Headless decision from `DECISIONS.md` `2026-08-25T18:15Z`.

| Track | Status | Reason | Records it |
|---|---|---|---|
| Tier-A visual diff - desktop 1440x900 | N/A | AD-1 produces no rendered surface, so there is no delivered output to capture. Independently, neither supplied PNG is a page screenshot; both are text-free editorial photographs, so there is no reference layout to diff against. | sentinel |
| Tier-A visual diff - mobile 390x844 | N/A | Same as desktop: no rendered output at either viewport under AD-1, and no reference layout at any viewport. | sentinel |
| Browser automation / page fetch | N/A | AD-1 delivers no page URL. The only HTTP surface is `GET /graphql/execute.json/headless-test/<name>`, which Sentinel exercises as a direct HTTP request. | sentinel |
| Core Web Vitals (LCP / INP / CLS) | N/A | Unmeasurable without a rendered document; AD-1 produces none. The performance obligation is redirected to persisted-query TTFB, p75 latency, payload size, and cache headers. | sentinel |
| Page-level accessibility scan (DOM, contrast, heading order, focus order) | N/A | No DOM exists under AD-1. The accessibility obligation is relocated into the payload through alt-text assertions. | sentinel |
| `ui.tests` Cypress-to-Playwright harness migration | N/A under AD-1 | There is no UI to test: no rendered surface and no consumer app in this repo. The harness migration is inapplicable by the same AD-1 logic that makes visual tracks N/A. | pilot recorded; sentinel does not attempt |

## Closeout

Sentinel completed the real-environment coverage ledger with archived evidence and no additional live probing during this continuation. The Sentinel stage handoff is `handoffs/sentinel.yaml`. The Program Agent subsequently recorded remediation declined in `DECISIONS.md`; no fix routing is authorized in this run.
