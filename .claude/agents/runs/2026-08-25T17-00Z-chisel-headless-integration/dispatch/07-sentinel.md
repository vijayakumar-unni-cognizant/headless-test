# Dispatch packet 07 — sentinel

- **agent:** sentinel
- **stage:** Test (post-deploy) — LAST stage of the ADLC flow (ADLC-SPEC §5.1.a)
- **run_id:** 2026-08-25T17-00Z-chisel-headless-integration
- **expected-handoff:** `.claude/agents/runs/2026-08-25T17-00Z-chisel-headless-integration/handoffs/sentinel.yaml`
- **gate-criteria:** ADLC-SPEC §8.1 (Sentinel validation criteria) + § P12 (test-coverage completeness,
  mechanical ID census, no blanket track-level N/A) + § P7 (DAM checkpoint) — evaluated by the Program
  Agent on your return, per-track and per-ID, not accepted on your self-report alone.

## 0. Credential handling — non-negotiable, restated verbatim from the Lead

The Author tier requires an IMS bearer token. It has been exported to your process environment as
`$AEM_AUTHOR_BEARER_TOKEN` for this dispatch only. **You MUST NOT write this token into any file** —
not this packet (it isn't here), not `handoffs/sentinel.yaml`, not any report under `test/sentinel/`,
not a `.env` file, not a Playwright/axios/curl config file, not a shell-history artifact you create or
commit. Every persisted artifact must refer to it only as `$AEM_AUTHOR_BEARER_TOKEN` or "Lead-supplied
IMS bearer token (not persisted)". Use it as an `Authorization: Bearer $AEM_AUTHOR_BEARER_TOKEN` header
constructed at call time from the environment variable, never as a literal string in code or config.

## 1. Environment targets

| Tier | URL | Auth |
|---|---|---|
| Author | `https://author-p185256-e1945105.adobeaemcloud.com/` | `Authorization: Bearer $AEM_AUTHOR_BEARER_TOKEN` |
| Publish | `https://publish-p185256-e1945105.adobeaemcloud.com/` | none (anonymous) |

Program/Environment: p185256 / e1945105. Deployment: Cloud Manager full-stack pipeline, reported
SUCCESSFUL by the Lead on 2026-08-26 (merged build hash not supplied — recorded as `measurement_gap`
in DECISIONS.md; do not infer it). Approval recorded verbatim in
`.claude/agents/runs/2026-08-25T17-00Z-chisel-headless-integration/DECISIONS.md`, entry
`2026-08-26T17:15Z — REAL-ENVIRONMENT VALIDATION APPROVAL (RESUME)`.

**Tier routing mandate, per the confirmed architecture (AD-1) and ADLC-SPEC:** authoring-provisions →
Author. GraphQL content-parity, delivery/DAM resolvability, cache/CORS/observability, and every other
NFR-equivalent track → Publish. Do not run a Publish-mandated track against Author or vice versa; if
you do, void that result and re-run on the correct tier rather than reporting it as-is.

## 1a. Program-Agent pre-probe baseline (observed fact — verify independently, do not substitute for your own measurement)

Before this dispatch, the Program Agent ran one read-only probe against Publish to establish a
known-good baseline. Treat the following as an observed starting fact, not as a discharged check —
you must still measure every track yourself:

`GET https://publish-p185256-e1945105.adobeaemcloud.com/graphql/execute.json/headless-test/stats-list`
(anonymous, no `Origin` header sent):
- `HTTP/1.1 200 OK`, `content-type: application/json`, 531-byte payload, 3 `stat` items delivered with
  correct `_path` values under `/content/dam/headless-test/chisel/fragments/stats/`.
- `cache-control: public, max-age=60, s-maxage=7200, stale-while-revalidate=86400, stale-if-error=86400`;
  `Age: 59`; `X-Cache: HIT`.
- Encoding confirmed clean at the byte level — the en-dash in `"vs. $200–500+ per tech / month"` is
  correct UTF-8 (`E2 80 93`). **If you observe mojibake in any console-captured payload, treat it as a
  terminal display artifact and re-verify byte-level (script or hex-dump, not eyeballing terminal
  output) before recording it as a content defect** — this exact false alarm already happened once in
  this run (DECISIONS.md 2026-08-26T10:45Z `en_dash_verification`, confirmed not-a-defect).

**This confirms the endpoint is live, publicly reachable, CDN-cached, and `stats-list` delivers real
content on Publish. It does NOT clear the § 3 headline multiline-`html` finding** — `stats-list` has no
multiline field (per `handoffs/composer.yaml`, the `stat` CF Model has only 3 scalar fields). The 12
multiline values you must check live in `hero-by-path` (1× `summary`), `pillars-list` (6×
`description`), and `landing-page-by-path` (4× `body`, 1× `seoDescription`) — those are the ones that
must come back non-null and `<p>`-wrapped.

**Two consequences for your methodology, both mandatory:**
1. **Cache-busting.** The observed `X-Cache: HIT` / `s-maxage=7200` means a stale CDN copy could mask
   the real post-deploy content state (including whether GQL-FIX-01/GQL-FIX-02 actually reached
   Publish). When validating delivered CONTENT (§ 3, § 4), cache-bust every request (a unique/dummy
   query parameter, or send `Cache-Control: no-cache`) so you are reading current origin content, not a
   pre-fix cached response. Separately — and only after content validation is cache-bypassed — measure
   cache behavior itself (the `cache-control`/`Age`/`X-Cache` header set) as its own finding under § 2's
   delivery-surface NFR substitutes, on an un-busted request, since that is what a real consumer
   actually experiences.
2. **CORS check requires a real `Origin` header.** The probe above sent no `Origin` header, so no
   `access-control-allow-origin` came back — that is expected behavior, not evidence either way on
   `AUD-INFO-01`. To make the CORS check in § 2 / § 7 meaningful, send the GraphQL GET with an explicit
   `Origin` header (e.g. `Origin: https://example-consumer.test`, a domain that is NOT
   `http://localhost:3000`) and report what `access-control-allow-origin` (if any) comes back — this is
   the only way to confirm or refute the placeholder-origin consequence for a real third-party consumer.

## 2. Architecture context you must respect (AD-1, confirmed human decision, DECISIONS.md 2026-08-25T18:15Z + 2026-08-26T18:35Z r04)

This run is **Pure Headless with NO rendered surface**: zero components, templates, HTL, Java,
consumer app, or `ui.tests`/Playwright harness obligation. `blockwright` was never dispatched.
`ui.tests/test-module/` is still the archetype's stock Cypress scaffold — untouched, not your
concern this dispatch, and its absence of a Playwright harness is NOT a defect to report.

**Consequence for your normal browser-rendered tracks — mark N/A with a per-track reason citing AD-1,
never a blanket track-level N/A:**
- Playwright / browser-automation UI test track → N/A (AD-1: no rendered surface exists to automate).
- Page-level Lighthouse Performance (LCP/CLS/INP page metrics) → N/A (AD-1: no page).
- Page-level SEO (`<title>`, meta tags, sitemap, robots.txt on a rendered page) → N/A (AD-1: no page).
- Page-level axe/a11y sweep → N/A (AD-1: no page).
- Visual Verification Tier A/B (screenshot diff against reference) → N/A (AD-1: no rendered surface;
  also both reference images — see § 5 below — carry no text/layout to diff against even if a surface
  existed). `design/reference-assets.md` § 4 already records every visual attribute as NOT OBSERVED.

**Do NOT scaffold, migrate, or touch the Playwright/Cypress harness. That is Blockwright's job and is
out of scope for this dispatch entirely — even implicitly (no throwaway spec files, no `ui.tests`
edits).**

**Substitute delivery-surface equivalents instead** (these ARE required, not optional substitutes for
the N/A'd tracks):
- Endpoint response time / TTFB for each of the 4 persisted queries on Publish.
- Response payload weight for each query.
- Cache-header / `Surrogate-Control` / `Cache-Control` behavior on repeat GraphQL GETs (NEG-3 in
  `handoffs/configsmith.yaml` flagged this as unmeasured — no dispatcher module exists in this repo,
  so report the OBSERVED header state as a finding with concrete remediation if absent, not a pass/fail
  against a baseline that was never set).
- CORS response headers actually returned by Publish for `/graphql/execute.json/headless-test/*` and
  `/content/_cq_graphql/headless-test/*` (`AUD-INFO-01`: the shipped config's `alloworigin` is still
  the `http://localhost:3000` placeholder — verify what the real endpoint actually sends and state the
  concrete consequence for a third-party React consumer on a different origin).
- HTTP status / observability baseline on both tiers (basic reachability, error-rate sanity).

## 3. THE headline check — do this first, report PASS/FAIL explicitly with raw evidence

`handoffs/pilot.yaml`'s one open MEDIUM finding is the entire reason this PR body was written the way
it was: the GraphQL multiline-field fix (GQL-FIX-02, all 12 `{ html }` fields wrapped in `<p>...</p>`)
and the schema fix (GQL-FIX-01, `landing-page.hero` field `valueType` corrected to `string/reference`)
were both verified live via Sling `:operation=import` directly against a local port-4506 Author
instance — **never through the FileVault package install path**. Cloud Manager has now installed via
FileVault onto the real Author + Publish tiers above. This is the first time either fix has been
exercised through an actual package install.

**Action:** execute all 4 persisted queries — `landing-page-by-path`, `hero-by-path`, `stats-list`,
`pillars-list` — against **both** Author (bearer) and Publish (anonymous). For each, on each tier,
confirm:
1. HTTP 200, zero `errors[]`.
2. All 12 multiline fields resolve non-null AND `<p>`-wrapped HTML (not bare text — see
   `handoffs/auditron.yaml`'s `multiline_fix_delivery_status` for the exact expected shape and the
   3-case table that shows why "non-null" alone is insufficient).
3. `landing-page-by-path`'s nested `hero` object is present (this is exactly the field GQL-FIX-01
   fixed at the schema level; report explicitly whether the FileVault-installed schema carries the fix
   or has reverted to dropping the field).
4. `GET /content/cq:graphql/headless-test/endpoint.schemaerrors` (or its Publish-tier equivalent path)
   returns `[]`.

Report this as an explicit PASS or FAIL per tier, with the raw JSON response bodies archived under
`test/sentinel/` (or an evidence subfolder) — this is the finding the whole PR was built around; do
not summarize it away.

## 4. GraphQL content-parity track (mandatory — headless run)

Source of truth: `design/source-content-inventory.md` (r02, the corrected verbatim extraction — 67
`verbatim (source-confirmed)` + 12 `partial` + 2 confirmed `UNCERTAIN` [`SC-PLAT-003`, `SC-PLAT-004`,
which must NOT appear anywhere in delivered content]) and `design/content-fragment-models.md`
(content-mapping rows). Compare against what the **Publish** endpoint actually delivers.

- Query isolation: this run's 4 persisted queries only, by-path/reference-traversal scoped, every
  delivered `_path` inside `/content/dam/headless-test/chisel/...`.
- Exact-match on `plaintext` for every multiline field (per `handoffs/auditron.yaml`: assert on
  `plaintext`, or on `html` with the `<p>` wrapper normalized — asserting raw `html` against the bare
  inventory string will false-fail; this is a documented, deliberate delivery-markup difference, not a
  content defect).
- Every source image (`home-hero.png` 1600×992, `home-movement.png` 1080×1341) resolves as an
  `ImageRef` with matching `_path`/`width`/`height`, and is independently delivery-resolvable (HTTP 200,
  correct `Content-Type: image/png`, unauthenticated) on Publish.
- 5 CF Models (`hero`, `stat`, `pillar`, `content-section`, `landing-page`), 15 fragments, 2 DAM
  binaries — full census against what Publish actually returns.

## 5. Authoring-provisions track → Author tier

Source: `design/authoring-test-cases.md` if present, else derive from `design/content-fragment-models.md`
+ Composer's `self_verification` block in `handoffs/composer.yaml`. Verify on Author:
- All 5 CF Models resolvable in the CF Model editor / via `.../models.1.json`, `status="enabled"`.
- All 15 fragments present under `/content/dam/headless-test/chisel/fragments/...`, correct `cq:model`.
- GraphQL endpoint config live (`sling:resourceType="graphql/sites/components/endpoint"`,
  `configurationPath="/conf/headless-test"`).
- Data-setup integrity by reading stored nodes back (not just the GraphQL response) — per-fragment
  field values, array lengths on `landing-page`'s `hero`/`stats`/`sections`/`pillars` references.

## 6. § P7 pre-Sentinel DAM asset checkpoint

Both reference images (`home-hero.png`, `home-movement.png`) are real seeded DAM binaries, not merely
visual references — confirm on the real environment (not just locally) that:
- `/content/dam/headless-test/chisel/home-hero.png` and `.../home-movement.png` exist with
  `dam:assetState="processed"`, correct byte sizes (802,956 / 1,661,220) and correct pixel dimensions
  (1600×992 / 1080×1341).
- Both are delivery-resolvable via their DAM binary URL on Publish (HTTP 200, correct content-type,
  unauthenticated).

This checkpoint stays active even though Visual Verification Tier A/B is N/A under AD-1 (§ P7 and the
Visual track are independent gates — DAM resolvability is a content-delivery check, not a visual-diff
check). No separate human checkpoint is needed here since both assets are already confirmed seeded in
`handoffs/composer.yaml`; this is a real-environment re-verification, not a new authorization ask.

## 7. Carried-forward flags — findings, not blockers. Do not stop the run for these.

- **`pom.xml` `<aem.port>` = 4506, not 4502.** Local-build-only property; no effect on the deployed
  real environment. Keep as an open LOW/INFO finding for a follow-up commit. Do not fail any gate on
  this.
- **`AUD-INFO-01` — CORS `alloworigin` is still the `localhost:3000` placeholder.** Actually verify what
  CORS headers the real Publish endpoint returns for a cross-origin GET, and report the concrete
  consequence (a third-party React consumer on any other origin will be blocked) as a finding. Do not
  soften or omit it.
- **`AUD-CONTENT-01` — re-check `sections/bolt` wiring against real delivered state.** Confirm whether
  `home-movement.png`'s carrier fragment (`sections/bolt`) is still unreachable from `landing-page-by-path`
  (deliberately not wired into `home.sections` per an accepted Composer scope call — DECISIONS.md
  2026-08-26T10:45Z). This blocks TC-012/TC-016 only; content itself (dimensions, delivery-resolvability)
  is independently confirmed correct regardless of wiring.
- **`GQL-SPEC-01` — TC-024's `pillars.length >= 6` clause is a test-case defect, not a content defect.**
  `landing-page-by-path` correctly returns 3 pillars for `home` (matching
  `design/persisted-query-contracts.md`'s own documented example); `pillars-list` correctly returns all
  6 authored pillar fragments. Do NOT "fix" content to satisfy the wrong clause. Report TC-024 as
  passing on its other 3 clauses with this 4th clause flagged as a known test-spec defect (already
  routed to Designforge/Program Agent).

## 8. Test-case coverage — execute 100% of the applicable set

Source: `design/test-cases.md` (34 unique `TC-*` IDs, mechanically confirmed by the Program Agent via
`grep -oE '\bTC-[0-9]+\b' design/test-cases.md | sort -u | wc -l` = 34, matching Auditron's declared
census exactly). Per `handoffs/auditron.yaml`'s `functional_test_cases` ledger:
- **24 already `auditron_executed`** (0 fail) against the pre-deploy local Author instance
  (`localhost-not-publish` — does not substitute for your real-tier run, but you do not need to
  re-derive these from scratch; re-confirm any that your own tracks naturally re-touch, and flag if any
  regress on the real tier).
- **8 `deferred_to_sentinel`:** `TC-002`, `TC-003` (Publish-tier exact-match parity, forward + reverse
  direction), `TC-007` (audits your own whitespace-normalization diff log — the `<p>` wrapper from
  GQL-FIX-02 is delivery markup, not a content difference; normalize it or use `plaintext`, and declare
  that normalization explicitly in your log as this TC requires), `TC-019`–`TC-022` (live-tier probes),
  `TC-023` (real Publish tier is expected anonymous; Author tier correctly requires auth — confirm both
  behave as expected on the real environment, not just conceptually).
- **2 `blocked`:** `TC-012`, `TC-016` — both solely on the open `AUD-CONTENT-01` wiring decision (§ 7
  above). Re-confirm the block still holds against real delivered state; do not mark as executed/pass
  if the wiring is genuinely still absent.

Emit `test/sentinel/coverage-matrix.md` with **your own mechanical ID census** (`total_from_file`) —
never a declared or inherited number — and per-ID `executed`/`result`/evidence, `executed == total`
for every ID in your remit (the 8 deferred + 2 blocked handed to you, plus any of the 24
`auditron_executed` you naturally re-touch). No blanket track-level `not_applicable`; every N/A above
in § 2 must carry its own per-track reason citing AD-1, itemized, not folded into one line.

## 9. Outputs

- `test/sentinel/sentinel-report.md` + `sentinel-report.html` (one consolidated report, one section per
  track: the headline multiline/schema check, GraphQL content-parity, authoring-provisions, DAM
  checkpoint, delivery-surface NFR substitutes [response time/payload weight/cache headers/CORS/
  observability], and the AD-1-justified N/A table for browser-rendered tracks).
- `test/sentinel/coverage-matrix.md` (per § 8).
- Raw response evidence archived under `test/sentinel/` (or a clearly named subfolder) for the headline
  check in § 3 at minimum.
- `handoffs/sentinel.yaml` with the terminal verdict (`status: pass` | `status: fail`), citing this
  packet's every finding disposition. **This is the LAST stage of the ADLC flow** — no downstream agent
  consumes your output except the Program Agent's session-close report.

## 10. Process discipline (standing rules for this run, apply to you too)

- Do not write directly into `DECISIONS.md`. Report findings and recommended entries back to the
  Program Agent in your response.
- Do not claim any human authorization beyond what is cited by timestamp in `DECISIONS.md`. If you
  believe a decision needs human input, surface it as an open question — do not invent an answer.
- Do not invoke `mvn`. The run's mvn ledger is closed at 3 of 3 (§ P4/§8.1.1.a) and this dispatch does
  not reopen it. Your verification is against the already-deployed real environment via HTTP only.
- Do not write the bearer token into any persisted artifact (§ 0).
