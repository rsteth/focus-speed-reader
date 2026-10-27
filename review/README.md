# Reader review — 2026-10-27

Verified baseline: source e0e3773014d23072f2538b5ae152704dbff8470f, deployed by gh-pages commit 5721e4a3621fb5419cfeeee81c2d7f12a4e9b54a. The public deployed JavaScript SHA-256 matches the gh-pages asset: 36ba98d5537adf0194c5b7d786791f38cdeebf2c5368c5aa16d5a80d4ad1c345. Original checkout was clean and remains untouched.

## Findings and changes

- Medium: long words clipped inside a fixed 896px grid. At a 1440px viewport the right side needed 1911px but had 417px. Fit the full word to available width while keeping the recognition point centered. Extremely long tokens necessarily become small, especially on phones.
- Medium: seeking at the right edge selected an index beyond the final word. Replaced the click-only div with a bounded, labeled native range control; playback stops at the final word and Replay restarts.
- Medium: progress effects saved on changing callback identities and cleanup on each index change. Stabilized the callback, save on pause and actual unmount, and explicitly await saving before closing. Regression checks confirm writes stop while paused and reopening resumes correctly. Abrupt browser termination during playback remains a persistence limitation; no periodic autosave was added.
- Medium: EPUB paragraph boundaries merged adjacent words (synthetic reproduction: paragraph.Second). Preserve block boundaries and use the supported spine/section interface with cleanup. Malformed/empty books receive feedback and disabled playback.
- Low: unlabeled backup icons were unclear. Keep the useful JSON download feature, label it Back up, label import Restore, disable empty export, and revoke download URLs.
- Low: empty submissions and file fallbacks gave poor results. Validate inputs and read TXT as text. EPUB/TXT upload matches the advertised README and now names both formats in the UI.
- Medium: malformed backup arrays could write earlier entries before failing. Validate/decode all entries before writing. A regression attempts to overwrite an existing book before a malformed entry and verifies the entire library is unchanged. Text beginning with base64: remains text; EPUB binary content survives a backup roundtrip. Storage failures during otherwise valid multi-record imports are not transactionally rolled back.
- Low: mobile library layout and hidden delete controls. Wrap header controls and show delete controls on touch-size layouts, with accessible labels.

Word count moved to the header, centered above the progress control. Dynamic viewport height and safe-area insets support mobile browser UI; short landscape layouts can scroll instead of hiding controls.

## Native Chrome fullscreen

Direct macOS Chrome observation reproduced the header under the transient browser toolbar. document.fullscreenElement was false and the header remained at document y=22. With the toolbar retracted, the header was visible. The user independently confirmed Always Show Toolbar in Full Screen makes it visible. This is configuration-dependent browser overlay behavior, not an app fullscreen API fix. No arbitrary top padding or browser setting changes are included. Dedicated test tab closed; native test window exited fullscreen. Existing project tabs were untouched. A blank New Tab containing concurrent user input was left in place.

## Validation

- npm run lint: PASS.
- npm run build: PASS (existing large-bundle and stale Browserslist warnings).
- browser-checks.cjs: PASS, no uncaught browser errors. Six viewports: 1440x900, 1920x1080, 768x700, 390x844, 320x568, 640x360. Long words, punctuation, 200-character tokens, CSS 2x zoom, seek bounds, range Home/End/arrows, speed endpoints, play/pause/end/replay, actual close/reopen resume, document fullscreen entry/exit, TXT/EPUB import, JSON download/restore, and malformed-import preservation.
- edge-checks.cjs: PASS. Empty/corrupt books, disabled playback, EPUB binary backup roundtrip, literal base64: text fidelity, 320/390px library widths.
- Native fullscreen observation as described above; no global keyboard shortcuts or app font-scale control existed, so none were added. Browser zoom toolbar settings were preserved; automated zoom check uses CSS zoom and responsive layout changes.
- Locally viewed screenshots: reader-before.png, reader-wide.png, reader-phone.png. These are local evidence, not uploaded attachments.

Run npm run dev -- --host 127.0.0.1 --port 5182, then PLAYWRIGHT_MODULE=/absolute/path/to/playwright node review/browser-checks.cjs and similarly edge-checks.cjs. Tests use isolated headless Chrome and synthetic fixtures only.

Remaining low-priority finding: WPM changes are session-local and reset to stored/default settings when a book is reopened. No persistence redesign included. Publication is pending approval.
