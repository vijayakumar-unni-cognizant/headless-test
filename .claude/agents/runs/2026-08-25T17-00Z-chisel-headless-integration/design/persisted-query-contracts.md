# Persisted GraphQL Query Contracts — Chisel Headless Integration (WB-04)

- **Run ID:** `2026-08-25T17-00Z-chisel-headless-integration`
- **Stage:** Design (Designforge)
- **Audience:** P2 (Consumer Front-End Developer) — this document is written so a consumer team can build against AEM without reading AEM internals (US-014). Also consumed by `composer` (WB-12, authors the `persistentQueries` binary nodes from the GraphQL text below verbatim) and `sentinel` (WB-16, executes each query against the real environment and diffs the response).
- **Config name:** `headless-test` (the last segment of `/conf/headless-test`).
- **Field-type / naming source of truth:** `.claude/skills/create-content-fragment-graphql/references/persisted-queries.md` and `graphql-endpoint.md`, read as design-conventions reference.

---

## 0. Rules every query in this contract follows

1. **`byPath` uses `_path: String!`**, never `path: ID!`. Declare `query X($path: String!)`, call `<model>ByPath(_path: $path)`.
2. **Reference-union fields are always selected via inline fragments**: `... on ImageRef { _path width height }` / `... on DocumentRef { _path }` for asset references; `... on <ModelName>Model { ... }` for fragment references. The object type carries the `Model` suffix (`HeroModel`, not `Hero`); the query FIELD does not (`heroByPath`, not `heroModelByPath`).
3. **Rich text is always selected as `{ html }`** (optionally also `{ plaintext }`), never as a bare scalar.
4. **Matrix parameters use `;name=value`**, never `?name=value`, and path values are passed raw — **not** URL-encoded (no `%2F` for `/`).
5. **No unfiltered `<model>List` is shipped.** `stats-list` and `pillars-list` are both constrained with a `STARTS_WITH` path filter against `/content/dam/headless-test/chisel` (US-011). `landing-page-by-path` and `hero-by-path` are inherently scoped by resolving a specific path and then only traversing fragment references reachable from it.
6. **`DocumentRef` is selected alongside `ImageRef`** on every asset-reference field, defensively, in case a non-PNG (e.g. SVG) asset is added later — SVGs resolve as `DocumentRef`, not `ImageRef`, and a query missing that branch would silently return a null image block for an SVG.

---

## 1. `landing-page-by-path` — PRIMARY query, primary acceptance surface

The single call that returns an entire page: hero + stats + sections + pillars, reached by following the `landing-page` fragment's own reference fields (AD-2). This is the query Sentinel's WB-16 content-parity check exercises most heavily.

### GraphQL text

```graphql
query LandingPageByPath($path: String!) {
  landingPageByPath(_path: $path) {
    item {
      slug
      seoTitle
      seoDescription { html }
      hero {
        ... on HeroModel {
          title
          eyebrow
          summary { html }
          heroImage {
            ... on ImageRef { _path width height }
            ... on DocumentRef { _path }
          }
          heroImageAlt
          ctaLabel
          ctaPath
          _path
        }
      }
      stats {
        ... on StatModel {
          value
          label
          detail
          _path
        }
      }
      sections {
        ... on ContentSectionModel {
          heading
          body { html }
          anchorId
          sectionImage {
            ... on ImageRef { _path width height }
            ... on DocumentRef { _path }
          }
          sectionImageAlt
          _path
        }
      }
      pillars {
        ... on PillarModel {
          title
          description { html }
          category
          linkLabel
          linkPath
          image {
            ... on ImageRef { _path width height }
            ... on DocumentRef { _path }
          }
          imageAlt
          _path
        }
      }
      _path
    }
  }
}
```

### Execution URL

```
GET /graphql/execute.json/headless-test/landing-page-by-path;path=/content/dam/headless-test/chisel/fragments/pages/home
```

Matrix parameter `path` takes the raw fragment path (no URL-encoding of the `/` characters).

### Isolation scope

**Inherently scoped.** `landingPageByPath` resolves exactly one fragment by its own JCR path, then reaches every other value (`hero`, `stats`, `sections`, `pillars`) only by following that fragment's own reference fields. It cannot return another feature's content because it never queries by type across the whole repository — there is no `<model>List` call anywhere in this query.

### Example JSON response (home page — VERBATIM source strings, CORRECTED per WB-02 r02)

**This example was rewritten in the WB-02 correction pass. Every copy string below now traces to a raw-HTML-confirmed row in `source-content-inventory.md` r02 — the r01 version of this example embedded several fabricated strings (`DECISIONS.md 2026-08-26T09:00Z`) and must not be used as an authoring reference.**

```json
{
  "data": {
    "landingPageByPath": {
      "item": {
        "slug": "home",
        "seoTitle": "Chisel — Sharper tools for the trades. Built in the trades.",
        "seoDescription": {
          "html": "<p>Free, AI-native operating systems for the skilled trades that run the business for the owner — instead of making the owner run the software.</p>"
        },
        "hero": {
          "title": "Sharper tools for the trades.",
          "eyebrow": "Built in the trades, for the trades",
          "summary": {
            "html": "<p>We invest in trades businesses, build the free software that runs them, and reinvest in the people behind the work.</p>"
          },
          "heroImage": {
            "_path": "/content/dam/headless-test/chisel/home-hero.png",
            "width": 1600,
            "height": 992
          },
          "heroImageAlt": "A tradesman in a work jacket and cap examining power tools on a workbench beside his service truck at sunset.",
          "ctaLabel": null,
          "ctaPath": null,
          "_path": "/content/dam/headless-test/chisel/fragments/heroes/home-hero"
        },
        "stats": [
          { "value": "$0", "label": "Free, forever", "detail": "vs. $200–500+ per tech / month", "_path": "/content/dam/headless-test/chisel/fragments/stats/free-pricing" },
          { "value": "$62,850", "label": "Saved a year", "detail": "vs. a comparable subscription stack", "_path": "/content/dam/headless-test/chisel/fragments/stats/annual-savings" },
          { "value": "< 5 min", "label": "A day in the software", "detail": "80%+ of back-office work runs itself", "_path": "/content/dam/headless-test/chisel/fragments/stats/back-office-time" }
        ],
        "sections": [
          { "heading": "We invest in trades businesses.", "body": { "html": "<p>Chisel partners with owners for the long term — to help you grow, or to give a life's work a permanent home. No quick flips.</p>" }, "anchorId": null, "sectionImage": null, "sectionImageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/sections/invest-in-businesses" },
          { "heading": "Software that runs the business for you.", "body": { "html": "<p>Chisel answers the calls, writes the invoices, and chases the payments — then hands you the day in a 60-second briefing. No forms. No subscriptions.</p>" }, "anchorId": null, "sectionImage": null, "sectionImageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/sections/runs-the-business" },
          { "heading": "Investing in the people of the trades.", "body": { "html": "<p>The trades built the world we live in. Chisel reinvests in the people who keep it standing.</p>" }, "anchorId": null, "sectionImage": null, "sectionImageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/sections/people-of-the-trades" }
        ],
        "pillars": [
          { "title": "Capital", "description": { "html": "<p>We invest in trades businesses — to scale up, or carry a legacy forward.</p>" }, "category": "capital", "linkLabel": null, "linkPath": "/capital", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/capital" },
          { "title": "Technology", "description": { "html": "<p>Free software that runs the business for you. No forms.</p>" }, "category": "technology", "linkLabel": null, "linkPath": "/platform", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/technology" },
          { "title": "Community", "description": { "html": "<p>Backing trade schools, scholarships, and the next generation.</p>" }, "category": "community", "linkLabel": null, "linkPath": "/community", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/community" }
        ],
        "_path": "/content/dam/headless-test/chisel/fragments/pages/home"
      }
    }
  }
}
```

**Note on this example response (updated for WB-02 r02):** the copy strings above are reproduced verbatim from the corrected `design/source-content-inventory.md` (SC-HOME-001, SC-HOME-001b, SC-HOME-002, SC-HOME-003, SC-HOME-004..006, SC-HOME-007..009, SC-HOME-010..012 as corrected). `seoDescription` uses SC-HOME-003 (the JSON-LD `WebSite.description` candidate) — SC-HOME-003b (`og:description`) is the other real candidate per inventory ambiguity A9; Composer must record which one is chosen before authoring, this example shows one valid choice, not the only one. `hero.eyebrow` is now populated (`"Built in the trades, for the trades"`) — it is CONFIRMED on the home page, correcting r01's `null`. `hero.ctaLabel`/`ctaPath` remain `null` for the home hero specifically — this is the one hero on the 4 pages genuinely confirmed to have no distinct hero-level CTA (capital/platform/community heroes DO have one; see `content-fragment-models.md § 1.1`). `null` on `anchorId`/`sectionImage`/`sectionImageAlt`/`linkLabel` reflects fields the source genuinely has no value for. The rich-text `html` wrapping (`<p>...</p>`) is Composer's/AEM's rendering of the authored plain text into the `MultiFormatString.html` sub-field — Sentinel's exact-match diff permits only whitespace normalisation here, not wording changes.

---

## 2. `hero-by-path`

Doubles as the `ImageRef` dimension smoke test (`width`/`height` present and correct for the one hero that carries an image).

### GraphQL text

```graphql
query HeroByPath($path: String!) {
  heroByPath(_path: $path) {
    item {
      title
      eyebrow
      summary { html }
      heroImage {
        ... on ImageRef { _path width height }
        ... on DocumentRef { _path }
      }
      heroImageAlt
      ctaLabel
      ctaPath
      _path
    }
  }
}
```

### Execution URL

```
GET /graphql/execute.json/headless-test/hero-by-path;path=/content/dam/headless-test/chisel/fragments/heroes/home-hero
```

### Isolation scope

Inherently scoped — resolves one fragment by path; no list traversal.

### Example JSON response (CORRECTED per WB-02 r02 — see note below)

```json
{
  "data": {
    "heroByPath": {
      "item": {
        "title": "Sharper tools for the trades.",
        "eyebrow": "Built in the trades, for the trades",
        "summary": {
          "html": "<p>We invest in trades businesses, build the free software that runs them, and reinvest in the people behind the work.</p>"
        },
        "heroImage": {
          "_path": "/content/dam/headless-test/chisel/home-hero.png",
          "width": 1600,
          "height": 992
        },
        "heroImageAlt": "A tradesman in a work jacket and cap examining power tools on a workbench beside his service truck at sunset.",
        "ctaLabel": null,
        "ctaPath": null,
        "_path": "/content/dam/headless-test/chisel/fragments/heroes/home-hero"
      }
    }
  }
}
```

---

## 3. `stats-list`

### GraphQL text

```graphql
query StatsList {
  statList(
    filter: {
      _path: {
        _expressions: [
          { value: "/content/dam/headless-test/chisel", _operator: STARTS_WITH }
        ]
      }
    }
  ) {
    items {
      value
      label
      detail
      _path
    }
  }
}
```

### Execution URL

```
GET /graphql/execute.json/headless-test/stats-list
```

No matrix parameters — the path filter is baked into the persisted query text itself, not passed at call time (there is nothing per-caller to vary; every caller wants the same scoped set).

### Isolation scope

**Path-filtered.** `statList` is a `<model>List` call and would return every `stat` fragment in the entire repository if unfiltered (US-011 forbids this). The `STARTS_WITH /content/dam/headless-test/chisel` filter constrains it to this run's own namespaced content root.

### Example JSON response (verbatim — home-page 3 stats shown; **CORRECTED per WB-02 r02:** `/platform` supplies exactly 4 additional real stats, not 6 — `source-content-inventory.md § 4` confirms `SC-PLAT-003`/`SC-PLAT-004` have no source and must not be authored)

```json
{
  "data": {
    "statList": {
      "items": [
        { "value": "$0", "label": "Free, forever", "detail": "vs. $200–500+ per tech / month", "_path": "/content/dam/headless-test/chisel/fragments/stats/free-pricing" },
        { "value": "$62,850", "label": "Saved a year", "detail": "vs. a comparable subscription stack", "_path": "/content/dam/headless-test/chisel/fragments/stats/annual-savings" },
        { "value": "< 5 min", "label": "A day in the software", "detail": "80%+ of back-office work runs itself", "_path": "/content/dam/headless-test/chisel/fragments/stats/back-office-time" }
      ]
    }
  }
}
```

---

## 4. `pillars-list`

A consumer groups the result by `category` client-side to reconstruct each of the 8 reference groups (AD-3).

### GraphQL text

```graphql
query PillarsList {
  pillarList(
    filter: {
      _path: {
        _expressions: [
          { value: "/content/dam/headless-test/chisel", _operator: STARTS_WITH }
        ]
      }
    }
  ) {
    items {
      title
      description { html }
      category
      linkLabel
      linkPath
      image {
        ... on ImageRef { _path width height }
        ... on DocumentRef { _path }
      }
      imageAlt
      _path
    }
  }
}
```

### Execution URL

```
GET /graphql/execute.json/headless-test/pillars-list
```

### Isolation scope

**Path-filtered**, same reasoning as `stats-list`. `pillarList` is a shared-model list — the `pillar` model is reused across 8 distinct reference groups (AD-3), so path-scoping is what prevents an unrelated future feature's `pillar` fragments (if any are ever authored outside `chisel/`) from leaking into this run's response.

### Example JSON response (verbatim — home-page 3 pillars shown; more categories present once Composer authors beyond the minimum bar)

```json
{
  "data": {
    "pillarList": {
      "items": [
        { "title": "Capital", "description": { "html": "<p>We invest in trades businesses — to scale up, or carry a legacy forward.</p>" }, "category": "capital", "linkLabel": null, "linkPath": "/capital", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/capital" },
        { "title": "Technology", "description": { "html": "<p>Free software that runs the business for you. No forms.</p>" }, "category": "technology", "linkLabel": null, "linkPath": "/platform", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/technology" },
        { "title": "Community", "description": { "html": "<p>Backing trade schools, scholarships, and the next generation.</p>" }, "category": "community", "linkLabel": null, "linkPath": "/community", "image": null, "imageAlt": null, "_path": "/content/dam/headless-test/chisel/fragments/pillars/community" }
      ]
    }
  }
}
```

---

## 5. Schema-naming rules the consumer will hit (US-014)

| Rule | Detail |
|---|---|
| Object type | `<ModelName>Model` — PascalCase model name + `Model` suffix. `hero` → `HeroModel`; `content-section` → `ContentSectionModel`; `landing-page` → `LandingPageModel`. |
| Query fields | `<modelName>List` / `<modelName>ByPath` / `<modelName>ById` — camelCase, **no** `Model` in the field name. |
| `byPath` argument | `_path: String!` (never `path: ID!`). |
| Reference fields | Resolve to the `Reference` union — always require inline fragments: `... on ImageRef { _path width height }` for asset references, `... on <ModelName>Model { ... }` for fragment references. |
| Rich text | `text-multi` fields resolve to `MultiFormatString` — query `{ html }` and/or `{ plaintext }`, never as a bare `String`. |
| Every fragment type | Also exposes `_path` (usable as an id), `_metadata`, `_variations`, whether selected or not. |

---

## 6. Model-change compatibility rules (US-014)

| Change | Consumer impact | Safe? |
|---|---|---|
| Add a new optional field to any of the 5 models | New field appears in the schema; existing persisted queries continue to work unchanged | Safe |
| Rename a field | The old field name disappears from the schema; every persisted query selecting it breaks with a validation error | **Breaking** |
| Delete a field | Data is retained on existing fragments but becomes inaccessible via GraphQL | **Breaking** |
| Change a field's `metaType` (e.g. `text-single` → `text-multi`) | Type mismatch between schema and stored data | **Breaking** |
| Add a new required field | New fragments must populate it; existing fragments have an empty value for it until edited | Caution — not breaking for reads, but a data-completeness gap |
| Add a new `category` enum value on `pillar` | Additive — safe, existing consumers ignore unknown values they don't render for | Safe |

These 5 models are authored once as a JCR seed and owned by Content Authors after first deploy (`technical-specifications.md § 6.1`) — treat any field-shape change as a schema migration requiring coordination with the consumer, not a routine content edit.

---

## 7. CORS — origin the consumer must be added to

Per US-006 / `technical-specifications.md § 7`: a **factory** CORS config `com.adobe.granite.cors.impl.CORSPolicyImpl~graphql` (config.publish) will cover `allowedpaths`:
```
/graphql/execute.json/headless-test/.*
/content/_cq_graphql/headless-test/.*
```
with an **explicit origin allow-list** (never `.*`, never `alloworiginregexp`). A consumer's origin (e.g. `https://app.example.com`) must be added to that allow-list by `configsmith` (WB-07) before a browser-based consumer can call these endpoints cross-origin. `supportscredentials` is `false`; only `GET`/`HEAD` are allowed. This document does not itself add an origin — it names the config the Lead/consumer team must request an addition to.

---

## 8. Gate self-check (Designforge)

- No unfiltered `<model>List` shipped — **confirmed**: `stats-list` and `pillars-list` both carry the `STARTS_WITH` path filter; `landing-page-by-path` and `hero-by-path` use `ByPath` + reference traversal.
- `byPath` uses `_path: String!` — **confirmed**, §§ 1, 2.
- `ImageRef` and `DocumentRef` both selected on every asset-reference field — **confirmed**, §§ 1, 2, 4 (`pillar.image`, `hero.heroImage`, `content-section.sectionImage`).
- Rich text selected as `{ html }` — **confirmed** throughout.
- Example JSON responses carry verbatim source strings, not placeholder copy — **confirmed**, cross-referenced to `source-content-inventory.md` item ids inline. **WB-02 r02 correction pass note:** the §§ 1–2 example responses were rewritten wholesale in this correction pass; the r01 examples embedded several strings later confirmed fabricated (`DECISIONS.md 2026-08-26T09:00Z`) and must not be relied on by anyone who cached the r01 output.
