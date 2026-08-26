# HTL Rendering — Fragment Data in Components

This reference covers how to wire a Sling Model that provides fragment data to an HTL template, and the patterns for rendering lists, rich text, images, and nested references.

## Component Structure

A fragment-backed component follows the same structure as any other AEM component:

```
ui.apps/src/main/content/jcr_root/apps/{project}/components/speaker-list/
├── .content.xml          # componentGroup, jcr:title
├── speaker-list.html     # HTL template
└── _cq_dialog/
    └── .content.xml      # (optional) dialog for query variant / path config
```

The HTL template uses `data-sly-use` to adapt the current request to the Sling Model, then iterates over the list.

## Basic List Template

```html
<!-- speaker-list.html -->
<sly data-sly-use.model="com.{project}.core.models.SpeakerListModel"/>

<div class="speaker-list" data-sly-test="${model.speakers}">
    <div class="speaker-list__item"
         data-sly-list.speaker="${model.speakers}">
        <div class="speaker-card">
            <img class="speaker-card__headshot"
                 data-sly-test="${speaker.headshotPath}"
                 src="${speaker.headshotPath @ context='uri'}"
                 alt="${speaker.speakerName @ context='text'}"
                 loading="lazy"/>
            <div class="speaker-card__info">
                <h3 class="speaker-card__name">${speaker.speakerName @ context='text'}</h3>
                <p class="speaker-card__title">${speaker.title @ context='text'}</p>
                <div class="speaker-card__bio"
                     data-sly-test="${speaker.bioHtml}">${speaker.bioHtml @ context='html'}</div>
            </div>
        </div>
    </div>
</div>

<div class="speaker-list speaker-list--empty"
     data-sly-test="${!model.speakers}">
    <p>No speakers available.</p>
</div>
```

### Key HTL context modes

| Content | Context to use | Why |
|---|---|---|
| Plain text (name, title) | `@ context='text'` | Escapes HTML entities |
| HTML from rich-text field | `@ context='html'` | Allows safe HTML tags |
| URL / image path | `@ context='uri'` | Encodes URL-unsafe chars |
| Attribute value | `@ context='attribute'` | Escapes attribute-breaking chars |
| CSS class string | `@ context='styleToken'` | Whitelist-safe for class names |

Never use `@ context='unsafe'` unless the content is fully controlled server-side and you have verified there is no XSS risk.

## Rendering Rich Text

Rich text fields (metaType `text-rich`) return an HTML string. Render it with `@ context='html'`:

```html
<div class="content-body"
     data-sly-test="${model.bioHtml}"
     >${model.bioHtml @ context='html'}</div>
```

AEM sanitises the HTML stored in fragments against the configured allowlist. Do not add `@ context='unsafe'` — `'html'` is the correct context and is already lenient enough for authored rich text.

## Rendering Images from `content-reference` Fields

Fragment image fields return a DAM path string. Use the Core Components Image component via `data-sly-resource` or build the `<img>` tag manually:

### Simple `<img>` tag

```html
<img data-sly-test="${speaker.headshotPath}"
     src="${speaker.headshotPath @ context='uri'}"
     alt="${speaker.speakerName @ context='text'}"
     width="200" height="200"
     loading="lazy"/>
```

### Via Core Components `image` (preferred — handles srcset, WebP)

```html
<sly data-sly-resource="${'image' @ resourceType='core/wcm/components/image/v3/image',
                                    fileReference=speaker.headshotPath,
                                    alt=speaker.speakerName}"/>
```

This delegates rendering to the Core Components image component which generates responsive srcsets and WebP variants automatically.

## Rendering Nested Fragment References

When a query returns nested fragments (e.g., a session with a speaker reference), the POJO holds a nested data class:

```java
// SessionData.java
public class SessionData {
    private final String title;
    private final String track;
    private final SpeakerData speaker;  // nested
    // ... getters
}
```

HTL accesses the nested object normally:

```html
<div class="session-card" data-sly-list.session="${model.sessions}">
    <h3>${session.title @ context='text'}</h3>
    <span class="session-card__track">${session.track @ context='text'}</span>
    <div class="session-card__speaker" data-sly-test="${session.speaker}">
        <span>${session.speaker.speakerName @ context='text'}</span>
        <span>${session.speaker.title @ context='text'}</span>
    </div>
</div>
```

## Empty State Handling

Always handle the empty list case — `data-sly-test` evaluates an empty Java `List` as falsy:

```html
<sly data-sly-use.model="com.{project}.core.models.SpeakerListModel"/>

<!-- Non-empty state -->
<ul class="speaker-grid" data-sly-test="${model.speakers}"
    data-sly-list.speaker="${model.speakers}">
    <li class="speaker-grid__item">
        <span>${speaker.speakerName @ context='text'}</span>
    </li>
</ul>

<!-- Empty state -->
<p class="speaker-grid__empty" data-sly-test="${!model.speakers}">
    No speakers have been announced yet.
</p>
```

If the model returns `null` instead of an empty list, `data-sly-test` also evaluates it as falsy. Return `Collections.emptyList()` from the Sling Model's getter, never `null`.

## Authoring Dialog (Optional Query Variant Picker)

If the component needs an author to select which query to run (e.g., "all speakers" vs. "featured only"), add a select field to the dialog:

```xml
<!-- _cq_dialog/.content.xml -->
<queryVariant
    jcr:primaryType="nt:unstructured"
    sling:resourceType="granite/ui/components/coral/foundation/form/select"
    fieldLabel="Speaker Set"
    name="./queryVariant">
  <items jcr:primaryType="nt:unstructured">
    <all jcr:primaryType="nt:unstructured"
         text="All Speakers"
         value="{project}/all-speakers"/>
    <featured jcr:primaryType="nt:unstructured"
              text="Featured Only"
              value="{project}/featured-speakers"/>
  </items>
</queryVariant>
```

In the Sling Model, read the authored value and use it as the query name:

```java
@ValueMapValue(name = "queryVariant", injectionStrategy = InjectionStrategy.OPTIONAL)
private String queryVariant;

@PostConstruct
protected void init() {
    String query = (queryVariant != null && !queryVariant.isBlank())
        ? queryVariant
        : "{project}/all-speakers";
    speakers = queryService.getSpeakers(query);
}
```

## Edit Placeholders (Author Mode)

When the component renders in the authoring environment, show a placeholder if the list is empty so authors see the component in the page rather than a blank area:

```html
<sly data-sly-use.wcmmode="com.adobe.cq.sightly.WCMMode"/>

<div class="speaker-list"
     data-sly-test="${model.speakers || wcmmode.edit}">

    <div data-sly-test="${!model.speakers && wcmmode.edit}"
         class="cq-placeholder">
        Speaker List — configure the query variant in the dialog
    </div>

    <div data-sly-list.speaker="${model.speakers}">
        <!-- speaker card markup -->
    </div>
</div>
```

## Performance Notes

- **Do not call the GraphQL endpoint per item** — always fetch a list in one query, then iterate the list in HTL.
- **Cache the query result** at the OSGi service level for frequently-accessed public data (use `Caffeine` or `EhCache` with a TTL matching your CDN TTL).
- **Use `loading="lazy"` on images** below the fold.
- **Return minimal fields** in persisted queries — only request fields the HTL template actually uses. Large queries with unused fields waste parse time.

## See Also

- [`java-integration.md`](java-integration.md) — the Sling Model providing data to this template.
- [`persisted-queries.md`](persisted-queries.md) — the GraphQL query powering the model.
- [`recipes.md`](recipes.md) — complete end-to-end examples (speaker list, session agenda).
- **Adobe — Getting Started with HTL:** <https://experienceleague.adobe.com/en/docs/experience-manager-htl/content/getting-started>
