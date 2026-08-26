# Java Integration — Executing Persisted Queries from Sling Models

This reference covers the Java side: how to execute persisted queries using the AEM Headless Client, map results to typed POJOs, and expose them from a Sling Model for HTL consumption.

## Dependencies

Add to `core/pom.xml`:

```xml
<dependency>
  <groupId>com.adobe.aem</groupId>
  <artifactId>aem-headless-client-java</artifactId>
  <version>1.2.0</version>
  <scope>provided</scope>
</dependency>
<dependency>
  <groupId>com.google.code.gson</groupId>
  <artifactId>gson</artifactId>
  <scope>provided</scope>
</dependency>
```

The `aem-headless-client-java` artifact is bundled in the AEM SDK and is available as `provided` scope — do not embed it.

Check the AEM SDK jar for the exact version — the artifact ID is `com.adobe.aem:aem-sdk-api` and the headless client is included.

## Service User Setup

The Sling Model needs a `ResourceResolver` to access fragment content, **not** to execute the GraphQL query. The headless client accesses the query as an HTTP call using the current request context or a service credential.

For server-side rendering in a Sling Model:

1. Use `@SlingObject ResourceResolver resourceResolver` (the request's resolver — authenticated as the page visitor).
2. For background/scheduled operations, use a dedicated service user with `jcr:read` on `/content/dam/<project>/fragments/` — see the `repoinit` skill.

## Pattern 1 — Using `AEMHeadlessClient` (HTTP, for decoupled rendering)

Use this when the Sling Model calls the GraphQL endpoint over HTTP (useful for publish-side rendering when the fragment data is already public).

```java
package com.{project}.core.models;

import com.adobe.aem.graphql.client.AEMHeadlessClient;
import com.adobe.aem.graphql.client.AEMHeadlessClientBuilder;
import com.adobe.aem.graphql.client.GraphQlResponse;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.OSGiService;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class SpeakerListModel {

    private static final Logger LOG = LoggerFactory.getLogger(SpeakerListModel.class);
    private static final String PERSISTED_QUERY = "{project}/all-speakers";

    @OSGiService
    private FragmentQueryService queryService;   // see Pattern 2 for the service

    private List<SpeakerData> speakers = Collections.emptyList();

    @PostConstruct
    protected void init() {
        speakers = queryService.getSpeakers(PERSISTED_QUERY);
    }

    public List<SpeakerData> getSpeakers() {
        return Collections.unmodifiableList(speakers);
    }
}
```

## Pattern 2 — OSGi Service wrapping the headless client

Separate the HTTP call into an OSGi service so it can be tested independently and reused across models.

```java
package com.{project}.core.services;

import com.adobe.aem.graphql.client.AEMHeadlessClient;
import com.adobe.aem.graphql.client.AEMHeadlessClientBuilder;
import com.adobe.aem.graphql.client.GraphQlResponse;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.Designate;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component(service = FragmentQueryService.class, immediate = true)
@Designate(ocd = FragmentQueryService.Config.class)
public class FragmentQueryService {

    private static final Logger LOG = LoggerFactory.getLogger(FragmentQueryService.class);

    @ObjectClassDefinition(name = "{project} — Fragment Query Service")
    @interface Config {
        @AttributeDefinition(name = "AEM Base URL",
            description = "AEM host base URL, e.g. https://publish-pNNNN-eNNNN.adobeaemcloud.com. "
                + "AEMHeadlessClient appends /graphql/execute.json/<config>/<name> for persisted queries. "
                + "Do NOT put /content/.../graphql/endpoint.json here.")
        String endpoint_url() default "http://localhost:4502";

        @AttributeDefinition(name = "Service Token",
            description = "Bearer token for server-to-server access. Leave empty on publish (anonymous).")
        String service_token() default "";
    }

    private AEMHeadlessClient client;

    @Activate
    @Modified
    protected void activate(Config config) {
        AEMHeadlessClientBuilder builder = AEMHeadlessClient.builder()
            .endpoint(config.endpoint_url());
        if (!config.service_token().isBlank()) {
            builder.serviceToken(config.service_token());
        }
        client = builder.build();
    }

    public List<SpeakerData> getSpeakers(String queryName) {
        try {
            GraphQlResponse response = client.runPersistedQuery(queryName);
            JsonObject data = response.getData();
            JsonArray items = data
                .getAsJsonObject("speakerProfileList")
                .getAsJsonArray("items");
            List<SpeakerData> result = new ArrayList<>();
            for (var element : items) {
                result.add(SpeakerData.from(element.getAsJsonObject()));
            }
            return result;
        } catch (Exception e) {
            LOG.error("Failed to execute persisted query '{}': {}", queryName, e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
```

### OSGi config for the service

```json
// ui.config/.../osgiconfig/config/
// com.{project}.core.services.FragmentQueryService.cfg.json
{
  "endpoint.url": "http://localhost:4502",
  "service.token": ""
}
```

```json
// ui.config/.../osgiconfig/config.publish/
// com.{project}.core.services.FragmentQueryService.cfg.json
{
  "endpoint.url": "https://publish-pNNNN-eNNNN.adobeaemcloud.com",
  "service.token": ""
}
```

`endpoint.url` is the AEM **host base** — the headless client appends
`/graphql/execute.json/<config>/<name>`. Use `$[env:...]` / `$[secret:...]` to avoid embedding
secrets:

```json
{
  "endpoint.url": "$[env:AEM_HOST;default=http://localhost:4502]",
  "service.token": "$[secret:AEM_GRAPHQL_TOKEN;default=]"
}
```

## Pattern 3 — Direct JCR access via ContentFragmentManager (author-tier only)

For author-tier code (e.g., a workflow process step) that needs to read fragment data without an HTTP call:

```java
import com.adobe.cq.dam.cfm.ContentFragment;
import com.adobe.cq.dam.cfm.ContentFragmentException;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;

public String getSpeakerName(ResourceResolver resolver, String fragmentPath) {
    Resource fragmentResource = resolver.getResource(fragmentPath);
    if (fragmentResource == null) {
        return null;
    }
    ContentFragment fragment = fragmentResource.adaptTo(ContentFragment.class);
    if (fragment == null) {
        return null;
    }
    try {
        return fragment.getElement("speakerName").getContent();
    } catch (ContentFragmentException e) {
        LOG.warn("Could not read speakerName from {}: {}", fragmentPath, e.getMessage());
        return null;
    }
}
```

`ContentFragment` is from `com.adobe.cq.dam.cfm:dam-cfm-api` — included in the AEM SDK.

**Do not use this pattern for publish-tier components** — it requires a ResourceResolver with DAM read access and bypasses caching. Use persisted queries instead.

## Typed Data POJO

```java
package com.{project}.core.models;

import com.google.gson.JsonObject;

public class SpeakerData {

    private final String speakerName;
    private final String title;
    private final String bioHtml;
    private final String headshotPath;
    private final boolean featured;
    private final String path;

    private SpeakerData(String speakerName, String title, String bioHtml,
                        String headshotPath, boolean featured, String path) {
        this.speakerName = speakerName;
        this.title = title;
        this.bioHtml = bioHtml;
        this.headshotPath = headshotPath;
        this.featured = featured;
        this.path = path;
    }

    public static SpeakerData from(JsonObject item) {
        String name = item.has("speakerName") ? item.get("speakerName").getAsString() : "";
        String title = item.has("title") ? item.get("title").getAsString() : "";
        String bio = "";
        if (item.has("bio") && item.getAsJsonObject("bio").has("html")) {
            bio = item.getAsJsonObject("bio").get("html").getAsString();
        }
        String headshot = "";
        if (item.has("headshot") && !item.get("headshot").isJsonNull()) {
            headshot = item.getAsJsonObject("headshot").get("_path").getAsString();
        }
        boolean featured = item.has("featured") && item.get("featured").getAsBoolean();
        String path = item.has("_path") ? item.get("_path").getAsString() : "";
        return new SpeakerData(name, title, bio, headshot, featured, path);
    }

    public String getSpeakerName() { return speakerName; }
    public String getTitle() { return title; }
    public String getBioHtml() { return bioHtml; }
    public String getHeadshotPath() { return headshotPath; }
    public boolean isFeatured() { return featured; }
    public String getPath() { return path; }
}
```

## Unit Testing

Test the Sling Model with `AemContext` from `io.wcm.testing.aem-mock` and mock the `FragmentQueryService`:

```java
@ExtendWith(AemContextExtension.class)
class SpeakerListModelTest {

    private final AemContext ctx = new AemContext(ResourceResolverType.JCR_MOCK);

    @Mock
    private FragmentQueryService queryService;

    @BeforeEach
    void setup() {
        ctx.registerService(FragmentQueryService.class, queryService);
        ctx.load().json("/com/{project}/core/models/SpeakerListModelTest.json", "/content");
        ctx.currentResource("/content/speaker-list");
    }

    @Test
    void returnsSpeakersFromService() {
        when(queryService.getSpeakers("{project}/all-speakers"))
            .thenReturn(List.of(new SpeakerData(...)));
        SpeakerListModel model = ctx.request().adaptTo(SpeakerListModel.class);
        assertThat(model.getSpeakers()).hasSize(1);
        assertThat(model.getSpeakers().get(0).getSpeakerName()).isEqualTo("Jane Doe");
    }

    @Test
    void returnsEmptyListWhenServiceFails() {
        when(queryService.getSpeakers(anyString())).thenReturn(Collections.emptyList());
        SpeakerListModel model = ctx.request().adaptTo(SpeakerListModel.class);
        assertThat(model.getSpeakers()).isEmpty();
    }
}
```

## See Also

- [`htl-rendering.md`](htl-rendering.md) — consuming the model's list in HTL.
- [`persisted-queries.md`](persisted-queries.md) — the query being executed.
- [`graphql-endpoint.md`](graphql-endpoint.md) — the endpoint URL the service points to.
- [`repoinit`](../../repoinit/SKILL.md) — service user for DAM read access if using JCR pattern.
- **AEM Headless Client for Java (GitHub):** <https://github.com/adobe/aem-headless-client-java>
- **Adobe — `com.adobe.cq.dam.cfm` Java API:** <https://developer.adobe.com/experience-manager/reference-materials/cloud-service/javadoc/com/adobe/cq/dam/cfm/package-summary.html>
