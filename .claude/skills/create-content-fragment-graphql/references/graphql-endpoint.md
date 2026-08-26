# GraphQL Endpoint Configuration

The GraphQL endpoint ties a Sites Configuration (`/conf/<config>`, where the CF Models live) to
an HTTP surface that GraphiQL and persisted-query execution use. **Without an endpoint node, no
endpoint appears in GraphiQL and persisted-query registration fails with "No suitable endpoint
found."**

> Verified against the AEM as a Cloud Service SDK. Earlier revisions of this doc documented a
> `graphql/sites/components/endpointConfig` page under `/content/<project>/graphql/endpoint.json`
> — **that resource type does not exist in AEM and does not work.** The correct shape is below.

## Endpoint Node Location

The real endpoint node lives under `/content/cq:graphql/<config>/endpoint`. In a FileVault content
package the `cq:` prefix is encoded as `_cq_`, so on disk:

```
ui.content/src/main/content/jcr_root/
└── content/_cq_graphql/<config>/
    ├── .content.xml                 # sling:Folder for <config>
    └── endpoint/
        └── .content.xml             # the endpoint node
```

`<config>` is the last segment of your `/conf/<config>` path (e.g. `wknd`, `adlc-headless-cms`).

## Endpoint `.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="nt:unstructured"
          sling:resourceType="graphql/sites/components/endpoint"
          configurationPath="/conf/<config>"/>
```

| Property | Required | Value |
|---|---|---|
| `jcr:primaryType` | Yes | `nt:unstructured` (NOT `cq:Page`) |
| `sling:resourceType` | Yes | `graphql/sites/components/endpoint` — must be exact (there is no `endpointConfig`) |
| `configurationPath` | Yes | Path to the `/conf` node that holds your CF Models |

The parent `content/_cq_graphql/<config>/.content.xml` is a plain folder:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="sling:Folder"/>
```

### Creating the endpoint at runtime (UI or API)

Endpoints are normally created via **Tools → General → GraphQL → Create** (only offered once CF
Models are enabled for the configuration). The Create action produces exactly the node above. You
can also create it with a Sling POST (idempotent) — see the registration script pattern in
[`persisted-queries.md`](persisted-queries.md); packaging the node (above) and POSTing it are
equivalent, the node is just JCR.

## Filter to Include Endpoint in Package

Add the endpoint path to `ui.content/src/main/content/META-INF/vault/filter.xml`:

```xml
<filter root="/content/cq:graphql/<config>" mode="merge"/>
```

Use the real repository path (`/content/cq:graphql/...`, with the colon) in `filter.xml`, even
though the on-disk folder is `_cq_graphql`.

## Endpoint URLs

```
# Schema introspection / ad-hoc query (author; requires enable.post + enable.ui)
POST /content/_cq_graphql/<config>/endpoint.json
Content-Type: application/json
{"query": "{ __schema { types { name } } }"}

# Persisted query execution (author + publish) — GLOBAL servlet, no /content/ prefix
GET /graphql/execute.json/<config>/<query-name>
GET /graphql/execute.json/<config>/<query-name>;param=value
```

Note the request path uses the underscore form `_cq_graphql`; the `<config>` segment on
`execute.json` is the Sites Configuration name (same as the endpoint's parent folder).

## Generated schema — naming you must match in queries

AEM auto-generates the schema from the CF Models under `configurationPath`. Confirm the exact
names with `{ __schema { types { name } } }` in GraphiQL. The conventions (which trip people up):

- **Object type per model = `<ModelName>Model`** (PascalCase + `Model` suffix). Model `hero`
  → type `HeroModel`; `landing-page` → `LandingPageModel`. Inline fragments must use these:
  `... on HeroModel { ... }`, **not** `... on Hero`.
- **Query fields** are `<modelName>List`, `<modelName>ByPath`, `<modelName>ById`.
- **`byPath` signature is `<modelName>ByPath(_path: String!, variation: String)`** — the argument
  is `_path` of type `String!` (NOT `path` / `ID!`).
- **Reference fields** (both content references and fragment references) resolve to the `Reference`
  union. Query them with inline fragments: `... on ImageRef { _path width height }` for asset
  references, `... on <ModelName>Model { ... }` for fragment references.

## OSGi Configs for the GraphQL Servlet

### Enable/disable POST + UI per tier

```json
// ui.config/.../osgiconfig/config.author/
// com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet.cfg.json
{ "enable.get": true, "enable.post": true, "enable.ui": true }
```
```json
// ui.config/.../osgiconfig/config.publish/
// com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet.cfg.json
{ "enable.get": true, "enable.post": false, "enable.ui": false }
```

`enable.ui` controls the GraphiQL IDE at `/aem/graphiql.html`. `enable.post` controls ad-hoc
POST queries + introspection — keep it off on publish so clients can only run persisted queries.

> **Shared-instance warning — this is a SINGLETON config (instance-wide).**
> `com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet` has no `~name` suffix, so it is NOT per-project:
> whoever ships it sets `enable.get/post/ui` for the **entire AEM instance and every team on it**.
> On a shared environment, do **not** ship it (rely on Adobe's per-tier defaults) or coordinate
> with the platform team — otherwise you may silently flip another team's GraphiQL/POST settings.
> Ship it only on a dedicated environment. Everything else in this skill (endpoint node, models,
> persisted queries) is per-config and safe. CORS should be a **factory** instance
> (`CORSPolicyImpl~<config>`) scoped to `/(content|conf)/<config>.*` — never edit the singleton
> CORS config, and never widen `allowedpaths` to `.*`.

## CORS Configuration

For SPAs or external clients calling the endpoint cross-origin:

```json
// ui.config/.../osgiconfig/config.publish/
// com.adobe.granite.cors.impl.CORSPolicyImpl~graphql.cfg.json
{
  "alloworigin": ["https://www.example.com", "https://app.example.com"],
  "alloworiginregexp": [],
  "allowedpaths": ["/graphql/execute.json/.*", "/content/_cq_graphql/.*"],
  "allowedheaders": ["Origin", "Accept", "X-Requested-With", "Content-Type",
                     "Access-Control-Request-Method", "Access-Control-Request-Headers",
                     "Authorization"],
  "allowedmethods": ["GET", "HEAD"],
  "maxage": "{Long}1800",
  "supportscredentials": false
}
```

For an AEM-rendered page (hybrid mode), CORS is not needed — the Sling Model calls the query
server-side.

## Dispatcher Passthrough for Persisted Queries

```apache
# conf.d/enabled_vhosts/<project>.vhost
<Location /graphql>
  Header always set Cache-Control "max-age=600, s-maxage=600"
</Location>
```
```
# dispatcher/src/conf.dispatcher.d/cache/rules.any
/0100 { /type "allow" /url "/graphql/execute.json/*" }
```

## Multiple Endpoints (Multi-Site)

Each Sites Configuration gets its own endpoint under `/content/cq:graphql/<config>/endpoint`, each
with its own schema derived from its `/conf` models:

```
/content/cq:graphql/wknd/endpoint       → configurationPath="/conf/wknd"
/content/cq:graphql/wknd-fr/endpoint    → configurationPath="/conf/wknd-fr"
```

## Verifying the Endpoint Works

1. On author, open `/aem/graphiql.html` — your `<config>` endpoint should be in the dropdown.
2. Run `{ __schema { types { name } } }` — you should see your `<ModelName>Model` types.
3. Register a persisted query (see [`persisted-queries.md`](persisted-queries.md)) and run
   `GET /graphql/execute.json/<config>/<query-name>`.

**If no endpoint appears in the dropdown / GraphiQL is empty / persist returns "No suitable
endpoint found":** the endpoint node is missing or has the wrong `sling:resourceType`. Confirm
`/content/cq:graphql/<config>/endpoint` exists with `sling:resourceType=graphql/sites/components/endpoint`.

## See Also

- [`anatomy.md`](anatomy.md) — how the endpoint ties the layers together.
- [`persisted-queries.md`](persisted-queries.md) — query storage, the mandatory `persist` API, execution URLs.
- [`validation.md`](validation.md) — diagnosing "no endpoints" / "query not found" / 401.
- **Adobe — GraphQL endpoint setup:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/graphql-api/graphql-endpoint>
