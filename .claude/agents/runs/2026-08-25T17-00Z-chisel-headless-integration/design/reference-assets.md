# Reference Assets Manifest — Chisel Headless Integration (WB-02A)

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Design (Designforge)
- **Status:** REQUIRED, NOT N/A. Even though every visual test track (Tier-A diff, browser automation, page-level a11y, CWV) is N/A under AD-1 (`DECISIONS.md` `2026-08-25T18:15Z` entry, Decision 1, consequence (i)), this manifest itself is explicitly **not** waived by that N/A — provenance of the supplied reference set must still be recorded.
- **Sources declared:** `sources: present` (3 sources — 1 URL, 2 image fixtures). This is NOT a `sources: none` run.

---

## 1. Source S1 — reference URL

| Field | Value |
|---|---|
| URL | `https://www.chiselindustries.com/` (+ `/capital`, `/platform`, `/community`) |
| Type | Live web page |
| Role (per `reference-deconstruction.md § 1`) | `content-source-of-truth` — confirmed per Q-005 resolution, `DECISIONS.md 2026-08-25T18:15Z`, Decision 2 |
| Match strictness | **EXACT** for text content (verbatim extraction, byte-exact per the settled decision) — quoting the intake's own scoping words is not possible here since the intake said "reference ONLY / no DOM-CSS transplant"; that phrase was resolved to mean markup-only restriction, not a content-fidelity downgrade (see `reference-deconstruction.md § 1.1`). **NEVER** for markup/DOM/CSS — HTML, class names, scripts and layout are never transplanted, confirmed by the same resolution. |
| Source of truth for | Every field in the `hero`, `stat`, `pillar`, `content-section`, and `landing-page` CF Models — see `design/source-content-inventory.md` for the full 81-item extraction and `design/content-fragment-models.md` for the field-level content-mapping rows. |
| Extraction method | `WebFetch` tool (HTML→markdown→LLM-mediated text extraction) — see `design/source-content-inventory.md § 0` for the explicit fidelity disclosure. No raw-HTTP/byte-level fetch tool was available in this session. |

---

## 2. Source S2 — `home-hero.png`

| Field | Value |
|---|---|
| Absolute source path | `C:\Users\2400091\Downloads\assets-headless\home-hero.png` |
| Type | Photographic asset — **not** a page screenshot |
| Role (per `reference-deconstruction.md § 1`) | `visual-reference-only` + `dam-seed` |
| Intrinsic dimensions | 1600 × 992 px (aspect ratio 1.613:1, landscape) — per `reference-deconstruction.md § 3.1` |
| File size | 784 KB (PNG) — per `reference-deconstruction.md § 3.1` |
| Match strictness | **N/A for layout/visual fidelity** — there is no rendered surface to diff against under AD-1, and the intake's own scoping is "visual/content-structure reference ONLY", but critically **this image carries no text, CTA, nav, or chrome** (`reference-deconstruction.md § 3.1`: "Text elements: NONE"), so there is no copy obligation for this source either. Its only obligation in this run is **binary-provenance**: the file that ships as the DAM asset binary must be this exact file, unaltered (no re-crop, no re-compression, no re-encode) unless a deviation is explicitly logged. |
| Intended DAM target path | `/content/dam/headless-test/chisel/home-hero.png` |
| Intended content slot | `hero.heroImage` (asset-reference field on the `hero` CF Model) — fills the home page's hero fragment. Also queried via `hero-by-path` and `landing-page-by-path` persisted queries. |
| Proposed `dc:title` (per `reference-deconstruction.md § 3.1`, carried forward as the design recommendation, not independently re-derived here) | `Skilled tradesman with tools at dusk beside a service truck` |
| Proposed alt text (→ `hero.heroImageAlt`) | `A tradesman in a work jacket and cap examining power tools on a workbench beside his service truck at sunset.` |
| Visual attributes NOT carried forward | Colours, focal-point crop guidance, and safe-area-for-overlay notes in `reference-deconstruction.md § 3.1` are recorded there for a future visual-consumer run; they impose **no obligation** on this pure-headless run (AD-1) and are not repeated here as if they were requirements. |

---

## 3. Source S3 — `home-movement.png`

| Field | Value |
|---|---|
| Absolute source path | `C:\Users\2400091\Downloads\assets-headless\home-movement.png` |
| Type | Photographic asset — **not** a page screenshot |
| Role | `visual-reference-only` + `dam-seed` |
| Intrinsic dimensions | 1080 × 1341 px (aspect ratio 0.805:1, portrait ≈4:5) — per `reference-deconstruction.md § 3.2` |
| File size | 1,622 KB (PNG) — per `reference-deconstruction.md § 3.2` |
| Match strictness | **N/A for layout/visual fidelity**, same reasoning as S2. This image likewise carries no authored text (`reference-deconstruction.md § 3.2`: "Text elements: NONE in the sense of authored copy" — the incidental illegible circuit-directory label is explicitly flagged as not-content). Obligation is binary-provenance only: ship this exact file unaltered. |
| Intended DAM target path | `/content/dam/headless-test/chisel/home-movement.png` |
| Intended content slot | `content-section.sectionImage` (asset-reference field on the `content-section` CF Model) — the design recommendation (per `reference-deconstruction.md § 3.2`) is to pair it with the home page's Community-narrative content-section (semantic match: mentorship/apprenticeship imagery ↔ `reference-deconstruction.md § 4.5`/§4.7 community narrative, and the "movement" filename). **This is a design recommendation, not an extracted fact** — Composer chooses the specific `content-section` fragment instance it attaches to; it is not required to be the Community section specifically, but no other section is a better semantic fit and no alternative should be chosen without a documented reason. |
| Proposed `dc:title` | `Experienced electrician mentoring an apprentice at a residential panel` |
| Proposed alt text (→ `content-section.sectionImageAlt`) | `An experienced electrician pointing at breakers in an open electrical panel while a younger apprentice holds the panel door and watches.` |
| Visual attributes NOT carried forward | Same caveat as S2 — focal point, safe-area and semantic-read notes in `reference-deconstruction.md § 3.2` are recorded for a future visual-consumer run and are not requirements of this run. |

---

## 4. What this manifest deliberately does NOT contain

Per `reference-deconstruction.md § 5` (colours, type scale, grid, split ratios, breakpoints — every visual attribute is recorded there as **NOT OBSERVED**) and AD-1 (no rendered surface), this manifest does not invent, restate as a requirement, or upgrade to "specified" any visual attribute beyond the two hard facts that ARE directly observable from the image files themselves: intrinsic pixel dimensions and file size (both stated above, both re-confirmable by any agent that opens the files). Anything beyond those two facts (focal point %, safe-area recommendation, tonal/lighting description) is Plan-stage **interpretive** commentary carried by reference only, not a Design-stage specification.

---

## 5. Downstream consumers

- **Composer (WB-10):** seeds the two `dam:Asset` nodes with real binaries at the target paths above, with `dc:title` + alt text as proposed (or a documented alternative). Must not create a binary-less `dam:Asset` node (`composer.md § C11`).
- **Configsmith (WB-06):** the `filter.xml` root `/content/dam/headless-test/chisel` (new) is what allows these two binaries to actually ship in the built package.
- **Sentinel (WB-16):** asserts each asset's GraphQL `ImageRef` returns non-null `_path`/`width`/`height` matching the dimensions recorded here (1600×992, 1080×1341), and separately asserts each `_path` is delivery-resolvable (HTTP 200 + image content-type, unauthenticated) on the real environment. § P7 stays active for this check even though visual-diff tracks are N/A.

---

## 6. Gate self-check

- Both PNG absolute source paths are listed: **yes** (§ 2, § 3).
- Reference URL is listed: **yes** (§ 1).
- No invented visual attribute — colours/type-scale/grid remain NOT OBSERVED: **confirmed** (§ 4 explicitly declines to invent any of these).
- `sources: none` was NOT used, correctly, since 3 real sources exist.
