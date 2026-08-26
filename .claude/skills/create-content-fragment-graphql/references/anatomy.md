# Anatomy — Content Fragments & GraphQL Delivery Chain

Understanding how the five layers connect is essential before touching any individual piece.

## The Five Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CF Model                                                     │
│     /conf/<project>/settings/dam/cfm/models/<model-name>/       │
│     Defines field schema: name, type, required, default         │
└───────────────────┬─────────────────────────────────────────────┘
                    │ referenced by
┌───────────────────▼─────────────────────────────────────────────┐
│  2. Fragment Instance                                            │
│     /content/dam/<project>/fragments/<category>/<slug>          │
│     Content authored against the model fields                   │
└───────────────────┬─────────────────────────────────────────────┘
                    │ queried via
┌───────────────────▼─────────────────────────────────────────────┐
│  3. GraphQL Schema (auto-generated)                              │
│     Derived from enabled CF Models in /conf/<config>           │
│     Type per model = <ModelName>Model (e.g. SpeakerProfileModel)│
└───────────────────┬─────────────────────────────────────────────┘
                    │ accessed through
┌───────────────────▼─────────────────────────────────────────────┐
│  4. GraphQL Endpoint                                             │
│     /content/cq:graphql/<config>/endpoint                       │
│     sling:resourceType=graphql/sites/components/endpoint        │
│     configurationPath → /conf/<config>                          │
└───────────────────┬─────────────────────────────────────────────┘
                    │ registered against, then executed
┌───────────────────▼─────────────────────────────────────────────┐
│  5. Persisted Query                                              │
│     Registered via PUT /graphql/persist.json/<config>/<name>    │
│     Stored at /conf/<config>/settings/graphql/persistentQueries │
│     Executed: GET /graphql/execute.json/<config>/<name>         │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: CF Model

The model is the schema. It lives in `/conf/<config>/settings/dam/cfm/models/<model-name>/`. The
root node is `cq:Template` and its `jcr:content` is `cq:PageContent` (see [`cf-models.md`](cf-models.md)
for the exact node shape).

In practice, models are created and maintained through the **CF Model Editor** UI at `/cf#/models` — not hand-authored. The `ui.content` package seeds the initial model as JCR XML so the structure exists on a clean SDK install; authors then evolve it in the UI.

Key properties on `jcr:content`:
- `jcr:title` — display name
- `status="enabled"` — activates the model (do NOT use `active="{Boolean}true"` — that does nothing)
- `description` — optional author hint

Child nodes define each field. See [`cf-models.md`](cf-models.md) for field type reference.

## Layer 2: Fragment Instance

A fragment lives in DAM at `/content/dam/<project>/fragments/`. It is a `dam:Asset` with a `jcr:content` node of type `dam:AssetContent`. The actual field data is nested under `jcr:content/data/master` (for the master variation) or `jcr:content/data/<variation-name>`.

Fragment nodes are authored, not typically shipped in `ui.content` (they are content, not code). Seed fragments may be shipped for local development convenience, but never shipped to production branches.

## Layer 3: GraphQL Schema (Auto-Generated)

AEM generates a GraphQL schema from all **enabled** CF Models in the configuration context. You never write the schema by hand — you write the CF Model and the schema is derived.

Generated names (verify in GraphiQL with `{ __schema { types { name } } }`):
- **`<ModelName>Model`** — the object type for a single fragment (model `speaker-profile` →
  `SpeakerProfileModel`). Inline fragments use this exact name: `... on SpeakerProfileModel`.
- **`<modelName>List`** / **`<modelName>ByPath`** / **`<modelName>ById`** — query root fields (camelCase model name, **no** `Model` in the field name, e.g. `speakerProfileByPath`).
- `byPath` takes **`_path: String!`** (not `path: ID!`).
- Reference fields (asset + fragment) resolve to the `Reference` **union** → query with inline fragments.

If a model field is named `speakerName`, the GraphQL field is also `speakerName` (exact case match). Renaming the field in the model invalidates all queries using the old name.

## Layer 4: GraphQL Endpoint

The endpoint is an `nt:unstructured` node at `/content/cq:graphql/<config>/endpoint` (on disk in a
FileVault package: `content/_cq_graphql/<config>/endpoint/.content.xml`), with:
- `sling:resourceType="graphql/sites/components/endpoint"` (there is **no** `endpointConfig` type)
- `configurationPath` — points to `/conf/<config>` (where the models live)

Ad-hoc / introspection URL (author): `POST /content/_cq_graphql/<config>/endpoint.json`.

For persisted queries (global servlet — no `/content/` prefix):
```
GET /graphql/execute.json/<config>/<query-name>
GET /graphql/execute.json/<config>/<query-name>;param=value
```

## Layer 5: Persisted Query

A persisted query is a **binary node** (`sling:resourceType="graphql/persistent/query"`, raw
GraphQL text in a binary `jcr:content/jcr:data`) under
`/conf/<config>/settings/graphql/persistentQueries/<name>`. Author it once, then **package that
node** in `ui.content` so it deploys and resolves with zero rework:

```
PUT /graphql/persist.json/{config}/all-speakers   (body: {"query":"..."})   # dev-time create (or GraphiQL "Save as persisted query")
→ node /conf/{config}/settings/graphql/persistentQueries/all-speakers        # export this node into ui.content
→ GET /graphql/execute.json/{config}/all-speakers                            # resolves immediately after deploy
```

Do NOT ship a `persistedQueries/*.json` file — the GraphQL servlet does not resolve it, leaving a
dead `persistedQueries` folder beside the real `persistentQueries`. Exact FileVault layout of the
node is in [`persisted-queries.md`](persisted-queries.md). Query body format:
```json
{
  "query": "query AllSpeakers { speakerProfileList { items { speakerName bio { html } headshot { ... on ImageRef { _path } } } } }"
}
```

Persisted queries:
- Are cached by the CDN (add `Cache-Control` header via Dispatcher config)
- Protect the GraphQL schema from exposure (clients can't introspect)
- Are the only supported query form in production (POST queries should be disabled)

## How Rendering Works (Hybrid Mode)

In a hybrid AEM page (page + fragments):

1. Author adds a component (e.g., `{project}/components/speaker-list`) to a page
2. Component's Sling Model executes a persisted query via `AEMHeadlessClient`
3. Model maps each result item to a typed POJO (`SpeakerData`)
4. HTL template renders the list via `data-sly-list`

The component may accept a **configuration property** (e.g., `queryVariant`) to switch between different persisted queries (all-speakers vs. featured-speakers) without code changes.

## Configuration Context

All of CF Models, persisted queries, and GraphQL endpoint tie back to a single `/conf/<project>` path. The relationship is:

```
/conf/{config}/            ← configuration context
  settings/
    dam/cfm/models/         ← models belong here
    graphql/
      persistentQueries/    ← AEM writes registered queries here (via persist API)

/content/cq:graphql/{config}/
  endpoint                  ← endpoint node: configurationPath → /conf/{config}
```

A single AEM instance can have multiple Sites Configurations, each with its own endpoint and model set, as long as they reference different `/conf` paths.

## What Lives Where

| Artifact | Package | Notes |
|---|---|---|
| CF Model definition | `ui.content` | Seed only; authors evolve in UI |
| Persisted queries | `persistentQueries/<name>` **node** (binary) in `ui.content` | Package the real node exported from AEM; a `persistedQueries/*.json` file is NOT resolved |
| GraphQL endpoint | `ui.content` (`/content/_cq_graphql/<config>/endpoint`) | `nt:unstructured`, `sling:resourceType=graphql/sites/components/endpoint` |
| Fragment instances | `ui.content` (dev seeds only) | Content, not code |
| Java Sling Model | `core` | Compiled bundle |
| HTL template | `ui.apps` | Immutable application code |
| Service user config | `ui.config` | Repoinit + ServiceUserMapper |

## See Also

- [`cf-models.md`](cf-models.md) — field types, required flags, default values.
- [`persisted-queries.md`](persisted-queries.md) — query syntax and caching.
- [`graphql-endpoint.md`](graphql-endpoint.md) — endpoint XML and OSGi config.
- [`java-integration.md`](java-integration.md) — executing queries from Java.
- [`htl-rendering.md`](htl-rendering.md) — rendering fragment data in HTL.
