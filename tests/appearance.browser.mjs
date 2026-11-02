// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package if not local.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
const page = await context.newPage();
const failures = [];
page.on('pageerror', error => failures.push(error.message));
const url = process.env.READER_URL || 'http://127.0.0.1:5174/focus-speed-reader/';
await page.goto(url);
await page.getByRole('button', { name: 'Add Book', exact: true }).click();
await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Appearance regression');
await page.getByRole('textbox', { name: 'Text to read' }).fill('Stable focus cues keep every word centered while the reader moves through this sample text. '.repeat(8));
await page.getByRole('button', { name: 'Add to Library' }).click();
await page.getByRole('group', { name: 'Open Appearance regression' }).focus();
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(450);
await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
await page.getByRole('dialog').waitFor();
const paused = await page.getByTestId('position').textContent();
await page.waitForTimeout(450);
assert.equal(await page.getByTestId('position').textContent(), paused, 'modal pauses playback');
await page.keyboard.press('Escape');
assert.equal(await page.getByRole('button', { name: 'Accessibility', exact: true }).evaluate(el => el === document.activeElement), true, 'Escape returns focus');
await page.waitForTimeout(350);
assert.equal(await page.getByTestId('position').textContent(), paused, 'closing modal does not resume');
const matrix = [];
for (const theme of ['light', 'dark']) {
  for (const palette of ['standard', 'red-green', 'blue-yellow', 'high-contrast']) {
    const toggle = page.getByRole('button', { name: 'Dark mode', exact: true });
    if ((await toggle.getAttribute('aria-pressed') === 'true') !== (theme === 'dark')) await toggle.click();
    await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
    await page.locator(`input[value="${palette}"]`).check();
    // Browser computes final CSS colors; composite transparent backgrounds through ancestors.
    const result = await page.evaluate(() => {
      const rgb = value => { const c = value.match(/[\d.]+/g).map(Number); return c; };
      const lum = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const bg = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (rgb(c)[3] !== 0) return c; } return getComputedStyle(document.body).backgroundColor; };
      const checks = [];
      for (const selector of ['.reader-shell h2', '[data-testid="position"]', '.reader-focus', 'footer label span', '.appearance-dialog p', '.appearance-dialog legend', '.palette-option span', '.system-theme', '.appearance-close']) {
        for (const el of document.querySelectorAll(selector)) { const s = getComputedStyle(el); checks.push({ selector, foreground: s.color, background: bg(el), ratio: ratio(s.color, bg(el)), minimum: 4.5 }); }
      }
      const button = document.querySelector('.appearance-icon');
      checks.push({ selector: '.appearance-icon border', ratio: ratio(getComputedStyle(button).borderTopColor, bg(button)), minimum: 3 });
      const marker = document.querySelector('.reader-focus');
      checks.push({ selector: 'focus underline', ratio: ratio(getComputedStyle(marker).textDecorationColor, bg(marker)), minimum: 3 });
      return { theme: document.documentElement.dataset.theme, palette: document.documentElement.dataset.palette, checks };
    });
    for (const check of result.checks) assert.ok(check.ratio >= check.minimum, `${theme}/${palette} ${check.selector} contrast ${check.ratio}`);
    matrix.push(result);
    if ((theme === 'light' && palette === 'standard') || (theme === 'dark' && palette === 'red-green')) await page.screenshot({ path: `review/reader-${theme}-${palette}-dialog.png`, fullPage: true });
    // Native modal Tab must stay inside the dialog.
    for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true); }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByTestId('position').textContent(), paused);
    if (palette === 'standard') await page.screenshot({ path: `review/reader-${theme}-standard.png`, fullPage: true });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    assert.equal(await page.locator('html').getAttribute('data-palette'), palette);
    await page.getByRole('button', { name: 'Add Book', exact: true }).click();
    const libraryChecks = await page.evaluate(() => {
      const rgb = value => value.match(/[\d.]+/g).map(Number);
      const lum = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const bg = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (rgb(c)[3] !== 0) return c; } return getComputedStyle(document.body).backgroundColor; };
      const checks = [];
      for (const selector of ['h1', 'h3', 'button', '.text-zinc-400', '[placeholder]']) {
        for (const el of document.querySelectorAll(selector)) {
          if (!el.getClientRects().length || !el.textContent.trim() && !el.hasAttribute('placeholder')) continue;
          const s = getComputedStyle(el, el.hasAttribute('placeholder') ? '::placeholder' : null);
          checks.push({ selector, ratio: ratio(s.color, bg(el)), minimum: 4.5 });
        }
      }
      return checks;
    });
    for (const check of libraryChecks) assert.ok(check.ratio >= check.minimum, `${theme}/${palette} library ${check.selector} contrast ${check.ratio}`);
    result.libraryChecks = libraryChecks;
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('group', { name: 'Open Appearance regression' }).click();
    await page.getByTestId('word').waitFor();
    assert.equal(await page.getByTestId('position').textContent(), paused, 'book progress survives preferences and reload');
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'review/reader-mobile-dark-high-contrast.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
await page.evaluate(() => document.documentElement.style.fontSize = '200%');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth), true, '200% text does not overflow');
await page.screenshot({ path: 'review/reader-mobile-200-percent.png', fullPage: true });
await page.evaluate(() => document.documentElement.style.fontSize = '');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Close reader' }).click();
await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
await page.locator('input[value="standard"]').check();
await page.keyboard.press('Escape');
await page.screenshot({ path: 'review/library-mobile-light.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
await page.getByRole('button', { name: 'Use device theme' }).click();
await page.keyboard.press('Escape');
await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'follows system after reset');
await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
await page.emulateMedia({ colorScheme: 'light' });
await page.emulateMedia({ colorScheme: 'dark' });
assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'explicit choice stays independent of system');
await page.emulateMedia({ forcedColors: 'active' });
await page.getByRole('button', { name: 'Accessibility', exact: true }).click();
await page.screenshot({ path: 'review/library-forced-colors.png', fullPage: true });
const denied = await browser.newContext({ colorScheme: 'dark' });
await denied.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
const deniedPage = await denied.newPage();
await deniedPage.goto(url);
assert.equal(await deniedPage.locator('html').getAttribute('data-theme'), 'dark');
await deniedPage.getByRole('button', { name: 'Dark mode', exact: true }).click();
await deniedPage.getByRole('button', { name: 'Accessibility', exact: true }).click();
await deniedPage.locator('input[value="blue-yellow"]').check();
assert.equal(await deniedPage.locator('html').getAttribute('data-theme'), 'light');
assert.equal(await deniedPage.locator('html').getAttribute('data-palette'), 'blue-yellow');
assert.deepEqual(failures, []);
await mkdir('review', { recursive: true });
await writeFile('review/contrast-results.json', JSON.stringify(matrix, null, 2));
console.log(`PASS: ${matrix.length} computed reader/dialog color combinations, modal keyboard/focus/pause, saved preferences, system fallback, blocked storage, mobile, 200% text, forced colors. No page errors.`);
await browser.close();
