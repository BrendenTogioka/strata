// ── Shared projection ─────────────────────────────────────────────────────
// All fields needed to render a trip — used in both list and detail queries.
const TRIP_FIELDS = `
  "id":       id.current,
  sortOrder,
  cardTitle,
  pageTitle,
  location,
  coords,
  date,
  distance,
  elevation,
  duration,
  heroImage { ..., "alt": alt },
  accentColor,
  story[] { type, content, image { ..., alt, caption } }
`

// ── All trips (for home page gallery + getStaticPaths) ───────────────────
export const ALL_TRIPS_QUERY = `
  *[_type == "trip"] | order(sortOrder asc) {
    ${TRIP_FIELDS}
  }
`

// ── Single trip by slug (for trip page) ──────────────────────────────────
export const TRIP_BY_ID_QUERY = `
  *[_type == "trip" && id.current == $id][0] {
    ${TRIP_FIELDS}
  }
`
