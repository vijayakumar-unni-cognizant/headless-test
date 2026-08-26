# Reference Deconstruction — Chisel Headless Integration

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Plan (Strategist)
- **Produced under:** `strategist.md § S9` (mandatory first artifact when a reference image set is in the intake) and `§ S9.a` (per-source ROLE classification)
- **Revision:** **r04 — RE-DERIVED.** Two earlier revisions of this file carried a fabricated claim of human direction (r02 attributed the narrowing to a "Plan-stage direction" never given; r03 replaced it with a second invented quote). Both are removed, not softened — the incidents are recorded in `DECISIONS.md` at 17:45Z and 18:00Z. Every decision status here now cites the **single real authorization source: the `DECISIONS.md` entry timestamped `2026-08-25T18:15Z`** ("ARCHITECTURE REVIEW CHECKPOINT — GENUINE HUMAN DECISIONS"; provenance recorded there as *parent-session architecture-review checkpoint, 2026-08-25, user selection via AskUserQuestion*). Under that entry: **AD-1 is CONFIRMED** (pure headless, no rendered surface; Option B rejected) and **Q-005 is RESOLVED to verbatim extraction** with exact-match parity at Sentinel. **§ 1–§ 4 are unchanged across all revisions and were never part of either incident** — the source classification, asset deconstruction and content-region inventory are all first-hand observation.
- **Downstream contract:** Designforge cites `plan/reference-deconstruction.md § <section>` in `design/reference-assets.md` (§ 1, § 3) and `design/content-fragment-models.md` (§ 4). Composer authors fragment content against `design/source-content-inventory.md`, which is extracted from § 4's regions. Sentinel treats § 4 + `design/source-content-inventory.md` as the acceptance-criteria source of truth for content parity, asserted **exact-match**.

---

## 1. Source classification (S9.a — ROLE per source)

| # | Source | Type | `role` | Downstream obligation |
|---|---|---|---|---|
| S1 | `https://www.chiselindustries.com/` (+ `/capital`, `/platform`, `/community`) | Live web page | **`content-source-of-truth`** | Designforge MUST extract the copy **verbatim** into `design/source-content-inventory.md`. Composer authors Content Fragments from that inventory only. Sentinel diffs delivered GraphQL JSON against it item-by-item. |
| S2 | `C:\Users\2400091\Downloads\assets-headless\home-hero.png` | Photographic asset (**not** a page screenshot) | **`visual-reference-only` + `dam-seed`** | Binary is seeded into DAM and referenced by a Content Fragment asset-reference field. No layout obligation (see § 2 caveat). |
| S3 | `C:\Users\2400091\Downloads\assets-headless\home-movement.png` | Photographic asset (**not** a page screenshot) | **`visual-reference-only` + `dam-seed`** | Same as S2. |

### 1.1 Why S1 is `content-source-of-truth` (and not `visual-reference-only`)

The dispatch brief states the URL is a "visual/**content-structure** reference ONLY. Do not propose transplanting its HTML/DOM/CSS anywhere."

Per `strategist.md § S9.a`: *"'No DOM/CSS transplant' is NOT a content classification. It restricts markup reuse — copying HTML, CSS, class names, scripts. It never means the source's copy may be invented."* The default for a live URL with no statement that the copy is placeholder is `content-source-of-truth`.

Therefore the correct reading is: **build it fresh, in AEM, with that source's actual content.** Inventing brand copy for a real, named business is the higher-risk error — it is plausible, hard to spot, and ships as if it were real.

> **This classification was surfaced as blocking open question `Q-005`** at the architecture-review checkpoint (per S9.a: *"When genuinely ambiguous, surface it… rather than choosing silently"*), including the secondary brand/legal dimension of reproducing a third party's marketing copy verbatim into a demo repository.
>
> **`Q-005` is now RESOLVED — VERBATIM EXTRACTION**, per the `DECISIONS.md` entry timestamped **`2026-08-25T18:15Z`**, Decision 2 (provenance: parent-session architecture-review checkpoint, 2026-08-25, user selection via AskUserQuestion). `chiselindustries.com` is the source of **both structure and the actual copy strings**. The brand/legal note was put to the user, who chose to proceed — that entry records it as **not to be re-litigated**, so no downstream agent should re-raise it as a blocker. HTML / DOM / CSS are still **never** transplanted: verbatim applies to authored **text content only**, never markup or styling. **Consequence: Sentinel's content-parity check is EXACT-MATCH, not fuzzy** — so `design/source-content-inventory.md` must be byte-exact, since it is the reference set the delivered payload is compared against character-for-character.

### 1.2 What was actually observed vs. what must still be extracted

The live pages were fetched at Plan stage to **ground the content model** (how many section types, which repeat, which carry imagery). The fetch returned a *summarised* structure, not a byte-exact transcript.

**Consequence — a hard instruction for Designforge:** treat § 4 below as the **inventory of content slots**, NOT as verbatim copy. Designforge MUST re-fetch each source page and capture the copy **byte-exact** into `design/source-content-inventory.md`. Nothing in § 4 may be pasted into a Content Fragment as-is. This is sharper under Q-005's resolution (18:15Z entry, Decision 2): parity is asserted **exact-match**, so a summarised or lightly-reworded value in the inventory would cause a Sentinel failure that looks like a delivery defect but is really an extraction defect.

---

## 2. Caveat that changes how this artifact is read

**Neither reference image is a screenshot of a composed page.** Both are full-bleed editorial photographs with **no text, no navigation, no CTA, no logo, no header/footer chrome, and no UI overlay of any kind**.

The S9 field list (font sizes, split ratios, background hex, CTA colours, z-index/overlay effects) has **no observable value in these two files**. Rather than invent hex codes and type scales — which is precisely the failure S9 exists to prevent, in reverse — this artifact:

- deconstructs S2/S3 as **asset specifications** (§ 3): subject, crop, aspect, focal point, tonal range, alt text, intended content slot;
- deconstructs S1 as a **content-region inventory** (§ 4): what each region *is*, what fields it needs, whether it repeats;
- explicitly records visual attributes as **NOT OBSERVED** (§ 5) so no downstream agent treats a guess as a specification.

This is the correct emphasis for a **Pure Headless** run: the delivered contract is a JSON payload, not a rendered layout. No AEM presentation layer is a deliverable (see `technical-specifications.md § Architecture decision AD-1`).

---

## 3. Image asset deconstruction

### 3.1 `home-hero.png`

| Attribute | Value |
|---|---|
| Intrinsic dimensions | **1600 × 992 px** |
| Aspect ratio | **1.613 : 1** (≈ 8:5 / 16:10 landscape) |
| File size | 784 KB (PNG) |
| Section name (slot) | **Hero** — `hero.heroImage` asset reference |
| Layout intent | Full-bleed landscape hero image. No text is baked into the image, so a consumer may overlay type freely. |
| Split ratio | N/A — single full-frame photograph |
| Subject | A tradesman, ~40s, standing right-of-centre in three-quarter profile, looking down and to his left at a workbench. Olive/khaki cotton work jacket with chest pockets, collared shirt underneath, two-tone (khaki crown / olive brim) baseball cap, short grey-flecked beard. |
| Foreground | Dark timber workbench across the lower third, holding hand and power tools: an orange-and-black impact driver / drill, a second black driver body, drill bits, a wrench, sockets. Debris/shavings on the bench surface. |
| Background | Left: white service pickup truck, front three-quarter view (grille, hood, cab, mirror). Right: white box-truck / trailer body with visible wheel. Centre-left: low sun setting behind bare deciduous trees. |
| Lighting / tone | Golden-hour backlight. Warm amber–orange highlight core centre-left, strong falloff to deep near-black shadow at frame edges. Low-key, high contrast. Documentary/editorial, not studio. |
| Text elements | **NONE** — no headline, eyebrow, body, caption, or CTA label in the image. |
| CTA buttons | **NONE** |
| Icons / logos | **NONE** (a truck grille badge is present but is not a brand mark for this project) |
| Navigation | **NONE** |
| Overlay / z-index effects | **NONE** baked in |
| Focal point (for smart-crop guidance) | Approx. **58% from left, 40% from top** — the subject's head/shoulders. A centre crop will cut the subject; crop toward the right-of-centre. |
| Safe area for consumer-side type overlay | Left third (truck + sky) is the darkest, lowest-detail region — the natural place for overlaid copy if a consumer chooses to overlay. |
| Proposed DAM path | `/content/dam/headless-test/chisel/home-hero.png` |
| Proposed `dc:title` | `Skilled tradesman with tools at dusk beside a service truck` |
| Proposed alt text | `A tradesman in a work jacket and cap examining power tools on a workbench beside his service truck at sunset.` |

### 3.2 `home-movement.png`

| Attribute | Value |
|---|---|
| Intrinsic dimensions | **1080 × 1341 px** |
| Aspect ratio | **0.805 : 1** (≈ 4:5 portrait) |
| File size | 1,622 KB (PNG) |
| Section name (slot) | **Movement / Community** — `content-section.sectionImage` asset reference (see § 4.7) |
| Layout intent | Portrait editorial image. Its 4:5 portrait ratio makes it a **side-by-side** or **inset** image, not a full-bleed banner — a consumer pairing it with copy should place it in a column, not across the viewport. This is the one genuinely layout-relevant fact derivable from the file. |
| Split ratio | N/A within the image; but portrait ratio implies a ~50/50 or 40/60 text-beside-image treatment downstream. |
| Subject | Two men working at an exterior residential electrical panel. Foreground right: older man, thick grey hair, faded light-blue denim work shirt, tan leather tool belt at hip, right index finger pointing at the breaker bank. Behind and to his left: younger man, short brown hair, grey-blue work shirt, holding the panel door open with his raised left hand, watching the point being made. |
| Left third | Cream/beige stucco exterior wall; an open grey metal breaker panel with visible breakers, wiring and a printed circuit-directory label on the inside of the door; a round glass-domed electric meter mounted above the panel at top-left. |
| Right third / background | Softly defocused greenery — tree canopy, shrubs, a fence line, lawn. |
| Bottom | Garden foliage and a hose bib / spigot at the base of the wall. |
| Lighting / tone | Flat, natural, overcast-to-open-shade daylight. Cool-neutral white balance, muted saturation, gentle film grain. Shallow depth of field isolating the two figures. |
| Text elements | **NONE** in the sense of authored copy. Small incidental real-world text exists on the panel's circuit-directory label — **illegible and not content**. Must not be treated as copy. |
| CTA buttons | **NONE** |
| Icons / logos | **NONE** |
| Navigation | **NONE** |
| Overlay / z-index effects | **NONE** baked in |
| Focal point | Approx. **48% from left, 42% from top** — the older man's face / pointing hand. |
| Semantic read | Mentorship / apprenticeship / knowledge transfer between generations of tradespeople. This maps directly to the reference site's **Community** narrative (trade schools, apprenticeships, "apprentice to owner" pathway) and to the "movement" filename. |
| Proposed DAM path | `/content/dam/headless-test/chisel/home-movement.png` |
| Proposed `dc:title` | `Experienced electrician mentoring an apprentice at a residential panel` |
| Proposed alt text | `An experienced electrician pointing at breakers in an open electrical panel while a younger apprentice holds the panel door and watches.` |

### 3.3 Asset-set observations that affect the content model

1. **Both images are people-first documentary photography**, not product screenshots, diagrams or UI. Any CF model asset-reference field must therefore be constrained to image assets and must carry an **alt-text obligation** — accessibility for a headless payload means the alt text is *in the payload*, because there is no AEM-rendered `<img>` to fix later.
2. **Two different aspect ratios (1.61 landscape, 0.81 portrait)** means the model cannot assume a single crop. Do **not** bake an aspect ratio into the model; expose `width`/`height` from the GraphQL `ImageRef` so the consumer can lay out responsively.
3. **Only 2 images exist for 4 reference pages.** Every other image slot in the content model must be **optional**. Composer must not fabricate placeholder assets, and must not author a `dam:Asset` node without a real binary (`composer.md § C11`).
4. **PNG, not SVG** — so the GraphQL `Reference` union resolves as `ImageRef`. Queries must still select `... on ImageRef { _path width height }`; the `DocumentRef` branch should also be selected defensively per the CF/GraphQL skill's SVG gotcha, in case an SVG logo is added later.

---

## 4. Content-region inventory (from the live reference, S1)

Ordered as encountered. **`repeats?` is the single most important column** — it determines whether a region becomes a scalar field, a fragment, or a multi-valued fragment reference.

> **Reminder:** copy shown below is *summary-level, NOT verbatim-verified*. Designforge must re-extract byte-exact into `design/source-content-inventory.md`.

### 4.1 Region — Site chrome (header / footer)

| Attribute | Value |
|---|---|
| Observed | Primary navigation resolves to three destinations: `/capital`, `/platform`, `/community`. Footer structure was **not retrievable** from the fetch. |
| Repeats? | Nav items repeat (3 observed) |
| Layout intent | **NOT OBSERVED** |
| Headless treatment | **Out of scope for this run.** Navigation and footer are consumer-shell concerns, not content-fragment concerns; there is no AEM-rendered chrome in a pure-headless delivery. Excluded deliberately — see `requirements.yaml § out_of_scope`. |

### 4.2 Region — Hero / opening statement (`/` home)

| Attribute | Value |
|---|---|
| Content | A single opening positioning statement describing three modes of backing skilled-trades businesses: investing in / acquiring them, giving them free AI-native operating software, and reinvesting in trade schools and apprenticeships. |
| Fields needed | headline/title, summary (rich text), optional eyebrow, optional hero image, optional single CTA (label + path) |
| Repeats? | **No** — one per page |
| Imagery | S2 (`home-hero.png`) is the natural fill for this slot |
| Model | `hero` (§ `technical-specifications.md § Content strategy`) |
| Layout intent | **NOT OBSERVED** |

### 4.3 Region — Stat / metric callouts

| Attribute | Value |
|---|---|
| Content (home) | Three metrics: a `$0` price point contrasted against `$200–500+ per tech / month`; a `$62,850` annual saving contrasted against a comparable subscription stack; a `< 5 min` figure with `80%+ of back-office work runs itself`. |
| Content (`/platform`) | Six further metrics: `$0`, `10` (AI agents), `97.98%` (blended take-home rate), `~30 min` (instant deposits), `+20–30%` (higher close rates with BNPL), `0.8%` (ACH pricing). |
| Fields needed | value (the big figure), label (what it measures), detail/comparison (the contrast line) |
| Repeats? | **Yes — heavily (9 observed across 2 pages).** This is the clearest case for its own fragment model + a multi-valued reference. |
| Imagery | None |
| Model | `stat` |
| Layout intent | **NOT OBSERVED** (a 3-up row is a reasonable inference from the grouping of three on home, but it is an inference — recorded here as inference, not spec) |

### 4.4 Region — Three-pillar / linked-offering cards

| Attribute | Value |
|---|---|
| Content (home) | Three linked categories: **Capital** → `/capital`, **Technology** → `/platform`, **Community** → `/community`, each with a one-line description. |
| Same shape recurs as | `/capital`: "Three ways to partner" (full partnership / majority partnership / growth investment); "The approach" (3 principles); "What Chisel offers owners" (6 benefit statements). `/community`: "The commitments" (trade schools / scholarships / career pathways). `/platform`: "Products by trade" (Chisel Tide / Ridge / Sentry); "How it is different" (4 points); "What the AI produces" (4 modules); "The stack" (5 modules). |
| Fields needed | title, description (rich text), optional link label + link path, optional image, category (to distinguish which group a pillar belongs to) |
| Repeats? | **Yes — pervasively.** This single shape covers ~30 observed items across 4 pages. |
| Imagery | None observed |
| Model | `pillar` — deliberately one model, reused across all these groups via a `category` enumeration, rather than one model per group (see `technical-specifications.md`, S8-analogous reasoning) |
| Layout intent | **NOT OBSERVED** |

### 4.5 Region — Narrative content sections

| Attribute | Value |
|---|---|
| Content (home) | "What Chisel is" (operator-led company serving HVAC, plumbing, electrical, roofing, pool service, pest control, landscaping, general contracting); "Why the software is free" (revenue from payments and finance rather than licensing); "The category: Continuous Software" ("No Forms" operating principle, AI-native functionality). |
| Same shape recurs as | `/platform`: "What it is", "The Virtual Back Office" intro. `/capital`: "Why the technology matters to the deal". `/community`: "How the investment actually works", "BOLT" (Balanced Open-License Terms). |
| Fields needed | heading, body (rich text — multi-paragraph, may contain inline links and lists), optional anchor id, optional section image |
| Repeats? | **Yes (9+ observed)** |
| Imagery | S3 (`home-movement.png`) fits the Community narrative section |
| Model | `content-section` |
| Layout intent | **NOT OBSERVED** |

### 4.6 Region — Role / agent roster (`/platform`, "The Virtual Back Office")

| Attribute | Value |
|---|---|
| Content | Ten named roles, each with a short responsibility line: COO ("Strategic oversight · the owner's interface"), Dispatcher ("Routes & scheduling"), Biller ("Invoicing & collections"), Inventory Manager ("Stock & reorder"), CSR ("Customer communications"), Analyst ("P&L & KPIs"), Marketing ("Reviews & leads"), HR Coordinator ("Recruit, hire, retain"), Field Assistant ("On-site AI guide"), Compliance ("Logs, safety, regulations"). |
| Repeats? | **Yes — 10 items, the largest single repeating set on the site.** |
| Fields needed | title + short description — **structurally identical to § 4.4** |
| Model | **`pillar`** with `category = "role"`. Deliberately **not** a new `ai-agent-role` model: an 11th model whose field set is `{title, description}` would be model-set fragmentation for no authoring gain. This is the content-model analogue of `strategist.md § S8`. |
| Layout intent | **NOT OBSERVED** |

### 4.7 Region — Operator films (`/community`)

| Attribute | Value |
|---|---|
| Content | Two documentary shorts, each with title, industry, location and duration: "Paradise Pools" (4 min), "Vine Homes" (3 min). |
| Repeats? | Yes (2 observed) |
| Fields needed | title + a short metadata line (industry · location · duration) |
| Model | **`pillar`** with `category = "film"` and the metadata line in `description`. **Not** a dedicated `film` model — a two-item set does not justify a model, and a dedicated `duration`/`industry`/`location` field triple is over-modelling for this run. Flagged as a **deliberate simplification** in `technical-specifications.md`; revisit if a real film catalogue is added. |
| Layout intent | **NOT OBSERVED** |

### 4.8 Region — Page-level metadata (all 4 pages)

| Attribute | Value |
|---|---|
| Content | Each page exposes a canonical URL, a publisher ("Chisel Industries"), a page title, a one-sentence tagline/description, and a "Last updated" date (`2026-07-01`, `2026-07-03` observed). |
| Repeats? | One set per page |
| Fields needed | slug, seoTitle, seoDescription, plus the composition of the regions above |
| Model | `landing-page` (the aggregator) |
| Note | The tagline doubles as the hero summary on `/capital` and `/community`. Designforge must decide in `design/content-fragment-models.md` whether tagline maps to `landing-page.seoDescription`, to `hero.summary`, or to both — and record it as a mapping row. |

---

## 5. Explicitly NOT OBSERVED — do not treat any of these as specified

No downstream agent may infer, invent, or "reasonably assume" the following. If a visual consumer is later built, these must be re-derived from a real screenshot or Figma frame and this artifact re-issued.

| S9 attribute | Status |
|---|---|
| Background colours / hex values | **NOT OBSERVED** — no page screenshot was supplied |
| Font families, sizes, weights, line heights | **NOT OBSERVED** |
| Text colours and alignment | **NOT OBSERVED** |
| CTA button fill, text colour, border-radius, size | **NOT OBSERVED** (CTA *presence* is only inferred from the three `/capital`, `/platform`, `/community` links) |
| Grid / column counts, gutters, container max-width | **NOT OBSERVED** |
| Split ratios per section | **NOT OBSERVED** (only S3's 4:5 portrait ratio is a real constraint) |
| Breakpoint behaviour, stacking order | **NOT OBSERVED** |
| Header-over-hero overlay, sticky behaviour, z-index effects | **NOT OBSERVED** |
| Icon set, logo lockup, logo scale | **NOT OBSERVED** |
| Footer column structure, legal text, social links | **NOT RETRIEVABLE** from the fetch |
| Animation / scroll behaviour | **NOT OBSERVED** |

**Consequence for the work breakdown:** the visual layer is unobserved *and* undelivered. Per `technical-specifications.md § AD-1` — **confirmed in the `DECISIONS.md` entry timestamped `2026-08-25T18:15Z`, Decision 1** — this run has **no rendered surface at all**: no consumer app and no AEM page. Note the direction of the reasoning, which is worth keeping straight: the visual attributes are unobserved **because no page screenshot was supplied**, independently of AD-1. That gap is a fact about the intake, not a consequence of the architecture choice. **Two independent reasons therefore support each visual-track N/A** — no reference layout to diff against, and no rendered output to diff. Therefore:

- **`blockwright` is not scheduled** — named explicitly in the 18:15Z entry, Decision 1. There is no component, HTL, SCSS, clientlib or design token to author — and nothing truthful to capture even if there were, per the NOT OBSERVED table above.
- **No visual-diff obligation exists**, and **Sentinel must not run a Tier-A visual diff, a browser automation, a page fetch, a Core Web Vitals measurement or a page-level a11y scan.** Each of these is recorded as a **per-track N/A carrying its own AD-1-citing reason** in `technical-specifications.md § 7.1` — the 18:15Z entry requires per-track justification and forbids a blanket track-level N/A.
- **What is NOT waived by the N/A, and must not be swept away with it** (all three named in the 18:15Z entry): (a) `design/reference-assets.md` must still record the reference URL **plus both PNG paths** — WB-02A; (b) **both DAM assets remain in scope** and must be verified resolvable via GraphQL/DAM delivery, § P7 stays active — WB-10, WB-16; (c) the `ui.tests` Cypress→Playwright harness obligation is **N/A under AD-1** and must be *recorded as such*, not left unchecked — WB-14.
- **Sentinel's acceptance criteria are entirely payload-shaped:** JSON contract conformance, **exact-match** item-by-item content parity against `design/source-content-inventory.md` in both directions, `_path` query isolation, `ImageRef` dimensions plus asset delivery-resolvability, alt-text presence *in the payload*, cache headers, latency and payload size. The **Publish-tier content-parity track is this run's core acceptance evidence**; authoring-provision cases run against **Author**. Sentinel is **non-deferrable** — AD-1 removes tracks from its scope, not the stage.

The durable value of this artifact in a headless run is therefore § 3 (asset specs — alt text, focal points, dimensions, intended slot) and § 4 (the content-region inventory that shapes the CF models), **not** the layout attributes in § 5. § 1 and § 3 are also the source for WB-02A's provenance record.

---

## 6. Traceability

| Region / asset | Model | Persisted query | Requirement |
|---|---|---|---|
| § 3.1 `home-hero.png` | `hero.heroImage` | `hero-by-path`, `landing-page-by-path` | US-004, US-005 — also WB-02A (provenance record) and WB-16 (delivery resolvability) |
| § 3.2 `home-movement.png` | `content-section.sectionImage` | `landing-page-by-path` | US-004, US-005 — also WB-02A (provenance record) and WB-16 (delivery resolvability) |
| § 4.2 Hero | `hero` | `hero-by-path`, `landing-page-by-path` | US-001, US-003 |
| § 4.3 Stats | `stat` | `stats-list`, `landing-page-by-path` | US-001, US-003 |
| § 4.4 Pillars | `pillar` (`category` = `capital`/`technology`/`community`/`offering`/`approach`/`product`/`differentiator`) | `pillars-list`, `landing-page-by-path` | US-001, US-003 |
| § 4.5 Narrative sections | `content-section` | `landing-page-by-path` | US-001, US-003 |
| § 4.6 Agent roster | `pillar` (`category = role`) | `pillars-list` | US-001, US-003 |
| § 4.7 Operator films | `pillar` (`category = film`) | `pillars-list` | US-001, US-003 |
| § 4.8 Page metadata | `landing-page` | `landing-page-by-path` | US-001, US-005, US-011 |
| § 1.1 Content role | — | all four queries | US-003, US-010, US-014 — **Q-005 RESOLVED to verbatim extraction** (18:15Z entry, Decision 2); parity asserted exact-match at WB-16 |
| § 5 Unobserved visuals | — | — | **No requirement.** No rendered surface in scope (AD-1, 18:15Z Decision 1); `blockwright` not scheduled. Each affected test track carries a per-track N/A reason in `technical-specifications.md § 7.1`. Re-derive from a real screenshot or Figma frame, and re-issue this artifact, before any future visual-consumer run. |
