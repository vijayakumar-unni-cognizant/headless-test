# Write Operations — Mutating a Running AEM Instance

The rest of this skill covers *authoring* CF/GraphQL artifacts as source (JCR seed, packaged
`persistentQueries` node) and *reading* them at runtime. This reference covers the other case:
**mutating a live instance over HTTP** — uploading DAM assets, setting fragment field values, and
creating/updating persisted queries via the REST API. This is what the `composer` content-seeding
track does when it seeds demo content against a local author or RDE.

> These are runtime seeding/repair operations. The source of truth for anything that must survive a
> Cloud Manager deploy is still the packaged node in `ui.content` — after seeding on an instance,
> export the resulting node back into the repo (see `references/persisted-queries.md`).

## Authentication for writes (the CSRF wall)

Every `POST`/`PUT`/`DELETE` passes through the Granite CSRF filter. Basic auth alone → **403** with an
empty body. You need a CSRF token **paired with the cookie jar from the same request that fetched it**:

```bash
# fetch token AND persist cookies to a jar in one call
curl -s -u admin:admin -c jar.txt \
  "http://localhost:4502/libs/granite/csrf/token.json"     # -> {"token":"eyJ..."}

# every write reuses the jar + sends the token header
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X POST ...
```

Symptom map:
- **403, empty body** on a write → missing/invalid CSRF token, or token sent without its cookie jar.
- Token fetched with basic auth but no `login-token` cookie is fine — reuse the jar you captured; do
  not try to force a form login.

> On Windows, the Git-Bash `curl` shim can fail at shell init (`/etc` symlink permission errors). Use
> PowerShell with the native `curl.exe`, or `Invoke-WebRequest`, instead. This is why `composer` lists
> `PowerShell` alongside `Bash`.

## Uploading a DAM asset (Assets HTTP API)

Create asset = **POST** (not PUT — PUT to a non-existent path returns 404). Parent folder must exist.

```bash
# 1) create the folder (idempotent-ish: 201 first time)
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X POST \
  -H "Content-Type: application/json" \
  -d '{"class":"assetFolder","properties":{"jcr:title":"Client Logos"}}' \
  "http://localhost:4502/api/assets/<project>/<path>/client-logos"

# 2) create each asset with POST + correct mime
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X POST \
  -H "Content-Type: image/svg+xml" --data-binary "@dropbox.svg" \
  "http://localhost:4502/api/assets/<project>/<path>/client-logos/dropbox.svg"
```

## Setting a fragment field value

Content-reference and image-reference fields are stored on the fragment's `master` node as a **plain
string path** (identical to how a working `heroImage`/`aboutImage` is stored). A direct Sling POST works:

```bash
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X POST \
  -F "logoImage=/content/dam/<project>/<path>/client-logos/dropbox.svg" \
  "http://localhost:4502/content/dam/<project>/fragments/<cat>/dropbox/jcr:content/data/master"
```

Verify with the fragment's `.../jcr:content/data/master.json` and then via GraphQL.

## Creating / updating a persisted query (REST API)

`PUT /graphql/persist.json/<config>/<name>` **only creates**. Gotchas, in order of how they bite:

1. **Content type:** body must be the **raw GraphQL query text** with `Content-Type: application/json`.
   - `application/x-www-form-urlencoded` (curl's `--data` default), `text/plain`, `application/graphql`,
     `text/html` → **415 Unsupported Content Type**.
   - A JSON wrapper `{"query":"..."}` → passes the content-type gate but fails query validation
     (`InvalidSyntax ... offending token '"query"'`). Send the raw query, not a wrapper.
2. **Already exists:** a second create → **409** (`create is not permitted`). There is no in-place update.
   To modify: **DELETE then PUT**.

```bash
# read the current query text (served raw by the query/content resource)
curl -s -u admin:admin \
  "http://localhost:4502/conf/<config>/settings/graphql/persistentQueries/<name>/jcr:content" > q.graphql
# ...edit q.graphql...
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X DELETE \
  "http://localhost:4502/graphql/persist.json/<config>/<name>"
curl -s -u admin:admin -b jar.txt -H "CSRF-Token: <token>" -X PUT \
  -H "Content-Type: application/json" --data-binary "@q.graphql" \
  "http://localhost:4502/graphql/persist.json/<config>/<name>"           # -> 201 {"action":"create"}
```

> DELETE-then-PUT is destructive if the PUT fails. Save the original query text first so you can restore.

## The SVG → `DocumentRef` trap

An image-reference field's GraphQL type is the union `Reference`. Its members include `ImageRef` (raster:
PNG/JPG, has `_path/width/height`) and `DocumentRef` (has `_path`, no dimensions). **AEM classifies an SVG
asset as `DocumentRef`**, so a query selecting only `... on ImageRef { _path }` returns `null` for an
SVG-backed reference even though the reference is set correctly. Diagnose with `logoImage { __typename }`,
then select both members:

```graphql
logoImage {
  ... on ImageRef { _path width height }
  ... on DocumentRef { _path }
}
```

Choose deliberately: keep logos/icons as **SVG** and teach the query to select `DocumentRef` (scalable,
crisp — preferred for logos), or standardize on **raster PNG** to match existing `ImageRef` content.
Don't silently convert SVG → PNG just to fit an `ImageRef`-only query.
