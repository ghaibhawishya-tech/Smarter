import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import Settings from "./_pages/Settings"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions" | "debug" | "settings">("queue")
  const [isElectron, setIsElectron] = useState(typeof window !== 'undefined' && !!window.electronAPI)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")
  const containerRef = useRef<HTMLDivElement>(null)

  // Check for Electron on mount
  useEffect(() => {
    setIsElectron(!!window.electronAPI)

    if (window.electronAPI) {
      // Sync Content Protection

      const savedProtection = localStorage.getItem("content-protection")
      if (savedProtection) {
        const enabled = savedProtection === "true"
        window.electronAPI.setContentProtection?.(enabled)
          .then(() => console.log(`Synced content protection: ${enabled}`))
          .catch(err => console.error("Failed to sync content protection:", err))
      }
    }
  }, [])

  // Theme detection and application
  useEffect(() => {
    const updateTheme = () => {
      if (theme === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setResolvedTheme(systemPrefersDark ? "dark" : "light")
      } else {
        setResolvedTheme(theme)
      }
    }

    updateTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => updateTheme()
    mediaQuery.addEventListener("change", handler)

    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.classList.toggle("light", resolvedTheme === "light")
  }, [resolvedTheme])

  useEffect(() => {
    if (!containerRef.current || !isElectron) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      const width = containerRef.current.scrollWidth
      window.electronAPI?.updateContentDimensions?.({ width, height })
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view, isElectron]) // Re-run when view changes

  useEffect(() => {
    if (!isElectron) return

    const cleanupFunctions = [
      window.electronAPI?.onSolutionStart?.(() => {
        setView("solutions")
        console.log("starting processing")
      }),

      window.electronAPI?.onUnauthorized?.(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("Unauthorized")
      }),
      // Update this reset handler
      window.electronAPI?.onResetView?.(() => {
        console.log("Received 'reset-view' message from main process")

        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("View reset to 'queue' via Command+R shortcut")
      }),
      window.electronAPI?.onProblemExtracted?.((data: any) => {
        if (view === "queue") {
          console.log("Problem extracted successfully")
          queryClient.invalidateQueries(["problem_statement"])
          queryClient.setQueryData(["problem_statement"], data)
        }
      })
    ].filter(Boolean)
    return () => cleanupFunctions.forEach((cleanup) => cleanup?.())
  }, [isElectron, view])

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isElectron ? (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center space-y-4">
            <div className="text-5xl">📋</div>
            <h1 className="text-2xl font-bold text-gray-800">Smarter</h1>
            <p className="text-gray-600">This app requires Electron to run</p>
            <p className="text-sm text-gray-500">Run: npm run app:dev</p>
          </div>
        </div>
      ) : (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            {view === "queue" ? (
              <Queue setView={setView} theme={theme} setTheme={setTheme} />
            ) : view === "solutions" ? (
              <Solutions setView={setView} />
            ) : view === "settings" ? (
              <Settings setView={setView} theme={theme} setTheme={setTheme} />
            ) : (
              <></>
            )}
            <ToastViewport />
          </ToastProvider>
        </QueryClientProvider>
      )}
    </div>
  )
}

export default App
