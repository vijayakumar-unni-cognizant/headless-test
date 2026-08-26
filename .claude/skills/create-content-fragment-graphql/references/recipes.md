# Recipes

Ready-to-use patterns for common Content Fragment + GraphQL scenarios. The placeholder `{project}` refers to your project name (from `.aem-skills-config.yaml`) — substitute it throughout when applying a recipe.

---

## Recipe 1 — Speaker List Component (Full Stack)

A component that displays a list of speakers fetched via a persisted query.

### CF Model seed — `speaker-profile`

```
ui.content/.../conf/{project}/settings/dam/cfm/models/speaker-profile/.content.xml
```

> **Use the canonical model shape in [`cf-models.md`](cf-models.md).** Do NOT hand-write a
> `dam:AssetContent` + `active="{Boolean}true"` + `tabs` structure — that shape does not activate
> the model. The correct root is `cq:Template`, `jcr:content` is `cq:PageContent`, activation is
> `status="enabled"`, and field `metaType`s are `text-single` / `text-multi` (rich) /
> `reference` (asset) / `fragment-reference` (fragment). See `cf-models.md` for the complete
> `speaker-profile` example and the field-type table.

```xml
<!-- abbreviated — full canonical example in cf-models.md -->
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="cq:Template" allowedPaths="[/content/dam/{config}(/.*)?]" ranking="{Long}100">
  <jcr:content jcr:primaryType="cq:PageContent" jcr:title="Speaker Profile" status="enabled"
    sling:resourceType="dam/cfm/models/console/components/data/entity/default"
    sling:resourceSuperType="dam/cfm/models/console/components/data/entity"
    cq:scaffolding="/conf/{config}/settings/dam/cfm/models/speaker-profile/jcr:content/model"
    cq:templateType="/libs/settings/dam/cfm/model-types/fragment">
    <!-- model/cq:dialog/content/items/<field> nodes per cf-models.md -->
  </jcr:content>
</jcr:root>
```

### Persisted query — `{project}/all-speakers`

```
ui.content/.../conf/{project}/settings/graphql/persistedQueries/{project}/all-speakers.json
```

```json
{
  "query": "query AllSpeakers { speakerProfileList(sort: \"speakerName ASC\") { items { speakerName jobTitle organisation bio { html } headshot { ... on ImageRef { _path width height } } featured _path } } }"
}
```

### Java POJO

```java
// core/src/main/java/com/{project}/core/models/SpeakerData.java
public final class SpeakerData {
    private final String speakerName;
    private final String jobTitle;
    private final String organisation;
    private final String bioHtml;
    private final String headshotPath;
    private final boolean featured;
    private final String path;

    // private constructor + static from(JsonObject) + getters
}
```

### Sling Model

```java
@Model(adaptables = SlingHttpServletRequest.class,
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class SpeakerListModel {
    private static final Logger LOG = LoggerFactory.getLogger(SpeakerListModel.class);

    @ValueMapValue private String queryVariant;
    @OSGiService private FragmentQueryService queryService;
    private List<SpeakerData> speakers = Collections.emptyList();

    @PostConstruct
    protected void init() {
        String query = (queryVariant != null && !queryVariant.isBlank())
            ? queryVariant : "{project}/all-speakers";
        speakers = queryService.getSpeakers(query);
    }

    public List<SpeakerData> getSpeakers() {
        return Collections.unmodifiableList(speakers);
    }
}
```

### HTL template

```html
<sly data-sly-use.model="com.{project}.core.models.SpeakerListModel"/>
<div class="speaker-list" data-sly-test="${model.speakers}">
    <article class="speaker-card" data-sly-list.speaker="${model.speakers}">
        <img src="${speaker.headshotPath @ context='uri'}"
             alt="${speaker.speakerName @ context='text'}"
             loading="lazy"
             data-sly-test="${speaker.headshotPath}"/>
        <h3>${speaker.speakerName @ context='text'}</h3>
        <p>${speaker.jobTitle @ context='text'}, ${speaker.organisation @ context='text'}</p>
        <div data-sly-test="${speaker.bioHtml}">${speaker.bioHtml @ context='html'}</div>
    </article>
</div>
```

---

## Recipe 2 — Session Agenda with Filter

Session listing filtered by track, sorted by date.

### Persisted query — `{project}/sessions-by-track`

```json
{
  "query": "query SessionsByTrack($track: String, $limit: Int = 20, $offset: Int = 0) { sessionCardList( filter: { track: { _expressions: [{ value: $track }] } } sort: \"sessionDate ASC\" limit: $limit offset: $offset ) { items { title track sessionDate roomName abstract { html } speaker { ... on SpeakerProfileModel { speakerName jobTitle _path } } _path } } }"
}
```

Usage:
```
GET /graphql/execute.json/{project}/sessions-by-track;track=fiscal;limit=10;offset=0
```

### Session model fields

```
title          text-single  required
track          enumeration  options: fiscal, climate, digital, governance
sessionDate    date-time    required
roomName       text-single
abstract       text-rich
speaker        fragment-reference  → speaker-profile model
```

---

## Recipe 3 — Hero Fragment (Single Fragment by Path)

A hero component where the author picks a single CF by path in the dialog.

### Dialog field

```xml
<fragmentPath
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/pathbrowser"
    fieldLabel="Hero Content Fragment"
    name="./fragmentPath"
    rootPath="/content/dam/{project}/fragments/heroes"
    filter="hierarchyNotFile"/>
```

### Persisted query — `{project}/hero-by-path`

```json
{
  "query": "query HeroByPath($path: String!) { conferenceHeroByPath(_path: $path) { item { headline subline ctaLabel ctaLink backgroundImage { ... on ImageRef { _path } } _path } } }"
}
```

### Sling Model

```java
@ValueMapValue private String fragmentPath;

@PostConstruct
protected void init() {
    if (fragmentPath == null || fragmentPath.isBlank()) return;
    hero = queryService.getHeroByPath(fragmentPath);
}
```

Service call:
```java
public HeroData getHeroByPath(String path) {
    GraphQlResponse response = client.runPersistedQuery("{config}/hero-by-path",
        Map.of("path", path));   // variable name matches the query's $path; the query maps it to _path
    // parse response.getData().getAsJsonObject("conferenceHeroByPath").getAsJsonObject("item")
}
```

---

## Recipe 4 — GraphQL Endpoint Setup + Persisted Query Registration

Minimal endpoint node for a new config, plus the mandatory persisted-query registration step.

### Endpoint node — `ui.content/.../content/_cq_graphql/{config}/endpoint/.content.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="nt:unstructured"
          sling:resourceType="graphql/sites/components/endpoint"
          configurationPath="/conf/{config}"/>
```

Parent `content/_cq_graphql/{config}/.content.xml` is a `sling:Folder`. (`cq:graphql` is encoded
as `_cq_graphql` on disk.) There is **no** `endpointConfig` resource type and the endpoint is not
a `cq:Page` under `/content/{config}/graphql`.

### `filter.xml` entry

```xml
<filter root="/content/cq:graphql/{config}" mode="merge"/>
<filter root="/conf/{config}/settings/graphql" mode="merge"/>
<filter root="/conf/{config}/settings/dam/cfm/models" mode="merge"/>
```

### Persisted query — package the node (no post-deploy step)

Author the query once (GraphiQL "Save as persisted query", or `PUT /graphql/persist.json/{config}/{query-name}`
with `{"query":"..."}`), then export the resulting node into `ui.content`:

```
ui.content/.../conf/{config}/settings/graphql/persistentQueries/
  .content.xml                     # sling:Folder
  {query-name}/
    .content.xml                   # nt:unstructured, sling:resourceType=graphql/persistent/query
    _jcr_content/_jcr_data.binary  # raw GraphQL query text
```
`{query-name}/.content.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="nt:unstructured" sling:resourceType="graphql/persistent/query">
    <jcr:content jcr:data="{Binary}\0" jcr:mimeType="text/html" jcr:primaryType="nt:unstructured"
        sling:resourceType="graphql/persistent/query/content"/>
</jcr:root>
```
Covered by the existing `/conf/{config}` merge filter. After deploy:
`curl -u admin:admin "http://localhost:4502/graphql/execute.json/{config}/{query-name};path=/content/dam/{config}/fragments/..."`
resolves with no manual step. (Do NOT ship a `persistedQueries/*.json` file — the servlet ignores it.)

### OSGi configs (author vs publish)

```json
// config.author/com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet.cfg.json
{ "enable.get": true, "enable.post": true, "enable.ui": true }

// config.publish/com.adobe.cq.dam.cfm.graphql.cf.GraphQlServlet.cfg.json
{ "enable.get": true, "enable.post": false, "enable.ui": false }
```

---

## Recipe 5 — Service User for Fragment Read (with `repoinit`)

See the `repoinit` skill for the full pattern. Quick summary:

**Repoinit script:**
```
create service user {project}-fragment-reader
set principal ACL for {project}-fragment-reader
  allow jcr:read on /content/dam/{project}/fragments
  allow jcr:read on /conf/{project}/settings/graphql
end
```

**ServiceUserMapper config:**
```json
// com.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-{project}-fragment-reader.cfg.json
{
  "user.mapping": ["com.{project}.core:{project}-fragment-reader=[{project}-fragment-reader]"]
}
```

**Java side** (only needed for JCR-direct pattern — not for HTTP/headless client):
```java
Map<String, Object> auth = Collections.singletonMap(
    ResourceResolverFactory.SUBSERVICE, "{project}-fragment-reader");
try (ResourceResolver resolver = factory.getServiceResourceResolver(auth)) {
    // use resolver to read fragments
}
```

---

## Anti-Patterns

### Calling the GraphQL endpoint via POST in production

```java
// WRONG — POST queries bypass CDN caching and expose schema
client.runQuery("{ speakerProfileList { items { speakerName } } }");
```

Use `runPersistedQuery("{project}/all-speakers")` instead.

### Storing the query result in `@ValueMapValue`

Fragment data is not authored on the component node — it comes from the GraphQL response. Don't try to inject it as `@ValueMapValue` (it won't be there). Use `@PostConstruct` to fetch it from the service.

### Querying without a null-check on the response

```java
// WRONG — throws NPE if GraphQL returns partial results
String name = response.getData()
    .getAsJsonObject("speakerProfileList")
    .getAsJsonArray("items")
    .get(0)
    .getAsJsonObject()
    .get("speakerName").getAsString();
```

Always check `has()` before `get()`, and handle null/empty responses in the POJO factory method.

### Shipping fragment instances in `ui.content` for production

Fragment instances are content, not application code. Shipping them in `ui.content` with `mode="replace"` will overwrite author edits on re-deploy. Use `mode="merge"` for seed fragments, and only for local development convenience. Production fragments live in the DAM and are managed by content editors.

## See Also

- [`anatomy.md`](anatomy.md) — delivery chain overview.
- [`cf-models.md`](cf-models.md) — field type reference.
- [`persisted-queries.md`](persisted-queries.md) — query syntax.
- [`java-integration.md`](java-integration.md) — service pattern and OSGi config.
- [`htl-rendering.md`](htl-rendering.md) — rendering lists and rich text.
