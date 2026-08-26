# `.claude/` Share Checklist

What to include / exclude when zipping the agents for a teammate or another machine.

---

## Include

| Path | Why |
|---|---|
| `.claude/agents/*.md` (all 11 files incl. `ADLC-SPEC.md`) | Agent contracts — the entire ADLC infrastructure |
| `.claude/skills/` (full tree) | Bundled skills the agents invoke (`best-practices`, `create-component`, `repoinit`, `dispatcher`, etc.) — no marketplace install needed by the recipient |
| `.claude/settings.json` | Hooks + team-shared permission grants |
| `ADLC-ONBOARDING.md` (project root) | Setup walkthrough for the receiving dev |

Optional — include if you want to ship worked examples:

| Path | Why |
|---|---|
| `.claude/agents/runs/<select runs>/` | Past run folders make great learning material — plan, decisions, dispatch packets, handoffs all visible |

---

## Exclude

| Path | Why |
|---|---|
| `.claude/settings.local.json` | Per-developer permission overrides (e.g., `BashCommand` allowlists you granted on your machine). Contains nothing useful for the recipient and may grant them tool access you didn't intend. |
| `.claude/agents/runs/` (when shipping a fresh start) | Audit data from your runs; clutters the recipient's view. Drop entirely OR cherry-pick exemplar runs. |
| Any `*.log`, `*.tmp`, `target/`, `dist/`, `node_modules/` accidentally inside `.claude/` | Build / runtime cruft — `.claude/` should only contain agents, skills, settings. |

---

## Does NOT travel in the zip (recipient gets none of this)

These live **outside** the project tree under the user's home dir. You can't ship them this way — and shouldn't.

| Path | What it is | Recipient gap |
|---|---|---|
| `~/.claude/projects/<encoded-path>/memory/` | Your auto-memory (user preferences, learned feedback, local env notes) | Recipient starts with empty memory. **OK** — all project-level rules are already encoded in agent contracts under `.claude/agents/`. |
| `~/.claude/plugins/marketplaces/*` | Marketplace plugins (Adobe AEM Skills, etc.) | **OK for this project** — every skill the agents call is bundled under `.claude/skills/`. Verify before sharing if you added new agents that invoke marketplace-only skills. |
| `~/.claude/mcp.json` or equivalent | MCP server configs (e.g., `aem-local` MCP) | **OK for this project** — none of the agents call MCP tools. Pilot/Auditron use plain `curl` via Bash. |
| `~/.claude/settings.json` | Your user-level preferences (theme, model default, etc.) | Recipient uses their own. No impact on agent behavior. |

---

## Pre-zip verification (30 seconds)

```bash
# From project root:

# 1. Confirm settings.local.json isn't included
ls .claude/settings.local.json 2>/dev/null && echo "EXCLUDE THIS"

# 2. Scan agent contracts + skills for absolute paths that won't exist on recipient's machine
grep -rn "C:\\\\Users\\\\\|/Users/[a-z]*/" .claude/agents/ .claude/skills/ 2>/dev/null

# 3. Confirm no secrets / tokens leaked into committed run folders
grep -rEn "(api[_-]?key|secret|password|token)[ =:]+[\"']?[A-Za-z0-9_-]{20,}" .claude/agents/runs/ 2>/dev/null

# 4. Size check — zip should be a few MB, not GB
du -sh .claude/
```

If any of those return hits, fix before zipping.

---

## Recipient quickstart (paste into your share message)

> 1. Unzip into the project root — you should end up with `<project>/.claude/` and `<project>/ADLC-ONBOARDING.md`.
> 2. Read `ADLC-ONBOARDING.md` from top to bottom (10 sections, ~15 min).
> 3. Bring up the AEM SDK Quickstart on `localhost:4502`.
> 4. Open Claude Code and invoke `@aem-program-agent verify environment` (or pick any small task to try the orchestrator).
> 5. Past run folders under `.claude/agents/runs/` are worked examples — useful to learn the dispatch / handoff pattern.

---

## When to update this checklist

- A new agent is added that depends on a marketplace skill → add the install step to "Recipient quickstart".
- A new agent depends on an MCP server → document the MCP setup the recipient needs.
- `.claude/settings.json` grows team-relevant hooks → no action; it already travels.
- `.claude/settings.local.json` adoption pattern changes → revisit the "exclude" list.
