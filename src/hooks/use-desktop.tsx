import * as React from "react"

const DESKTOP_BREAKPOINT = 1024

/**
 * Returns true if the viewport width is desktop size (>= 1024px, lg breakpoint).
 * Tablet and mobile devices (< 1024px) return false.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= DESKTOP_BREAKPOINT
    }
    return true
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}
