# Persisted GraphQL Queries

Persisted queries are the only supported mechanism for delivering fragment data in production.
They are named, server-side query strings that clients invoke by name (not by sending query
text), enabling CDN caching and preventing schema exposure.

> **How AEM stores a persisted query — and why a `.json` file in the package does not work.**
> AEM does not resolve persisted queries from a hand-authored JSON file. Each query is a **binary
> node**: `<name>` (`nt:unstructured`, `sling:resourceType="graphql/persistent/query"`) with a
> `jcr:content` child (`nt:unstructured`, `sling:resourceType="graphql/persistent/query/content"`,
> `jcr:mimeType="text/html"`, and the raw GraphQL text in a binary `jcr:data`) — under
> `/conf/<config>/settings/graphql/`**`persistentQueries`** (one word; NOT `persistedQueries`).
> Shipping a `.json` under a `persistedQueries` folder deploys a node that returns HTTP 200 as a
> raw resource but is invisible to the GraphQL servlet → `404 PersistenceError: Could not find
> Persisted Query` on `execute.json`. It also leaves the tell-tale pair of folders in CRXDE: a
> dead `persistedQueries` (from the package) next to the real `persistentQueries` (created by hand).

## Best practice: package the `persistentQueries` node (zero-rework deploy)

A persisted query is just JCR — a node plus a binary. Ship that node in `ui.content` and it deploys
like any other content: the query resolves immediately after `mvn ... -PautoInstallSinglePackage`
or a Cloud Manager deploy, with **no post-deploy script and no manual GraphiQL step**.

Workflow:
1. **Author once** — create + test the query in GraphiQL (`/aem/graphiql.html`) → **Save as
   persisted query** (or the `persist.json` API below). This writes the real node under
   `/conf/<config>/settings/graphql/persistentQueries/<name>`.
2. **Export the node into `ui.content`** — build a content package of that subtree (CRX Package
   Manager → new package, filter `/conf/<config>/settings/graphql/persistentQueries` → Build →
   download), or use `vlt`, and copy the `jcr_root/...` files into the project. The FileVault
   layout (verified against a clean install) is:
   ```
   ui.content/.../conf/<config>/settings/graphql/persistentQueries/
     .content.xml                     # sling:Folder
     <query-name>/
       .content.xml                   # the query node (below)
       _jcr_content/
         _jcr_data.binary             # raw GraphQL query text
   ```
   `<query-name>/.content.xml`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
       jcr:primaryType="nt:unstructured"
       sling:resourceType="graphql/persistent/query">
       <jcr:content
           jcr:data="{Binary}\0"
           jcr:mimeType="text/html"
           jcr:primaryType="nt:unstructured"
           sling:resourceType="graphql/persistent/query/content"/>
   </jcr:root>
   ```
   The sidecar `_jcr_content/_jcr_data.binary` holds the **raw GraphQL query text itself**
   (e.g. `query X($path: String!) { ... }`) — NOT a `{"query":...}` wrapper. The `jcr:data="{Binary}\0"`
   placeholder + the `.binary` file is the standard FileVault way to carry a binary property.
3. **Filter** — the query lives under `/conf/<config>`, so an existing `mode="merge"` filter on
   `/conf/<config>` already covers it; no extra filter root is required.

**Do NOT** ship a `persistedQueries/*.json` file and rely on a post-deploy `persist.json` call —
that is the anti-pattern that produces the duplicate `persistedQueries` (dead) + `persistentQueries`
(real) folders and "query missing after deploy."

## Creating / re-registering a query via the API (dev-time only)

GraphiQL's **Save as persisted query** is the usual authoring path. The equivalent HTTP API (an
endpoint must exist first — see [`graphql-endpoint.md`](graphql-endpoint.md) — otherwise you get
*"No suitable endpoint found"*):

```
PUT    /graphql/persist.json/<config>/<name>    Content-Type: application/json    body: { "query": "query ... { ... }" }
DELETE /graphql/persist.json/<config>/<name>    # for idempotent replace (DELETE then PUT)
GET    /graphql/execute.json/<config>/<name>[;param=value]    # execute
```

Use this to author/update the query on a local author, then **re-export the resulting node**
(step 2 above) so the change is captured in source control. This API is how you *create* the node —
it is not a required deploy step. (On Windows, script it with `curl.exe`, not PowerShell's
`Invoke-WebRequest`, which trips AEM's POST/PUT security filter with a 403.)

## JSON File Format

```json
{
  "query": "query AllSpeakers { speakerList { items { speakerName title bio { html } headshot { ... on ImageRef { _path width height } } featured _path } } }"
}
```

The `query` value is a single-line JSON string containing valid GraphQL. Write it multi-line for
review, then minify before committing.

## Matching the generated schema (avoids the most common validation errors)

Confirm names with `{ __schema { queryType { fields { name } } } }` in GraphiQL. Conventions:

- Object type per model = **`<ModelName>Model`** (e.g. `speaker` → `SpeakerModel`). Inline
  fragments use the `Model`-suffixed name: `... on SpeakerModel { ... }`.
- Query fields = `<modelName>List`, `<modelName>ByPath`, `<modelName>ById`.
- **`byPath` argument is `_path: String!`** — declare `query X($path: String!)` and call
  `<model>ByPath(_path: $path)`. Using `path:` / `ID!` fails validation.
- Reference fields resolve to the `Reference` union → require inline fragments
  (`... on ImageRef { _path }` for assets, `... on <ModelName>Model { ... }` for fragment refs).
- Rich text (`text-multi`) is `MultiFormatString` → query `{ html }` or `{ plaintext }`.

## Query isolation — scope every query to its own source

A CF Model and its endpoint are usually **shared across features and across delivery cycles**. That makes an unscoped query a correctness hazard, not just an efficiency one: it silently returns *other* features' fragments, so the response is no longer attributable to the content you just authored, and any verification against it is meaningless.

**Rules**

1. **One source → one query.** Give each page / aggregator fragment / content set its own persisted query, named for that source. Do not extend or reuse another feature's query to serve a new source because "the shape fits" — a shared query is a shared blast radius.
2. **Prefer `<model>ByPath` + reference traversal** over `<model>List`. Resolve your own root by path, then reach everything else by following fragment references from it. This is inherently scoped and cannot pick up a sibling feature's content.
3. **Never ship an unfiltered `<model>List` on a shared model.** `speakerList { items { … } }` returns *every* fragment of that model in the repository. If you genuinely need a list, constrain it so it cannot match content outside your own root:

   ```graphql
   query MyFeatureSections($root: String!) {
     sectionList(filter: { _path: { _expressions: [{ value: $root, _operator: STARTS_WITH }] } }) {
       items { headline _path }
     }
   }
   ```

4. **Namespace your content.** Author a feature's fragments and assets under their own folder rather than mixing them into an existing feature's tree — a path-scoped query is then unambiguous and pre-existing content stays untouched.
5. **Reusing a model is fine; sharing a query is not.** When you reuse an existing CF Model, leave its definition byte-identical and isolate at the *query* level.
6. **Verify in isolation.** Execute your own query and assert every returned `_path` resolves inside your own content root. A foreign `_path` means the query is not isolated. A different, already-populated query returning 200 is **not** evidence that your content is correct — keep regression checks of other features' queries clearly separate from verification of your own.

## GraphQL Query Patterns

### List query — all fragments of a type

> Use with care — unfiltered on a model shared with another feature, this returns their fragments too. See "Query isolation" above.

```graphql
query AllSpeakers {
  speakerList {
    items {
      speakerName
      title
      bio { html }
      headshot { ... on ImageRef { _path width height } }
      featured
      _path
    }
  }
}
```

### List query with filter

```graphql
query FeaturedSpeakers {
  speakerList(filter: { featured: { _expressions: [{ value: true }] } }) {
    items { speakerName title _path }
  }
}
```

### Fragment by path

```graphql
query SpeakerByPath($path: String!) {
  speakerByPath(_path: $path) {
    item { speakerName bio { html } }
  }
}
```

Usage: `GET /graphql/execute.json/<config>/speaker-by-path;path=/content/dam/<project>/fragments/speakers/jane-doe`

### Nested fragment reference

```graphql
query SessionsWithSpeakers {
  sessionList {
    items {
      title
      speaker {                 # fragment-reference field → Reference union
        ... on SpeakerModel { speakerName title _path }
      }
    }
  }
}
```

Inline fragments (`... on TypeName`) are **required** for any `Reference`-typed field (all content
references and fragment references).

## Filter Expressions Reference

```graphql
filter: { track: { _expressions: [{ value: "fiscal", _operator: EQUALS }] } }
```

| `_operator` | Meaning |
|---|---|
| `EQUALS` | Exact match (default) |
| `EQUALS_NOT` | Exclude |
| `CONTAINS` / `CONTAINS_NOT` | Substring |
| `STARTS_WITH` | Prefix |
| `LOWER` / `LOWER_OR_EQUAL` / `GREATER` / `GREATER_OR_EQUAL` | Numeric/date comparisons |

Multi-value OR: `filter: { track: { _logOp: OR, _expressions: [{ value: "fiscal" }, { value: "climate" }] } }`

## Variables in Persisted Queries

```graphql
query SessionsByTrack($track: String, $limit: Int = 10) {
  sessionList(filter: { track: { _expressions: [{ value: $track }] } }, limit: $limit) {
    items { title sessionDate _path }
  }
}
```

URL: `GET /graphql/execute.json/<config>/sessions-by-track;track=fiscal;limit=5`
Pass variables as semicolon-delimited matrix params (`;name=value`), not `?name=value`. Use the
raw path value for path variables — do not URL-encode the slashes.

## Caching

Persisted queries are GET requests, cacheable by CDN + Dispatcher. Add
`Cache-Control: max-age=<seconds>` for `/graphql/execute.json/*` (see
[`graphql-endpoint.md`](graphql-endpoint.md)). Use `no-store` for personalised/authenticated
queries.

## `_path`, `_metadata`, `_variations`

Every fragment type includes `_path` (JCR path, usable as ID), `_metadata`, and `_variations`.

```graphql
{ speakerList { items { _path _metadata { stringMetadata { name value } } } } }
```

## Common Mistakes

| Mistake | Symptom |
|---|---|
| Shipping the query as a `.json` file only (never PUT via persist API) | `404 PersistenceError: Could not find Persisted Query` |
| No endpoint node for the config | persist API returns `404 No suitable endpoint found` |
| Inline fragment `... on Hero` instead of `... on HeroModel` | `Validation error … Unknown type 'Hero'` |
| `byPath(path: $path)` / `$path: ID!` | `Missing field argument '_path'` / `Unknown field argument 'path'` |
| Field name case mismatch vs model field `name` | `Field '…' undefined` |
| `rich-text` queried as `String` instead of `{ html }` | Type error / null |
| Variable passed with `?` instead of `;` | Variable not parsed |

## See Also

- [`graphql-endpoint.md`](graphql-endpoint.md) — endpoint node (prerequisite) + schema naming.
- [`cf-models.md`](cf-models.md) — model field types incl. fragment references.
- [`java-integration.md`](java-integration.md) — executing persisted queries from Java.
- [`validation.md`](validation.md) — debugging query errors.
- **Adobe — Persisted queries:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/graphql-api/persisted-queries>
