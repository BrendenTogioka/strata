const TRIP_FIELDS = `
  "id":       id.current,
  tripDate,
  cardTitle,
  pageTitle,
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
