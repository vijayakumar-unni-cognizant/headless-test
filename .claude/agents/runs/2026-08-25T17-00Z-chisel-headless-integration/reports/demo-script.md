# Demo Script - Chisel Headless Integration

## Setup

- PR: `https://github.com/vijayakumar-unni-cognizant/headless-test/pull/1`
- Publish endpoint base: `https://publish-p185256-e1945105.adobeaemcloud.com/graphql/execute.json/headless-test/`
- Author endpoint: `https://author-p185256-e1945105.adobeaemcloud.com/`
- Final status to state up front: `fail (accepted gap)` after remediation was declined.

## Walkthrough

1. Show the PR and summarize the package:
   - 5 Content Fragment Models: `hero`, `stat`, `pillar`, `content-section`, `landing-page`.
   - 15 authored fragments under `/content/dam/headless-test/chisel/fragments/`.
   - 2 DAM assets: `home-hero.png` and `home-movement.png`.
   - 4 persisted queries: `landing-page-by-path`, `hero-by-path`, `stats-list`, `pillars-list`.

2. Show the primary Publish query:
   ```text
   https://publish-p185256-e1945105.adobeaemcloud.com/graphql/execute.json/headless-test/landing-page-by-path;path=/content/dam/headless-test/chisel/fragments/pages/home
   ```
   Point out that Sentinel confirmed HTTP 200, zero GraphQL errors, nested hero data present, and multiline fields delivered as `<p>...</p>` wrapped HTML.

3. Show the parity result:
   - `103` fields mechanically compared against `design/source-content-inventory.md`.
   - `0` mismatches.
   - `0` non-whitespace diffs.
   - Only rich-text delivery markup normalization was applied.

4. Show Author provisioning evidence:
   - All 5 CF Models enabled.
   - Author introspection includes all 5 model types.
   - `landing-page.hero` deployed with `valueType: "string/reference"`.
   - All 4 persisted queries exist as binary nodes.

5. Show DAM delivery:
   - `home-hero.png`: HTTP 200, `image/png`, 802956 bytes, 1600x992.
   - `home-movement.png`: HTTP 200, `image/png`, 1661220 bytes, 1080x1341.

6. Explain the accepted gaps:
   - `SENT-CORS-01`: browser cross-origin consumers cannot currently read Publish GraphQL responses. Fresh requests with an `Origin` header return HTTP 204 and zero bytes.
   - `AUD-CONTENT-01`: `home-movement.png` is delivered as a DAM asset but is not reachable through `landing-page-by-path` because `sections/bolt` is not wired into `home.sections`.
   - `GQL-SPEC-01`: TC-024 needs a spec correction for the all-6-pillars clause.

7. Close with the decision:
   - Remediation was declined under the P10 checkpoint.
   - The run closes as `fail (accepted gap)`.
   - Future remediation needs a new cycle: fix, Auditron, PR, Lead redeploy, Sentinel re-check.

## Evidence To Open During Review

- `test/sentinel/sentinel-report.html`
- `test/sentinel/coverage-matrix.md`
- `handoffs/sentinel.yaml`
- `reports/final-report.md`
