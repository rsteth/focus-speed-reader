# Appearance and accessibility — 2026-11-02

Isolated feature branch `feat/appearance-accessibility` starts at clean master `89e6c3f`, verified origin `https://github.com/rsteth/focus-speed-reader.git`. Original checkout remains untouched. No repository AGENTS.md or applicable development skill was present.

## Changes

Sun/moon Dark mode toggle and independent Accessibility dialog appear in the library and reader. Warm ivory/charcoal/sage/terracotta light colors accompany the dark theme. Standard, red–green friendly, blue–yellow friendly and high contrast palettes change semantic colors without filtering books or media. The head bootstrap resolves system preference before rendering; explicit theme and palette choices persist separately with versioned app keys. Use device theme restores live system following. Denied storage falls back safely to visit-local choices.

The native dialog includes radio labels, keyboard focus wrapping, Escape, visible Close controls and focus return. Opening it pauses playback; closing it does not resume. The focal letter keeps the existing center position and adds weight and an underline in every palette. No per-word live announcements were added. Library cards can be opened with Enter/Space and the restore input can receive keyboard focus. Reduced-motion and forced-colors support are included. Card transitions affect shadows only, preventing mixed foreground/background colors during theme changes.

## Validation

- `npm run build`: pass. Existing large bundle and stale Browserslist warnings remain.
- `npm run lint`: pass.
- `tests/appearance.browser.mjs`: pass in Chromium. Eight light/dark × palette combinations check actual computed reader, dialog and library text, selected options, placeholders, focus underline and control border colors. Minimum tested text contrast 5.79:1; minimum tested meaningful-graphic contrast 4.35:1. This is targeted coverage, not a blanket WCAG claim.
- The same regression verifies modal Tab containment/Escape/focus return, pause without automatic resume, progress across reload, preference independence/persistence, device following and explicit override, denied localStorage, 390px layout, 200% text enlargement, and forced colors. No uncaught browser errors.
- Existing `review/browser-checks.cjs`: pass across six viewports including 320px, 390px, desktop, tablet and landscape; long words, punctuation, 200-character tokens, 2× CSS zoom, seek keyboard/bounds, speed, playback/pause/replay, close/reopen progress, fullscreen API, TXT/EPUB import, JSON backup/restore and malformed backup preservation.
- Existing `review/edge-checks.cjs`: pass for empty/corrupt books, disabled playback, EPUB binary backup roundtrip, literal `base64:` text fidelity and narrow library widths.
- Screenshots were visually inspected: warm mobile library, light reader, dark accessibility dialog, and 200% mobile modal. Mobile tests are emulated Chromium, not physical phones. Native browser-toolbar fullscreen behavior and screen-reader output were not revalidated on physical devices.

`contrast-results.json` contains the browser-computed pairs and ratios. PNG evidence is synthetic content only.

Run a local preview on port 5174, then:

```sh
PLAYWRIGHT_MODULE=/path/to/installed/@playwright/test \
CHROMIUM_PATH=/path/to/chromium \
node tests/appearance.browser.mjs
```

The existing reader scripts use port 5182 and installed Google Chrome. Playwright and browser binaries were reused from the machine; no dependency was added or downloaded. All QA used local synthetic book content; no deployment or paid API calls occurred.

Remaining pre-existing limits: WPM is session-local; abrupt termination during active playback may lose recent progress; extremely long tokens become small to preserve fitting. User review with their preferred assistive technology remains valuable.
