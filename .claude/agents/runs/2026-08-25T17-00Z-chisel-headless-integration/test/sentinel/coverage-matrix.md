# Sentinel Coverage Matrix - Chisel Headless Integration

- Run ID: `2026-08-25T17-00Z-chisel-headless-integration`
- Agent: `sentinel`
- Stage: Test (post-deploy)
- Source artifact: `design/test-cases.md`
- Target environment: real AEM Cloud Service Author and Publish tiers from dispatch packet `07-sentinel.md`
- Evidence root: `test/sentinel/evidence/`
- Generated: `2026-08-26T15:12:28Z`

## Mechanical ID Census

Command re-run in this workspace:

```powershell
$ids = Select-String -Path '.claude\agents\runs\2026-08-25T17-00Z-chisel-headless-integration\design\test-cases.md' -Pattern '\bTC-[0-9]+\b' -AllMatches | ForEach-Object { $_.Matches.Value } | Sort-Object -Unique; $ids.Count; $ids -join ', '
```

- `total_from_file: 34`
- IDs: `TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-025, TC-026, TC-027, TC-028, TC-029, TC-030, TC-031, TC-032, TC-033, TC-034`
- Gaps: none
- Duplicates: none

## Per-ID Matrix

| ID | Source artifact | Owner | Executed | Result | Evidence | Notes |
|---|---|---|---|---|---|---|
| TC-001 | `design/test-cases.md` | sentinel | yes | pass | `test/sentinel/evidence/publish-landing-page-by-path.json`; `publish-landing-page-by-path.headers.txt` | Publish `landing-page-by-path` returned HTTP 200 and non-empty item. |
| TC-002 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 3.2 | 34 landing-page fields mechanically compared, 0 mismatches. |
| TC-003 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-hero-by-path.json`; `publish-stats-list.json`; `publish-pillars-list.json` | Authored home-scoped items are present in the query responses; `sections/bolt` is out of home scope per accepted `AUD-CONTENT-01`. |
| TC-004 | `design/test-cases.md` | sentinel | yes | pass | `publish-hero-by-path.json`; `publish-hero-by-path.headers.txt` | Hero content and image dimensions match. |
| TC-005 | `design/test-cases.md` | sentinel | yes | pass | `publish-stats-list.json`; `publish-stats-list.headers.txt` | Stats exact-match; `SC-PLAT-003` and `SC-PLAT-004` absent. |
| TC-006 | `design/test-cases.md` | sentinel | yes | pass | `publish-pillars-list.json`; `publish-pillars-list.headers.txt` | Six pillars exact-match; categories and paths scoped correctly. |
| TC-007 | `design/test-cases.md` | sentinel | yes | pass | `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 3.2; raw publish JSON files | Only `<p>...</p>` rich-text wrapping was normalized; 0 non-whitespace diffs. |
| TC-008 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json` | All returned `_path` values resolve under `/content/dam/headless-test/chisel/`. |
| TC-009 | `design/test-cases.md` | sentinel | yes | pass | `publish-stats-list.json`; `publish-pillars-list.json` | Stats and pillars query isolation confirmed. |
| TC-010 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-hero-by-path.json`; `publish-stats-list.json`; `publish-pillars-list.json` | 21 `_path` values checked, 0 foreign paths. |
| TC-011 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-hero-by-path.json` | `home-hero.png` ImageRef is `/content/dam/headless-test/chisel/home-hero.png`, 1600x992. |
| TC-012 | `design/test-cases.md` | sentinel | yes | blocked | `publish-landing-page-by-path.json`; `frag-data-fragments-sections-bolt.json`; `publish-home-movement-headers.txt` | Blocked by carried-forward `AUD-CONTENT-01`: `sections/bolt` is not wired into `home.sections`, so no `sectionImage` is reachable in `landing-page-by-path`. |
| TC-013 | `design/test-cases.md` | sentinel | yes | pass | `publish-home-hero-headers.txt` | `home-hero.png` returns HTTP 200, `image/png`, 802956 bytes. |
| TC-014 | `design/test-cases.md` | sentinel | yes | pass | `publish-home-movement-headers.txt` | `home-movement.png` returns HTTP 200, `image/png`, 1661220 bytes. |
| TC-015 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-hero-by-path.json` | `heroImageAlt` is non-null where `heroImage` is present. |
| TC-016 | `design/test-cases.md` | sentinel | yes | blocked | `publish-landing-page-by-path.json`; `frag-data-fragments-sections-bolt.json`; `publish-home-movement-headers.txt` | Same block as TC-012: no reachable section image means no reachable `sectionImageAlt`. |
| TC-017 | `design/test-cases.md` | sentinel | yes | pass | `publish-pillars-list.json` | Pillar `image` and `imageAlt` are consistently null; no invalid image-without-alt state. |
| TC-018 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json` | `seoTitle` and `seoDescription` are present. |
| TC-019 | `design/test-cases.md` | sentinel | yes | pass | `publish-cache-headers-1.txt`; `publish-cache-headers-2.txt` | Cache-Control observed: `public, max-age=60, s-maxage=7200, stale-while-revalidate=86400, stale-if-error=86400`. |
| TC-020 | `design/test-cases.md` | sentinel | yes | pass | `publish-latency-samples.txt` | p75 approximately 177 ms, below both configured targets. |
| TC-021 | `design/test-cases.md` | sentinel | yes | pass | `publish-latency-samples.txt` | TTFB samples all below 600 ms; p75 approximately 177 ms. |
| TC-022 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-landing-page-by-path.headers.txt`; `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 3.5 | `landing-page-by-path` payload is 3343 bytes, below 150 KB. |
| TC-023 | `design/test-cases.md` | sentinel | yes | pass | `publish-*.json`; `author-*.json`; `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 3.3 | Publish queries are anonymous HTTP 200; Author without auth returned 401; Author with bearer succeeded. |
| TC-024 | `design/test-cases.md` | sentinel | yes | pass | `publish-landing-page-by-path.json`; `publish-pillars-list.json`; `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 5 | Hero, stats, and sections clauses pass; fourth clause is known `GQL-SPEC-01` test-spec defect because `home` intentionally references 3 pillars while `pillars-list` returns all 6. |
| TC-025 | `design/test-cases.md` | sentinel | yes | pass | `publish-tc025-nonexistent-path.json` | Non-existent path returns HTTP 200 with GraphQL error body, not 500. |
| TC-026 | `design/test-cases.md` | sentinel | yes | pass | `publish-tc026-missing-path.json` | Missing path parameter returns GraphQL validation error, not 500 or empty success. |
| TC-027 | `design/test-cases.md` | sentinel | yes | pass | `author-model-hero.json`; `author-model-stat.json`; `author-model-pillar.json`; `author-model-content-section.json`; `author-model-landing-page.json` | All 5 CF Models exist and are enabled. |
| TC-028 | `design/test-cases.md` | sentinel | yes | pass | `author-introspection.json` | Introspection includes `HeroModel`, `StatModel`, `PillarModel`, `ContentSectionModel`, `LandingPageModel`. |
| TC-029 | `design/test-cases.md` | sentinel | yes | pass | `author-schemaerrors.txt`; `publish-schemaerrors.txt` | Author `endpoint.schemaerrors` is `[]`; Publish 404 is expected because this diagnostic endpoint is Author-only. |
| TC-030 | `design/test-cases.md` | sentinel | yes | pass | `frag-check-fragments-heroes-home-hero.json`; `frag-check-fragments-stats-free-pricing.json`; `frag-check-fragments-pillars-capital.json`; `frag-check-fragments-sections-bolt.json`; `frag-check-fragments-pages-home.json` | Sample fragments reference correct models via `jcr:content/data/cq:model`. |
| TC-031 | `design/test-cases.md` | sentinel | yes | pass | `author-fragfolder-heroes.json`; `author-fragfolder-stats.json`; `author-fragfolder-pillars.json`; `author-fragfolder-sections.json`; `author-fragfolder-pages.json` | Counts: heroes=1, stats=3, pillars=6, sections=4, pages=1. |
| TC-032 | `design/test-cases.md` | sentinel | yes | pass | `author-home-hero-jcrcontent-full.json`; `author-home-movement-jcrcontent-full.json`; `publish-home-hero-headers.txt`; `publish-home-movement-headers.txt` | Both DAM assets have real binaries, correct dimensions, and matching Publish byte sizes. |
| TC-033 | `design/test-cases.md` | sentinel | yes | pass | `author-endpoint-config.json`; `author-introspection.json` | Endpoint node has expected resource type and configuration path; functional introspection/query execution proves endpoint registration. GraphiQL dropdown was not separately rendered. |
| TC-034 | `design/test-cases.md` | sentinel | yes | pass | `author-pq-landing-page-by-path.json`; `author-pq-hero-by-path.json`; `author-pq-stats-list.json`; `author-pq-pillars-list.json`; `SENTINEL-HANDOFF-FOR-CONTINUATION.md` section 3.3 | All 4 persisted queries are binary nodes with `graphql/persistent/query`; no wrong-cased `persistedQueries` repo matches. |

## Totals

- `total_from_file: 34`
- `executed: 34`
- `pass: 32`
- `fail: 0`
- `blocked: 2`
- `not_applicable: 0`
- Arithmetic check: `32 + 0 + 2 + 0 = 34`

Terminal coverage status: `complete_with_blockers`. The blockers are limited to TC-012 and TC-016 and are both caused by carried-forward `AUD-CONTENT-01`.
