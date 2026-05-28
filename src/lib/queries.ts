const TRIP_FIELDS = `
  "id":       id.current,
  tripDate,
  pageTitle,
  description,
  location,
  coords,
  date,
  distance,
  elevation,
  duration,
  category,
  tags,
  heroImage { ..., "alt": alt },
  "accentColor": coalesce(
    accentColor,
    heroImage.asset->metadata.palette.vibrant.background,
    heroImage.asset->metadata.palette.dominant.background,
    "#C04820"
  ),
  featured,
  featureLayout,
  "featureBlurb": coalesce(featureBlurb, description),
  featureQuote,
  orderRank,
  storyTitle,
  story[] {
    type,
    content,
    richText,
    url,
    image { ..., alt, caption, "dims": asset->metadata.dimensions },
    images[] { _key, ..., alt, caption, "dims": asset->metadata.dimensions }
  }
`

// All trips newest-first — used by getStaticPaths and the expeditions archive
export const ALL_TRIPS_QUERY = `
  *[_type == "trip"] | order(tripDate desc) {
    ${TRIP_FIELDS}
  }
`

// 10 most recent trips — used by the home page gallery
export const RECENT_TRIPS_QUERY = `
  *[_type == "trip"] | order(tripDate desc) [0...10] {
    ${TRIP_FIELDS}
  }
`

// Curated homepage features — large cinematic sections under the recent scroll.
// Order matches the drag-to-reorder list in Studio (orderable-document-list plugin).
export const FEATURED_TRIPS_QUERY = `
  *[_type == "trip" && featured == true] | order(orderRank asc) {
    ${TRIP_FIELDS}
  }
`
