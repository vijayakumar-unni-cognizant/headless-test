# Editable Templates Skill

AEM as a Cloud Service authoring and review skill for **editable templates** — the template-types, templates, content policies, policy mappings, and allowed-component / allowed-template wiring that define the world a component lives in.

This skill complements the existing **`create-component`** skill: that skill builds the components themselves; this skill builds the templates, policies, and constraints that components live inside. Together they cover the full author-facing surface of an AEM site.

## Why This Skill Exists

The Adobe-supplied skill set covers components extensively (via `create-component`) but does not scaffold the **template-types, editable templates, policy mappings, and allowed-components wiring** that components live inside. In practice, editable templates are:

- **The number-one source of "why doesn't this work" tickets** from new AEM developers — three independent layers (`initial`, `structure`, `policies`) interact in non-obvious ways.
- **Inconsistently understood**: many projects misuse `initial/` for content that should be in `structure/`, or put allowed-components on the structure node instead of the policy.
- **Critical for governance**: `cq:allowedTemplates` and per-container allowed-components lists are how you keep different teams from creating each other's pages by mistake.

Treating editable templates as a first-class skill keeps the patterns consistent across the project and catches the common mistakes before they hit production.

## What's in This Skill

- **[`SKILL.md`](SKILL.md)** — Entry point, decision guide, critical rules, validation checklist.
- **[`references/anatomy.md`](references/anatomy.md)** — The three-layer model (`initial`, `structure`, `policies`) and how they combine at render time.
- **[`references/template-types.md`](references/template-types.md)** — Creating template types — the blueprints admins use to spawn editable templates.
- **[`references/templates.md`](references/templates.md)** — Creating editable templates as source-controlled `ui.content` definitions.
- **[`references/policies.md`](references/policies.md)** — Content policies, policy mappings, the property catalogue for common components.
- **[`references/allowed-components.md`](references/allowed-components.md)** — The `components` policy property, component groups, style system.
- **[`references/allowed-templates.md`](references/allowed-templates.md)** — `cq:allowedTemplates` on content branches and its relationship to template `allowedPaths`.
- **[`references/validation.md`](references/validation.md)** — Debugging templates, symptom → cause table, local diagnostic script.
- **[`references/recipes.md`](references/recipes.md)** — Six ready-to-use patterns plus four anti-patterns.

## When This Skill Activates

Trigger phrases include: `editable template`, `template type`, `template-type`, `content policy`, `policy mapping`, `allowed components`, `cq:allowedTemplates`, `cq:Template`, `policies/.content.xml`, `structure/.content.xml`, `initial/.content.xml`. Also activates when scaffolding any new page kind, when adding components to a container's policy, and when debugging "template not visible" / "policy not applied" / "component locked" issues.

## Relationship to Other Skills

| Skill | When to combine |
|-------|-----------------|
| **create-component** | Build the component first with `create-component`; then come here to add it to a template's allowed-components list and wire its policy. |
| **best-practices** | When a template ships a page component (`{project}/components/page`), ensure that component's Sling Model follows the resource-resolver / logging guidance. |
| **repoinit** | If a service user needs to read/write `/conf/<project>/...` (e.g., to query templates programmatically), grants are configured via `repoinit`. |
| **migration** | If you're migrating from static templates (`/apps/<project>/templates`) to editable templates, this skill covers the destination side. |

## Status

Beta. Validate every change against a local AEM SDK quickstart with the Template Editor open before pushing to Cloud Manager.

## References

- **Adobe — Page Templates (developer):** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/full-stack/components-templates/templates>
- **Adobe — Page Templates (authoring):** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/sites/authoring/page-editor/templates>
- **Adobe — Components & Templates Reference:** <https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/full-stack/components-templates/reference>
- **Core Components — Policy properties:** <https://github.com/adobe/aem-core-wcm-components>
