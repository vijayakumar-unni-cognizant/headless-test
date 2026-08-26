# Content Fragment Model Specifications — Chisel Headless Integration (WB-03)

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Design (Designforge)
- **Consumed by:** `composer` (WB-09, authors these models in `ui.content`); `configsmith` (endpoint schema derives from these); `sentinel` (WB-16, asserts `endpoint.schemaerrors` clean and field-level parity)
- **No component, dialog, template, or policy spec exists in this document or anywhere in this run** — none applies (AD-1, confirmed `DECISIONS.md 2026-08-25T18:15Z`; `technical-specifications.md § 3.1`).
- **Field-type source of truth:** every `metaType` / `sling:resourceType` / `valueType` combination below is taken from `.claude/skills/create-content-fragment-graphql/references/cf-models.md`, read as part of this stage's design work (per the Designforge contract's "read-only consultation" mode for that skill). Nothing below is invented from memory.

---

## 0. Model-wide structural rules (apply to all 5 models)

Per `.claude/skills/create-content-fragment-graphql/references/cf-models.md` and `technical-specifications.md § 6.1`, every model's `jcr:content`:

| Property | Required value |
|---|---|
| `jcr:content/jcr:primaryType` | `cq:PageContent` (**never** `nt:unstructured` or `dam:AssetContent`) |
| `status` | `enabled` (**never** `active="{Boolean}true"`) |
| `sling:resourceType` | `dam/cfm/models/console/components/data/entity/default` |
| `sling:resourceSuperType` | `dam/cfm/models/console/components/data/entity` |
| `cq:scaffolding` | `/conf/headless-test/settings/dam/cfm/models/<model-name>/jcr:content/model` — **self-referencing**, i.e. points at this model's own `jcr:content/model` node, not another model's |
| `cq:templateType` | `/libs/settings/dam/cfm/model-types/fragment` |
| `model/jcr:primaryType` | `cq:PageContent` |
| Root node | `jcr:primaryType="cq:Template"`, `allowedPaths="[/content/dam/headless-test(/.*)?]"` |

Generated GraphQL type per model = `<PascalCaseModelName>Model` (e.g. `hero` → `HeroModel`, `content-section` → `ContentSectionModel`, `landing-page` → `LandingPageModel`). Query fields = `<camelCaseModelName>List` / `ByPath` / `ById`.

---

## 1. Model: `hero`

Path: `/conf/headless-test/settings/dam/cfm/models/hero/`

| Field `name` | `metaType` | `sling:resourceType` | `valueType` | Required | `translatable` |
|---|---|---|---|---|---|
| `title` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** | no |
| `eyebrow` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `summary` | `text-multi` | `dam/cfm/admin/components/authoring/contenteditor/multieditor` (`default-mime-type="text/html"`) | `string/multiline` | **yes** | **yes** |
| `heroImage` | `reference` | `dam/cfm/models/editor/components/contentreference` (`validation="cfm.validation.contenttype.image"`, `rootPath="/content/dam/headless-test"`) | `string/reference` | no | no |
| `heroImageAlt` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `ctaLabel` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `ctaPath` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |

Generated type: `HeroModel { title eyebrow summary { html plaintext } heroImage { ...on ImageRef{...} ...on DocumentRef{...} } heroImageAlt ctaLabel ctaPath _path _metadata _variations }`

### 1.1 Content mapping — `hero`

| Field | Exact source value (→ `source-content-inventory.md` item id) | Rendered role in the consumer (GraphQL payload) |
|---|---|---|
| `title` | **CORRECTED (WB-02 r02).** Home: SC-HOME-001c (`Sharper tools for the trades.`). Capital: SC-CAP-001b (`Real capital.` + `A patient partner.`). Platform: SC-PLAT-001 real H1 (`The operating system for the trades.`). Community: SC-COMM-001 real H1 (`Of the trades. For the trades.`). | The hero's OWN headline string — the on-page `<h1>`, now individually confirmed against raw HTML on all 4 pages. **Ambiguity A1 in `source-content-inventory.md` is RESOLVED, not merely narrowed: a distinct on-page H1 was found on every page, separate from `<title>`/`og:title`.** Do NOT reuse `landing-page.seoTitle`'s value here — they are different strings on every page now that the inventory has been corrected (see § 5.1). |
| `eyebrow` | **CORRECTED (WB-02 r02) — WB-02 r01's "NOT OBSERVED" was itself a fidelity gap; a real eyebrow exists on every page.** Home: `Built in the trades, for the trades` (SC-HOME-001b). Capital: `Capital` (SC-CAP-001b). Platform: `The platform · Chisel OS` (SC-PLAT-001). Community: `Community` (SC-COMM-001). | Small kicker/label rendered above the headline. Author these — do not leave the field empty on the assumption it has no source value; that assumption was wrong. |
| `summary` | Home: SC-HOME-002 (corrected value: `We invest in trades businesses, build the free software that runs them, and reinvest in the people behind the work.`). Capital: SC-CAP-002 (corrected: `Chisel invests in trades businesses and holds for the long term. Grow, or hand off what you built — we meet you where you are.`). Platform: SC-PLAT-002 (corrected: `One AI-native platform that runs the back office, moves the money, and sends more work your way. Proven daily on the businesses we own and operate.`). Community: SC-COMM-002 (corrected: `The skilled trades built the world we live in. Chisel reinvests in the people who keep it standing — funding education, scholarships, and the career pathways that carry the work into the next generation.`). | The hero's body/lede paragraph, rendered BELOW the headline. **All 4 of these values changed from WB-02 r01** — the r01 strings were confirmed fabricated (`DECISIONS.md 2026-08-26T09:00Z`) and are no longer valid inputs for this field. This role remains distinct from `landing-page.seoDescription`'s machine-facing role even on the pages where the two now happen to share a string (see § 4.1/§ 5.1). |
| `heroImage` | S2 (`home-hero.png`), per `design/reference-assets.md`. Unaffected by the WB-02 correction. | Resolves to `Reference` union → `ImageRef { _path width height }`. |
| `heroImageAlt` | Proposed alt text in `design/reference-assets.md § 2`: `A tradesman in a work jacket and cap examining power tools on a workbench beside his service truck at sunset.` (unaffected) | Accessibility text paired 1:1 with `heroImage`. |
| `ctaLabel` / `ctaPath` | **CORRECTED (WB-02 r02) — partially observed, per page, not uniformly absent.** Home: still no distinct hero-level CTA button (the hero is followed immediately by the 3-card mini-nav strip, a structurally different element already mapped to `pillar` — leave `hero.ctaLabel`/`ctaPath` empty for home only). Capital: `Talk to us about your business` → `/contact?topic=capital`. Platform: `See it in your trade` → `/tide`. Community: `Get involved` → `/contact?topic=community`. | Left unauthored ONLY for the home hero, where it is genuinely confirmed absent. Author real values for capital/platform/community — leaving these empty on the r01 blanket "NOT OBSERVED" basis would now be under-authoring confirmed real content. Each of these 3 pages' hero also has a SECOND real CTA link (capital: `Seller education` → `/selling-a-business`; platform: `Talk to us` → `/contact?topic=software`; community: `Read our story` → `/about`) that this single-CTA field cannot carry — flag to Composer as a known model-shape limitation, not a content gap. |

---

## 2. Model: `stat`

Path: `/conf/headless-test/settings/dam/cfm/models/stat/`

| Field `name` | `metaType` | `sling:resourceType` | `valueType` | Required |
|---|---|---|---|---|
| `value` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** |
| `label` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** |
| `detail` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no |

`value` is intentionally `string`, not a numeric type — the source values are non-numeric strings (`$0`, `< 5 min`, `+20–30%`, `~30 min`, `97.98%`, `0.8%`), confirmed in `source-content-inventory.md`. A numeric `valueType` would either fail to store several of these values or silently truncate them.

Generated type: `StatModel { value label detail _path _metadata _variations }`

### 2.1 Content mapping — `stat`

| Fragment (suggested) | `value` | `label` | `detail` | Source item |
|---|---|---|---|---|
| `stats/free-pricing` | `$0` | `Free, forever` | `vs. $200–500+ per tech / month` | SC-HOME-004 |
| `stats/annual-savings` | `$62,850` | `Saved a year` | `vs. a comparable subscription stack` | SC-HOME-005 |
| `stats/back-office-time` | `< 5 min` | `A day in the software` | `80%+ of back-office work runs itself` | SC-HOME-006 |
| ~~`stats/price-to-operators`~~ | ~~`$0`~~ | ~~`Price to operators`~~ | ~~`no per-seat subscription...`~~ | **DO NOT AUTHOR — SC-PLAT-003 is confirmed UNSOURCED as of WB-02 r02.** Raw-HTML re-verification (`source-content-inventory.md § 4`) found no matching stat card anywhere on `/platform`. This row is struck through and must not be authored into a fragment. |
| ~~`stats/agent-count`~~ | ~~`10`~~ | ~~`AI agents in the Virtual Back Office`~~ | ~~none observed~~ | **DO NOT AUTHOR — SC-PLAT-004 is confirmed UNSOURCED as of WB-02 r02**, same basis as above. |
| `stats/blended-take-home` | `97.98%` | `Blended take-home` | `on a 50/50 card/ACH mix` | SC-PLAT-005 (re-confirmed against raw HTML, unchanged) |
| `stats/instant-deposits` | `~30 min` | `Instant deposits` | `funds, not 'two business days'` | SC-PLAT-006 (re-confirmed, unchanged) |
| `stats/close-rates` | `+20–30%` | `Higher close rates` | `with BNPL at the point of sale` | SC-PLAT-007 (re-confirmed, unchanged) |
| `stats/ach-pricing` | `0.8%` | `ACH, capped at $5` | `a ~99% take-home rate` | SC-PLAT-008 (re-confirmed, unchanged) |

**Correction (WB-02 r02):** `/platform` supplies exactly **4** real `stat`-shaped items (rows above), not 6 as WB-02 r01 implied. All 4 belong to one on-page section ("Chisel Pay" / "Get paid faster. Keep more of every dollar.") — there is no on-page equivalent for a `$0`/"Price to operators" stat or a `10`/"AI agents" stat anywhere on the page. Any downstream count assumption of "6 platform stats" must be revised to 4.

Every one of `value` / `label` / `detail` renders as its own distinct GraphQL field — there is no swap hazard within this model (three fields, three visibly different roles: the headline number, its caption, and its contrast line), but note the fields are NOT interchangeable: `label` is what the number *measures*, `detail` is the *comparison* — a consumer template that puts `detail` where `label` belongs would silently invert "what this is" and "why it matters." US-003's minimum bar requires ≥3 `stat` fragments; the home-page trio (rows 1–3) satisfies it.

---

## 3. Model: `pillar`

Path: `/conf/headless-test/settings/dam/cfm/models/pillar/`

Per AD-3: one model, reused across 8 distinct reference groups via `category`, instead of 8+ near-identical models.

| Field `name` | `metaType` | `sling:resourceType` | `valueType` | Required | `translatable` |
|---|---|---|---|---|---|
| `title` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** | no |
| `description` | `text-multi` | `dam/cfm/admin/components/authoring/contenteditor/multieditor` | `string/multiline` | no | **yes** |
| `category` | `enumeration` | `granite/ui/components/coral/foundation/form/select` (+ `optionsmultifield` per option, `datasource` = `dam/cfm/admin/components/datasources/optionrendererenumeration`) | `string` | no | no |
| `linkLabel` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `linkPath` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `image` | `reference` | `dam/cfm/models/editor/components/contentreference` (`validation="cfm.validation.contenttype.image"`) | `string/reference` | no | no |
| `imageAlt` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |

`category` enumeration options (`optionsmultifield/item0..9`, `fieldValue` shown, `fieldLabel` = title-cased form): `capital`, `technology`, `community`, `offering`, `partnership`, `approach`, `product`, `differentiator`, `role`, `film`.

Generated type: `PillarModel { title description { html plaintext } category linkLabel linkPath image { ...on ImageRef{...} } imageAlt _path _metadata _variations }`

### 3.1 Content mapping — `pillar` (representative sample; full 65-item source list is `source-content-inventory.md § 8`)

| `category` | Source items | `title` / `description` mapping | `linkLabel` / `linkPath` | `image` |
|---|---|---|---|---|
| `capital` / `technology` / `community` (home pillars) | SC-HOME-007/008/009 | direct 1:1 | `linkPath` = `/capital` / `/platform` / `/community` respectively (verbatim href observed). **`linkLabel` NOT OBSERVED anywhere** — no distinct "Learn more" style label string was returned by any fetch pass; leave `linkLabel` empty rather than duplicating `title` into it without evidence. | none observed |
| `offering` (What Chisel offers owners) | SC-CAP-003..008 (6 items) | direct 1:1 | not observed — empty | none |
| `partnership` (Three ways to partner) | SC-CAP-009..011 (3 items) | direct 1:1 | not observed — empty | none |
| `approach` (The approach) | SC-CAP-012..014 (3 items) | direct 1:1 | not observed — empty | none |
| `product` (The Stack + Products by Trade) | SC-PLAT-010..014, SC-PLAT-035..037 (8 items) | direct 1:1, **with one title correction (WB-02 r02):** the "Products by Trade" cards' on-page `title` is the bare trade name (`Tide`, `Ridge`, `Sentry`), NOT `Chisel Tide`/`Chisel Ridge`/`Chisel Sentry` — the "Chisel" prefix is only implied by page context (a brand-color dot), not literal card text. Author `title` as the bare name to stay faithful to the confirmed on-page string, or as `Chisel <name>` if a product-brand convention is preferred — either is defensible but must be a recorded choice, not a silent pick. | `linkPath` = `/tide` for `Tide` only (SC-PLAT-035, verbatim). **CORRECTED (WB-02 r02): `/ridge` and `/sentry` are not merely UNCERTAIN — confirmed ABSENT.** Both cards render as non-clickable `<div>`s, not `<a>` links, on the live page. Leave `linkPath` empty for these two, as a confirmed fact, not a pending re-verification. | none |
| `differentiator` (What the AI Produces + How It Is Different) | SC-PLAT-027..034 (8 items) | direct 1:1 (re-confirmed; SC-PLAT-027..030's title/body/stat are 3 separate on-page fields, not one joined string — see corrected inventory) | not observed — empty | none |
| `role` (Virtual Back Office roster) | SC-PLAT-016..025 (10 items) | **PARTIAL as of WB-02 r02.** `title` (bare role name) and the short parenthetical label are confirmed for all 10 roles. The LONG-FORM `description` sentence is confirmed for only 1 of 10 (COO) — the other 9 roles' long-form description text used in WB-02 r01 is fabricated and must not be authored. Options: author `description` as just the short parenthetical label for the other 9 (e.g. `(Routes & scheduling)`) and leave the rest empty, or hold those 9 fragments pending a further, JS-bundle-aware fetch (`source-content-inventory.md § 6, A8`). | not observed — empty |
| `film` (operator films) | SC-COMM-011..012 (2 items) | **CORRECTED (WB-02 r02).** The on-page metadata is 3 separate confirmed fields (sector, location, runtime), not a single collapsed string — but more importantly, WB-02 r01 omitted a real, confirmed narrative sentence for each film. Recommended `description` = the real narrative sentence (Paradise Pools: `Decades of Napa pools, one crew that never cut a corner — and the day the owner decided the next chapter didn't mean walking away.`; Vine Homes: `A builder whose houses hold up wine country's hills — on the craft, the crew, and finding a partner who keeps the name on the door.`), with the sector/location/runtime metadata either folded in as a prefix (matching the on-page rendering, which shows them as `Paradise Pools · Pool service · Napa, California` plus a separate `4 min` badge) or omitted from `description` and left for a future dedicated field. **Do not use AD-3's originally-illustrated collapsed string (`Pool service, Napa, California, 4 min`) as the sole `description` value — it was never the full real content and is missing the narrative sentence entirely.** | not observed — empty |
| `community` (The commitments + How the investment works) | SC-COMM-003..009 (7 items) | direct 1:1 | not observed — empty | none |

**Swap hazard called out explicitly:** `title` and `description` are NOT swappable-looking in this model (one is a short label, the other is a full sentence-or-more), but within the `role` category specifically, note that the source's own parenthetical (e.g. `(Strategic oversight · the owner's interface)`) was folded into the FRONT of `description`, not into `title` — `title` stays the bare role name (`COO`, `Dispatcher`, etc.). A consumer rendering `title` as a card heading and `description` as the card body will show the parenthetical sub-label as the first clause of the body text, not as a separate heading — this is the correct, source-faithful rendering, not an error to "fix" by moving the parenthetical into `title`.

---

## 4. Model: `content-section`

Path: `/conf/headless-test/settings/dam/cfm/models/content-section/`

| Field `name` | `metaType` | `sling:resourceType` | `valueType` | Required | `translatable` |
|---|---|---|---|---|---|
| `heading` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** | no |
| `body` | `text-multi` | `dam/cfm/admin/components/authoring/contenteditor/multieditor` | `string/multiline` | **yes** | **yes** |
| `anchorId` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |
| `sectionImage` | `reference` | `dam/cfm/models/editor/components/contentreference` (`validation="cfm.validation.contenttype.image"`) | `string/reference` | no | no |
| `sectionImageAlt` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | no | no |

Generated type: `ContentSectionModel { heading body { html plaintext } anchorId sectionImage { ...on ImageRef{...} } sectionImageAlt _path _metadata _variations }`

### 4.1 Content mapping — `content-section`

**All rows below except `sections/bolt` were corrected in WB-02 r02 — the r01 headings/bodies for these fragments were confirmed fabricated (`DECISIONS.md 2026-08-26T09:00Z`) and do not exist anywhere in the raw HTML. Do not author the struck-through r01 values.**

| Fragment (suggested) | `heading` | `body` | `sectionImage` | Source item |
|---|---|---|---|---|
| ~~`sections/connective-idea`~~ | ~~`The connective idea`~~ | ~~`Chisel owns and operates trades businesses...`~~ | — | **RETIRED.** No "connective idea" section exists on the home page; this row is dropped, not replaced 1:1 — see `sections/invest-in-businesses` below for the real section that occupies this narrative position instead. |
| `sections/invest-in-businesses` (NEW — real substitute for the retired row above) | `We invest in trades businesses.` | `Chisel partners with owners for the long term — to help you grow, or to give a life's work a permanent home. No quick flips.` | none | SC-HOME-010 (corrected) |
| ~~`sections/what-chisel-is`~~ → `sections/runs-the-business` | ~~`What Chisel is`~~ → `Software that runs the business for you.` | ~~"Chisel Industries is an operator-led company..."~~ → `Chisel answers the calls, writes the invoices, and chases the payments — then hands you the day in a 60-second briefing. No forms. No subscriptions.` | none | SC-HOME-011 (corrected) |
| ~~`sections/why-software-is-free`~~ → `sections/people-of-the-trades` | ~~`Why the software is free`~~ → `Investing in the people of the trades.` | ~~"Most field-service software charges..."~~ → `The trades built the world we live in. Chisel reinvests in the people who keep it standing.` **Plus 3 sub-items** (`Trade schools` / `Partnering with the programs training the next generation.`; `Scholarships` / `Funding apprenticeships and scholarships in the skilled trades.`; `Career pathways` / `Real paths from apprentice to owner.`) that this model's flat `body` field cannot individually carry — fold them into `body` as a continuation, or note the model-shape limitation to Composer. | none | SC-HOME-012 (corrected) |
| ~~`sections/continuous-software`~~ → `sections/run-your-trade` | ~~`The category: Continuous Software`~~ → `See your trade run itself.` | **No body paragraph exists at this position — it is CTA-only** (`See Tide in action` → `/tide`, `Partner with Chisel` → `/capital`). If `body` is a required field on this model (it is — see § 4), either leave this 4th home content-section unauthored (the US-003 floor of 3 is already met by the 3 rows above) or author `body` as empty/omitted and rely on `sections/invest-in-businesses` + `sections/runs-the-business` + `sections/people-of-the-trades` as the 3 required. | none | SC-HOME-013 (corrected — thin) |
| `sections/why-technology-matters` → `sections/selling-a-business` | ~~`Why the technology matters to the deal`~~ → `Thinking about selling? Start here.` | ~~"Chisel's free software removes a five-figure annual cost..."~~ → `Selling the business you built is one of the biggest decisions you'll ever make. We've written the most thorough, owner-first guide to selling a trades business anywhere — plus trade-by-trade breakdowns and a Bay Area guide. No jargon, no sales pitch.` | none | SC-CAP-015 (corrected) |
| ~~`sections/what-it-is`~~ → `sections/data-entry-clerk` | ~~`What It Is`~~ → `For 25 years you were the data-entry clerk for your own business.` | Partial — a "SaaS asked you to / Observe reality / Translate it into data / Type it into a form" comparison list exists; only these fragments are re-confirmed, the list's full remaining content is UNCERTAIN (`source-content-inventory.md § 4`, SC-PLAT-009) — do not complete this list from imagination if authoring it. | none | SC-PLAT-009 (corrected, partial) |
| `sections/virtual-back-office-intro` | ~~"The core of the system is 10 AI agents, each holding a role..."~~ → `Not a chatbot. A team of ten.` | ~~(same fabricated sentence)~~ → `Each agent has a job title, a domain, and the autonomy to act — without a human filling out a form. The owner spends under five minutes a day inside the software. Meet the staff.` | none | SC-PLAT-015 (corrected) |
| `sections/safety-rails` (NEW — replaces the SC-PLAT-026 "operational note" merge) | `Safety rails & observability` (or omit heading and fold into the VBO intro above) | **Two distinct real candidates exist — pick one, record the choice:** (a) `Runs autonomously. Financial actions above a threshold pause for your approval — every decision traced and auditable.` (attached to the COO panel); (b) `Financial actions above a threshold pause for human approval. Every agent decision is traced and auditable.` (a separate "Safety rails & observability" card). **Do not merge these into a third, blended sentence as WB-02 r01 did — that produced a sentence matching neither.** | none | SC-PLAT-026 (corrected) |
| `sections/bolt` | `BOLT — Balanced Open-License Terms` | verbatim, SC-COMM-010 (unaffected by this correction pass) | **`home-movement.png` (S3)** per `design/reference-assets.md § 3` design recommendation — semantic fit with mentorship/community narrative, not an extracted fact | SC-COMM-010 |

`sectionImageAlt` for the `sections/bolt` (or whichever section is chosen to carry S3) fragment = `An experienced electrician pointing at breakers in an open electrical panel while a younger apprentice holds the panel door and watches.` (per `design/reference-assets.md § 3`). `anchorId` has **no observed source value on any page** — it is an optional, purely structural field for a future consumer's deep-linking; leave unauthored or derive a slug from `heading` (e.g. `what-chisel-is`) and mark it `derived`, never `verbatim`, if authored at all.

US-003's minimum bar requires ≥3 `content-section` fragments — the home-page trio (`sections/invest-in-businesses`, `sections/runs-the-business`, `sections/people-of-the-trades`, all corrected per WB-02 r02 above) satisfies it without needing `sections/run-your-trade`.

---

## 5. Model: `landing-page` (aggregator)

Path: `/conf/headless-test/settings/dam/cfm/models/landing-page/`

Per AD-2 (aggregator + 4 leaf models) and AD-4 (Option B for every multi-valued fragment-reference field — the proper multifield, Option A, cannot be hand-authored in JCR; see `.claude/skills/create-content-fragment-graphql/references/cf-models.md`'s "Multi-valued references: two options" table).

| Field `name` | `metaType` | `sling:resourceType` | `valueType` | Required |
|---|---|---|---|---|
| `slug` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** |
| `seoTitle` | `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | **yes** |
| `seoDescription` | `text-multi` | `dam/cfm/admin/components/authoring/contenteditor/multieditor` | `string/multiline` | no |
| `hero` | `fragment-reference` (single) | `dam/cfm/models/editor/components/fragmentreference` (`cfModelPath=".../models/hero"`, `filter="fragments"`) | **`string/reference`** (corrected 2026-08-26T15:30Z — was `string/content-fragment`) | no |
| `stats` | `fragment-reference` (multi, **Option B**) | `dam/cfm/models/editor/components/fragmentreference` (same resource type as single — NOT `/multifield`) | **`string/reference[]`** | no |
| `sections` | `fragment-reference` (multi, **Option B**) | `dam/cfm/models/editor/components/fragmentreference` | **`string/reference[]`** | no |
| `pillars` | `fragment-reference` (multi, **Option B**) | `dam/cfm/models/editor/components/fragmentreference` | **`string/reference[]`** | no |

> ### CORRECTION 2026-08-26T15:30Z — the single-valued `hero` field's `valueType`
>
> This table originally specified `valueType="string/content-fragment"` for `hero`, taken from
> `.claude/skills/create-content-fragment-graphql/references/cf-models.md`'s single-fragment-reference
> pattern. **That value is not recognised by the CF-Model-to-GraphQL schema generator: the field is
> silently dropped from the generated type entirely** (`SCHEMA_INCOMPLETE_FIELD_REMOVED` on
> `landing-page@hero`), which made `landing-page-by-path` fail schema validation for every input. The
> skill reference is wrong on this point and has been routed to its maintainers.
>
> **Correct value: `string/reference`** (no `[]`). Established by writing each candidate to a live
> model and re-introspecting the schema: `string/content-fragment` → field absent;
> `string/content-fragment[]` → field absent; `string` → `String` scalar (bare path, so
> `... on HeroModel` would be invalid); `string/fragment-reference` → `String` scalar;
> **`string/reference` → `Reference` UNION**, which is what the documented inline-fragment spread
> needs. Nothing else on the field changed, and **no persisted query changed** — the `Reference` union
> already contains all five project model types. Full evidence: `DECISIONS.md 2026-08-26T15:30Z`.
>
> **AD-4 is narrowed, not overturned.** The Option B rule below — `string/reference[]` for the three
> multi-valued fields — was correct all along; `stats`/`sections`/`pillars` were present in the schema
> as `[Reference]` throughout. The single-valued analogue is simply the same token without the `[]`.

**AD-4 / Option B rule, restated precisely because getting this wrong is the single most common silent failure in this model (per the CF/GraphQL skill's own field-type table):** for `stats`/`sections`/`pillars`, the `valueType` carries the `[]` array suffix (`string/reference[]`), but the `sling:resourceType` stays the **single**-picker `fragmentreference` component — **not** the `/multifield` variant. The `/multifield` variant (Option A) requires the CF Model Editor UI to author (it writes a target-model link no plain JCR property reproduces) and, if hand-authored, is dropped from the schema with `SCHEMA_INCOMPLETE_FIELD_REMOVED`. Option B trades a real "add more" multifield for a single path-picker dialog, in exchange for being fully JCR-authorable with zero manual post-deploy step — the correct trade for this run's reproducible-deploy priority (Q-004, non-blocking, proceeding on this default).

Generated type: `LandingPageModel { slug seoTitle seoDescription { html plaintext } hero { ...on HeroModel{...} } stats { ...on StatModel{...} } sections { ...on ContentSectionModel{...} } pillars { ...on PillarModel{...} } _path _metadata _variations }`

### 5.1 Content mapping — `landing-page`

**All `seoTitle` and `seoDescription` values below are corrected per WB-02 r02 — the r01 values were confirmed fabricated (`DECISIONS.md 2026-08-26T09:00Z`).**

| Fragment | `slug` | `seoTitle` | `seoDescription` | `hero` / `stats` / `sections` / `pillars` |
|---|---|---|---|---|
| `pages/home` | `home` (derived, unaffected) | **CORRECTED** → `Chisel — Sharper tools for the trades. Built in the trades.` (SC-HOME-001, the real `<title>`; note this is now confirmed DIFFERENT from `hero.title`, which is the real H1 `Sharper tools for the trades.` — the two fields are no longer the same string, per A1's resolution) | **CORRECTED** → two real, non-identical candidates now confirmed: SC-HOME-003 (`Free, AI-native operating systems for the skilled trades that run the business for the owner — instead of making the owner run the software.` — JSON-LD `WebSite.description`) or SC-HOME-003b (`og:description`: `Continuous Software — free, AI-native operating systems for the skilled trades. No forms. Built by people who own and operate trades businesses themselves.`). Pick one, record the choice in `DECISIONS.md` before authoring (inventory § 6, A9). Both are confirmed DISTINCT from the corrected `hero.summary` (SC-HOME-002) — no swap risk on home. | references the home `hero` fragment + 3 home `stat` fragments + the home `content-section` fragments (corrected, § 4.1) + the home 3 `pillar` fragments |
| `pages/capital` | `capital` (derived) | **CORRECTED** → `Capital \| Chisel — A Patient Partner for Trades Owners` (SC-CAP-001) | **CORRECTED** → `Chisel invests in trades businesses and holds for the long term. Grow, or hand off what you built — we meet you where you are.` — this is the SAME source string as the corrected `hero.summary` for the capital hero fragment (SC-CAP-002); this identity is real and confirmed, not an r01 artifact | — |
| `pages/platform` | `platform` (derived) | **CORRECTED** → `The Platform \| Chisel OS — Continuous Software for the Trades` (SC-PLAT-001; note `og:title` is the shorter `Chisel OS — Continuous Software for the Trades` — pick one, both confirmed real) | **CORRECTED** → `One AI-native platform that runs the back office, moves the money, and sends more work your way. Proven daily on the businesses we own and operate.` — same source string as the corrected `hero.summary` for the platform hero fragment (SC-PLAT-002) | — |
| `pages/community` | `community` (derived) | **CORRECTED** → `Community \| Chisel — Investing in the People of the Trades` (SC-COMM-001) | **CORRECTED — and now directly confirmed, not a pattern-based inference.** `The skilled trades built the world we live in. Chisel reinvests in the people who keep it standing — funding education, scholarships, and the career pathways that carry the work into the next generation.` (SC-COMM-002) — this is the SAME source string as the corrected `hero.summary` for the community hero fragment, directly confirmed against raw HTML (`source-content-inventory.md § 5`), superseding r01's claim that `/community`'s page metadata was unconfirmable. | — |

**Swap hazard — restated per the standing content-mapping-gate requirement, now against corrected values:** on the home page, `hero.summary` and both `seoDescription` candidates are three DIFFERENT source strings — no swap risk there, but an A9 choice is needed between the two `seoDescription` candidates. On `/capital`, `/platform`, and `/community`, the SAME (corrected) source string is the confirmed-correct value for BOTH `hero.summary` AND `landing-page.seoDescription` — this remains a genuine characteristic of the source, not a copy-paste error to "fix." The RENDERED ROLE still differs even when the string is identical: `hero.summary` is **visible body copy** under the hero headline; `seoDescription` is **machine-facing metadata**, never rendered as visible page content. Composer must author the same corrected string into both fields for these 3 pages.

### 5.2 Model-change compatibility note (carried into `persisted-query-contracts.md` per US-014)

Per `.claude/skills/create-content-fragment-graphql/references/cf-models.md`'s versioning table: renaming or deleting any field above breaks every persisted query selecting it (`SCHEMA_INCOMPLETE_FIELD_REMOVED` / silent data loss). Adding a new optional field is safe. Changing a `metaType` is breaking. These models are authored once as a seed and owned by authors thereafter (`technical-specifications.md § 6.1`) — treat any future field change as a schema migration, not a content edit.

---

## 6. Gate self-check (Designforge)

- `status="enabled"` used throughout, never `active="{Boolean}true"` — **confirmed**, § 0.
- Self-referencing `cq:scaffolding` per model — **confirmed**, § 0 (stated as the general rule; each model's own path substitutes `<model-name>`).
- Option B (`valueType="string/reference[]"`, single-picker resource type) used for all 3 multi-valued fragment-reference fields on `landing-page` — **confirmed**, § 5, AD-4.
- Every asset-reference field (`hero.heroImage`, `pillar.image`, `content-section.sectionImage`) is paired with its own `*Alt` text field — **confirmed**, §§ 1, 3, 4.
- No component or dialog spec produced — **confirmed**, none exists in this run.
- Every field traces to a region in `plan/reference-deconstruction.md § 4` and/or `design/source-content-inventory.md` — **confirmed** throughout §§ 1–5, **re-verified against raw HTML in WB-02 r02**. `hero.eyebrow` and `hero.ctaLabel`/`ctaPath` are NOW CONFIRMED OBSERVED on capital/platform/community (corrected from r01's blanket "not observed" — see § 1.1); they remain genuinely unobserved only for the home hero specifically. `pillar.linkLabel`, the `/ridge`/`/sentry` `pillar.linkPath`s (now confirmed absent, not merely unconfirmed), and `content-section.anchorId` remain explicitly NOT OBSERVED / left optional and unauthored, never invented. `stats/price-to-operators` and `stats/agent-count` (SC-PLAT-003/004) are confirmed UNSOURCED and must not be authored at all (§ 2.1).
