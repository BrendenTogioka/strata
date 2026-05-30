/**
 * Card preview videos are stored in Cloudinary as the ORIGINAL uploads — some
 * 69 MB .mp4 files, some 24 MB .mov files served as `video/quicktime`. Delivering
 * those raw wrecks both page weight and the Cloudinary credit budget (every byte
 * is metered). This rewrites a Cloudinary video `secure_url` into a web-optimized
 * derivative:
 *   - `w_<width>`  cap the delivery width (cards never need the full original)
 *   - `q_auto`     let Cloudinary pick perceptually-lossless quality
 *   - force `.mp4` so .mov/.webm originals transcode to a container every browser
 *                  plays (the loops are muted/aria-hidden, so AVC mp4 is ideal)
 * Result is far smaller than the raw original yet stays crisp at card size. The
 * first request for a new transform transcodes (slow once), then it's
 * immutable-CDN-cached.
 *
 * `width` must cover the card's *device* pixels: these cards are large (the home
 * gallery cards are 60–70vw × 100vh and `object-fit: cover`), so on a HiDPI
 * display an 800px derivative gets upscaled and looks soft. Callers pass a width
 * sized to the card; the 1280 default suits the smaller grid cards.
 *
 * Defensive + idempotent: empty strings, non-Cloudinary URLs, and URLs that
 * already carry a transform segment are returned unchanged.
 */
export function cardVideoSrc(url: string | undefined | null, width = 1280): string {
  if (!url) return url ?? ''
  const marker = '/video/upload/'
  const at = url.indexOf(marker)
  if (at === -1) return url // not a Cloudinary video delivery URL — leave it alone

  const head = url.slice(0, at + marker.length)
  const tail = url.slice(at + marker.length)

  // First path segment after /upload/ is either a version ("v123…") or an
  // existing transform. If it already looks like a transform, don't double-wrap.
  const firstSeg = tail.split('/')[0]
  if (/(?:^|,)(?:w_|h_|q_|f_|c_|vc_|so_)/.test(firstSeg)) return url

  return (head + `w_${width},q_auto/` + tail).replace(
    /\.(mov|webm|m4v|avi|mkv|qt)(\?.*)?$/i,
    '.mp4$2',
  )
}
