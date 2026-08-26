# Content Fragment Models

A CF Model defines the schema for a fragment type — the fields authors fill in and the types of data each field holds. The schema directly determines the GraphQL types that AEM generates.

## Where Models Live

```
/conf/<project>/settings/dam/cfm/models/<model-name>/
└── .content.xml
```

Models are managed through the **Content Fragment Model Editor** at `/cf#/models`. The JCR representation under `ui.content` is the initial seed — authors own evolution after first deploy.

## Correct Node Structure

The root must be `cq:Template`. The `jcr:content` child must be `cq:PageContent` (not `nt:unstructured`). Fields go inside `jcr:content/model/cq:dialog/content/items/`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:granite="http://www.adobe.com/jcr/granite/1.0"
          jcr:primaryType="cq:Template"
          allowedPaths="[/content/dam/<project>(/.*)?]"
          ranking="{Long}100">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    jcr:title="<Model Title>"
    description="<Description>"
    status="enabled"
    sling:resourceType="dam/cfm/models/console/components/data/entity/default"
    sling:resourceSuperType="dam/cfm/models/console/components/data/entity"
    cq:scaffolding="/conf/<project>/settings/dam/cfm/models/<model-name>/jcr:content/model"
    cq:templateType="/libs/settings/dam/cfm/model-types/fragment">
    <metadata jcr:primaryType="nt:unstructured"/>
    <model
      jcr:primaryType="cq:PageContent"
      dataTypesConfig="/mnt/overlay/settings/dam/cfm/models/formbuilderconfig/datatypes"
      sling:resourceType="wcm/scaffolding/components/scaffolding"
      maxGeneratedOrder="20"
      cq:targetPath="/content/dam/<project>">
      <cq:dialog
        jcr:primaryType="nt:unstructured"
        sling:resourceType="cq/gui/components/authoring/dialog">
        <content
          jcr:primaryType="nt:unstructured"
          sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns">
          <items
            jcr:primaryType="nt:unstructured"
            maxGeneratedOrder="20">
            <!-- field nodes here -->
          </items>
        </content>
      </cq:dialog>
    </model>
  </jcr:content>
</jcr:root>
```

**Critical points:**
- `jcr:content/jcr:primaryType` must be `cq:PageContent` — **not** `nt:unstructured` or `dam:AssetContent`
- `model/jcr:primaryType` must also be `cq:PageContent`
- `status="enabled"` activates the model — **not** `active="{Boolean}true"`
- All four `sling:resourceType`, `sling:resourceSuperType`, `cq:scaffolding`, `cq:templateType` are required on `jcr:content`
- `cq:scaffolding` must point to the exact model path within this model's own `jcr:content/model`

## Field Node Structure

Each field is a child node of `items`. Node names can be any valid XML identifier (human-readable names work fine). Every field needs these properties:

| Property | Required | Notes |
|---|---|---|
| `jcr:primaryType` | Yes | Always `nt:unstructured` |
| `metaType` | Yes | Determines the field type (see table below) |
| `name` | Yes | JCR property name and GraphQL field name |
| `fieldLabel` | Yes | Label shown in the CF editor |
| `sling:resourceType` | Yes | The Granite UI component for this field type |
| `valueType` | Yes | How the value is stored in JCR |
| `listOrder` | Yes | Integer controlling field order in the editor |
| `showEmptyInReadOnly` | Yes | Use `"true"` |
| `renderReadOnly` | Yes | Use `"false"` |
| `granite:data` | Yes* | Empty `nt:unstructured` child node (required for most types) |

## Field Types and Their Properties

### text-single — Single-line text

```xml
<myField
  jcr:primaryType="nt:unstructured"
  listOrder="1"
  valueType="string"
  showEmptyInReadOnly="true"
  metaType="text-single"
  required="on"
  name="myField"
  maxlength="255"
  fieldLabel="My Field"
  sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured"/>
</myField>
```

Remove `required="on"` for optional fields. `maxlength="255"` is the recommended default.

**Multiple values (a plain `String[]`, e.g. parallel label/href arrays):** do NOT just bolt
`multiple="{Boolean}true"` onto `valueType="string"` — that is a no-op for the GraphQL schema
generator and the field will silently resolve as scalar `String` (returns `null` for real
multi-value data). Confirmed live against
`/libs/settings/dam/cfm/models/formbuilderconfig/datatypes` (`text-single` entry:
`valueType=["string","string[]"]`, `fieldResourceType=[".../form/textfield",".../form/multifield"]`)
— exactly analogous to the `fragment-reference` multi-value rule below. Correct shape:

```xml
<myMultiField
  jcr:primaryType="nt:unstructured"
  listOrder="1"
  valueType="string[]"
  multiple="{Boolean}true"
  showEmptyInReadOnly="true"
  metaType="text-single"
  name="myMultiField"
  fieldLabel="My Multi Field"
  sling:resourceType="granite/ui/components/coral/foundation/form/multifield"
  renderReadOnly="false">
  <field
    jcr:primaryType="nt:unstructured"
    name="myMultiField"
    fieldLabel="Value"
    maxlength="255"
    sling:resourceType="granite/ui/components/coral/foundation/form/textfield"/>
  <granite:data jcr:primaryType="nt:unstructured"/>
</myMultiField>
```

Note both `valueType="string[]"` (the part that actually controls the schema) AND
`multiple="{Boolean}true"` (the part that controls the Coral dialog widget) — author them
together, but if you ever see this field resolve `null` in GraphQL while the underlying JCR
property (`GET <fragment>/jcr:content/data/master.json`) is a correctly populated array, check
the `[]` suffix on `valueType` first. See `validation.md`'s "GENERAL RULE" section for the same
pitfall across every other field type.

### text-multi — Multi-line / rich text

```xml
<bio
  jcr:primaryType="nt:unstructured"
  listOrder="4"
  translatable="true"
  valueType="string/multiline"
  showEmptyInReadOnly="true"
  metaType="text-multi"
  cfm-element="Biography"
  name="bio"
  sling:resourceType="dam/cfm/admin/components/authoring/contenteditor/multieditor"
  renderReadOnly="false"
  default-mime-type="text/html"/>
```

`cfm-element` is the display name for the rich text element in the editor (can match fieldLabel). No `granite:data` child needed. In GraphQL, this becomes a `MultiFormatString` with `.html` and `.plaintext` sub-fields.

### boolean — Checkbox

```xml
<featured
  jcr:primaryType="nt:unstructured"
  listOrder="6"
  valueType="boolean"
  showEmptyInReadOnly="true"
  metaType="boolean"
  name="featured"
  fieldLabel="Featured Speaker"
  sling:resourceType="granite/ui/components/coral/foundation/form/checkbox"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured"/>
</featured>
```

### enumeration — Dropdown (single-select)

```xml
<track
  jcr:primaryType="nt:unstructured"
  listOrder="2"
  valueType="string"
  showEmptyInReadOnly="true"
  metaType="enumeration"
  name="track"
  fieldLabel="Track"
  emptyOption="{Boolean}true"
  sling:resourceType="granite/ui/components/coral/foundation/form/select"
  renderReadOnly="false">
  <optionsmultifield jcr:primaryType="nt:unstructured">
    <item0
      jcr:primaryType="nt:unstructured"
      fieldLabel="Fiscal Policy"
      fieldValue="fiscal"/>
    <item1
      jcr:primaryType="nt:unstructured"
      fieldLabel="Climate &amp; Sustainability"
      fieldValue="climate"/>
  </optionsmultifield>
  <datasource
    jcr:primaryType="nt:unstructured"
    variant="default"
    sling:resourceType="dam/cfm/admin/components/datasources/optionrendererenumeration"/>
  <granite:data jcr:primaryType="nt:unstructured"/>
</track>
```

Options go in `optionsmultifield/item0..N`. Each item has `fieldLabel` (author UI) and `fieldValue` (stored value). `emptyOption="{Boolean}true"` adds a blank first option.

### reference — Content/asset reference (image, document)

```xml
<headshot
  jcr:primaryType="nt:unstructured"
  filter="hierarchy"
  listOrder="5"
  valueType="string/reference"
  nameSuffix="contentReference"
  showEmptyInReadOnly="true"
  metaType="reference"
  rootPath="/content/dam/{project}"
  validation="cfm.validation.contenttype.image"
  name="headshot"
  fieldLabel="Headshot Image"
  showThumbnail="true"
  sling:resourceType="dam/cfm/models/editor/components/contentreference"
  renderReadOnly="false">
  <granite:data
    jcr:primaryType="nt:unstructured"
    showThumbnail="true"
    thumbnail-validation="cfm.validation.thumbnail.show"/>
</headshot>
```

`rootPath` constrains the DAM path browser. `validation="cfm.validation.contenttype.image"` limits to image assets.

### fragment-reference — Reference to another Content Fragment

Use this (NOT `reference`) when a field points at other **fragments** (e.g. a landing-page model
that aggregates hero/product/testimonial fragments). `reference` is for DAM **assets**;
`fragment-reference` is for fragments. Getting this wrong is a common, silent failure: a
fragment-reference authored with `valueType="string/reference"` still generates a *single*
`Reference` field, so multi-valued instance data returns `null`.

**Single fragment reference:**

```xml
<hero
  jcr:primaryType="nt:unstructured"
  filter="fragments"
  listOrder="3"
  valueType="string/content-fragment"
  metaType="fragment-reference"
  required="on"
  rootPath="/content/dam/<project>/fragments"
  cfModelPath="/conf/<project>/settings/dam/cfm/models/hero"
  name="hero"
  fieldLabel="Hero"
  showThumbnail="true"
  sling:resourceType="dam/cfm/models/editor/components/fragmentreference"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured" showThumbnail="true"/>
</hero>
```

**Multiple fragment references (allow multiple):** two things change — the `valueType` gets the
`[]` array suffix AND the `sling:resourceType` gets the `/multifield` suffix:

```xml
<products
  jcr:primaryType="nt:unstructured"
  filter="fragments"
  listOrder="4"
  valueType="string/content-fragment[]"
  metaType="fragment-reference"
  rootPath="/content/dam/<project>/fragments"
  cfModelPath="/conf/<project>/settings/dam/cfm/models/product"
  name="products"
  fieldLabel="Products"
  sling:resourceType="dam/cfm/models/editor/components/fragmentreference/multifield"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured"/>
</products>
```

Source of truth for these tokens is AEM's own field-type config at
`/libs/settings/dam/cfm/models/formbuilderconfig/datatypes` (`fragment-reference` entry:
`valueType=["string/content-fragment","string/content-fragment[]"]`,
`fieldResourceType=[".../fragmentreference",".../fragmentreference/multifield"]`).

> **Do NOT use `multiple="{Boolean}true"` to make a reference multi-valued** — it has no effect on
> the generated schema. The `[]` in `valueType` + the `/multifield` resource type are what make
> it a list. The multifield variant carries additional child structure; the most reliable way to
> author it is to build the field once in the **CF Model Editor UI** (Fragment Reference → *Allow
> Multiple*) and export the resulting JCR.

In GraphQL both variants resolve to the `Reference` union; query with inline fragments
`... on <TargetModelName>Model { ... }`. Single → returns an object; multiple → returns an array.

#### Multi-valued references: two options (know the trade-off)

Symptom that sends you here: a multi-value reference field returns `null` in GraphQL while
single ones work — because the field is defined single but the fragment stores an array of paths.
There are two ways to make it a list, and the difference matters if you can't use the UI:

| Option | How | GraphQL | Authoring dialog | Hand-authorable in JCR? |
|---|---|---|---|---|
| **A — proper multifield** | `valueType="string/content-fragment[]"` + `.../fragmentreference/multifield`, set via **CF Model Editor → Allow Multiple** | `[Reference]`, typed | Real "add more" multifield | **No** — needs the editor. Editing the raw node fails: the schema generator drops the field with `SCHEMA_INCOMPLETE_FIELD_REMOVED … Missing nested model(s) ''` because the target-model link is only written by the editor (not `cfModelPath`/`fragmentModelPath`/any plain property). |
| **B — generic list** | `valueType="string/reference[]"` (keep the single `.../fragmentreference` resource type) | `[Reference]` (same union) | Single path-picker (authors can't add multiple in the UI) | **Yes** — a plain property edit; deploys via content package with zero rework |

Both make `execute.json` return the full array (the union still resolves each path to its
`<Name>Model`, so the query is identical: `field { ... on <Name>Model { … } }`). Prefer **A** when
authors edit these references in the AEM UI. Use **B** when the data is seeded/managed
programmatically (headless) and you need a package-only, no-UI-step fix — it's the only one you
can author purely in JCR. Diagnose which is happening with the endpoint's `.schemaerrors` selector
(`GET /content/cq:graphql/<config>/endpoint.schemaerrors`).

### number — Integer or decimal

```xml
<groupSize
  jcr:primaryType="nt:unstructured"
  listOrder="3"
  valueType="long"
  typeHint="long"
  showEmptyInReadOnly="true"
  metaType="number"
  name="groupSize"
  step="1"
  fieldLabel="Group Size"
  sling:resourceType="granite/ui/components/coral/foundation/form/numberfield"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured"/>
</groupSize>
```

Use `valueType="long"` + `typeHint="long"` for integers; `valueType="double"` + `typeHint="double"` for decimals.

### date — Date/time picker

```xml
<eventDate
  jcr:primaryType="nt:unstructured"
  listOrder="5"
  valueType="calendar/datetime"
  showEmptyInReadOnly="true"
  metaType="date"
  name="eventDate"
  fieldLabel="Event Date"
  sling:resourceType="dam/cfm/models/editor/components/datatypes/datepicker"
  renderReadOnly="false">
  <granite:data jcr:primaryType="nt:unstructured"/>
</eventDate>
```

## Field Type Quick Reference

| `metaType` | `sling:resourceType` | `valueType` | GraphQL type |
|---|---|---|---|
| `text-single` | `granite/ui/components/coral/foundation/form/textfield` | `string` | `String` |
| `text-single` (multiple, e.g. parallel label/href arrays) | `granite/ui/components/coral/foundation/form/multifield` (wraps a `.../textfield`) | **`string[]`** (bracket suffix is what matters — `multiple="{Boolean}true"` alone is a no-op) | `[String]` |
| `text-multi` | `dam/cfm/admin/components/authoring/contenteditor/multieditor` | `string/multiline` | `MultiFormatString` |
| `boolean` | `granite/ui/components/coral/foundation/form/checkbox` | `boolean` | `Boolean` |
| `enumeration` | `granite/ui/components/coral/foundation/form/select` | `string` | `String` |
| `reference` (asset) | `dam/cfm/models/editor/components/contentreference` | `string/reference` | `Reference` union — query `... on ImageRef { _path }` |
| `fragment-reference` (single) | `dam/cfm/models/editor/components/fragmentreference` | `string/content-fragment` | `Reference` union — query `... on <Name>Model { }` |
| `fragment-reference` (multiple, proper multifield) | `dam/cfm/models/editor/components/fragmentreference/multifield` | `string/content-fragment[]` | `[Reference]` — needs CF Model Editor (Option A above) |
| `fragment-reference` (multiple, JCR-only) | `dam/cfm/models/editor/components/fragmentreference` | `string/reference[]` | `[Reference]` — hand-authorable, single-picker dialog (Option B above) |
| `number` | `granite/ui/components/coral/foundation/form/numberfield` | `long` or `double` | `Int` or `Float` |
| `date` | `dam/cfm/models/editor/components/datatypes/datepicker` | `calendar/datetime` | `Calendar` |

## Activating a Model

Set `status="enabled"` on `jcr:content`. This is what makes the model appear in:
- The Create Fragment wizard
- The auto-generated GraphQL schema
- GraphiQL explorer

**Do not use `active="{Boolean}true"`** — that is wrong and will not activate the model.

## Configuring `/content/dam` for the Model

The DAM folder where fragments will be created must have `cq:conf` pointing to your `/conf` root:

```bash
curl -u admin:admin -X POST \
  http://localhost:4502/content/dam/<project>/jcr:content \
  -d "cq:conf=/conf/<project>"
```

Without this, the CF creation wizard will not find the models even if they are enabled.

## Complete Working Example — speaker-profile

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:granite="http://www.adobe.com/jcr/granite/1.0"
          jcr:primaryType="cq:Template"
          allowedPaths="[/content/dam/{project}(/.*)?]"
          ranking="{Long}100">
  <jcr:content
    jcr:primaryType="cq:PageContent"
    jcr:title="Speaker Profile"
    description="A conference speaker with name, role, organisation, biography and headshot."
    status="enabled"
    sling:resourceType="dam/cfm/models/console/components/data/entity/default"
    sling:resourceSuperType="dam/cfm/models/console/components/data/entity"
    cq:scaffolding="/conf/{project}/settings/dam/cfm/models/speaker-profile/jcr:content/model"
    cq:templateType="/libs/settings/dam/cfm/model-types/fragment">
    <metadata jcr:primaryType="nt:unstructured"/>
    <model
      jcr:primaryType="cq:PageContent"
      dataTypesConfig="/mnt/overlay/settings/dam/cfm/models/formbuilderconfig/datatypes"
      sling:resourceType="wcm/scaffolding/components/scaffolding"
      maxGeneratedOrder="20"
      cq:targetPath="/content/dam/{project}">
      <cq:dialog
        jcr:primaryType="nt:unstructured"
        sling:resourceType="cq/gui/components/authoring/dialog">
        <content
          jcr:primaryType="nt:unstructured"
          sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns">
          <items
            jcr:primaryType="nt:unstructured"
            maxGeneratedOrder="20">
            <speakerName
              jcr:primaryType="nt:unstructured"
              listOrder="1"
              valueType="string"
              showEmptyInReadOnly="true"
              metaType="text-single"
              required="on"
              name="speakerName"
              maxlength="255"
              fieldLabel="Full Name"
              sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
              renderReadOnly="false">
              <granite:data jcr:primaryType="nt:unstructured"/>
            </speakerName>
            <jobTitle
              jcr:primaryType="nt:unstructured"
              listOrder="2"
              valueType="string"
              showEmptyInReadOnly="true"
              metaType="text-single"
              name="jobTitle"
              maxlength="255"
              fieldLabel="Job Title / Role"
              sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
              renderReadOnly="false">
              <granite:data jcr:primaryType="nt:unstructured"/>
            </jobTitle>
            <bio
              jcr:primaryType="nt:unstructured"
              listOrder="3"
              translatable="true"
              valueType="string/multiline"
              showEmptyInReadOnly="true"
              metaType="text-multi"
              cfm-element="Biography"
              name="bio"
              sling:resourceType="dam/cfm/admin/components/authoring/contenteditor/multieditor"
              renderReadOnly="false"
              default-mime-type="text/html"/>
            <headshot
              jcr:primaryType="nt:unstructured"
              filter="hierarchy"
              listOrder="4"
              valueType="string/reference"
              nameSuffix="contentReference"
              showEmptyInReadOnly="true"
              metaType="reference"
              rootPath="/content/dam/{project}"
              validation="cfm.validation.contenttype.image"
              name="headshot"
              fieldLabel="Headshot Image"
              showThumbnail="true"
              sling:resourceType="dam/cfm/models/editor/components/contentreference"
              renderReadOnly="false">
              <granite:data
                jcr:primaryType="nt:unstructured"
                showThumbnail="true"
                thumbnail-validation="cfm.validation.thumbnail.show"/>
            </headshot>
            <featured
              jcr:primaryType="nt:unstructured"
              listOrder="5"
              valueType="boolean"
              showEmptyInReadOnly="true"
              metaType="boolean"
              name="featured"
              fieldLabel="Featured Speaker"
              sling:resourceType="granite/ui/components/coral/foundation/form/checkbox"
              renderReadOnly="false">
              <granite:data jcr:primaryType="nt:unstructured"/>
            </featured>
          </items>
        </content>
      </cq:dialog>
    </model>
  </jcr:content>
</jcr:root>
```

## GraphQL Types Generated

From the `speaker-profile` model above, AEM generates (confirm with `{ __schema { types { name } } }`):

```graphql
type SpeakerProfileModel {          # NOTE the "Model" suffix — NOT "SpeakerProfile"
  speakerName: String
  jobTitle: String
  bio: MultiFormatString
  headshot: Reference               # reference/fragment-reference → Reference UNION
  featured: Boolean
  _path: ID
  _metadata: TypedMetaData
  _variations: [String]
}

extend type QueryType {
  speakerProfileList(filter: ..., sort: ..., limit: Int, offset: Int): SpeakerProfileModelResults
  speakerProfileByPath(_path: String!, variation: String): SpeakerProfileModelResult
  speakerProfileById(_id: String!, variation: String): SpeakerProfileModelResult
}
```

Naming rules that queries must match (these are the two most common query-breakers). Note the
**type** carries a `Model` suffix but the query **field names do not**:
- The object type is **`<ModelName>Model`** — model `speaker-profile` → `SpeakerProfileModel`
  (PascalCase + `Model` suffix). Inline fragments use this: `... on SpeakerProfileModel { }`.
- Query fields are **`<modelName>List` / `<modelName>ByPath` / `<modelName>ById`** — camelCase
  model name, **no** `Model` in the field name (`speakerProfileByPath`, `heroList`). Verify the
  exact prefix in GraphiQL.
- **`byPath` takes `_path: String!`** (not `path: ID!`). `byPath`/`byId` return a wrapper with an
  `item { }`; `list` returns a wrapper with `items { }`.

Rich text (`text-multi`) becomes `MultiFormatString` with `.html` and `.plaintext` sub-fields —
render via `${item.bio.html @ context='html'}`.

## Model Versioning and Field Changes

| Change | Impact | Safe? |
|---|---|---|
| Add a new optional field | New field in GraphQL; existing queries unaffected | ✅ Safe |
| Rename a field | Old field name disappears from schema; all queries using it break | ❌ Breaking |
| Delete a field | Data retained on fragments but inaccessible via GraphQL | ❌ Breaking |
| Change `metaType` | Type mismatch; schema and stored data diverge | ❌ Breaking |
| Add a required field | New fragments must fill it; existing fragments have empty value | ⚠️ Caution |

Treat model changes like database migrations — coordinate with query consumers before deploying.

## Folder for Models

Each model is a sibling folder under `conf/<project>/settings/dam/cfm/models/`:

```
/conf/{project}/settings/dam/cfm/models/
├── speaker-profile/
├── session-card/
└── venue-info/
```

## See Also

- [`anatomy.md`](anatomy.md) — how models fit into the full delivery chain.
- [`persisted-queries.md`](persisted-queries.md) — writing queries against the generated schema.
- [`java-integration.md`](java-integration.md) — using generated types from Java.
- **Adobe — CF Model Editor:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/assets/content-fragments/content-fragments-models>
