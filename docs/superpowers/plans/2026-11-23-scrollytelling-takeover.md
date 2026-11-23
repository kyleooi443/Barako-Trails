# Full-screen scrollytelling takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Barako Trails page into a full-screen, scroll-driven editorial journey while preserving all current copy and interactions.

**Architecture:** Add a scene layer around the existing sections: each `.story-scene` owns a sticky `.scene-visual` and a stack of `.scene-step` panels. A new `js/story.js` computes scroll progress and writes DOM state; a new `css/story.css` consumes that state for parallax, steps, and the chapter rail. Existing `js/script.js` remains responsible for navigation, filters, planner, modals, and lightbox.

**Tech Stack:** Plain HTML5, CSS3, vanilla JavaScript, Playwright verification scripts, `python3 -m http.server`.

**Spec:** `docs/superpowers/specs/2026-11-23-scrollytelling-takeover-design.md`

## Global Constraints

- Preserve all existing headings, descriptions, quotes, and destination copy verbatim.
- No new icons except the existing favicon and hamburger.
- Text-only controls keep labels such as `Back to top`, `Close`, `Previous`, `Next`.
- No positive letter-spacing.
- Hero keeps the local BARABARA font with `text-transform: uppercase`.
- Body copy keeps Barlow.
- Footer stays simplified: no `Explore`, `Practical`, or `Connect` columns.
- Decorative closing image keeps `alt=""` and `aria-hidden="true"`; meaningful images keep descriptive alt text.
- All five destination filters remain visible on phones.
- Primary controls remain at least 40px tall on small screens.
- No framework, package manager, build step, or external library.
- Desktop chapter rail is visible only at `min-width: 1024px`.
- Scroll snapping is enabled only with `.has-story`, on desktop, when reduced motion is not requested.

## Verification setup

Before running any `node tests/...` command, start the local server from the repo root with `python3 -m http.server 8765 --bind 127.0.0.1`. Playwright is resolved from the existing npx cache path in `tests/helpers.js`.

## Review Focus

- **Reduced motion:** all steps must be visible with no parallax; pinned test in Task 4.
- **No JavaScript:** all content must remain readable and in flow; pinned test in Task 1.
- **Dense steps:** destination grid and gallery must not clip inside full-screen scenes; pinned test in Task 2.
- **Anchors and dialogs:** links and modal/lightbox triggers inside scenes must still scroll and restore focus; pinned test in Task 5.
- **Small phones:** 390px and 360px must have no horizontal overflow and preserve 11px/44px rules; pinned test in Task 5.

---

### Task 1: Scene structure and test harness

**Files:**
- Modify: `index.html`
- Create: `tests/helpers.js`
- Create: `tests/story-structure.js`

**Interfaces:**
- Consumes: existing section ids `#home`, `#province`, `#destinations`, `#experiences`, `#culture`, `#food`, `#guide`, `#gallery`, `#closing`.
- Produces: `.story-scene[data-scene][data-chapter]`, `.scene-visual`, `.scene-content`, `.scene-step[data-step]`, `.story-rail`, `link[href="css/story.css"]`, `script[src="js/story.js"]`.
- `tests/helpers.js` exports `createPage({ viewport, reducedMotion, javaScriptEnabled }) -> Promise<{ browser, page, consoleErrors }>` and constant `URL = 'http://127.0.0.1:8765/index.html'`.

- [ ] **Step 1: Write the failing structure test**

Create `tests/story-structure.js` using `tests/helpers.js`. Assert:
- `document.querySelectorAll('.story-scene').length === 9`.
- Every `.story-scene` has non-empty `data-scene` and `data-chapter`.
- Every `.story-scene` has exactly one `.scene-visual` and one `.scene-content`.
- Every `.scene-content` has at least one `.scene-step` with a numeric `data-step`.
- `.story-rail` exists and contains nine `.story-rail-item` elements.
- `link[href="css/story.css"]` and `script[src="js/story.js"]` exist.
- With JavaScript disabled, every `.scene-step` has visible text.

```js
assert.strictEqual(await page.locator('.story-scene').count(), 9);
assert.strictEqual(await page.locator('.story-rail-item').count(), 9);
assert.ok(await page.locator('link[href="css/story.css"]').count());
assert.ok(await page.locator('script[src="js/story.js"]').count());
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/story-structure.js`
Expected: FAIL because `.story-scene` count is 0.

- [ ] **Step 3: Add scene wrappers and chapter rail to `index.html`**

Wrap each existing section body in `.story-scene`, `.scene-visual`, `.scene-content`, and `.scene-step`. Keep all existing text, image `alt` attributes, buttons, and ids unchanged. Split `#experiences` into four `.story-scene` instances inside the existing section. Add `.story-rail` with nine text labels. Add the CSS link after `css/style.css` and the script tag after `js/script.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/story-structure.js`
Expected: PASS on all structure assertions.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/helpers.js tests/story-structure.js
git commit -m "feat: add scrollytelling scene structure"
```

---

### Task 2: Story CSS foundation

**Files:**
- Create: `css/story.css`
- Create: `tests/story-layout.js`
- Modify: `index.html` only if the stylesheet link is missing from Task 1.

**Interfaces:**
- Consumes: `.story-scene`, `.scene-visual`, `.scene-content`, `.scene-step`, `.story-rail`, `.story-rail-item`.
- Produces: sticky scene layout, full-height steps, desktop chapter rail, mobile progress line, no-JS fallback.

- [ ] **Step 1: Write the failing layout test**

Create `tests/story-layout.js`. Assert:
- At 1440px, `.scene-visual` has `position: sticky` and height equal to `window.innerHeight`.
- At 1440px, `.story-rail` is visible.
- At 768px and 390px, `.story-rail` is hidden.
- `.scene-step` has `min-height` at least `window.innerHeight` for normal steps.
- The destination grid and gallery grid remain fully within the viewport width at 390px and 360px.
- With JavaScript disabled, all `.scene-step` elements have computed opacity `1`.

```js
const visual = await page.locator('.scene-visual').first().evaluate((el) => ({
  position: getComputedStyle(el).position,
  height: Math.round(el.getBoundingClientRect().height)
}));
assert.strictEqual(visual.position, 'sticky');
assert.strictEqual(visual.height, 900);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/story-layout.js`
Expected: FAIL because `css/story.css` has no sticky scene rules.

- [ ] **Step 3: Implement `css/story.css` layout**

Define `.story-scene` as a one-cell grid with `.scene-visual` and `.scene-content` overlapping. Set `.scene-visual { position: sticky; top: 0; height: 100svh; }`. Set normal `.scene-step { min-height: 100svh; }`; allow `.scene-step--tall` to grow. Style `.story-rail` for `min-width: 1024px` only and hide it below that. Add a mobile progress line only if it does not overlap the back-to-top control. Base styles must not hide any step when `.has-story` is absent.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/story-layout.js`
Expected: PASS at 1440px, 768px, 390px, and 360px.

- [ ] **Step 5: Commit**

```bash
git add css/story.css tests/story-layout.js
git commit -m "feat: add sticky story scene layout"
```

---

### Task 3: Story state engine

**Files:**
- Create: `js/story.js`
- Create: `tests/story-state.js`
- Modify: `index.html` only if the script tag is missing from Task 1.

**Interfaces:**
- Consumes: `.story-scene`, `.scene-step`, `.story-rail-item`, `data-scene`, `data-chapter`, `data-step`.
- Produces: `html.has-story`, `body[data-active-chapter]`, `.story-scene[data-active-step]`, `.scene-step.is-active`, `.story-scene style="--scene-progress: <0–1>"`, `.story-rail-item.is-active`.

Internal functions in `js/story.js`:
- `computeSceneProgress(scene: HTMLElement) -> number`
- `setSceneState(scene: HTMLElement, progress: number, activeStep: number) -> void`
- `setActiveChapter(chapter: string) -> void`

- [ ] **Step 1: Write the failing state test**

Create `tests/story-state.js`. Assert:
- `html.has-story` exists when reduced motion is not requested.
- Scrolling to the middle of `#province` sets `body[data-active-chapter]` to the province chapter value.
- The same scene gets `data-active-step` equal to the index of the step nearest viewport center.
- The scene's inline `--scene-progress` is a number between 0 and 1 and increases after scrolling further.
- The matching `.story-rail-item` has `is-active`.

```js
await page.evaluate(() => document.querySelector('#province').scrollIntoView());
await page.waitForTimeout(120);
const state = await page.evaluate(() => ({
  chapter: document.body.dataset.activeChapter,
  step: document.querySelector('#province').dataset.activeStep,
  progress: parseFloat(document.querySelector('#province').style.getPropertyValue('--scene-progress'))
}));
assert.ok(state.chapter, 'active chapter missing');
assert.ok(Number.isInteger(Number(state.step)), 'active step missing');
assert.ok(state.progress >= 0 && state.progress <= 1, 'progress out of range');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/story-state.js`
Expected: FAIL because `html.has-story` is missing.

- [ ] **Step 3: Implement `js/story.js`**

Write an IIFE that checks `matchMedia('(prefers-reduced-motion: reduce)')`, adds `has-story` only when motion is allowed, collects scenes and steps, and runs a `requestAnimationFrame`-throttled scroll handler. `computeSceneProgress` derives progress from the scene's bounding rect. `setSceneState` writes `--scene-progress`, `data-active-step`, and toggles `.is-active` on the matching `.scene-step`. `setActiveChapter` writes `body.dataset.activeChapter` and toggles `.is-active` on `.story-rail-item`. Do not hide, disable, or remove any step.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/story-state.js`
Expected: PASS on all state assertions.

- [ ] **Step 5: Commit**

```bash
git add js/story.js tests/story-state.js index.html
git commit -m "feat: add scroll scene state engine"
```

---

### Task 4: Motion choreography

**Files:**
- Modify: `css/story.css`
- Modify: `js/story.js` only if active-step timing needs adjustment.
- Create: `tests/story-motion.js`

**Interfaces:**
- Consumes: `html.has-story`, `--scene-progress`, `data-active-step`, `.scene-step.is-active`, `body[data-active-chapter]`.
- Produces: parallax transforms, step reveals, chapter transitions, planner route reveal, reduced-motion fallback.

- [ ] **Step 1: Write the failing motion test**

Create `tests/story-motion.js`. Assert:
- With motion allowed, `.scene-visual img` has a non-`none` transform after scrolling mid-scene.
- The active `.scene-step` has computed opacity greater than 0.9 and a non-`none` transform during its reveal.
- With `prefers-reduced-motion: reduce`, `html` does not have `.has-story`, all `.scene-step` opacities are `1`, and `.scene-visual img` has `transform: none`.
- `scroll-snap-type` is `none` on `html` in reduced-motion mode.

```js
const reduced = await browser.newContext({ reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(URL);
assert.strictEqual(await reducedPage.evaluate(() => document.documentElement.classList.contains('has-story')), false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/story-motion.js`
Expected: FAIL because no parallax transforms are defined.

- [ ] **Step 3: Implement motion in `css/story.css`**

Under `.has-story`, drive `.scene-visual img` with `transform: translate3d(0, calc(var(--scene-progress) * -24px), 0) scale(calc(1 + var(--scene-progress) * 0.04))`. Style `.scene-step` defaults and `.scene-step.is-active` with opacity/translate/scale transitions staggered by `data-step` or child role. Add chapter-label sweep and body accent transitions using `body[data-active-chapter]`. Add the planner result route-line reveal using a border or pseudo-element only. Keep every animation under `.has-story` or `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/story-motion.js`
Expected: PASS for motion and reduced-motion contexts.

- [ ] **Step 5: Commit**

```bash
git add css/story.css js/story.js tests/story-motion.js
git commit -m "feat: add scrollytelling motion choreography"
```

---

### Task 5: Interaction regression and responsive polish

**Files:**
- Modify: `js/script.js` only where a scene wrapper breaks an existing scroll target.
- Modify: `css/story.css` for small-screen polish.
- Create: `tests/story-regression.js`

**Interfaces:**
- Consumes: existing selectors from `js/script.js`: `#tripPlanner`, `.filter`, `[data-open-destination]`, `.gallery-item`, `#lightbox`, `#backToTop`, `.nav-link`.
- Produces: unchanged behavior for filters, planner, dialogs, lightbox, navigation, and mobile accessibility rules.

- [ ] **Step 1: Write the failing regression test**

Create `tests/story-regression.js`. Assert:
- All five `.filter` buttons are visible at 390px.
- Clicking `.filter[data-filter="mountains"]` shows two destination cards.
- Planner change updates `.result-stops li` count and the result title.
- Clicking `[data-open-destination="taal"]` opens `#destinationModal` and `Close` returns focus to the trigger.
- Clicking `.gallery-item` opens `#lightbox`; `Next` changes the counter; `Close` restores focus.
- Clicking `.nav-link[href="#culture"]` scrolls to `#culture` with the header offset.
- At 390px and 360px, `document.documentElement.scrollWidth <= window.innerWidth`.
- At 390px, no visible text node has computed font-size below 11px, excluding `aria-hidden` elements.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/story-regression.js`
Expected: FAIL on at least one scene-related interaction assertion.

- [ ] **Step 3: Apply compatibility fixes**

If wrapper elements change a `scrollToElement` target, update only that lookup in `js/script.js`. Add `css/story.css` overrides so dense steps do not force horizontal scrolling and the mobile progress line never covers the back-to-top control. Do not change copy, labels, or existing interaction logic.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/story-regression.js`
Expected: PASS on all interaction and responsive assertions.

- [ ] **Step 5: Commit**

```bash
git add js/script.js css/story.css tests/story-regression.js
git commit -m "fix: preserve interactions inside story scenes"
```

---

### Task 6: Screenshots and final verification

**Files:**
- Create: `tests/story-screenshots.js`
- Modify: `README.md` only if the verification command should be documented.

**Interfaces:**
- Consumes: all selectors and state from Tasks 1–5.
- Produces: regenerated screenshots in `~/Downloads` and a passing full verification run.

- [ ] **Step 1: Write the screenshot script**

Create `tests/story-screenshots.js` that starts from `http://127.0.0.1:8765/index.html` and captures:
- `barako-trails-desktop-full.png`
- `barako-trails-desktop-fold.png`
- `barako-trails-tablet-full.png`
- `barako-trails-mobile-full.png`
- `barako-trails-mobile-fold.png`
- `barako-trails-desktop-planner.png`
- `barako-trails-mobile-planner.png`
- New `barako-trails-story-province.png`, `barako-trails-story-experiences.png`, and `barako-trails-story-food.png` at mid-scene progress.

- [ ] **Step 2: Run all verification tests**

Run each in order:
`node tests/story-structure.js`, `node tests/story-layout.js`, `node tests/story-state.js`, `node tests/story-motion.js`, `node tests/story-regression.js`.
Expected: all PASS, no console errors.

- [ ] **Step 3: Regenerate screenshots**

Run: `node tests/story-screenshots.js`
Expected: all listed files written to `~/Downloads`.

- [ ] **Step 4: Commit**

```bash
git add tests/story-screenshots.js README.md
git commit -m "chore: add story screenshots and verification"
```
