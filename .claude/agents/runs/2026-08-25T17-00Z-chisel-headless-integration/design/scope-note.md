# Design-Stage Scope Note — Chisel Headless Integration

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Purpose:** `designforge.md`'s standing gate contract (ADLC-SPEC §8.1) expects seven artifacts: `component-specifications.md`, `dialog-specifications.md`, `template-design.md`, `policy-mapping.md`, `authoring-guidelines.md`, `functional-test-cases.md`, `ui-test-scenarios.md`, alongside `content-fragment-models.md`. This run produces **none of the first five, and neither of the two test artifacts in their normal shape.** Per this run's dispatch instructions, that is not a silent omission — each is justified individually below, citing AD-1 (`DECISIONS.md 2026-08-25T18:15Z` entry, Decision 1) exactly as Strategist did for its own per-track testing N/A table (`technical-specifications.md § 7.1`). This mirrors that pattern rather than inventing a new one.

**Standing rule this note follows:** no statement below defers or skips a stage — it explains why an artifact that presupposes a rendered surface has no surface to describe in a run whose confirmed architecture (AD-1) has none. Nothing here should be read as "this artifact is deferred"; each is either genuinely inapplicable (not merely postponed) or explicitly substituted by a named replacement artifact in this same design pack.

---

## 1. `component-specifications.md` — DOES NOT APPLY

**Reason:** AD-1 (confirmed, `DECISIONS.md 2026-08-25T18:15Z`, Decision 1) delivers zero custom Java, zero custom components, zero custom HTL, and zero rendered surface. There is no component to specify a Sling Model contract, HTL structure, SCSS class, or accessibility expectation for — `technical-specifications.md § 3` states this explicitly and records the component reuse-vs-new triage as inapplicable: *"There is no component in this run... The reuse triage is therefore trivial and is recorded as such rather than being padded into a table of non-work."*

**What replaces it:** `design/content-fragment-models.md` — per `technical-specifications.md § 3`, "In a pure-headless delivery the CF Model is the unit of reuse", and AD-3's reuse discipline (one `pillar` model with a `category` enumeration, instead of 8+ near-identical models) is the content-model-layer analogue of the component reuse triage this artifact would otherwise perform.

**Returns when:** a rendered surface or visual consumer enters scope (would require a new human decision reversing AD-1's Option-B rejection — no agent may reintroduce this unilaterally, per R-11).

---

## 2. `dialog-specifications.md` — DOES NOT APPLY

**Reason:** Dialogs are authoring surfaces for AEM components/templates. None exist. `technical-specifications.md § 3.2`: *"No component is created, so there is no S6 deviation to justify and no S8 fragmentation to avoid."* The CF Models in `content-fragment-models.md` do have field-level dialog widgets (the Granite/CFM form components each field uses — e.g. `granite/ui/components/coral/foundation/form/textfield`, `dam/cfm/admin/components/authoring/contenteditor/multieditor`), but these are CF Model **field type specs**, not a component dialog in the ADLC sense this artifact normally covers (tabs, Granite dialog XML for a component's `_cq_dialog`). The dialog-spec confirmation gate (echo table + human/Strategist confirmation before scaffolding) does not apply because there is no component dialog to echo.

**What replaces it:** `design/content-fragment-models.md §§ 1–5` — each model's field table IS the authoring-surface spec for this run; it is CF Model field configuration, not component dialog configuration, and is documented as such rather than forced into the dialog-spec template.

**Returns when:** a custom AEM component is introduced (same trigger as § 1).

---

## 3. `template-design.md` — DOES NOT APPLY

**Reason:** No page is authored in this run. `technical-specifications.md § 4`: *"No template work is in scope. No page is authored... The existing template `/conf/headless-test/settings/wcm/templates/page-content` is left exactly as it is — its `structure/` must not be modified."* `S1–S4, S10` (template chrome via EF, project container proxy, `cq:Page` depth, allowed-templates registration, template reuse weighing) are explicitly recorded as inapplicable in `technical-specifications.md § 9`.

**Consequence held explicitly, not silently:** the existing template and the existing `/content/headless-test` page tree are both left untouched — this is a hard constraint (`requirements.yaml § constraints`), not an oversight. No downstream agent may add a page "just to check" — that would reintroduce exactly the Option-B surface the human rejected (risk R-11, `technical-specifications.md § 8`).

**Returns when:** AD-1 is reversed by a new human decision (Option B, or a future visual-consumer run).

---

## 4. `policy-mapping.md` — DOES NOT APPLY

**Reason:** Policy mapping specifies least-privilege allowed-components per parsys area on a template. There is no parsys, no template, no page (§ 3 above). `technical-specifications.md § 4` confirms no content policy and no policy mapping is in scope.

**What replaces it, in spirit:** the least-privilege discipline this artifact enforces (never `*`, always explicit allow-lists) has its content-model analogue in `design/persisted-query-contracts.md § 0` rule 5: *"No unfiltered `<model>List` is shipped"* — `stats-list` and `pillars-list` are both explicitly path-scoped (`STARTS_WITH /content/dam/headless-test/chisel`) rather than left open to return every fragment of that type in the repository. This is the query-isolation equivalent of a policy allow-list, and it is enforced in that document, not invented here as a fake policy table.

**Returns when:** a template/parsys exists to police.

---

## 5. `authoring-guidelines.md` — DOES NOT APPLY (in its normal "how to build a page" shape)

**Reason:** This artifact's contract is to tell an author how to create a page from templates and components — required/optional fields, image expectations, where to drop each component. There is no page-authoring workflow in this run (no page, no component, no parsys). `technical-specifications.md § 6.5`: *"No page is authored (AD-1, § 4). The content is reachable only through the four persisted queries and through the AEM Assets CF editor for authors. This is the intended end state, not a gap."*

**What replaces it:** the authoring workflow that DOES exist in this run — how a Content Author (P1) creates and maintains Content Fragments in the CF editor — is documented field-by-field, model-by-model, in `design/content-fragment-models.md` (required vs. optional fields, `*Alt` pairing obligation, `category` enumeration usage, the Option-B single-picker authoring caveat for `landing-page.stats`/`sections`/`pillars`) and in `design/source-content-inventory.md § 9` (the hard verbatim-authoring rules Composer/authors must follow, including the minimum fragment count per model). Together these ARE this run's authoring guidance — they are just organised around Content Fragments rather than pages/components, because that is the only authoring surface this run has.

**Returns when:** a page-authoring workflow exists to document.

---

## 6. `functional-test-cases.md` — SUBSTITUTED, not omitted

**Reason:** `functional-test-cases.md`'s normal contract (walk acceptance criteria → derive TC-### cases with executor/tier) presupposes a mix of rendered-surface and payload assertions. This run has payload assertions only.

**What replaces it:** `design/test-cases.md` (WB-05) — 34 test cases (`TC-001`..`TC-034`), each with a stable ID, tier (Publish/Author), executor, preconditions, test data, steps, expected result, and requirement traceability, exactly per the standing functional-test-case contract, adapted to a payload-only scope. It is named `test-cases.md` rather than `functional-test-cases.md` per this run's explicit dispatch instructions, which also fold in `ui-test-scenarios.md`'s normal responsibilities (§ 7 below) since there is no separate UI layer to scenario-spec.

---

## 7. `ui-test-scenarios.md` — DOES NOT APPLY (folded into `test-cases.md`)

**Reason:** UI-test scenarios describe Playwright-verifiable DOM/accessibility/navigation assertions on a rendered page. AD-1 produces no page, no DOM, no browser-facing surface at all (`technical-specifications.md §§ 1.0, 3.1`). `technical-specifications.md § 7.1` explicitly forbids Sentinel from running any Tier-A visual diff, browser automation, page fetch, Core Web Vitals measurement, or page-level accessibility scan — each with its own AD-1-citing reason, carried verbatim into `design/test-cases.md § 10`.

**What replaces it:** `design/test-cases.md §§ 1–9` cover the equivalent ground for a payload-shaped deliverable — content correctness (the payload analogue of DOM assertions), accessibility-in-payload (alt-text presence, the payload analogue of `@axe-core` DOM checks), and query isolation (the payload analogue of navigation-flow correctness). `design/test-cases.md § 10` explicitly carries forward the per-track N/A table so Sentinel records, rather than runs or silently drops, every UI-shaped track this run genuinely has none of.

---

## 8. What this run DOES produce (full design pack)

| Artifact | Status |
|---|---|
| `design/source-content-inventory.md` | Produced (WB-02) |
| `design/reference-assets.md` | Produced (WB-02A) |
| `design/content-fragment-models.md` | Produced (WB-03) |
| `design/persisted-query-contracts.md` | Produced (WB-04) |
| `design/test-cases.md` | Produced (WB-05) — substitutes for `functional-test-cases.md` + `ui-test-scenarios.md` |
| `design/scope-note.md` | Produced (this document) |
| `component-specifications.md` | N/A — § 1 |
| `dialog-specifications.md` | N/A — § 2 |
| `template-design.md` | N/A — § 3 |
| `policy-mapping.md` | N/A — § 4 |
| `authoring-guidelines.md` | N/A — § 5 (guidance folded into `content-fragment-models.md` + `source-content-inventory.md § 9`) |

No artifact above is marked "deferred". Each N/A is a standing fact about this run's confirmed architecture (AD-1), re-checkable the moment that architecture changes by a new human decision — not a checkbox left for a later stage to pick up.
