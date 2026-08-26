# Validation & Debugging

Symptom-first reference for diagnosing CF Model, persisted query, endpoint, and rendering issues.

## Diagnostic Checklist

Before diving into individual symptoms, run through this sequence in order:

1. **Model enabled?** — Navigate to `/cf#/models` in author. Is your model listed and enabled (`status="enabled"`)?
2. **Endpoint node exists?** — Check CRXDE at `/content/cq:graphql/<config>/endpoint`; confirm `sling:resourceType="graphql/sites/components/endpoint"` and `configurationPath="/conf/<config>"`.
3. **GraphiQL lists the endpoint?** — Open `/aem/graphiql.html`. Is your `<config>` endpoint in the dropdown? Run `{ __schema { types { name } } }` — do your `<Name>Model` types appear?
4. **Persisted query registered?** — In CRXDE: `/conf/<config>/settings/graphql/persistentQueries/<query-name>` (a **node**, spelled `persistentQueries`). A `.json` under `persistedQueries` is NOT the registered query.
5. **Query returns data in GraphiQL?** — Paste your query into GraphiQL and execute. Any errors?
6. **GET endpoint returns data?** — `http://localhost:4502/graphql/execute.json/<config>/<query-name>` with credentials. HTTP 200?
7. **Service user has DAM read?** — When using JCR Pattern (ContentFragment API), does the service user have `jcr:read` on `/content/dam/<config>/fragments/`?

---

## Symptom: "Model not found" / model doesn't appear in wizard

**Probable causes:**

| Cause | Fix |
|---|---|
| `status` is not `enabled` (or someone set `active="{Boolean}true"`, which does nothing) | Set `status="enabled"` on the model's `jcr:content` |
| Model is in `/conf/global` instead of `/conf/<config>` | Move to correct conf path; ensure configurationPath on endpoint matches |
| `ui.content` filter doesn't include `/conf/<config>/settings/dam/cfm/models` | Add `<filter root="/conf/{config}/settings/dam/cfm/models" mode="merge"/>` |
| Model installed but service cache not refreshed | Touch the model node in CRXDE (add/remove a space in `jcr:title`) to trigger invalidation |

---

## Symptom: GraphQL type not in schema / `__schema` doesn't list my type

**Probable causes:**

| Cause | Fix |
|---|---|
| Model is inactive | Enable the model (see above) |
| Wrong `/conf` path — endpoint's `configurationPath` doesn't match where model lives | Align `configurationPath` on endpoint with the `/conf` path holding the model |
| Model has no fields defined | Add at least one field with `metaType`; empty models may not generate a type |
| Schema cache stale | POST `{"query":"{ __schema { types { name } } }"}` to force a fresh schema parse |

---

## Symptom: No endpoints in GraphiQL / `/content/cq:graphql` is empty

The GraphiQL dropdown is empty, or persist/introspection fails.

**Probable causes:**

| Cause | Fix |
|---|---|
| No endpoint node exists | Create `/content/cq:graphql/<config>/endpoint` (`sling:resourceType="graphql/sites/components/endpoint"`, `configurationPath="/conf/<config>"`) — via Tools → General → GraphQL → Create, a Sling POST, or a package node under `content/_cq_graphql/`. See `graphql-endpoint.md`. |
| Endpoint authored with `graphql/sites/components/endpointConfig` | That resource type does not exist — use `graphql/sites/components/endpoint`. |
| Endpoint authored as a `cq:Page` under `/content/<project>/graphql/endpoint.json` | Wrong location/type; the real node is `/content/cq:graphql/<config>/endpoint` (`nt:unstructured`). |
| CF Models not enabled for the config | "Create" is disabled until at least one model has `status="enabled"`. |

---

## Symptom: Persisted query returns 404 (even though the `.json` file is deployed)

```
GET /graphql/execute.json/{config}/all-speakers
→ 404 {"errors":[{"errorType":"PersistenceError","message":"Could not find Persisted Query"}]}
```

**Probable causes:**

| Cause | Fix |
|---|---|
| **Query shipped as a `persistedQueries/*.json` file** (most common; you'll see a dead `persistedQueries` folder next to the real `persistentQueries` in CRXDE) | AEM does not resolve persisted queries from a package `.json`. Package the real **`persistentQueries/<name>` binary node** instead (export it from AEM after "Save as persisted query" — see `persisted-queries.md`). Then it deploys and resolves with no post-deploy step. |
| Query authored on this machine but never exported into `ui.content` | The node exists locally but isn't in the package, so a fresh deploy lacks it. Export `/conf/<config>/settings/graphql/persistentQueries/<name>` into `ui.content`. |
| `persist.json` returns `404 No suitable endpoint found` | The endpoint node is missing — create it first (see symptom above). |
| Namespace mismatch | The `<config>` URL segment must match the Sites Configuration name (the endpoint's `configurationPath` last segment). |
| Query present on author but not on publish | Persisted-query nodes don't auto-replicate — deploy the node to / replicate it to publish too. |

---

## Symptom: Persisted query returns 400 / "QueryValidationException"

```json
{"errors":[{"message":"Validation error of type FieldUndefined: Field 'speakerNme' in type 'SpeakerProfileModel' is undefined"}]}
```

**Probable causes:**

| Cause | Fix |
|---|---|
| Inline fragment on the un-suffixed type name (`... on Speaker` / `... on Hero`) | Use the `Model`-suffixed type: `... on SpeakerModel` / `... on HeroModel`. Confirm names in `__schema`. |
| `byPath` written as `byPath(path: $path)` with `$path: ID!` | Use `byPath(_path: $path)` with `$path: String!`. |
| Typo in field name (case-sensitive) | Field name must exactly match the model field `name` property. |
| Model field was renamed after query was written | Update query to use the new field name. |
| Querying `text-rich` as plain String | Use `bio { html }`, not `bio`. |
| `reference` / `fragment-reference` field queried without inline fragment | Wrap in `... on ImageRef { _path }` (asset) or `... on <Name>Model { ... }` (fragment). |

---

## Symptom: A reference field returns `null` while single-value refs work

A multi-valued fragment/asset reference (e.g. `products`, `clientLogos`) comes back `null`, but
single-value references on the same fragment (e.g. `hero`) resolve fine.

**Probable cause:** the CF-model reference field is defined as **single** but the instance stored a
**multi-value** (array) property — the single-ref resolver can't read an array, so it returns null.
Usually the field was authored with `valueType="string/reference"` (asset type) + a no-op
`multiple="{Boolean}true"` instead of the fragment-reference multi shape.

**Fix — make the field a list.** Two options (full trade-off table in `cf-models.md`):
- **A (proper multifield, best authoring):** `valueType="string/content-fragment[]"` +
  `.../fragmentreference/multifield`, set via **CF Model Editor → Allow Multiple** then export.
  A raw JCR flip to this shape FAILS — `.schemaerrors` shows
  `SCHEMA_INCOMPLETE_FIELD_REMOVED … Missing nested model(s) ''` (the target-model link is only
  written by the editor).
- **B (JCR-only, no UI):** `valueType="string/reference[]"` on the existing single
  `.../fragmentreference` field. Plain property edit, deploys via package with zero rework;
  trade-off is the authoring dialog stays a single path-picker. Use for seeded/headless data.

Both make the schema field `[Reference]` and the array resolve; the query is unchanged
(`field { ... on <Name>Model { … } }`). Diagnose with
`GET /content/cq:graphql/<config>/endpoint.schemaerrors`.

---

## GENERAL RULE — `multiple="{Boolean}true"` NEVER makes a field a list in GraphQL, for ANY `metaType`

This is not specific to `fragment-reference` — it applies to every CF Model field type
(`text-single`, `boolean`, `enumeration`, `number`, `date`, references, everything). The schema
generator decides scalar-vs-list **only** from the `[]` suffix on `valueType`. The `multiple`
attribute is a *widget* concern (it tells the Coral/Granite dialog to render a multifield "add
more" UI) and is authored alongside the `[]` valueType for a good authoring experience, but it is
**not** what the GraphQL schema generator reads. Author both together, but always verify the
`[]` suffix is present — it is the one that matters.

| `metaType` | Single `valueType` | Multi `valueType` (the one that matters) | Multi `sling:resourceType` |
|---|---|---|---|
| `text-single` | `string` | **`string[]`** | `.../form/multifield` (wrapping a `.../form/textfield`, `name` matching the multifield) |
| `reference` (asset) | `string/reference` | `string/reference[]` | `.../fragmentreference` (unchanged — see Option B above) |
| `fragment-reference` | `string/content-fragment` | `string/content-fragment[]` (Option A, editor-only) or `string/reference[]` (Option B, hand-authorable) | see reference-field rows above |
| `boolean`, `enumeration`, `number`, `date` | (undocumented / not confirmed as of this writing — check the live `/libs/settings/dam/cfm/models/formbuilderconfig/datatypes` registry before hand-authoring a multi-value variant of any of these; do not extrapolate from the table above) | | |

**Symptom:** a plain multi-value field (parallel string arrays, tag lists, etc. — not a
fragment/asset reference) resolves as `null` even though the underlying JCR property is a
correctly-populated array (verify with `GET <fragment-path>/jcr:content/data/master.json`).

**Root cause, confirmed live (2026-08):** the field was authored with `valueType="string"` +
`multiple="{Boolean}true"` instead of `valueType="string[]"`. Introspecting the model's GraphQL
type (`{ __type(name: "<Model>Model") { fields { name type { kind ofType { name } } } } }`) shows
the field as `kind: SCALAR` (should be `kind: LIST`) — that mismatch is the tell.

**Fix:** change `valueType="string"` → `valueType="string[]"` on the field (keep
`sling:resourceType="granite/ui/components/coral/foundation/form/multifield"` and the inner
`<field>` node unchanged — those were never the problem). This can be hand-authored and applied
live via a Sling POST to the field node (`valueType=string[]`) for immediate verification before
packaging, then shipped the same way in the `ui.content` `.content.xml`.

**Before hand-authoring ANY multi-value CF Model field you haven't built once in the CF Model
Editor UI:** check `GET /libs/settings/dam/cfm/models/formbuilderconfig/datatypes.infinity.json`
on a live instance first and read the `valueType` array for that `metaType` — the multi-value
entry is always the second element and it always carries a `[]` suffix. Do not assume
`multiple="{Boolean}true"` is sufficient for a field type not yet in the table above.

---

## Symptom: A multi-value field delivers MORE elements than authored (3 intended → 7 returned)

The field resolves as a list correctly, the JCR property is a genuine array, and the XML is
syntactically valid — but the element count is wrong and the text is fragmented mid-sentence.

**Root cause:** FileVault DocView's compact multi-value syntax is
`attr="[v1,v2,v3]"` — the comma is the **element separator**, so every literal comma *inside* a
value is parsed as another separator. One intended element containing prose commas silently
becomes several elements:

```xml
<!-- WRONG — 3 intended values, parses as 7 elements -->
highlightBodies="[Finance the truck, the trailer, or the tools — approved against the job, not
  just your credit history.,Cover payroll between draws so your crew gets paid on time, every
  time.,Get a funding decision before the crew clocks out.]"
```

**Fix — escape every literal comma inside a value with `\,`**, leaving only the true
element-separator commas bare:

```xml
<!-- RIGHT — 3 elements; internal commas escaped -->
highlightBodies="[Finance the truck\, the trailer\, or the tools — approved against the job\, not
  just your credit history.,Cover payroll between draws so your crew gets paid on time\, every
  time.,Get a funding decision before the crew clocks out.]"
```

The same applies to `\\` (literal backslash) and to `[`/`]` at the very start/end of a value.

**Verify by reading the STORED value back — never by re-reading the source file.** The source
file's own commas are exactly what fooled you the first time:

```bash
curl -s -u admin:admin \
  "$HOST/content/dam/<project>/fragments/<f>/jcr:content/data/master.json" \
  | node -e 'const d=JSON.parse(require("fs").readFileSync(0));
             for (const [k,v] of Object.entries(d)) if (Array.isArray(v)) console.log(k, v.length);'
```

Assert the **array length** per field, not just that values look plausible. Cardinality drift is
the tell; spot-checking individual strings will miss it.

**Why it matters downstream:** consumers that zip parallel arrays (title[] + body[]) will pair the
wrong elements once cardinalities diverge, producing visibly garbled output from content that
"built fine".

---

## Symptom: A content fix is correct in source but never appears on the instance after redeploy

You corrected a `.content.xml`, rebuilt, redeployed, and the delivered value is **byte-identical to
the old broken one**. Rebuilding again changes nothing.

**Diagnosis.** Read the stored node back and compare its value — and its `jcr:created` — against
the deploy you just ran. A `jcr:created` timestamp that predates the rebuild proves the node was
never touched: the package installed, but that subtree was skipped.

**Root cause:** the covering filter in `ui.content/src/main/content/META-INF/vault/filter.xml`
uses an import mode that only *adds* nodes:

```xml
<!-- mode="merge" NEVER updates a node that already exists in the repository -->
<filter root="/content/dam/<project>/fragments" mode="merge"/>
```

`merge` adds missing nodes and leaves existing ones alone, so once a fragment has been created by
any earlier deploy, **every subsequent correction silently no-ops** — no error, no warning.

**Fix:** use an import mode that updates existing content for any subtree you expect to redeploy:

```xml
<filter root="/content/dam/<project>/fragments" mode="update"/>
```

- `update` — adds new nodes **and** updates existing ones. The right default for redeployable
  seeded content.
- `merge` — add-only. Correct only for content you deliberately want to author once and never
  overwrite (genuinely author-owned mutable content).
- `replace` — deletes and recreates the subtree. Destructive; it discards author edits, so treat a
  switch to `replace` as an escalation, never a convenience.

**Guardrail:** a filter-mode change is meaningful — never accidental. When seeding content that
later runs will correct, choose `update` deliberately at authoring time rather than discovering
this after a fix "doesn't deploy". And always confirm a correction landed by reading the stored
value back post-deploy; a green build is not evidence that content changed.

---

## Symptom: A field you DELETED from `.content.xml` is still delivered after redeploy

You removed an attribute from the fragment's `<master>` element, rebuilt, redeployed — and the
GraphQL response still returns the old value. Unlike the `merge`-mode trap above, the rest of your
edits in the same file *did* land, which makes this one especially confusing.

**Root cause:** `mode="update"` **adds and updates** properties present in the package. It does
**not delete** properties that are absent from it. FileVault has no way to distinguish "the author
intentionally removed this" from "the package simply doesn't manage this property", so an
already-existing JCR property survives every redeploy once created. Removing a line from
`.content.xml` is therefore **not** a content deletion — it only stops the package from *setting*
that property.

**Diagnose by reading the stored node, not the source file:**

```bash
curl -s -u admin:admin \
  "$HOST/content/dam/<project>/fragments/<f>/jcr:content/data/master.json" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      const o=JSON.parse(d);
      for(const k of Object.keys(o).sort()) if(!k.startsWith("jcr:")) console.log(k);});'
```

Any property listed here that no longer exists in your `.content.xml` is a stale leftover.

**Fix — pick per situation:**

| Situation | Fix |
|---|---|
| Dev/test instance, want it gone now | Sling POST with the `@Delete` suffix: `curl -u admin:admin -F"fieldName@Delete=" "$HOST/<fragment>/jcr:content/data/master"`. Removes the property cleanly; a later redeploy will not re-add it (the package no longer sets it). |
| The field should exist but be empty | Author it explicitly as an empty value (`fieldName=""`) rather than removing the line. Deterministic on every deploy, and falsy for consumer conditionals. |
| Whole subtree must mirror the package exactly | `mode="replace"` on that filter root — **destructive**: it deletes and recreates the subtree, discarding any author edits. Treat as an escalation, never a convenience. |

**Guardrail:** after removing a field, verify by reading the stored node back — a green build and a
"the source no longer has it" check will both pass while the stale value is still being delivered.
This bites hardest on **multi-value** fields (a removed `string[]` keeps its full old array) and on
optional CTA/caption fields, where a stale value renders as UI content that exists nowhere in your
source of truth.

---

## Symptom: Query returns empty `items: []`

**Probable causes:**

| Cause | Fix |
|---|---|
| No fragments published to publish | Activate fragments in author: Assets → navigate to fragments folder → activate |
| Fragment has wrong model reference | Check fragment's `jcr:content/data/master` in CRXDE — `dam:cfm:model` must point to the correct model path |
| Filter too restrictive | Test without the filter first; if data appears, narrow down the filter |
| Fragment is in wrong DAM path | The endpoint's `configurationPath` scopes the search — fragments must be under `/content/dam` within the site's content tree |
| Fragment not published | On publish only — check `/crx/de` on publish instance to confirm fragment node exists |

---

## Symptom: Component renders with empty data / no speakers shown

**Probable causes:**

| Cause | Fix |
|---|---|
| Sling Model `@PostConstruct` throws silently | Add `LOG.error` in catch block; check `error.log` on the AEM instance |
| `FragmentQueryService` not bound — `@OSGiService` is null | Check Felix Console `/system/console/components` — is `FragmentQueryService` Active? |
| Wrong endpoint URL in OSGi config | Verify `com.{project}.core.services.FragmentQueryService.cfg.json` has correct URL |
| Service token missing on author | Add token to `config.author/` OSGi config; check Cloud Manager environment secrets |
| Model getter returns `null` instead of empty list | Fix Sling Model to return `Collections.emptyList()` on failure |

---

## Symptom: 401 Unauthorized on publish

```
GET /graphql/execute.json/{project}/all-speakers → 401
```

**Probable causes:**

| Cause | Fix |
|---|---|
| Dispatcher blocks unauthenticated requests to `/graphql/` | Add a Dispatcher `allow` rule for `/graphql/execute.json/*` |
| `require.authentication=true` in GraphQL servlet config | Set to `false` for public content; or include credentials in requests |
| Fragment path not published or ACL denies `everyone` | Activate fragments; check ACL on `/content/dam/<project>/fragments` |

---

## Symptom: Rich text renders as escaped HTML entities

```html
<!-- Shows: &lt;p&gt;Speaker bio text&lt;/p&gt; -->
```

**Fix:** Use `@ context='html'` in HTL:

```html
${speaker.bioHtml @ context='html'}
```

If you used `@ context='text'` by mistake, switch to `'html'`. The `'html'` context is already safe for authored rich text sanitised by AEM.

---

## Symptom: CORS error from SPA client

```
Access to fetch at '/graphql/execute.json/{project}/all-speakers' from origin 'https://app.example.com' 
has been blocked by CORS policy
```

**Fix:** Add a CORS config in `ui.config`:

```json
// com.adobe.granite.cors.impl.CORSPolicyImpl~graphql.cfg.json
{
  "alloworigin": ["https://app.example.com"],
  "allowedpaths": ["/graphql/execute.json/.*"],
  "allowedmethods": ["GET"],
  "maxage": "{Long}1800"
}
```

---

## Useful Diagnostics

### Check if a model is enabled via curl

```bash
curl -u admin:admin \
  "http://localhost:4502/conf/{config}/settings/dam/cfm/models/speaker-profile/jcr:content.json" \
  | jq '.status'      # expect "enabled"
```

### Introspect the schema (confirm type + query-field names)

```bash
curl -u admin:admin -X POST -H "Content-Type: application/json" \
  -d '{"query":"{__schema{queryType{fields{name}}}}"}' \
  "http://localhost:4502/content/_cq_graphql/{config}/endpoint.json"
```

### Register + execute a persisted query

```bash
# register (delete-then-create for idempotency)
curl -u admin:admin -X DELETE "http://localhost:4502/graphql/persist.json/{config}/all-speakers"
curl -u admin:admin -X PUT -H "Content-Type: application/json" \
  --data @all-speakers.json "http://localhost:4502/graphql/persist.json/{config}/all-speakers"
# execute
curl -u admin:admin "http://localhost:4502/graphql/execute.json/{config}/all-speakers"
```

### List all fragment instances under a path

```bash
curl -u admin:admin \
  "http://localhost:4502/bin/querybuilder.json?path=/content/dam/{project}/fragments&type=dam:Asset&property=jcr:content/contentFragment&property.value=true&p.limit=50"
```

### Tail AEM error log for GraphQL exceptions

```bash
tail -f crx-quickstart/logs/error.log | grep -i "graphql\|fragment\|cfm"
```

---

## See Also

- [`anatomy.md`](anatomy.md) — the five-layer chain helps identify which layer is broken.
- [`graphql-endpoint.md`](graphql-endpoint.md) — endpoint node requirements.
- [`persisted-queries.md`](persisted-queries.md) — query syntax reference.
- [`java-integration.md`](java-integration.md) — service and OSGi config setup.
