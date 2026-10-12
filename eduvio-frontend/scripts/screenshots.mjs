/**
 * Layout screenshots of every page at 375–1920 px plus a horizontal-overflow check.
 *
 * Needs the dev server with the mock API:
 *   VITE_USE_MOCK=true npm run dev            (http://localhost:5175)
 *   npx playwright install chromium           (once)
 *   npm run screenshots -- [label]            → screenshots/<label>/<page>-<width>.png
 *
 * Environment: BASE_URL (default http://localhost:5175), WIDTHS (e.g. "1024,1280"),
 * PAGES (e.g. "dashboard,calendar"). Exit code 1 when any page scrolls horizontally.
 *
 * Without the browser's system libraries (unsupported distro), run everything in the
 * Playwright image from eduvio-frontend (the version matches the devDependency):
 *   docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
 *     -v "$PWD:/app" -w /app mcr.microsoft.com/playwright:v1.55.0-noble sh -c '
 *       VITE_USE_MOCK=true npx vite --port 5175 >/tmp/vite.log 2>&1 &
 *       until node -e "fetch(\"http://localhost:5175\").catch(() => process.exit(1))"; do sleep 1; done
 *       node scripts/screenshots.mjs after'
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5175'
const LABEL = process.argv[2] || 'current'
const OUT_DIR = new URL(`../screenshots/${LABEL}/`, import.meta.url)
const WIDTHS = (process.env.WIDTHS || '375,768,1024,1280,1440,1920').split(',').map(Number)
const HEIGHT = 900
const MAX_HEIGHT = 8000
const MOCK_USER = { email: 'borek.sarman@upol.cz', password: 'password' }

const clickTab = (name) => async (page) => {
  await page.getByRole('button', { name }).first().click()
}

// name, path, needs login, optional action after load
const PAGES = [
  { name: 'login', path: '/login', auth: false },
  { name: 'register', path: '/register', auth: false },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'subjects', path: '/subjects' },
  { name: 'subject-detail', path: '/subjects/1' },
  { name: 'calendar', path: '/calendar' },
  { name: 'materials', path: '/materials' },
  { name: 'profile', path: '/profile' },
  { name: 'profile-account', path: '/profile', action: clickTab(/Osobní údaje/) },
].filter(({ name }) => !process.env.PAGES || process.env.PAGES.split(',').includes(name))

/** Overflow of the document and of the desktop scroll container (<main>). */
const measureOverflow = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement
    const main = [...document.querySelectorAll('main')].find((el) => el.offsetParent !== null)
    const wide = []
    if (doc.scrollWidth > window.innerWidth || (main && main.scrollWidth > main.clientWidth)) {
      // The widest offenders, to find the cause quickly
      const limit = main ? main.getBoundingClientRect().right : window.innerWidth
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect()
        if (rect.width && rect.right > limit + 1 && el.offsetParent !== null) {
          wide.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 4).join('.')} → ${Math.round(rect.right)}px`)
        }
      }
    }
    return {
      docScrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      mainScrollWidth: main?.scrollWidth ?? null,
      mainClientWidth: main?.clientWidth ?? null,
      offenders: wide.slice(0, 8),
    }
  })

/** Height that shows the whole page: the desktop layout scrolls inside <main>. */
const contentHeight = (page) =>
  page.evaluate(() => {
    const main = [...document.querySelectorAll('main')].find((el) => el.offsetParent !== null)
    const docHeight = document.documentElement.scrollHeight
    if (!main || main.scrollHeight <= main.clientHeight) return docHeight
    return docHeight + (main.scrollHeight - main.clientHeight)
  })

const settle = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1500) // mock API delays + page transitions
}

const login = async (context) => {
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/login`)
  await page.fill('#login-email', MOCK_USER.email)
  await page.fill('#login-password', MOCK_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|profile)/, { timeout: 15000 })
  await page.close()
}

const browser = await chromium.launch()
await mkdir(OUT_DIR, { recursive: true })
const report = []
let failed = false

for (const width of WIDTHS) {
  const guest = await browser.newContext({ viewport: { width, height: HEIGHT }, locale: 'cs-CZ' })
  const user = await browser.newContext({ viewport: { width, height: HEIGHT }, locale: 'cs-CZ' })
  for (const context of [guest, user]) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('i18nextLng', 'cs')
        localStorage.setItem('eduvio-theme', 'light')
      } catch { /* storage unavailable */ }
    })
  }
  await login(user)

  for (const entry of PAGES) {
    const page = await (entry.auth === false ? guest : user).newPage()
    await page.goto(`${BASE_URL}${entry.path}`)
    await settle(page)
    if (entry.action) {
      await entry.action(page)
      await settle(page)
    }

    const overflow = await measureOverflow(page)
    const ok = overflow.docScrollWidth <= overflow.innerWidth &&
      (overflow.mainScrollWidth === null || overflow.mainScrollWidth <= overflow.mainClientWidth)
    if (!ok) failed = true
    report.push({ page: entry.name, width, ok, ...overflow })
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${entry.name.padEnd(16)} ${String(width).padStart(4)} px` +
      (ok ? '' : `  doc ${overflow.docScrollWidth}/${overflow.innerWidth}, main ${overflow.mainScrollWidth}/${overflow.mainClientWidth}\n       ${overflow.offenders.join('\n       ')}`))

    const height = Math.min(MAX_HEIGHT, Math.max(HEIGHT, await contentHeight(page)))
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(300)
    await page.screenshot({ path: new URL(`${entry.name}-${width}.png`, OUT_DIR).pathname })
    await page.close()
  }
  await guest.close()
  await user.close()
}

await writeFile(new URL('report.json', OUT_DIR), JSON.stringify(report, null, 2))
await browser.close()
console.log(failed ? '\nHorizontal overflow found.' : '\nNo horizontal overflow.')
process.exit(failed ? 1 : 0)
