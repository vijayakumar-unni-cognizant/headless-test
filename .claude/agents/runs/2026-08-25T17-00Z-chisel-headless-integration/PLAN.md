# PLAN — 2026-08-25T17-00Z-chisel-headless-integration

## Intake (verbatim)

> Build an AEM Pure Headless integration by taking this URL as a Reference
> https://www.chiselindustries.com/ Include the AEM Content Fragment Models, GraphQL query. and
> also take this image folder for asset reference: C:\Users\2400091\Downloads\assets-headless

## Project identifiers

- `project`: headless-test
- `package`: com.headlesstest.aem
- `group`: Headless Test
- Default branch (verified via `git symbolic-ref refs/remotes/origin/HEAD`): **`main`** — NOT `master`. Pilot must target `main`.
- Repo: `vijayakumar-unni-cognizant/headless-test` (origin)

## Reference assets in scope

- Reference URL (visual/design/content-structure reference ONLY — no DOM/CSS transplant): `https://www.chiselindustries.com/`
- Reference image folder: `C:\Users\2400091\Downloads\assets-headless`
  - `home-hero.png` (~803 KB)
  - `home-movement.png` (~1.66 MB)
- Because a reference image set is present, **§ P6, § P7, § P8 of aem-program-agent.md are ACTIVE** for this run:
  - Layered visual-fidelity gates at every stage (Plan/Design/Implement/Test).
  - Pre-Sentinel DAM asset checkpoint (§ P7) before Visual Verification Tier A.
  - Tier A viewport convention (§ P8): Desktop 1440x900, Mobile 390x844 (no override specified in intake).

## Scope classification

- **Domain: Headless** (Pure Headless). Content Fragment Models + persisted GraphQL queries are named, required deliverables.
- `composer` is IN SCOPE (CF Models, GraphQL, DAM seeding).
- `designforge` MUST produce `design/content-fragment-models.md` with content-mapping rows (not just field shape).
- Strategist MUST make and record an explicit architecture call on the consumer surface (headless front-end consumer vs AEM-rendered vs hybrid) — this determines whether Sentinel's SPA-integration + GraphQL content-parity tracks run against a real front-end consumer or a hybrid AEM-rendered page.
- The reference URL is a visual/content-structure reference only. Blockwright/Designforge must NOT transplant HTML/DOM/CSS — decompose into a content model + component/consumer list, authored fresh against AEMaaCS patterns.

## Stage graph (per ADLC-SPEC §5.1.a — authoritative)

| # | Stage | Specialist(s) | Mode | Notes |
|---|---|---|---|---|
| 1 | Plan | `strategist` | serial | MANDATORY stage 1. Produces `plan/requirements.yaml` + `plan/technical-specifications.md` + `plan/reference-deconstruction.md` (P6, ref image in intake). Human checkpoint: architecture review. |
| 2 | Design | `designforge` | serial | Full design pack incl. `content-fragment-models.md` (content-mapping rows), `reference-assets.md` (both images + ref URL, non-`none`), `source-content-inventory.md` (fetched from chiselindustries.com), `design-token-audit.md` if tokens in scope, Pixel-Verified Acceptance Criteria tables (P6). |
| 3 | Implement/Integrate fan-out | `blockwright`, `configsmith`, `bridgesmith`(if boundary work needed), `composer` | parallel where possible | Blockwright: components/templates/services + Playwright harness pre-deploy. Configsmith: repoinit/ACLs/dispatcher/security. Composer: CF Models + persisted GraphQL queries + endpoint config + sample-page authoring + DAM seeding from `assets-headless`. Bridgesmith: only if an external system boundary is identified by Strategist (e.g. if a separate SPA consumer repo/build is out of scope, likely bridgesmith is N/A — confirmed after Strategist's architecture call). |
| 4 | Test (pre-release) | `auditron` | serial | Code-quality review, Build Gate (mvn #1), unit+integration tests (mvn #2). Functional-TC attribution ledger required. |
| 5 | Release | `pilot` | serial | Raises PR feature-branch -> `main` (verified default branch) once Auditron green. Flow SUSPENDS. Human checkpoint: real-environment validation approval (Author + Publish URLs + auth modes). |
| — | PAUSE | (human Lead) | — | Lead manually merges PR, syncs to Adobe Git, deploys real env. |
| 6 | Test (post-deploy, LAST) | `sentinel` | serial | Runs against real Author + Publish URLs. Playwright, Perf/SEO/A11y/Observability, GraphQL content-parity (mandatory — headless run), authoring-provisions, Visual Verification Tier A/B (mandatory — ref image in intake) incl. § P7 DAM checkpoint before Tier A. |
| 6.5 | Visual Iteration Loop (conditional) | `sentinel`-routed | gated | Only runs after human confirms remediation at § P10 checkpoint if Tier A reports criticals. |

## Human checkpoints (never auto-advance)

1. **Architecture review** — after `strategist` emits `plan/technical-specifications.md`.
2. **Real-environment validation approval (resume)** — after `pilot` raises the PR; requires Lead approval + Author URL/auth + Publish URL/auth.
3. **Sentinel remediation approval** — conditional, only if `sentinel` returns `status: fail`.
4. **Pre-Sentinel DAM asset checkpoint (§ P7)** — informational human checkpoint before Sentinel's Visual Tier A run, re: real DAM assets present under `/content/dam/headless-test/...` on the real env.

## Out of ADLC scope (flagged, not dispatched)

- Cloud Manager Dev/Stage/Prod triggers, Stage/Prod approval enforcement, post-deploy incident triage, rollback beyond RDE, postmortems — Lead/external process.

## Dispatch mode

- `Agent` tool IS present in this session's tool list → standard orchestration mode (not co-orchestration fallback). No `dispatch-mode: co-orchestration` note needed.
- Parent-materialization fallback for `.claude/agents/runs/` Write denials is pre-authorized in every dispatch packet regardless.
