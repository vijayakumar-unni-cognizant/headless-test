# Playwright UI-Test Module — Scaffold & Migration Reference

Canonical, **proven** template for the AEM `ui.tests` module on Playwright, plus the
procedure for bringing any project's module to this state. Cloud Manager's
_Custom UI Testing_ step is framework-agnostic: it builds the Docker image and evaluates
the run **solely on the JUnit XML** written to `REPORTS_PATH` (exit code ignored). Cypress
was the archetype default; Playwright is fully supported.

> **Ownership.** **`blockwright` follows this reference, PRE-DEPLOY** (Implement stage) — it
> creates/migrates the harness and authors one spec per Designforge scenario ID, then validates
> them with `npx playwright test --list` (parse + discovery, no live environment needed).
> **`sentinel` only executes** the suite post-deploy against the real environment and must not
> migrate or scaffold the module. The migration has to land before the PR: Cloud Manager builds
> this module from whatever is committed, so a module still on Cypress at deploy time means the
> first pipeline run executes the wrong harness.
>
> **Tier parameterization.** Specs read their base URL from env (`AEM_AUTHOR_URL` /
> `AEM_PUBLISH_URL`) with Playwright projects for anonymous-publish and authenticated-author —
> Sentinel runs UI tests against **publish** and authoring checks against **author**. Never
> hard-code a host or credential in a spec.

> These templates were validated end-to-end against a local AEM SDK: `npm install`,
> `npx playwright install`, `npm test` → 12/12 green across chromium/firefox/webkit/mobile,
> JUnit XML emitted. Treat them as the known-good baseline; do not "improve" them blindly.

---

## Bootstrap decision (Sentinel runs this ONCE per run, in Phase 1)

Detect the state of `ui.tests/test-module/` and act:

| State detected | How to detect | Action |
|---|---|---|
| **Playwright already present** | `ui.tests/test-module/playwright.config.js` exists AND `package.json` has `@playwright/test` | Use as-is. Do NOT rewrite the harness. Only author/update specs. |
| **Still Cypress** | `ui.tests/test-module/cypress.config.js` exists OR `package.json` has `cypress` | **Migrate** (see procedure below). One-time. |
| **Missing entirely** | no `ui.tests/test-module/` or no test config at all | **Scaffold** fresh from the templates below. |

This is idempotent: on every subsequent run the module is "Playwright already present" and
the harness is left alone. The migration/scaffold cost is paid once per project.

### Migration procedure (Cypress → Playwright)

1. Replace `ui.tests/Dockerfile`, `ui.tests/test-module/run.sh`, `package.json` with the templates below.
2. Add `playwright.config.js`, `global-setup.js`, `.gitignore` (templates below).
3. Add `tests/` and author specs there (`*.spec.js`) — port existing `cypress/e2e/*.cy.js` logic.
4. Delete the stale `package-lock.json` (Cypress-based) so `npm install` regenerates it.
5. Leave `cypress/`, `cypress.config.js`, `reporter.config.js` in place ONLY until specs are
   ported, then delete them. They are ignored by lint (see `.eslintrc.js` `ignorePatterns`).
6. Do NOT touch `ui.tests/pom.xml` or `assembly-ui-test-docker-context.xml` — they are
   framework-agnostic (they tar the `Dockerfile` + `test-module`). The Dockerfile change is
   the only build-side edit needed.
7. Record the migration in `DECISIONS.md` (one-time, per project).

### Version pin rule

The Docker base image tag **must** match the `@playwright/test` version in `package.json`
(e.g. image `v1.49.1-jammy` ↔ dep `1.49.1`). Bump both together, never one alone.

---

## Templates

### `ui.tests/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.1-jammy
ENV APP_PATH=/usr/src/app
WORKDIR ${APP_PATH}
COPY ./test-module ./
RUN npm install
# Browsers are preinstalled in the base image; no Xvfb/X11 needed (headless).
ENTRYPOINT ["bash","run.sh"]
```

### `ui.tests/test-module/run.sh`

Keep the Cloud Manager EaaS proxy block verbatim from the archetype; replace only the
runner. Playwright runs headless — **no Xvfb**.

```bash
#!/usr/bin/env bash
# setup proxy environment variables (Cloud Manager EaaS convention — preserved)
if [ -n "${PROXY_HOST:-}" ]; then
  if [ -n "${PROXY_HTTPS_PORT:-}" ]; then
    export HTTP_PROXY="https://${PROXY_HOST}:${PROXY_HTTPS_PORT}"
  elif [ -n "${PROXY_HTTP_PORT:-}" ]; then
    export HTTP_PROXY="http://${PROXY_HOST}:${PROXY_HTTP_PORT}"
  fi
  if [ -n "${PROXY_CA_PATH:-}" ]; then
    export NODE_EXTRA_CA_CERTS=${PROXY_CA_PATH}
  fi
  if [ -n "${PROXY_OBSERVABILITY_PORT:-}" ] && [ -n "${HTTP_PROXY:-}" ]; then
    echo "Waiting for proxy"
    curl --silent --retry "${PROXY_RETRY_ATTEMPTS:-3}" --retry-connrefused --retry-delay "${PROXY_RETRY_DELAY:-10}" \
      --proxy "${HTTP_PROXY}" --proxy-cacert "${PROXY_CA_PATH:-}" \
      "${PROXY_HOST}:${PROXY_OBSERVABILITY_PORT}"
    if [ $? -ne 0 ]; then echo "Proxy is not ready"; exit 1; fi
  fi
fi

# JUnit XML is written to $REPORTS_PATH per the Cloud Manager UI-testing contract.
npx playwright test
```

### `ui.tests/test-module/package.json`

```json
{
  "name": "playwright-eaas",
  "version": "1.0.0",
  "description": "Playwright UI test module for AEM as a Cloud Service (Cloud Manager Custom UI Testing)",
  "scripts": {
    "test": "playwright test",
    "test:chromium": "playwright test --project=chromium",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.1",
    "@playwright/test": "1.49.1",
    "eslint": "^8.57.0"
  },
  "license": "Apache-2.0"
}
```

### `ui.tests/test-module/playwright.config.js`

Reads the AEM UI-test convention env vars (Cloud Manager injects them). JUnit reporter →
`REPORTS_PATH` is the contract; the html/list reporters are for humans. Four browser
projects give real cross-browser + device-emulated mobile coverage (WebKit included —
Cypress could not do this).

```js
const { defineConfig, devices } = require('@playwright/test')
const path = require('path')

const reportsPath = process.env.REPORTS_PATH || 'results'
const authorURL = process.env.AEM_AUTHOR_URL || 'http://localhost:4502'

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup'),
  outputDir: path.join(reportsPath, 'artifacts'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: path.join(reportsPath, 'results.xml') }],
    ['html', { outputFolder: path.join(reportsPath, 'html-report'), open: 'never' }],
  ],
  use: {
    baseURL: authorURL,
    storageState: path.join(__dirname, '.auth', 'state.json'),
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
})
```

### `ui.tests/test-module/global-setup.js` — AEM author login (CRITICAL)

AEM author **302-redirects unauthenticated requests to the login form** — it does NOT send
a 401 Basic-auth challenge. So `httpCredentials` silently fails and every test lands on the
"AEM Sign In" page. Log in once here via Granite `j_security_check`, capture the
`login-token` cookie as `storageState`, and all tests reuse it.

```js
const { request } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const STATE_PATH = path.join(__dirname, '.auth', 'state.json')

module.exports = async () => {
  const authorURL = process.env.AEM_AUTHOR_URL || 'http://localhost:4502'
  const user = process.env.AEM_AUTHOR_USERNAME || 'admin'
  const pass = process.env.AEM_AUTHOR_PASSWORD || 'admin'
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true })
  const ctx = await request.newContext({ baseURL: authorURL, ignoreHTTPSErrors: true })
  // j_validate=true → 200 + login-token cookie on success, 403 on failure, no redirect.
  const resp = await ctx.post('/libs/granite/core/content/login.html/j_security_check', {
    form: { _charset_: 'utf-8', j_username: user, j_password: pass, j_validate: 'true' },
  })
  if (!resp.ok()) {
    throw new Error(`AEM author login failed (HTTP ${resp.status()}) at ${authorURL}.`)
  }
  await ctx.storageState({ path: STATE_PATH })
  await ctx.dispose()
}
```

### `ui.tests/test-module/.gitignore`

```
node_modules/
node/
.auth/
results/
test-results/
playwright-report/
storageState.json
```

### `ui.tests/test-module/.eslintrc.js`

```js
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'node/**', 'node_modules/**', 'results/**', 'html-report/**',
    'playwright-report/**', 'test-results/**',
    'cypress/**', 'cypress.config.js', 'reporter.config.js',
  ],
  rules: {},
}
```

---

## Spec authoring conventions (per run — Sentinel writes these into `tests/`)

- One `*.spec.js` per component/page, named `tests/{component-or-page}.spec.js`.
- Import: `const { test, expect } = require('@playwright/test')`.
- Navigation is authenticated automatically via `storageState` — just `page.goto('/content/...html')`.
- Prefer role/text locators (`getByRole`, `getByText`) over brittle CSS where practical.
- Specs run across ALL configured projects automatically (no per-browser duplication).

**Holistic coverage is mandatory** (Sentinel gate — see `sentinel.md § 3` table). "Page loads" is NOT enough; a component can render an empty/mis-mapped box and still load. Every spec asserts all eight layers:

1. **Render / functional** — component present; interactive elements work; no console errors.
2. **Content mapping** — authored dialog values reach the DOM: title/description text, CTA `href` = authored path, image `src`/`alt` resolve and the image actually loaded (`naturalWidth > 0`).
3. **Style-System / policy** — expected `cmp-<type>--<variant>` class present for each authored `cq:styleIds` (proves policy → DOM wiring). **The class lands on the component's OUTER decoration wrapper (the grid cell), not on the inner `.cmp-<type>`** — e.g. `<div class="teaser cmp-teaser--<variant>">` wraps `<div class="cmp-teaser">`. Assert with a class-contains locator (`[class~="cmp-<type>--<variant>"]`), never `page.locator('.cmp-<type>').toHaveClass(...)`, which checks the wrong element and yields a false negative.
4. **Style-System runtime-apply** — for any **layout** variant (container grid/scroll, split panels), assert the layout *resolved*, not just that the class exists: the effective `display` of the element that owns the layout is `grid`/`flex` and children lay out as designed. A class that's present but whose CSS targets the wrong element (the #1 container defect) renders as a full-width stack and this catches it.
5. **Image sizing** — every embedded image is size-constrained: rendered width ≤ its wrapper width (no runaway native-rendition inflation), and images cropped to a shape honor it. Catches the "image renders huge" defect at runtime.
6. **Computed style (D15)** — the Pixel-Verified Acceptance Criteria properties via `toHaveCSS`.
7. **Accessibility** — one `<h1>` (`designforge § D22` guardrail) + zero critical/serious axe (`@axe-core/playwright`).
8. **Visual** — `toHaveScreenshot()` (Tier B regression; Tier A vision-diff handled by Sentinel).

### Proven reference spec (`tests/{page}.spec.js`)

```js
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

const PAGE = '/content/<project>/<region>/<locale>/<page>.html'

test.describe('<Page>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  })

  test('render + content mapping: authored values reach the DOM', async ({ page }) => {
    const teaser = page.locator('.cmp-teaser').first()
    await expect(teaser).toBeVisible()
    // mapping: dialog title/description/CTA/image actually surfaced (not an empty box)
    await expect(teaser.locator('.cmp-teaser__title')).toHaveText(/COSMETIC/i)
    await expect(teaser.getByRole('link', { name: /learn more/i }))
      .toHaveAttribute('href', /\/product\.html$/)
    const img = page.locator('.cmp-image img').first()
    await expect(img).toHaveAttribute('alt', /.+/)               // non-empty alt
    expect(await img.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0)  // image really loaded
  })

  test('Style-System: authored variant class is emitted (policy -> DOM)', async ({ page }) => {
    // The variant class lands on the OUTER wrapper (grid cell), not on .cmp-<type>.
    // Use a class-contains locator so it matches wherever AEM placed it.
    await expect(page.locator('[class~="cmp-teaser--hero"]').first()).toBeVisible()
  })

  // Style-System RUNTIME-APPLY — include one per layout variant the design uses.
  // Proves the class did more than exist: the layout actually resolved. Guards the
  // #1 container defect (class present but CSS targets the wrong element -> full-width stack).
  test('container layout variant resolves at runtime (not just authorable)', async ({ page }) => {
    const variant = page.locator('[class*="cmp-container--"]').first()
    await expect(variant).toBeVisible()
    // The class is on the outer wrapper; the grid that lays children out is  .cmp-container > .aem-Grid.
    const grid = variant.locator(':scope > .cmp-container > .aem-Grid, :scope .cmp-container > .aem-Grid').first()
    const display = await grid.evaluate((el) => getComputedStyle(el).display)
    expect(['grid', 'flex']).toContain(display)   // NOT 'block' — block == the stacked-column defect
    // Multi-column/row layouts place >1 child on the same top offset (side by side, not stacked).
    const tops = await grid.evaluate((el) =>
      [...el.children].filter((c) => c.offsetParent !== null).map((c) => c.offsetTop))
    expect(new Set(tops).size).toBeLessThan(tops.length)  // at least two children share a row
  })

  // Image SIZING — no runaway native-rendition inflation. Generic across every embedded image.
  test('embedded images stay within their wrapper (no oversized rendition)', async ({ page }) => {
    const imgs = page.locator('.cmp-image img, .cmp-teaser__image img')
    const n = await imgs.count()
    for (let i = 0; i < n; i++) {
      const over = await imgs.nth(i).evaluate((el) => {
        const wrap = el.closest('.cmp-image, [class*="__image"]') || el.parentElement
        return el.getBoundingClientRect().width - wrap.getBoundingClientRect().width
      })
      expect(over, `image ${i} overflows its wrapper (runaway rendition width)`).toBeLessThanOrEqual(1)
    }
  })

  test('computed style matches D15 acceptance criteria', async ({ page }) => {
    await expect(page.locator('.cmp-teaser__title').first()).toHaveCSS('color', 'rgb(63, 83, 38)')
    // add one assertion per D15 pixel-verified property (font-size, background, layout, spacing)
  })

  test('exactly one <h1> (structural-title / one-H1 guardrail)', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('no critical or serious accessibility violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const blocking = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(blocking, JSON.stringify(blocking.map((v) => v.id), null, 2)).toEqual([])
  })

  test('visual regression (Tier B baseline)', async ({ page }) => {
    await expect(page).toHaveScreenshot('cosme-full.png', { maxDiffPixelRatio: 0.005 })
  })
})
```

### Cross-page a11y sweep (`tests/_a11y-sweep.spec.js`) — replaces `@axe-core/cli`

Sentinel's cross-page WCAG sweep runs here, in Playwright's **pinned Chromium**, reusing the authenticated `storageState`. This avoids the `@axe-core/cli` failure mode (it drives *system* Chrome via `chromedriver` and dies on any Chrome/ChromeDriver version skew) and it sees author pages behind login. Save raw results per URL for drill-down.

```js
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const fs = require('fs')
const path = require('path')

// URLs to sweep — Sentinel writes this list per run (seeded pages + smoke set).
const URLS = [
  '/content/<project>/<region>/<locale>/<page>.html',
]
const OUT = process.env.REPORTS_PATH || 'results'

for (const url of URLS) {
  test(`a11y cross-page sweep: ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const slug = url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(path.join(OUT, `axe-${slug}.json`), JSON.stringify(results, null, 2))
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(blocking, JSON.stringify(blocking.map((v) => ({ id: v.id, impact: v.impact })), null, 2)).toEqual([])
  })
}
```

Run: `cd ui.tests/test-module && AEM_AUTHOR_URL=<host> REPORTS_PATH=results npx playwright test tests/_a11y-sweep.spec.js --project=chromium`. (Chromium alone is enough for the cross-page WCAG sweep; per-browser a11y is already covered by the in-spec scans in each component/page spec.)

## Local proof (no Docker)

```bash
cd ui.tests/test-module
npm install
npx playwright install          # first time only (downloads browsers)
AEM_AUTHOR_URL=http://localhost:4502 REPORTS_PATH=results npm test
```

## Cloud Manager parity proof (with Docker)

```bash
cd ui.tests
mvn clean package -Pui-tests-docker-build
mvn verify -Pui-tests-docker-execution -DAEM_AUTHOR_URL=http://host.docker.internal:4502
ls target/reports/*.xml     # JUnit XML == the contract artifact
```
