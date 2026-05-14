import React, { useState, useEffect } from "react"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"

interface SettingsProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug" | "settings">>
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void
}

const Settings: React.FC<SettingsProps> = ({ setView, theme, setTheme }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })


  const [isSaving, setIsSaving] = useState(false)
  const [opacity, setOpacity] = useState(1.0)
  const [contentProtection, setContentProtection] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem("llm-settings")
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        // settings for providers are no longer needed

      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    // Load theme preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // Load opacity from electron
    window.electronAPI?.getWindowOpacity?.().then((savedOpacity) => {
      setOpacity(savedOpacity)
    }).catch(err => console.error("Failed to load opacity:", err))

    // Load content protection (default to true)
    const savedProtection = localStorage.getItem("content-protection")
    if (savedProtection !== null) {
      setContentProtection(savedProtection === "true")
    } else {
      // Default to enabled
      setContentProtection(true)
      localStorage.setItem("content-protection", "true")
      window.electronAPI?.setContentProtection?.(true)
    }
  }, [])

  // Save theme preference when changed
  useEffect(() => {
    localStorage.setItem("theme", theme)
  }, [theme])

  // Handle opacity changes
  const handleOpacityChange = async (newOpacity: number) => {
    setOpacity(newOpacity)
    try {
      await window.electronAPI?.setWindowOpacity?.(newOpacity)
    } catch (error) {
      console.error("Failed to set opacity:", error)
      showToast("Error", "Failed to set window opacity", "error")
    }
  }

  const showToast = (title: string, description: string, variant: ToastVariant) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)

    try {
      const settings = {
        opacity,
        contentProtection
      }

      localStorage.setItem("app-settings", JSON.stringify(settings))

      showToast("Success", "Settings saved successfully", "neutral")
      // Go back to queue after successful save
      setTimeout(() => {
        setView("queue")
      }, 1500)
    } catch (error) {
      showToast("Error", `Failed to save settings: ${String(error)}`, "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-container">
      <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={3000}>
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>

      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="app-logo">Settings</div>
        </div>
        <div className="top-bar-right">
          <button
            className="icon-button close"
            title="Back to chat"
            onClick={() => setView("queue")}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ padding: "20px", paddingBottom: "60px", overflowY: "auto" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {/* Appearance Settings */}
          <div style={{ marginBottom: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <h2 style={{ fontSize: "16px", marginBottom: "16px", color: "rgba(255, 255, 255, 0.9)" }}>
              Appearance
            </h2>

            {/* Theme Selection */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "rgba(255, 255, 255, 0.9)" }}>
                Theme
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {(["light", "dark", "system"] as const).map((themeOption) => (
                  <label key={themeOption} style={{ flex: 1, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="theme"
                      value={themeOption}
                      checked={theme === themeOption}
                      onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
                      style={{ marginRight: "8px" }}
                    />
                    <span style={{ color: "rgba(255, 255, 255, 0.8)", textTransform: "capitalize" }}>
                      {themeOption === "system" ? "System" : themeOption}
                    </span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                Choose between light, dark, or follow system preferences
              </p>
            </div>

            {/* Opacity Control */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", color: "rgba(255, 255, 255, 0.9)" }}>
                <span>Window Opacity</span>
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)" }}>
                  {Math.round(opacity * 100)}%
                </span>
              </label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "linear-gradient(to right, rgba(96, 165, 250, 0.3), rgba(96, 165, 250, 0.8))",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                Adjust window transparency (30% - 100%)
              </p>
            </div>

            {/* Content Protection Toggle */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>Hide from Screen Share</span>
                <input
                  type="checkbox"
                  checked={contentProtection}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    setContentProtection(enabled)
                    localStorage.setItem("content-protection", String(enabled))
                    window.electronAPI?.setContentProtection?.(enabled)
                  }}
                  style={{ accentColor: "#3b82f6" }}
                />
              </label>
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                If enabled, the window will be invisible to screen sharing tools (Zoom, Discord, etc.)
              </p>
            </div>

            {/* Auto-release Focus Toggle */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>Auto-release Focus</span>
                <input
                  type="checkbox"
                  checked={localStorage.getItem("auto-release-focus") === "true"}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    localStorage.setItem("auto-release-focus", String(enabled))
                    // Force re-render
                    setOpacity(prev => prev)
                  }}
                  style={{ accentColor: "#3b82f6" }}
                />
              </label>
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                Automatically return focus to the game after sending a message
              </p>
            </div>

            {/* Stealth Mode Toggle */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>Stealth Mode (Experimental)</span>
                <input
                  type="checkbox"
                  checked={localStorage.getItem("stealth-mode") === "true"}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    localStorage.setItem("stealth-mode", String(enabled))
                    // Force re-render
                    setOpacity(prev => prev)
                  }}
                  style={{ accentColor: "#ef4444" }}
                />
              </label>
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                Type without taking focus. Requires clicking the input box to activate.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "10px",
              background: isSaving
                ? "rgba(96, 165, 250, 0.3)"
                : "linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(99, 102, 241, 0.5))",
              border: "1px solid rgba(96, 165, 250, 0.3)",
              borderRadius: "6px",
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "12px",
              fontWeight: "600",
              cursor: isSaving ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
