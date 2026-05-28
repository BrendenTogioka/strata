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
  heroImage { ..., "alt": alt, "dims": asset->metadata.dimensions },
  "accentColor": coalesce(
    accentColor,
    heroImage.asset->metadata.palette.vibrant.background,
    heroImage.asset->metadata.palette.dominant.background,
    "#C04820"
  ),
  "cardVideoUrl":  cardVideo.secure_url,
  "routeGpxUrl":   routeGpx.asset->url,
  elevationPoints,
  fieldIntel[] { key, value, status },
  conditions[] { icon, label, value, subtext },
  featured,
  featureLayout,
  "featureBlurb": coalesce(featureBlurb, description),
  featureQuote,
  orderRank,
  storyTitle,
  story[] {
    _key,
    type,
    content,
    richText,
    url,
    dayTitle,
    eyebrowKind,
    customEyebrow,
    layout,
    image {
      ..., alt, caption,
      "dims": asset->metadata.dimensions,
      "palette": asset->metadata.palette
    },
    images[] {
      _key, ..., alt, caption,
      "dims": asset->metadata.dimensions,
      "palette": asset->metadata.palette
    }
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

// All gear — sorted by category then name. Featured items float to top within each group.
export const GEAR_QUERY = `
  *[_type == "gear"] | order(featured desc, category asc, name asc) {
    _id,
    name,
    brand,
    category,
    description,
    featured,
    image {
      ...,
      "alt": alt,
      "dims": asset->metadata.dimensions,
    },
  }
`
