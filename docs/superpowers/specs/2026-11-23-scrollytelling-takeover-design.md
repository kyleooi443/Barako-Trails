# Full-screen scrollytelling takeover — design spec

Date: 2026-11-23
Branch: `kyle-branch`
Status: Approved design; implementation plan pending

## Goal

Turn the existing Barako Trails single-page site into a full-screen, scroll-driven editorial journey without rewriting its copy. Each major section becomes a scene with a pinned visual and step-based content choreography, so the page reads as one continuous story from arrival to departure.

## Success criteria

- The existing destinations, experiences, culture, food, guide, gallery, and closing copy is preserved verbatim.
- Every major section occupies at least one full viewport and progresses through visible steps as the user scrolls.
- Pinned imagery parallaxes gently while text remains readable.
- The interactive planner, destination filters, gallery lightbox, credits modal, mobile navigation, and smooth anchor scrolling continue to work.
- Reduced-motion users and browsers without JavaScript receive a complete, readable page with no hidden content.
- Desktop, tablet, and phone layouts have no horizontal overflow and preserve the existing 11px text floor and 40px primary control minimum.

## Non-goals

- No new destination, food, culture, or gallery content.
- No rewrite of existing headings, descriptions, or quotes.
- No replacement of the BARABARA hero font, Barlow body font, simplified footer, or no-icons rule.
- No new framework, package manager, build step, or external library.
- No change to the `Share itinerary` decision; it remains out of scope.

## Constraints carried forward

- Text-only controls except the existing favicon and hamburger. Controls keep labels such as `Back to top`, `Close`, `Previous`, and `Next`.
- No positive letter-spacing.
- Hero uses the local BARABARA font with `text-transform: uppercase`.
- Body copy uses Barlow.
- Footer remains simplified: no `Explore`, `Practical`, or `Connect` columns.
- Decorative closing image keeps `alt=""` and `aria-hidden="true"`; meaningful images keep descriptive alt text.
- All five destination filters remain visible on phones.
- Primary controls remain at least 40px tall on small screens.

## Architecture

### Files

- `index.html`
  - Add scene/step wrapper markup and `data-scene`, `data-chapter`, and `data-step` attributes around existing content.
  - Add the desktop chapter rail markup.
  - Load `js/story.js` after `js/script.js`.
- `css/story.css`
  - New file for scene layout, sticky visual stages, step choreography, chapter rail, and scroll-linked transforms.
  - Loaded after `css/style.css` so it can layer on top without rewriting base components.
- `js/story.js`
  - New file that owns scroll-driven scene state and the chapter rail.
  - Does not handle navigation, filters, planner, modals, lightbox, or credits; those remain in `js/script.js`.
- `css/style.css`
  - Only minimal changes if a base rule blocks the new scene layout.
- `js/script.js`
  - No behavioral rewrite. Small compatibility hooks only if a scene wrapper changes a scroll target.

### State and data flow

1. `js/story.js` collects `.story-scene` elements and their `.scene-step` children.
2. For each scene, a `requestAnimationFrame`-throttled scroll handler computes progress from the scene's bounding rect.
3. The script writes:
   - `--scene-progress` as a `0–1` custom property on the scene.
   - `data-active-step` as the zero-based index of the step nearest the viewport center.
   - `data-active-chapter` on `<body>` for the chapter rail and header accent.
4. CSS consumes these values to parallax the sticky visual and reveal the active step.
5. Steps remain in normal document flow; no step is ever removed, hidden with `display: none`, or made unreachable.

### Fallback behavior

- If JavaScript is unavailable, `js/story.css` does not add hidden states; all steps and content render normally.
- If `prefers-reduced-motion: reduce` matches, the script does not add `.has-story`; parallax, transforms, and scroll snapping are disabled.
- If `IntersectionObserver` is unavailable, the script still computes progress from scroll position alone.

## Chapter map

| Chapter | Section id | Pinned visual | Steps |
| --- | --- | --- | --- |
| 01 | `home` | Existing Taal hero image | Existing hero eyebrow, title, description, actions |
| 02 | `province` | `about-lake.jpg` | Intro heading, lead/body copy, quote, stats |
| 03 | `destinations` | Destination image collage built from existing images | Heading/filter bar, filterable card grid |
| 04 | `experiences` | Each experience's existing image | One scene per experience: kicker, heading, copy, tags, link |
| 05 | `culture` | `culture-basilica.jpg` | Heading, feature caption, three heritage chapters, quote |
| 06 | `food` | `food-bulalo.jpg` | Heading, feature dish, smaller dishes, footnote |
| 07 | `guide` | `gallery-jeepney.jpg` | Intro/season tabs, interactive planner, four travel facts |
| 08 | `gallery` | Dark gallery stage | Heading, gallery grid, credit line |
| 09 | `closing` / footer | `dest-laiya.jpg` | Eyebrow, title, copy, actions, footer |

The four experience entries become four separate `.story-scene` instances while remaining inside the existing `#experiences` section. The chapter rail still labels them collectively as `04 · Experiences`.

## Layout model

Each `.story-scene` uses a two-layer grid:

- `.scene-visual`: `position: sticky; top: 0; height: 100svh`, containing one existing `<img>` and a scrim.
- `.scene-content`: overlays the visual in the same grid cell and contains `.scene-step` panels.

A normal `.scene-step` has `min-height: 100svh`. Dense content steps such as the destination grid or gallery may be taller; the pinned visual stays until the whole scene ends.

On desktop only, `html.has-story` uses `scroll-snap-type: y proximity` and `.scene-step` uses `scroll-snap-align: start`. Snapping is disabled on phones and under reduced motion.

## Motion language

- Hero: existing title reveal and image zoom, plus scroll-linked fade/scale as the hero exits.
- Scene visuals: capped `translateY` and `scale` driven by `--scene-progress`; never enough to expose image edges or reduce text contrast.
- Step entrances: opacity, vertical travel, and subtle scale, staggered by element role (kicker, heading, body, cards).
- Chapter transitions: large chapter number and label sweep in at scene start; body `data-active-chapter` shifts header/background accents between sand, ocean, and ink.
- Planner: result panel keeps its `is-updated` animation; add a route-line reveal using borders/pseudo-elements only, not icons.
- Modals and lightbox: keep existing `modalIn`, backdrop blur, focus restoration, and swipe/keyboard navigation.

All transforms and animations live under `.has-story` or an explicit `@media (prefers-reduced-motion: no-preference)` guard.

## Chapter rail

- Desktop (`min-width: 1024px`) only: fixed right-side `<aside>` with text labels such as `01 The province`, `04 Experiences`, `09 Closing`.
- Decorative and `aria-hidden="true"`; the existing primary nav remains the accessible navigation.
- Active chapter is highlighted with color and a short progress segment driven by `--scene-progress`.
- Hidden below 1024px. No icons are added.

## Accessibility

- Steps stay in DOM flow and remain keyboard focusable.
- Existing skip link, nav focus trap, dialog focus restoration, and active-section nav continue to work.
- Meaningful images keep descriptive alt text; decorative scrims and the chapter rail are `aria-hidden="true"`.
- Reduced motion disables parallax, snapping, and transitions while keeping the full-screen layout.
- The mobile 11px text floor and 40px control minimum continue to apply to rail-adjacent and step content.

## Verification

A Playwright-based check will cover:

1. All nine chapters and their scenes/steps render.
2. Scrolling updates `data-active-chapter`, `data-active-step`, and `--scene-progress`.
3. Destination filters still show all five categories on a 390px viewport.
4. Planner choices still update the itinerary and copy/localStorage behavior is unchanged.
5. Destination modal and gallery lightbox open, close, and restore focus.
6. Reduced-motion mode exposes all content with no transforms.
7. No console errors and no horizontal overflow at 1440px, 768px, 390px, and 360px.
8. Screenshots are regenerated for desktop, tablet, phone, multiple scroll positions, and the planner.

## Risks and mitigations

- **Risk:** Sticky layers interfere with anchor scrolling or dialogs.
  - **Mitigation:** Keep dialogs outside scene wrappers; verify `scrollToElement` against scene steps.
- **Risk:** Full-screen steps make long grids feel cramped.
  - **Mitigation:** Allow dense steps to exceed one viewport; only normal steps are `100svh`.
- **Risk:** Scroll snapping feels restrictive.
  - **Mitigation:** Use proximity snapping on desktop only and disable it for reduced motion.
- **Risk:** Extra JS state drifts from existing active-nav state.
  - **Mitigation:** Story state is read-only for CSS; `js/script.js` remains the source of truth for navigation and interactions.
