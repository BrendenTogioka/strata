# New Trip Post — Reusable Prompt

Paste everything below the line into a fresh Claude Code terminal **opened in this repo**
(`/Users/admin/Documents/Claude/Projects/astro-strata`). Fill in the `TRIP BRIEF` block first;
leave the rest as-is.

---

You are creating a new "trip" post for the STRATA travel site (Astro + Sanity CMS). Trips are
seeded into the live Sanity production dataset by a small Node script, following an established
pattern. Your job: study the existing trips, then author and run a new seed script that matches
their layout, voice, and structure.

## TRIP BRIEF — fill this in

- **Destination:** <e.g. Glacier National Park, MT>
- **Dates / duration:** <e.g. started Aug 3, 2024 · 3 days · 2 nights>
- **Trip type:** <e.g. backpacking / car camping / road trip / day hikes>
- **Image folder (absolute path):** <e.g. /Users/admin/Desktop/Locations/glacier np>
- **Hero image:** <a specific filename, OR "you choose the best one">
- **Key beats / what happened:** <free-form notes — the route, terrain, weather, wildlife,
  memorable moments, anything that should make it into the copy. The more the better.>
- **Anything required in the copy:** <e.g. a specific quote, a particular caption, etc.
  — note that a quote, a callout, and a hindsight are ALWAYS required; see below>

## Steps

1. **Study the pattern.** Read `scripts/seed-bisti.mjs`, `scripts/seed-lakes-trail.mjs`, and
   `scripts/seed-yellowstone.mjs` in full. These are complete, working examples — copy their
   structure exactly (env loading, key generator, block builder helpers, upload loop, document
   shape). Also skim `sanity/schemaTypes/trip.ts` to confirm the allowed values (see below).

2. **Look at every image.** Use the Read tool to view each file in the image folder so your
   captions and alt text describe what's actually in frame. Pick the hero (per the brief, or your
   best judgment — a strong, wide landscape shot works best for the hero). Decide a sensible
   subset to use (roughly 6–12 images; don't cram all of them in — drop near-duplicates) and a
   role/keyword for each.

3. **Write the seed script** at `scripts/seed-<slug>.mjs`, modeled on the examples. It must:
   - Read env from `.env` (already wired in the example scripts — copy verbatim).
   - Set `SRC` to the image folder and a `PHOTOS` map of role → filename.
   - Upload each image and build the story array with the helper functions
     (`section`, `text`, `quote`, `callout`, `divider`, `hindsight`, `imageBlock`, `gallery`).
   - `createOrReplace` a document with `_id: 'trip-<slug>'` and `id.current: '<slug>'`.

4. **Run it:** `node scripts/seed-<slug>.mjs`

5. **Verify:** `node scripts/fetch-trip.mjs <slug>` and confirm the block order, images, and
   metadata look right.

## Voice & layout conventions (match these closely)

- **First person plural ("we"), observational and sensory**, short sentences mixed with longer
  narrative ones. Reflective, never markety. Specific over generic. Read the example scripts'
  prose and match that register.
- **Story arc:** `section('overview', …)` + 2–3 intro paragraphs + an establishing image +
  `divider()` → then `section('day', …)` blocks (auto-number "Day 01/02/…") that alternate text
  and images, OR `section('custom', title)` with a region/theme eyebrow for non-day-based trips
  (driving trips, etc.) → close with `section('final', …)` + reflection + a last image +
  `hindsight(...)`.
- **Always include exactly these three, placed wherever they fit the flow best:**
  - one **quote** — a reflective or memorable line (use real curly quotes "…" inside);
  - one **callout** — field-note style, typically `Day X · place/activity · conditions`;
  - one **hindsight** — practical, backward-looking advice for someone repeating the trip.
- **Images:** every image needs descriptive `alt`; most should have a `caption`. Use single
  `imageBlock`s for intimacy; use a `gallery('grid', [...])` (2–4 imgs) or `gallery('strip', […])`
  (3-up full width) to group related shots.
- **Tailor `fieldIntel` (8 rows) and `conditions` (4 items) to the specific trip** — permit
  reality, difficulty, best window, water, cell service, crowds, hazards/wildlife, access, etc.,
  with `status: 'good' | 'warn' | ''`. Conditions get an emoji `icon`, `label`, `value`, `subtext`.

## Schema constraints (use only these where the field is an enum)

- `category` (pick one): `desert` | `canyon` | `arctic` | `mountain` | `jungle` | `coastal` | `forest`
- `tags` (pick all that apply): `photography`, `hiking`, `backpacking`, `camping`, `day-hike`,
  `overnight`, `winter`, `water`, `night-sky`, `golden-hour`, `technical`, `remote`, `tropical`,
  `swimming`, `solo`
- `status` on intel rows: `''` (neutral), `good` (green), `warn` (orange)
- Story block `type`: `text` (Portable Text via the `para()` helper), `quote`, `callout`, `image`,
  `gallery` (`layout: 'grid' | 'strip'`), `video`, `divider`, `dayEntry`
  (`eyebrowKind: 'overview' | 'day' | 'final' | 'custom'`, with `customEyebrow` only for `custom`),
  `hindsight`.
- Document fields: `pageTitle` (array of 1–3 UPPERCASE lines), `storyTitle` (SEO-style long
  headline), `description` (≤140 chars), `tripDate` (`YYYY-MM-DD`), `location`, `coords`, `date`
  (display string, e.g. "August 2024"), `distance`, `elevation` (`'—'` if N/A), `duration`,
  `category`, `tags`, `accentColor` (hex, pick one that suits the hero), `featured: false`,
  `heroImage`, `fieldIntel`, `conditions`, `story`.

## Notes

- The seed scripts are safe to re-run (`createOrReplace` + deterministic `_id`); Sanity dedupes
  identical image uploads by hash.
- Don't set `featured: true` unless asked — ask the user if they want the trip on the home page.
- If anything about the trip is ambiguous (exact campsite, lake/peak names, mileage), make a
  reasonable choice and flag it to the user afterward rather than inventing false specifics.
