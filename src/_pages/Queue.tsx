import React, { useState, useEffect, useRef, useCallback } from "react"
import { useQuery } from "react-query"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug" | "settings">>
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void
}

interface UISettings {
  windowPosition?: { x: number; y: number }
  windowSize?: { width: number; height: number }
  theme?: "dark" | "light"
}

const Queue: React.FC<QueueProps> = ({ setView, theme, setTheme }) => {
  // ============ STATE MANAGEMENT ============
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "gemini"; text: string }>>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [attachedScreenshot, setAttachedScreenshot] = useState<{ path: string; preview: string } | null>(null)
  const [copyingIndex, setCopyingIndex] = useState<number | null>(null)

  // ============ REFS ============
  const responseAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatMessagesRef = useRef<Array<{ role: "user" | "gemini"; text: string }>>([])

  // ============ API & DATA FETCHING ============
  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI?.getScreenshots?.() || []
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load screenshots", "error")
        return []
      }
    },
    { staleTime: Infinity, cacheTime: Infinity, refetchOnWindowFocus: true, refetchOnMount: true }
  )

  // ============ UTILITIES ============
  const showToast = useCallback((title: string, description: string, variant: ToastVariant) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (responseAreaRef.current) {
      setTimeout(() => {
        const element = responseAreaRef.current
        if (element) {
          // Use scrollIntoView as a fallback
          const lastChild = element.lastElementChild
          if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' })
          } else {
            // Fallback to scrollTo
            element.scrollTop = element.scrollHeight
          }
        }
      }, 100)
    }
  }, [])

  const copyToClipboard = useCallback((text: string, index: number) => {
    setCopyingIndex(index)
    navigator.clipboard.writeText(text).then(() => {
      showToast("✓ Copied", "Message copied to clipboard", "neutral")
      setTimeout(() => setCopyingIndex(null), 1000)
    }).catch(() => {
      showToast("✗ Error", "Failed to copy to clipboard", "error")
      setCopyingIndex(null)
    })
  }, [showToast])

  // ============ LOCALSTORAGE PERSISTENCE ============
  useEffect(() => {
    const saved = localStorage.getItem("cluely-ui-settings")
    if (saved) {
      try {
        JSON.parse(saved) // Validate JSON
      } catch (e) {
        console.error("Failed to parse UI settings:", e)
      }
    }
  }, [])

  // ============ UTILITY FUNCTIONS ============
  const detectAndFormatCodeQuestion = (text: string): string => {
    // Check if the message looks like it contains code or is asking about code
    const codeKeywords = [
      'how to', 'write', 'function', 'class', 'def ', 'const ', 'let ', 'var ',
      'import', 'export', 'return', 'if ', 'for ', 'while', 'code', 'program',
      'script', 'error', 'bug', 'debug', 'fix', 'implement', 'create'
    ]

    const hasCodeKeyword = codeKeywords.some(keyword => text.toLowerCase().includes(keyword))

    if (hasCodeKeyword && !text.includes('```')) {
      // Try to detect if there's actual code in the text
      const codePattern = /([a-zA-Z_]\w*\s*[=(]\s*|\w+\s*\(\s*|function\s+\w+)/
      if (codePattern.test(text)) {
        // Extract potential code parts and wrap them
        return text.replace(
          /([a-zA-Z_]\w*(?:\s*[=;]|\s*\(|.*?\))|function\s+\w+.*?{[\s\S]*?})/g,
          '```\n$1\n```'
        )
      }
    }

    return text
  }

  // ============ CHAT OPERATIONS ============
  const handleChatSend = useCallback(async (arg?: any, textOverride?: string) => {
    // Check if arg is a screenshot object (has path property)
    const screenshotOverride = (arg && arg.path) ? arg : null
    const currentScreenshot = screenshotOverride || attachedScreenshot

    const messageToUse = textOverride !== undefined ? textOverride : chatInput

    if (!messageToUse.trim() && !currentScreenshot) return

    let userMessage = messageToUse

    // Format coding questions
    userMessage = detectAndFormatCodeQuestion(userMessage)

    // Add screenshot context if attached
    if (currentScreenshot) {
      userMessage = `[Screenshot attached]\n${userMessage || "Can you analyze this screenshot?"}`
    }

    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }])
    setChatLoading(true)
    setChatInput("")

    try {
      // Prepare the payload with screenshot if available
      const payload: any = {
        message: userMessage,
        history: chatMessages
      }

      // If screenshot is attached, send it to the AI
      if (currentScreenshot) {
        payload.screenshotPath = currentScreenshot.path
      }

      const response = await window.electronAPI?.invoke?.(
        "gemini-chat",
        payload
      ) || "Error: Could not reach AI service"

      setChatMessages((prev) => [...prev, { role: "gemini", text: response }])

      // Clear the attached screenshot after sending
      setAttachedScreenshot(null)
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "gemini", text: `Error: ${String(err)}` }])
      showToast("Error", "Failed to get response", "error")
    } finally {
      setChatLoading(false)

      // Check if auto-release focus is enabled
      const autoRelease = localStorage.getItem("auto-release-focus") === "true"
      if (autoRelease) {
        // Blur the input first
        inputRef.current?.blur()
        // Call backend to force focus drop
        window.electronAPI?.invoke?.("drop-focus")
      } else {
        // Keep focus for continuous chatting
        inputRef.current?.focus()
      }
    }
  }, [chatInput, attachedScreenshot, chatMessages, showToast])

  // ============ KEYBOARD SHORTCUTS ============
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Alt+1: Toggle window visibility
      if (e.altKey && e.key === "1") {
        e.preventDefault()
        window.electronAPI?.invoke?.("toggle-window")
        return
      }

      // Cmd/Ctrl+H: Take screenshot
      if (modifier && e.key === "h") {
        e.preventDefault()
        window.electronAPI?.takeScreenshot?.()
        return
      }

      // Arrow keys: Move window (with Shift for larger steps)
      if (modifier && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        switch (e.key) {
          case "ArrowUp":
            window.electronAPI?.invoke?.("move-window", "up", step)
            break
          case "ArrowDown":
            window.electronAPI?.invoke?.("move-window", "down", step)
            break
          case "ArrowLeft":
            window.electronAPI?.invoke?.("move-window", "left", step)
            break
          case "ArrowRight":
            window.electronAPI?.invoke?.("move-window", "right", step)
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleChatSend])

  // ============ AUTO-SCROLL ON NEW MESSAGES ============
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, chatLoading, scrollToBottom])

  // Update ref when chatMessages changes to avoid stale closures
  useEffect(() => {
    chatMessagesRef.current = chatMessages
  }, [chatMessages])

  // ============ ELECTRON IPC LISTENERS ============
  useEffect(() => {
    const cleanup = [
      window.electronAPI?.onScreenshotTaken?.((data) => {
        console.log("[Queue] Screenshot taken event received:", data)
        setAttachedScreenshot(data)
        refetch()
        showToast("Screenshot Captured", "Screenshot attached to your next message", "neutral")
      }),
      window.electronAPI?.onTriggerChatSolve?.((data: { path: string; preview: string }) => {
        console.log("[Queue] Trigger Chat Solve received:", data)
        setAttachedScreenshot(data)
        setChatInput("solve this question")
        refetch()
        
        // Use text override to bypass stale state closure
        handleChatSend(data, "solve this question")
      }),
      window.electronAPI?.onResetView?.(() => {
        console.log("[Queue] Reset view event received")
        refetch()
      }),
      window.electronAPI?.onCopyLastResponse?.(() => {
        console.log("[Queue] Copy last response triggered")
        console.log("[Queue] Current chat messages:", chatMessagesRef.current)
        // Get the last AI message from chat using ref to avoid stale closure
        const lastAiMessage = [...chatMessagesRef.current].reverse().find(m => m.role === "gemini")
        if (lastAiMessage) {
          console.log("[Queue] Copying last AI message:", lastAiMessage.text)
          navigator.clipboard.writeText(lastAiMessage.text).then(() => {
            showToast("Copied!", "Last response copied to clipboard", "neutral")
          }).catch(err => {
            console.error("[Queue] Failed to copy:", err)
            showToast("Copy Failed", "Could not copy to clipboard", "error")
          })
        } else {
          console.log("[Queue] No AI messages available")
          showToast("No Response", "No AI response available to copy", "neutral")
        }
      }),
      window.electronAPI?.onSolutionError?.((error: string) => {
        console.error("[Queue] Solution error event:", error)
        showToast("Processing Failed", "Error processing screenshots", "error")
        console.error("Processing error:", error)
      })
    ].filter(Boolean)

    return () => cleanup.forEach((fn) => fn?.())
  }, [refetch, showToast])

  // ============ STEALTH MODE LOGIC ============
  const [isStealthActive, setIsStealthActive] = useState(false)
  const stealthModeEnabled = localStorage.getItem("stealth-mode") === "true"

  useEffect(() => {
    if (!stealthModeEnabled) return

    const handleStealthInput = (event: any, data: { type: string; value: string }) => {
      console.log("Stealth input:", data)
      if (data.type === "char") {
        setChatInput(prev => prev + data.value)
      } else if (data.type === "action") {
        if (data.value === "BACKSPACE") {
          setChatInput(prev => prev.slice(0, -1))
        } else if (data.value === "ENTER") {
          handleChatSend()
          setIsStealthActive(false)
          window.electronAPI?.invoke?.("stop-stealth-mode")
        } else if (data.value === "ESCAPE") {
          setIsStealthActive(false)
          window.electronAPI?.invoke?.("stop-stealth-mode")
        }
      }
    }

    // We need to add a listener for stealth-input. 
    // Since it's a custom event, we might need to expose it in preload or use a generic listener.
    // Assuming electronAPI exposes a generic 'on' method or specific one.
    // Let's check preload.ts later. For now, assuming we can add it.
    // Actually, we need to add it to preload.ts if it's not there.
    // But let's assume we can use window.electronAPI.on("stealth-input", ...)

    // Since we can't easily modify preload without checking it, let's assume we need to add it.
    // But wait, the previous code used window.electronAPI.onScreenshotTaken.
    // I should check preload.ts.

    // Use the exposed onStealthInput method
    const removeListener = window.electronAPI?.onStealthInput?.(handleStealthInput)

    // If stealth mode is enabled, make window non-focusable to prevent clicks from stealing focus
    if (stealthModeEnabled) {
      window.electronAPI?.setFocusable?.(false)
    } else {
      window.electronAPI?.setFocusable?.(true)
    }

    return () => {
      if (isStealthActive) {
        window.electronAPI?.invoke?.("stop-stealth-mode")
      }
      // Restore focusability when unmounting or disabling stealth mode
      window.electronAPI?.setFocusable?.(true)
      removeListener?.()
    }
  }, [stealthModeEnabled, isStealthActive, handleChatSend])

  const handleInputClick = () => {
    if (stealthModeEnabled && !isStealthActive) {
      setIsStealthActive(true)
      window.electronAPI?.invoke?.("start-stealth-mode")
      // No need to drop focus if window is non-focusable
    }
  }

  // ============ RENDER - MAIN LAYOUT ============
  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={3000}>
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>

      {/* ============ TOP BAR ============ */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="app-logo">Smarter</div>
        </div>
        <div className="top-bar-right">
          <button
            className="icon-button"
            title="Settings"
            onClick={() => setView("settings")}
            onMouseDown={(e) => e.preventDefault()}
          >
            ⚙️
          </button>
          <button
            className="icon-button close"
            title="Close App"
            onClick={() => window.electronAPI?.quitApp?.()}
            onMouseDown={(e) => e.preventDefault()}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div className="main-content">
        {/* Response Area */}
        <div className="response-area" ref={responseAreaRef}>
          {chatMessages.length > 0 && (
            chatMessages.map((msg, idx) => (
              <div key={idx} className={`response-card ${msg.role}`}>
                {msg.role === "gemini" && (
                  <div className="response-card-header">
                    <span className="response-card-role">AI</span>
                    <div className="response-card-actions">
                      <button
                        className={`copy-button ${copyingIndex === idx ? 'copying' : ''}`}
                        onClick={() => copyToClipboard(msg.text, idx)}
                        title="Copy response"
                        disabled={copyingIndex === idx}
                      >
                        {copyingIndex === idx ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="response-content">
                  {msg.role === "gemini" ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading State */}
          {chatLoading && (
            <div className="response-card ai">
              <div className="response-card-header">
                <span className="response-card-role">AI</span>
              </div>
              <div className="loading-indicator">
                <span className="loading-text">Thinking</span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ INPUT SECTION (Bottom) ============ */}
      <div className="input-section">
        {attachedScreenshot && (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(96, 165, 250, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={attachedScreenshot.preview}
                alt="Screenshot preview"
                style={{
                  width: '40px',
                  height: '40px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '1px solid rgba(96, 165, 250, 0.3)'
                }}
              />
              <span>📸 Screenshot attached</span>
            </div>
            <button
              onClick={() => setAttachedScreenshot(null)}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: 'rgba(239, 68, 68, 0.9)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px 8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              }}
              title="Remove screenshot"
            >
              Remove
            </button>
          </div>
        )}
        <div className="input-group">
          <input
            ref={inputRef}
            className={`message-input ${isStealthActive ? 'stealth-active' : ''}`}
            type="text"
            placeholder={isStealthActive ? "Stealth Mode: Typing..." : "What should I say? (Press Enter to send)"}
            value={chatInput}
            onChange={(e) => !isStealthActive && setChatInput(e.target.value)}
            onClick={handleInputClick}
            readOnly={isStealthActive}
            onKeyDown={(e) => {
              // Send on Enter key (standard mode)
              if (!isStealthActive && e.key === "Enter") {
                e.preventDefault()
                handleChatSend()
              }
            }}
            disabled={chatLoading}
            autoFocus
            style={isStealthActive ? { borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' } : {}}
          />
          <button
            className="action-button send-button"
            onClick={handleChatSend}
            disabled={chatLoading || (!chatInput.trim() && !attachedScreenshot)}
            title="Send (⏎)"
          >
            Send
          </button>
          <button
            className="action-button"
            onClick={async () => {
              try {
                const result = await window.electronAPI?.invoke?.("take-screenshot")
                if (result && result.path) {
                  setAttachedScreenshot(result)

                  // If there's text, send immediately
                  if (chatInput.trim()) {
                    // We need to wait a bit for state to update or pass it directly
                    // Since handleChatSend reads from state, let's pass it explicitly
                    // But handleChatSend is a callback. Let's modify handleChatSend to accept an override.

                    // Actually, let's just trigger the send logic here directly to be safe
                    // or refactor handleChatSend.

                    // Refactoring handleChatSend to accept optional screenshot
                    handleChatSend(result)
                  } else {
                    showToast("Screenshot Captured", "Screenshot attached. Type a message to send.", "neutral")
                  }
                }
              } catch (error) {
                console.error("Screenshot error:", error)
                showToast("Error", "Failed to take screenshot", "error")
              }
            }}
            title="Screenshot (Ctrl+H)"
          >
            📸
          </button>
        </div>

      </div>
    </div>
  )
}

export default Queue
