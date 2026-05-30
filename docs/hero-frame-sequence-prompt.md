# Task: convert the hero scroll-scrub from `<video>` seeking to a canvas image-frame sequence

## Goal
The homepage hero currently scrubs a Cloudinary MP4 by setting `video.currentTime` on scroll. Replace that with the Apple-style **image-frame-sequence** technique: preload a numbered set of stills and paint the correct frame to a `<canvas>` based on scroll progress. This removes the iOS seeking jank and gives smoother, decoder-independent scrubbing.

**Critical constraint:** Do **NOT** delete the existing video implementation. **Comment it out** so we can flip back instantly. We will only remove the dead video code in a follow-up commit, *after* the new version is tested live on real desktop AND mobile devices. Leave a clear `// VIDEO SCRUB (legacy) — remove after frame-sequence verified live on desktop+mobile` marker on each commented block.

## Current implementation (read these first)
- `src/components/HeroSection.astro` — hero markup. `#hero-img-wrap` gets the `hero-img-wrap--fill` class when `heroVideoUrl` is truthy. Contains a poster `<img>` (class `hero-img-hidden` when video active) and `<video id="hero-video" muted playsinline preload="none" aria-hidden="true">`.
- `src/utils/viewTransition.ts` — `initHeroScrub()` and `destroyHeroScrub()`, called from `initViewTransitions()`. Holds `const HERO_SCRUB_MAX = 0.85`, the scroll→`currentTime` math, the iOS `play()/pause()` unlock, and the rAF throttle. This is the file to fork the logic in.
- `src/styles/global.css` (~lines 989–1075) — `.hero` (height 100svh, overflow hidden), `.hero-img-wrap` (absolute inset 0), `.hero-img-wrap--fill` (`position: sticky; top: 0; height: 300vh` — the scroll track that gives the scrub its length), `.hero-video`, `.hero-img-hidden`, `.hero-img-wrap img` (object-fit cover), `will-change: transform`.
- `src/pages/index.astro:37` — `const heroVideoUrl = '…/OurRoamingReels/hero-bg.mp4'` passed into `<HeroSection>`. The poster (`so_0` jpg) is preloaded via `BaseLayout`'s `preloadImage`.

## Asset source — no re-upload needed
Cloudinary can extract numbered frames from the existing hero video on the fly. Base:

```
https://res.cloudinary.com/dlle6kl4n/video/upload/<transforms>/v1779987514/OurRoamingReels/hero-bg.jpg
```

Generate frame `i` of `N` (0-indexed) by using a percentage start-offset and content-negotiated format/quality:

```
so_<pct>p,w_<width>,c_fill,q_auto,f_auto
```

where `pct = Math.round((i / (N - 1)) * 100)`. `f_auto` makes the CDN serve AVIF/WebP to capable browsers (big size win), `q_auto` lets it pick quality. Example for the 50% frame at 1280px wide:
`https://res.cloudinary.com/dlle6kl4n/video/upload/so_50p,w_1280,c_fill,q_auto,f_auto/v1779987514/OurRoamingReels/hero-bg.jpg`

## Implementation plan

### 1. Markup (`HeroSection.astro`)
- **Comment out** the `<video id="hero-video">…</video>` block (keep the marker note).
- Add `<canvas id="hero-canvas" class="hero-canvas" aria-hidden="true"></canvas>` inside `#hero-img-wrap`, positioned like `.hero-video` was.
- Keep the poster `<img>` in the DOM as the first-paint / no-JS / reduced-motion fallback. Show it until frame 0 is decoded and drawn, then fade/hide it (reuse `hero-img-hidden` or add a small fade).

### 2. CSS (`global.css`)
- Add `.hero-canvas` mirroring `.hero-video` (`position: absolute; inset: 0; width: 100%; height: 100%;` — note the canvas does its own cover math via drawImage, so `object-fit` is not used on canvas).
- **Comment out** `.hero-video` (with marker). Leave `.hero-img-wrap--fill` (sticky 300vh track) EXACTLY as-is — the frame sequence depends on it.

### 3. Logic (`viewTransition.ts`)
Fork `initHeroScrub` into a canvas version (and update `destroyHeroScrub`). Comment out the old video body, keep the marker.

- **Config:** `FRAME_COUNT` ≈ 90 (tune for smoothness vs. payload). Reuse `HERO_SCRUB_MAX = 0.85`.
- **Responsive width:** pick frame width from viewport + DPR, e.g. mobile (`innerWidth < 768`) → 720, else min(1920, innerWidth) — then cap effective requests by capping DPR at 2. Build the `N` Cloudinary URLs with that width.
- **Preload + decode:** create an `Image()` per frame; await `img.decode()` (not just `onload`) before treating it as ready, to avoid first-draw hitches. Draw frame 0 as soon as it decodes and hide the poster. Stage the rest (e.g. load every Nth first for a coarse scrub, then fill in) so the hero is interactive fast. Track a `frames: HTMLImageElement[]` array.
- **Scroll handler:** keep the existing progress math (rect of `#hero-img-wrap`, clamp `-rect.top` to `[0, height - innerHeight]`, divide by `HERO_SCRUB_MAX`). Map to `frameIndex = Math.round(clampedProgress * (FRAME_COUNT - 1))`. If that frame is decoded, `drawImage` it with cover math (scale to fill canvas, center-crop). Keep the `requestAnimationFrame` throttle. Skip redraw if `frameIndex` hasn't changed.
- **Canvas sizing:** set `canvas.width/height` to CSS size × `min(devicePixelRatio, 2)`; recompute cover math on `resize` (and re-pick frame width / rebuild URLs if the breakpoint crossed). Use a debounced resize handler.
- **Reduced motion:** if `matchMedia('(prefers-reduced-motion: reduce)').matches`, skip preloading/scrub entirely and just leave the poster `<img>` visible.
- **Memory:** keep references in the `frames` array only; null it out in the cleanup. No need for the iOS unlock hack anymore (delete-by-commenting that block).
- **Cleanup:** `destroyHeroScrub` removes scroll + resize listeners and clears the frames array.

### 4. Verify before finishing (required)
Use the preview tools, do NOT ask the user to check manually:
- Start the dev server, load the homepage.
- Check `preview_console_logs` and `preview_network` — confirm frames load (and that `f_auto` is serving webp/avif), no 404s on the Cloudinary URLs, no JS errors.
- `preview_snapshot` to confirm the canvas is present and the poster falls back correctly.
- Scroll-drive it via `preview_eval` (set `window.scrollTo` to several positions through the hero track) and `preview_screenshot` at ~0%, 25%, 50%, 85%+ to prove the frame advances.
- `preview_resize` to a mobile width (e.g. 390×844) and repeat the scroll screenshots to prove the mobile frame set + cover math work.
- Test `prefers-reduced-motion` (emulate) → poster stays, no frame fetching.

Report payload size (sum of frame bytes from the network panel) at desktop and mobile widths so we can compare against the video.

## Out of scope / leave alone
- Don't touch `index.astro`'s `heroVideoUrl` constant yet (the new path won't use it, but leave it so the commented video code still references something valid). 
- Don't remove any commented legacy video code — that's a separate, later cleanup once we've confirmed it live on desktop + mobile.
