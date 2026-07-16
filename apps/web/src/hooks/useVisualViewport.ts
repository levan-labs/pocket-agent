import { useEffect } from 'react'

/**
 * Keeps layout CSS variables in sync with the visual viewport so the app
 * shell (and the chat composer inside it) stay above the Android keyboard.
 *
 * Writes on :root:
 *   --viewport-height       visible height (px), fallback 100dvh
 *   --viewport-offset-top   visualViewport.offsetTop (px)
 *   --keyboard-height       estimated obscured height (px)
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport

    const sync = () => {
      if (!vv) {
        root.style.setProperty('--viewport-height', '100dvh')
        root.style.setProperty('--viewport-offset-top', '0px')
        root.style.setProperty('--keyboard-height', '0px')
        return
      }

      const height = vv.height
      const offsetTop = vv.offsetTop
      // Layout viewport minus the visible visual viewport ≈ keyboard / chrome.
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)

      root.style.setProperty('--viewport-height', `${height}px`)
      root.style.setProperty('--viewport-offset-top', `${offsetTop}px`)
      root.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
    }

    sync()

    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)

    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])
}
