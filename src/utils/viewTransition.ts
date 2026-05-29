/**
 * Temporarily shadows document.startViewTransition so Astro's navigate() falls
 * back to a plain DOM swap with no snapshot capture. This prevents the browser's
 * "rendering suppression" phase — a 1-frame pause during which the live DOM
 * (including our curtain/iris overlay on <html>) is not shown, causing a visible
 * dark flash. Our overlays own all visual cover; the snapshot system must stay
 * completely out of the picture.
 *
 * We shadow the real method (which lives on Document.prototype) with an
 * own-property mock that immediately calls Astro's swap callback and returns
 * resolved promises. Astro proceeds normally (swap + events) but the BROWSER's
 * View Transitions API is never invoked.
 *
 * Setting to `undefined` instead would make `document.startViewTransition(cb)`
 * throw a TypeError, crashing Astro's navigation silently and leaving the
 * overlay on screen permanently.
 */
export function bypassViewTransition(fn: () => void): void {
  const svt = (document as any).startViewTransition?.bind(document)
  ;(document as any).startViewTransition = (cb: () => Promise<void>) => {
    const done = cb()
    return {
      ready:              Promise.resolve(),
      updateCallbackDone: done ?? Promise.resolve(),
      finished:           done ?? Promise.resolve(),
      skipTransition:     () => {},
    }
  }
  document.addEventListener('astro:after-swap', () => {
    if (svt) {
      (document as any).startViewTransition = svt
    } else {
      delete (document as any).startViewTransition
    }
  }, { once: true })
  fn()
}

/**
 * Appends a <link rel="preload" as="image"> for the given URL so a destination
 * hero is cached before the iris/curtain transition lands. No-op if the URL is
 * empty or a preload link for it already exists. Used by transition triggers
 * (card hover, click) across the gallery, archive, feature and next-trip cards.
 */
export function preloadImage(url: string | undefined | null): void {
  if (!url) return
  if (document.querySelector(`link[rel="preload"][href="${CSS.escape(url)}"]`)) return
  const link = document.createElement('link')
  link.rel  = 'preload'
  link.as   = 'image'
  link.href = url
  document.head.appendChild(link)
}
