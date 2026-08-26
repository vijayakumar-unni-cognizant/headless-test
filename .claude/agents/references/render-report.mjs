#!/usr/bin/env node
/*
 * Deterministic ADLC report renderer (token saver).
 *
 * The model emits a COMPACT data.json; this script fills report-template.html
 * and produces BOTH <name>.html (rich, Lighthouse-style) and <name>.md — so an
 * agent never hand-writes ~300 lines of HTML per report. Same look, far fewer
 * output tokens, and consistent across runs.
 *
 * Usage:  node .claude/agents/references/render-report.mjs <data.json> <out-dir> [template.html]
 *   (report-template.html is resolved from this script's own dir by default)
 *
 * data.json (all optional except title/status/statusClass):
 * {
 *   "name":"sentinel-report", "title":"…", "agent":"sentinel",
 *   "stage":"Test — UI + NFR enforcement", "runId":"…", "timestamp":"…", "url":"…",
 *   "status":"FAIL", "statusClass":"fail",           // pass|fail|warn|info
 *   "summary":"one-line verdict (supports `code` and **bold**)",
 *   // 0-100 -> donut. One per Lighthouse category PLUS non-Lighthouse tracks
 *   // expressible as a score, e.g. UI Tests = Playwright pass-rate (passed/total*100).
 *   // Auto color: good>=90 / avg>=50 / poor<50; override with optional "class".
 *   // "link":"#<section-id>" makes the gauge a clickable anchor that scrolls to
 *   // (and expands) the matching section below. Point it at that section's id.
 *   "scores":[{"label":"Performance","value":81,"note":"LCP 3.0s","link":"#perf"},
 *             {"label":"UI Tests","value":100,"note":"12/12 · Playwright","class":"good","link":"#ui"}],
 *   "matrix":[{"track":"…","verdict":"PASS","class":"pass","detail":"…"}],
 *   "findings":[{"id":"F-PERF-01","sev":"high","track":"…","component":"…",
 *                "title":"…","issue":"…","evidence":"…","cause":"…",
 *                "recommendation":"concrete fix a reader can act on — REQUIRED for every failed/blocking finding",
 *                "route":"…","status":"…"}],
 *   "screenshots":[{"caption":"Desktop — 1440×900","src":"screenshots/cosme-desktop.png"}],
 *   // "id" is the section's anchor (a gauge's "link" targets it); defaults to a slug of "title".
 *   "sections":[{"id":"perf","title":"Performance — Lighthouse","badge":"FAIL (81)","badgeClass":"fail","open":false,
 *                "blocks":[ {"p":"…"},
 *                           {"table":{"head":["Metric","Value"],"rows":[["LCP","3.0 s"]]}},
 *                           {"callout":{"class":"info","text":"…"}} ]}]
 * }
 * sev: critical|high|medium|low|info   class/badgeClass: pass|fail|warn|info
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// tiny inline markup: `code` and **bold** (everything else escaped)
const rich = (s = '') => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
const gaugeClass = (v) => (v >= 90 ? 'good' : v >= 50 ? 'avg' : 'poor')
const slug = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const gaugeFig = (s) =>
  `<figure class="gauge ${s.class || gaugeClass(s.value)}" style="--val:${s.value}"><div class="ring"><span>${s.value}</span></div><figcaption>${esc(s.label)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</figcaption></figure>`
const scorecard = (scores) =>
  !scores?.length ? '' :
  // a gauge with "link" (e.g. "#perf") becomes a clickable anchor that scrolls to its section
  `<div class="scorecard">${scores.map((s) => (s.link ? `<a class="gauge-link" href="${esc(s.link)}">${gaugeFig(s)}</a>` : gaugeFig(s))).join('')}</div>`

const matrixTable = (rows) =>
  !rows?.length ? '' :
  `<table class="matrix"><thead><tr><th>Track</th><th>Verdict</th><th>Detail</th></tr></thead><tbody>${rows.map((r) =>
    `<tr><td>${rich(r.track)}</td><td><span class="badge ${r.class || 'info'}">${esc(r.verdict)}</span></td><td>${rich(r.detail || '')}</td></tr>`).join('')}</tbody></table>`

const findingsTable = (f) =>
  !f?.length ? '' :
  `<table class="findings"><thead><tr><th>Sev</th><th>Track</th><th>Component</th><th>Finding</th><th>Route</th></tr></thead><tbody>${f.map((x) =>
    `<tr><td><span class="chip sev-${x.sev}">${esc((x.sev || 'info').toUpperCase())}</span></td><td>${rich(x.track || '')}</td><td>${rich(x.component || '')}</td><td>${rich(x.title)}</td><td>${rich(x.route || '—')}</td></tr>`).join('')}</tbody></table>`

const findingCards = (f) =>
  !f?.length ? '' :
  f.map((x) => {
    const row = (k, v) => (v ? `<dt>${k}</dt><dd>${rich(v)}</dd>` : '')
    return `<div class="finding sev-${x.sev}"><h4><span class="chip sev-${x.sev}">${esc((x.sev || 'info').toUpperCase())}</span> ${rich(x.id ? x.id + ' — ' : '')}${rich(x.title)}</h4><dl>${row('Issue', x.issue)}${row('Evidence', x.evidence)}${row('Cause', x.cause)}${row('Recommended fix', x.recommendation)}${row('Route', x.route)}${row('Status', x.status)}</dl></div>`
  }).join('')

const shots = (list) =>
  !list?.length ? '' :
  `<div class="shots">${list.map((s) =>
    `<figure><figcaption>${esc(s.caption)}</figcaption><a href="${esc(s.src)}"><img src="${esc(s.src)}" alt="${esc(s.caption)}"></a></figure>`).join('')}</div>`

const renderBlock = (b) => {
  if (b.p) return `<p>${rich(b.p)}</p>`
  if (b.callout) return `<div class="callout ${b.callout.class || 'info'}">${b.callout.html || rich(b.callout.text || '')}</div>`
  if (b.table) {
    const head = b.table.head.map((h) => `<th>${rich(h)}</th>`).join('')
    const rows = b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')
    return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
  }
  if (b.html) return b.html
  return ''
}
const renderSection = (s) =>
  // id (explicit or slug of title) is the anchor target for a gauge's "link"
  `<details class="track" id="${esc(s.id || slug(s.title))}"${s.open ? ' open' : ''}><summary>${esc(s.title)}${s.badge ? ` <span class="badge ${s.badgeClass || 'info'}">${esc(s.badge)}</span>` : ''}</summary><div>${(s.blocks || []).map(renderBlock).join('')}</div></details>`

// ---- main ----
const [, , dataPath, outDir, tplArg] = process.argv
if (!dataPath || !outDir) {
  console.error('usage: node render-report.mjs <data.json> <out-dir> [template.html]')
  process.exit(2)
}
const here = path.dirname(fileURLToPath(import.meta.url))
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const tpl = fs.readFileSync(tplArg || path.join(here, 'report-template.html'), 'utf8')

let content = scorecard(d.scores)
if (d.summary || d.matrix) {
  content += `<section class="card"><h2>Verdict &amp; track matrix</h2>`
  if (d.summary) content += `<div class="callout ${d.statusClass || 'warn'}">${rich(d.summary)}</div>`
  content += matrixTable(d.matrix) + `</section>`
}
if (d.findings?.length) {
  content += `<section class="card"><h2>Findings &amp; routing</h2>${findingsTable(d.findings)}</section>`
  content += `<details class="track" open><summary>Detailed findings</summary><div>${findingCards(d.findings)}</div></details>`
}
if (d.screenshots?.length) content += `<details class="track" open><summary>Visual evidence — screenshots</summary><div>${shots(d.screenshots)}</div></details>`
for (const s of d.sections || []) content += renderSection(s)

const sub = {
  '{{REPORT_TITLE}}': esc(d.title || 'Report'),
  '{{AGENT}}': esc(d.agent || 'sentinel'),
  '{{STAGE}}': esc(d.stage || ''),
  '{{RUN_ID}}': esc(d.runId || ''),
  '{{TIMESTAMP}}': esc(d.timestamp || ''),
  '{{STATUS}}': esc(d.status || ''),
  '{{STATUS_CLASS}}': esc(d.statusClass || 'info'),
  '{{MD_FILENAME}}': esc((d.name || 'report') + '.md'),
  '{{CONTENT_HTML}}': content,
}
let html = tpl
for (const [k, v] of Object.entries(sub)) html = html.split(k).join(v)

const base = d.name || 'report'
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, base + '.html'), html)

// canonical .md from the same data (plain text — no HTML tokens)
const strip = (s = '') => String(s).replace(/<[^>]+>/g, '')
let md = `# ${d.title || 'Report'}\n\n- **status:** ${d.status || ''}\n- **run:** ${d.runId || ''}\n- **url:** ${d.url || ''}\n\n`
if (d.summary) md += `> ${strip(d.summary)}\n\n`
if (d.scores?.length) md += `## Scores\n\n${d.scores.map((s) => `- ${s.label}: **${s.value}**${s.note ? ` (${s.note})` : ''}`).join('\n')}\n\n`
if (d.matrix?.length) md += `## Track matrix\n\n| Track | Verdict | Detail |\n|---|---|---|\n${d.matrix.map((r) => `| ${r.track} | ${r.verdict} | ${(r.detail || '').replace(/\|/g, '\\|')} |`).join('\n')}\n\n`
if (d.findings?.length) md += `## Findings\n\n${d.findings.map((f) => `### [${(f.sev || '').toUpperCase()}] ${f.id ? f.id + ' — ' : ''}${f.title}\n- **Issue:** ${f.issue || ''}\n- **Evidence:** ${f.evidence || ''}\n- **Cause:** ${f.cause || ''}${f.recommendation ? `\n- **Recommended fix:** ${f.recommendation}` : ''}\n- **Route:** ${f.route || ''}\n- **Status:** ${f.status || ''}`).join('\n\n')}\n`
fs.writeFileSync(path.join(outDir, base + '.md'), md)

console.log(`wrote ${base}.html + ${base}.md to ${outDir}`)
