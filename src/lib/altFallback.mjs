/**
 * Deterministic, no-AI fallback alt text for trip images.
 *
 * Shared by the Astro render layer (build-time guard so nothing ever renders
 * without alt) and scripts/generate-alt-captions.mjs (persists the same value
 * into Sanity). It can't *describe* a photo — only derive a truthful label from
 * the trip and the section the image sits in. Real, descriptive alt/caption is
 * still authored per image; this is the safety net for anything left blank.
 */

/** "HAVASUPAI" / "DÍA DE MUERTOS" → "Havasupai" / "Día De Muertos" */
const titleCase = (s) =>
  String(s)
    .toLowerCase()
    .replace(/(^|\s|-)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())

const subjectOf = (trip) => {
  const lines = Array.isArray(trip?.pageTitle) ? trip.pageTitle.filter(Boolean) : []
  if (lines.length) return titleCase(lines.join(' '))
  return trip?.location || 'Expedition photo'
}

/**
 * Build a fallback alt string.
 * @param {object} trip            the trip doc (uses pageTitle + location)
 * @param {string} [sectionTitle]  nearest preceding section heading, if any
 */
export function deriveAlt(trip, sectionTitle) {
  const subject = subjectOf(trip)
  if (sectionTitle && sectionTitle.trim()) return `${subject} — ${sectionTitle.trim()}`
  if (trip?.location && trip.location !== subject) return `${subject}, ${trip.location}`
  return subject
}

const blank = (v) => !String(v ?? '').trim()

/**
 * Walk a trip's story once, tracking the current section, and fill any blank
 * `alt` on the hero, image blocks, and gallery images. Mutates in place.
 * Returns the number of fields filled. Captions are intentionally left alone —
 * a generic caption is visible to everyone and worse than none.
 */
export function applyAltFallback(trip) {
  if (!trip) return 0
  let filled = 0
  if (trip.heroImage && blank(trip.heroImage.alt)) {
    trip.heroImage.alt = deriveAlt(trip)
    filled++
  }
  let section = ''
  for (const block of trip.story ?? []) {
    if (block?.type === 'dayEntry') {
      section = block.dayTitle || block.customEyebrow || ''
      continue
    }
    if (block?.type === 'image' && block.image && blank(block.image.alt)) {
      block.image.alt = deriveAlt(trip, section)
      filled++
    }
    if (block?.type === 'gallery') {
      for (const img of block.images ?? []) {
        if (img && blank(img.alt)) {
          img.alt = deriveAlt(trip, section)
          filled++
        }
      }
    }
  }
  return filled
}
