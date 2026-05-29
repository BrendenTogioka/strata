# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Our Roaming Reels" — a statically-generated Astro travel/field-journal site (deployed at ourroamingreels.com). Content lives in **Sanity CMS** and is fetched at **build time** via GROQ; media (hero video, card video) is served from **Cloudinary**. Heavy use of GSAP + Lenis for scroll-driven animation. Node >= 22.12.

## Commands

```sh
npm run dev        # Astro dev server at localhost:4321 (Studio also live at /studio)
npm run build      # static build to ./dist (fetches Sanity content at build time)
npm run preview    # serve the built ./dist locally
npm run studio     # run Sanity Studio standalone (`sanity dev`)
npm run gen:alt    # generate/refresh image alt text (scripts/generate-alt-captions.mjs)
```

- **No test suite and no linter are configured.** `npx astro check` works but prompts to install `@astrojs/check` on first run; TypeScript is `astro/tsconfigs/strict` (strict, not strictest — unused locals are allowed).
- **Type-check / catch errors**: `npm run build` is the practical verification step — it compiles and bundles the `<script>` in `BaseLayout.astro` and will fail on real errors.

### Content scripts (all read `.env`, talk to the live Sanity dataset)
- `node scripts/seed-<trip>.mjs` — create/replace a trip doc + upload its photos. Idempotent (`createOrReplace` with a deterministic `_id`). One script per trip; `seed-gear.mjs` and `seed-metadata.mjs` seed gear/site metadata.
- `node scripts/import-gear-list.mjs <trip-slug> <csv>` — import a per-trip Field Kit gear list from a CSV; replaces the trip's `gearList` wholesale.
- `npm run migrate:*` — one-off data migrations (see `package.json` scripts).
- Write scripts need `SANITY_WRITE_TOKEN` in `.env`; the site build/read path uses `SANITY_API_TOKEN`.

> **Gotcha:** after seeding a new trip (or its `/expedition/<slug>` route), **restart the dev server** — Astro caches `getStaticPaths`, so a new slug 404s until restart.

## Architecture

### Two render contexts in one repo
1. **The site** — Astro pages in `src/pages/`, prerendered to static HTML at build time.
2. **The embedded Sanity Studio** — `sanity.config.ts` + `sanity/schemaTypes/*` + `sanity/components/*`, mounted client-side at `/studio` (`src/pages/studio.astro` → `StudioMount.tsx`, `client:only="react"`).

### Data flow (build time)
- `src/lib/sanity.ts` — the Sanity `client` (**`useCdn: false`** deliberately, so freshly-published content isn't baked behind the Sanity CDN's ~60s lag), plus `urlFor()` and `sanityImgSrcset()` image-URL helpers. Use these for all Sanity images.
- `src/lib/queries.ts` — all GROQ queries (`ALL_TRIPS_QUERY`, `RECENT_TRIPS_QUERY`, `FEATURED_TRIPS_QUERY`, `GEAR_QUERY`).
- `src/pages/expedition/[id].astro` — trip pages; `getStaticPaths` fetches `ALL_TRIPS_QUERY` and renders one page per trip. Story content is a **block array** (`image` / `gallery` (`layout: strip|grid`) / `video` / `quote`), rendered with `@portabletext/to-html` for rich text. `applyAltFallback()` (`src/lib/altFallback.mjs`) guarantees no `<img>` ships without alt.
- The `trip` schema (`sanity/schemaTypes/trip.ts`) drives most of the site: `pageTitle` (array of display lines), `fieldIntel`, `gearList` (Field Kit), `elevationPoints`/`routeGpx`, `featured` (drag-orderable in Studio → controls home-page feature order), Cloudinary `heroVideo`/`cardVideo`.

### All client-side behavior lives in `src/layouts/BaseLayout.astro`
This is the single most important file. Its module `<script>` owns **every** animation and interaction site-wide; the section components (`HeroSection`, `ExpeditionGallery`, `FeaturedSection`, etc.) are **markup-only with no scripts**. It contains:
- `initPageAnimations()` — run on **every `astro:page-load`** (so it works regardless of entry page), wiring all GSAP ScrollTrigger animations, the hero scrub, section reveals, and the route map.
- **Lenis** smooth scroll — desktop only; **disabled on touch** (`isTouch()`), where native scroll + ScrollTrigger run instead. On desktop Lenis drives `ScrollTrigger.update()` via a `scrollerProxy`.
- Custom cursor (rAF loop, `transition:persist`), nav toggle (document-delegated so it survives swaps).
- **View-transition lifecycle**: Astro `ClientRouter` is on. `astro:after-swap` tears everything down (recreate Lenis → revert `matchMedia` → `ScrollTrigger.killAll()` → refresh) and `astro:page-load` re-inits. Anything stateful must be torn down here to avoid double-binding. Custom page transitions are `src/utils/irisTransition.ts` (image-card → hero) and `curtainTransition.ts` (nav-level); `viewTransition.ts` has `preloadImage`.

### Hero scrub (home page)
The hero is an **Apple-style image frame sequence painted to `<canvas>`**, scrubbed on scroll, on both desktop and mobile. Frames are extracted from a Cloudinary video via start-offset transforms (`so_<pct>p`); `HeroSection.astro` parses cloud/version/public-id out of `heroVideoUrl` into `data-*` on the canvas. **Pinned via CSS `position: sticky`, not a GSAP pin** (a GSAP pin corrupts ScrollTrigger scroll-tracking on touch). `.hero` is a tall scroll *track*, `.hero-sticky` holds the visuals; a non-pinning ScrollTrigger maps scroll progress → frame index. See the detailed memory note for hard-won gotchas (size the canvas to its own box not `.hero`; the worker-pool preloader must gate on real work or it spins/freezes; `body { overflow-x: clip }` not `hidden`).

### Styling
Single global stylesheet `src/styles/global.css` (no Tailwind, no CSS modules). Mobile content sits at `1.25rem` side padding; keep nav/hero margins consistent with it. `html` font-size is a `clamp()`, so `rem` ≈ 17–19px.

## Environment (`.env`)
`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` (default `production`), `SANITY_WRITE_TOKEN` (used **only** by the node scripts in `scripts/` — seed/import/migrate; the site build reads the public dataset with no token), `SANITY_STUDIO_CLOUDINARY_CLOUD_NAME` (enables the Cloudinary media browser in Studio).

## Deploy
Static output. Pushing to `main` on GitHub triggers the host's auto-deploy; commit/push only when asked.
