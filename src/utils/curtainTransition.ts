import { gsap } from 'gsap'
import { navigate } from 'astro:transitions/client'

interface CurtainOptions {
  href: string
}

/**
 * Temporarily removes document.startViewTransition so Astro's navigate() falls
 * back to a plain DOM swap with no snapshot capture. This prevents the browser's
 * "rendering suppression" phase — a 1-frame pause during which the live DOM
 * (including our curtain/iris overlay on <html>) is not shown, causing a visible
 * dark flash. Our overlays own all visual cover; the snapshot system must stay
 * completely out of the picture.
 */
function bypassViewTransition(fn: () => void): void {
  // `delete document.startViewTransition` is a no-op — the method lives on
  // Document.prototype, not as an own property of the document instance.
  // Assigning undefined as an OWN property shadows the prototype method so
  // Astro's navigate() sees `document.startViewTransition === undefined` and
  // skips view transitions entirely, preventing the rendering-suppression flash.
  const svt = (document as any).startViewTransition?.bind(document)
  ;(document as any).startViewTransition = undefined
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
 * Ink-curtain page transition.
 * 1. A near-black panel rises from the bottom to cover the viewport (~0.55s).
 * 2. Astro's client-side navigate() swaps the page underneath.
 * 3. On the destination's astro:page-load, BaseLayout finds the curtain still
 *    on screen (it lives on <html> so it survives the body swap) and slides
 *    it up off the top to reveal the new page.
 *
 * Skips entirely under prefers-reduced-motion.
 */
export function playCurtainTransition({ href }: CurtainOptions): void {
  // Same re-entry guard as iris: a rapid double-click could otherwise stack
  // two curtains and leave one on the destination page. First click wins.
  if (document.querySelector('.curtain-overlay')) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate(href)
    return
  }

  const curtain = document.createElement('div')
  curtain.className = 'curtain-overlay'
  Object.assign(curtain.style, {
    position:      'fixed',
    inset:         '0',
    background:    '#0C0906',          // matches var(--ink)
    transform:     'translateY(100%)', // starts below the viewport
    zIndex:        '9500',             // above iris (9000), below custom cursor (9998+)
    pointerEvents: 'none',
    willChange:    'transform',
  })
  // Append to <html> so Astro's body swap doesn't destroy it mid-transition.
  document.documentElement.appendChild(curtain)

  gsap.to(curtain, {
    y:        '0%',
    duration: 0.55,
    ease:     'power3.inOut',
    onComplete: () => bypassViewTransition(() => navigate(href)),
  })
}
