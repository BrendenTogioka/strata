import { gsap } from 'gsap'
import { navigate } from 'astro:transitions/client'

interface IrisOptions {
  src:      string
  rect:     DOMRect
  href:     string
  heroSrc?: string  // full-res destination hero — preloaded during the animation
}

/**
 * Iris expand transition.
 * 1. Animates the card image rect to fullscreen (visual feedback).
 * 2. Calls Astro's navigate() — a client-side swap, not a hard reload.
 *    The overlay is appended to <html> (not <body>) so it survives Astro's
 *    body swap — swapBodyElement only preserves [data-astro-transition-persist]
 *    elements inside <body> and discards everything else. By living a level up,
 *    the overlay stays on screen across the swap until the destination's
 *    initPageAnimations fades it out once .trip-hero-img has decoded. That
 *    handoff is what prevents the dark flash between navigations.
 */
export function playIrisTransition({ src, rect, href, heroSrc }: IrisOptions): void {
  // Kick off a preload for the destination's full-res hero immediately —
  // the 0.75s animation gives the browser a head start before the page swap.
  if (heroSrc && !document.querySelector(`link[rel="preload"][href="${CSS.escape(heroSrc)}"]`)) {
    const preload = document.createElement('link')
    preload.rel  = 'preload'
    preload.as   = 'image'
    preload.href = heroSrc
    document.head.appendChild(preload)
  }
  // Container starts at the card image's exact screen position
  const container = document.createElement('div')
  container.className = 'iris-overlay'
  Object.assign(container.style, {
    position:      'fixed',
    top:           `${rect.top}px`,
    left:          `${rect.left}px`,
    width:         `${rect.width}px`,
    height:        `${rect.height}px`,
    overflow:      'hidden',
    zIndex:        '9000',
    pointerEvents: 'none',
  })

  // Inner image stays full-viewport-sized so it looks correct as the
  // container expands — avoids a "zooming postage stamp" effect
  const img = document.createElement('img')
  Object.assign(img.style, {
    position:  'absolute',
    top:       '50%',
    left:      '50%',
    width:     '100vw',
    height:    '100vh',
    objectFit: 'cover',
    transform: 'translate(-50%, -50%)',
  })
  img.src = src
  container.appendChild(img)
  // Append to <html>, not <body> — see note above. A body child would be
  // destroyed by Astro's swap before the destination hero is ready.
  document.documentElement.appendChild(container)

  // Expand to fullscreen, then hand off to Astro's client-side router
  gsap.to(container, {
    top:      0,
    left:     0,
    width:    '100vw',
    height:   '100vh',
    duration: 0.75,
    ease:     'power3.inOut',
    onComplete: () => navigate(href),
  })
}
