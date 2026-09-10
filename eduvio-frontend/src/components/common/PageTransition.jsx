import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

const SELECTOR = '.page-section, section:not(aside *):not(aside), [data-page-section]'
const OBSERVER_TIMEOUT_MS = 2000

const PageTransition = ({ children, className }) => {
  const containerRef = useRef(null)
  const location = useLocation()

  useGSAP(() => {
    if (!containerRef.current) return

    let rafId = null
    let observer = null
    let disconnectTimerId = null

    const runAnimation = () => {
      if (!containerRef.current) return

      // Collect all matching targets that haven't been animated yet
      const allTargets = Array.from(
        containerRef.current.querySelectorAll(SELECTOR)
      ).filter((el) => !el.hasAttribute('data-animated'))

      if (allTargets.length === 0) return

      // Kill any in-progress tweens on these elements to prevent overlap
      allTargets.forEach((el) => gsap.killTweensOf(el))

      // Mark as animated before starting so the observer won't re-trigger
      allTargets.forEach((el) => el.setAttribute('data-animated', 'true'))

      // Reset the auto-disconnect timer every time we animate new content.
      // This ensures we keep watching for async data that arrives late
      // (e.g. React Query resolving after the initial render), but we
      // still disconnect eventually to avoid observing indefinitely.
      if (observer) {
        clearTimeout(disconnectTimerId)
        disconnectTimerId = setTimeout(() => {
          if (observer) {
            observer.disconnect()
            observer = null
          }
        }, OBSERVER_TIMEOUT_MS)
      }

      gsap.fromTo(
        allTargets,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.06,
          force3D: true,
          clearProps: 'opacity,transform',
        }
      )
    }

    // Immediate animation on mount / route change
    runAnimation()

    // Observe DOM changes for async data (React Query resolving after mount).
    // Debounce via rAF so all mutations within a single React commit are batched
    // into one animation pass instead of firing per-node.
    const scheduledRun = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        runAnimation()
      })
    }

    observer = new MutationObserver(scheduledRun)

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    })

    // Start the initial auto-disconnect timer
    disconnectTimerId = setTimeout(() => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
    }, OBSERVER_TIMEOUT_MS)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      clearTimeout(disconnectTimerId)
      if (observer) observer.disconnect()
    }
  }, { scope: containerRef, dependencies: [location.pathname] })

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

export default PageTransition
