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
  accentColor,
  featured,
  featureLayout,
  "featureBlurb": coalesce(featureBlurb, description),
  featureQuote,
  featureOrder,
  storyTitle,
  story[] {
    type,
    content,
    richText,
    url,
    image { ..., alt, caption },
    images[] { _key, ..., alt, caption }
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

// Curated homepage features — large cinematic sections under the recent scroll
export const FEATURED_TRIPS_QUERY = `
  *[_type == "trip" && featured == true] | order(featureOrder asc, tripDate desc) {
    ${TRIP_FIELDS}
  }
`
