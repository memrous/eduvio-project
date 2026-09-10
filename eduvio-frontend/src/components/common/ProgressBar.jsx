import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/**
 * Reusable animated progress bar component with GSAP.
 *
 * @param {number} value - Target percentage (0 - 100)
 * @param {string} [className] - Outer container classes
 * @param {string} [barClassName] - Inner bar classes
 * @param {number} [duration=0.9] - Animation duration in seconds
 * @param {number} [delay=0.25] - Delay before animation starts (runs smoothly after page entrance)
 * @param {React.ReactNode} [children] - Optional content inside the bar
 */
const ProgressBar = ({
  value = 0,
  className = 'h-2 w-full overflow-hidden rounded-full bg-surface-container',
  barClassName = 'h-full rounded-full bg-primary',
  duration = 0.9,
  delay = 0.25,
  children,
  ...containerProps
}) => {
  const containerRef = useRef(null)
  const barRef = useRef(null)

  const clampedValue = Math.min(100, Math.max(0, Number(value) || 0))

  useGSAP(() => {
    if (!barRef.current) return

    gsap.fromTo(
      barRef.current,
      { width: '0%' },
      {
        width: `${clampedValue}%`,
        duration,
        delay,
        ease: 'power2.out',
        force3D: true,
      }
    )
  }, { scope: containerRef, dependencies: [clampedValue] })

  return (
    <div ref={containerRef} className={className} {...containerProps}>
      <div ref={barRef} className={barClassName} style={{ width: '0%' }}>
        {children}
      </div>
    </div>
  )
}

export default ProgressBar
