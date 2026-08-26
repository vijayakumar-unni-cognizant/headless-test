---
name: create-content-fragment-graphql
description: AEM as a Cloud Service Content Fragments and GraphQL delivery. Covers CF Model authoring (admin and JCR), fragment creation, persisted GraphQL queries, the GraphQL endpoint config, Java-side query execution via GraphQL client, Sling Model integration, and headless/hybrid page rendering patterns. Use when scaffolding a new CF Model, writing a persisted query, fetching fragment data from a component, or debugging "query not found" / "model not found" / "no fragment data" issues.
license: Apache-2.0
---

# AEM as a Cloud Service — Content Fragments & GraphQL

Content Fragments (CF) provide structured, reusable content that can be delivered headlessly via GraphQL or rendered inside page components. Unlike page content, fragments live in `/content/dam/<project>/fragments/` and are authored independently of pages.

This skill covers the full delivery chain:
1. **CF Models** — define the schema (fields and their types)
2. **Fragment instances** — content authored against the model
3. **GraphQL endpoint** — the endpoint node at `/content/cq:graphql/<config>/endpoint` (resource type `graphql/sites/components/endpoint`)
4. **Persisted queries** — binary nodes under `/conf/<config>/settings/graphql/persistentQueries/`; **package that node in `ui.content`** so it deploys with zero rework (a `persistedQueries/*.json` file is NOT resolved by the GraphQL servlet)
5. **Java / HTL integration** — fetching query results from a Sling Model and passing data to HTL

It complements **`create-component`** (building the rendering component) and **`repoinit`** (service user + ACL for the GraphQL service user).

> **Beta Skill**: Validate CF Models in the Content Fragment Model Editor UI, test persisted queries via `/graphiql.html`, and verify fragment rendering end-to-end against a local AEM SDK before deploying to Cloud Manager.

## When to Use This Skill

- Defining a **new CF Model** for structured data (speakers, sessions, venues, products)
- Wiring a model to a **GraphQL persisted query** so a component can fetch content
- Creating the **GraphQL endpoint** config for a new project or sub-site
- Writing **Java code** that executes a persisted query and adapts results to a Sling Model
- Rendering fragment data inside an **HTL component** (hybrid mode: page + fragments)
- Debugging: "model not found", "query not found", "fragment not returned", "endpoint 404", "no items in query result"
- Auditing fragment **delivery performance** (persisted query caching, CDN headers)

## File Locations & Naming

```
ui.content/src/main/content/jcr_root/
├── conf/<config>/settings/
│   ├── dam/cfm/models/                  # CF Model definitions (JCR seed)
│   │   └── <model-name>/
│   │       └── .content.xml
│   └── graphql/
│       └── persistentQueries/           # LIVE persisted query — package this node (binary)
│           └── <query-name>/            #   deploys and resolves with zero rework
│               ├── .content.xml         #   nt:unstructured, sling:resourceType=graphql/persistent/query
│               └── _jcr_content/
│                   └── _jcr_data.binary #   raw GraphQL query text
├── content/dam/<config>/
│   └── fragments/                       # fragment instances
│       └── <category>/<fragment-name>/.content.xml
└── content/_cq_graphql/<config>/        # `cq:graphql` encoded as `_cq_graphql` on disk
    └── endpoint/
        └── .content.xml                 # endpoint node (sling:resourceType=graphql/sites/components/endpoint)

core/src/main/java/com/{project}/core/
└── models/
    └── <FragmentName>Model.java         # Sling Model wrapping fragment data
```

> Ship the real `persistentQueries/<name>` node (one word — NOT `persistedQueries`) exported from
> AEM after "Save as persisted query". A `persistedQueries/*.json` file deploys a node the GraphQL
> servlet ignores → duplicate dead folder + "query missing after deploy." See
> `references/persisted-queries.md`.

**Naming conventions:**
- Model folder: `kebab-case` (e.g., `speaker-profile`, `session-card`)
- Persisted query: `<project>/<purpose>` (e.g., `{project}/all-speakers`, `{project}/sm26-sessions`)
- Fragment path: `/content/dam/<project>/fragments/<category>/<slug>`
- Java model: `<PascalCase>Model.java` with `@Model(adaptables = Resource.class)`

## Decision Guide

| Task | Reference |
|------|-----------|
| Understand how CF Models, fragments, queries, and endpoints fit together | [`references/anatomy.md`](references/anatomy.md) |
| Define a new CF Model (fields, types, validation, tabs) | [`references/cf-models.md`](references/cf-models.md) |
| Write or maintain a persisted GraphQL query | [`references/persisted-queries.md`](references/persisted-queries.md) |
| Scope a query so it returns only your own content (shared model/endpoint) | [`references/persisted-queries.md § Query isolation`](references/persisted-queries.md) |
| Seed multi-value content whose values contain commas | [`references/validation.md § delivers MORE elements than authored`](references/validation.md) |
| A content fix that is correct in source never reaches the instance | [`references/validation.md § never appears after redeploy`](references/validation.md) |
| A field deleted from `.content.xml` is still delivered | [`references/validation.md § field you DELETED is still delivered`](references/validation.md) |
| Configure the GraphQL endpoint for a project | [`references/graphql-endpoint.md`](references/graphql-endpoint.md) |
| Fetch fragment data from Java / Sling Model | [`references/java-integration.md`](references/java-integration.md) |
| Render fragment data in HTL | [`references/htl-rendering.md`](references/htl-rendering.md) |
| Debug "model not found" / "query error" / "no results" | [`references/validation.md`](references/validation.md) |
| Copy-paste recipes (speaker list, session agenda, hero fragment) | [`references/recipes.md`](references/recipes.md) |
| Mutate a running instance (upload DAM assets, create/update a persisted query via REST) | [`references/write-operations.md`](references/write-operations.md) |

## Critical Rules

- **READ THE REFERENCE FIRST** — the CF GraphQL schema is auto-generated from the model; field names in queries must exactly match model field names (case-sensitive).
- **Always use persisted queries** in production — ad-hoc POST queries bypass CDN caching and expose schema to clients. Use `/graphql/execute.json/<project>/<query-name>` only.
- **CF Models live in `/conf/<project>`** (not `/apps` or `/libs`). They are mutable content — ship as initial seed via `ui.content` with `mode="merge"` filter, and expect authors to evolve them in the UI.
- **Fragments live in DAM** (`/content/dam/`), not in `/content/<site>/`. They are assets, not pages. Service users that read fragment data need `jcr:read` on `/content/dam/<project>/fragments/`.
- **Never query without a persisted query in prod** — the GraphQL endpoint allows POST queries by default but this should be disabled in production via OSGi config `AEMHeadlessClient` or CDN rules.
- **Model field renames break queries** — renaming a model field invalidates all persisted queries that reference that field. Treat model changes like database schema migrations.
- **`_variations` is not a field** — to query a variation, use `byPath(_path: "...", variation: "name")` or the variation-aware query forms; don't try to traverse `_variations` as a nested type.
- **SVG assets resolve as `DocumentRef`, not `ImageRef`** — a content/image-reference field (union type `Reference`) resolves raster assets (PNG/JPG) as `ImageRef` but SVG as `DocumentRef`. A query selecting only `... on ImageRef { _path }` returns `null` for SVG-backed references. Select both: `logoImage { ... on ImageRef { _path width height } ... on DocumentRef { _path } }`. See `references/write-operations.md`.
- **Always enable CORS and CDN caching** headers for the GraphQL endpoint when delivering to SPAs or external clients — see `references/graphql-endpoint.md`.
- **Do not store sensitive data in fragments** — fragments are readable by any service user with `jcr:read` on the DAM path. Apply ACLs at the folder level for restricted content.

## Quick Sketch — Minimum Viable Fragment Delivery

```
1. CF Model:   /conf/{config}/settings/dam/cfm/models/speaker-profile   (status="enabled")
2. Fragment:   /content/dam/{config}/fragments/speakers/jane-doe
3. Endpoint:   /content/cq:graphql/{config}/endpoint   (sling:resourceType=graphql/sites/components/endpoint)
4. Persist:    Save-as-persisted-query in GraphiQL, then package the resulting persistentQueries/<name> node
5. Execute:    GET /graphql/execute.json/{config}/sm26-speakers
6. Java:       SpeakerListModel.java → executes persisted query → exposes List<SpeakerData>
7. HTL:        speaker-list.html → data-sly-list="${model.speakers}"
```
Order matters: the endpoint (3) must exist before the query can be registered (4).

## Validation Checklist

- [ ] CF Model enabled (`status="enabled"`, NOT `active`) and visible in `/conf/<config>/settings/dam/cfm/models/`.
- [ ] Fragment at expected DAM path with the correct model reference (`contentFragmentModel`).
- [ ] GraphQL endpoint node exists at `/content/cq:graphql/<config>/endpoint` (`sling:resourceType=graphql/sites/components/endpoint`, `configurationPath="/conf/<config>"`) — and appears in the GraphiQL dropdown.
- [ ] Persisted query **packaged as the `persistentQueries/<name>` node** (nt:unstructured + binary `jcr:content`), exported from AEM — NOT a `persistedQueries/*.json` file. Deploys and resolves with no post-deploy step.
- [ ] Query tested in GraphiQL UI (`/aem/graphiql.html`) — inline fragments use `... on <Name>Model`, `byPath` uses `_path: String!`.
- [ ] Service user has `jcr:read` on `/content/dam/<project>/fragments/` (see `repoinit` skill).
- [ ] `getServiceResourceResolver(SUBSERVICE="<project>-fragment-reader")` paired with `ServiceUserMapperImpl.amended` config.
- [ ] HTL Use-class / Sling Model exposes typed POJOs, not raw `ValueMap` — avoids NPE on missing fields.
- [ ] CDN caching headers confirmed (`Cache-Control: max-age`) on `/graphql/execute.json/...` responses.
- [ ] Build/deploy verification deferred to the Build Validation Gate (Test Automation Agent, ADLC-SPEC §8.1.1). After the gate runs, `error.log` should show no `ResolveException` or `QueryValidationException`. This skill does NOT invoke `mvn`.

## See Also

- **Component side:** [`create-component`](../create-component/SKILL.md) — building the rendering component.
- **Template side:** [`create-editable-template`](../create-editable-template/SKILL.md) — page template that hosts fragment-backed components.
- **Service users:** [`repoinit`](../repoinit/SKILL.md) — service user + ACL for DAM read access.
- **Adobe — Content Fragments overview:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/sites/administering/content-fragments/overview>
- **Adobe — Headless GraphQL API:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/graphql-api/content-fragments>
- **Adobe — Persisted queries:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/graphql-api/persisted-queries>
- **AEM Headless Client for Java:** <https://github.com/adobe/aem-headless-client-java>
