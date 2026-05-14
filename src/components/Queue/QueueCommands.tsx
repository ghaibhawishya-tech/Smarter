import React, { useState, useEffect, useRef } from "react"
import { IoCloseOutline } from "react-icons/io5"
import { Dialog, DialogContent, DialogClose } from "../ui/dialog"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshots: Array<{ path: string; preview: string }>
  onChatToggle: () => void
  onSettingsToggle: () => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots,
  onChatToggle,
  onSettingsToggle
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const chunks = useRef<Blob[]>([])
  // Remove all chat-related state, handlers, and the Dialog overlay from this file.

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
            } catch (err) {
              setAudioResult('Audio analysis failed.')
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording.')
      }
    } else {
      // Stop recording
      mediaRecorder?.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  // Remove handleChatSend function

  return (
    <div className="w-full">
      <div className="liquid-glass-bar draggable-area" style={{ display: "flex", alignItems: "center", gap: "1.25rem", justifyContent: "flex-start", padding: "0 1rem", overflow: "hidden", maxHeight: "44px" }}>
        {/* Show/Hide Command */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 500, whiteSpace: "nowrap" }}>
          <span>⌘B</span>
        </div>

        {/* Solve Command - Only show if screenshots exist */}
        {screenshots.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 500, whiteSpace: "nowrap" }}>
            <span>⌘↵</span>
          </div>
        )}

        {/* Voice Recording Button */}
        <button
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.625rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: isRecording ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.1)",
            color: isRecording ? "rgb(254, 202, 202)" : "rgba(255, 255, 255, 0.8)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
          onClick={handleRecordClick}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          tabIndex={-1}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isRecording ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isRecording ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.1)";
          }}
        >
          {isRecording ? (
            <>
              <span style={{ animation: "pulse 1s ease-in-out infinite" }}>●</span>
              <span>REC</span>
            </>
          ) : (
            <span>🎤</span>
          )}
        </button>

        {/* Settings Button */}
        <button
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.625rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "rgba(255, 255, 255, 0.8)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
          onClick={onSettingsToggle}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          tabIndex={-1}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          ⚙️
        </button>

        {/* Help Tooltip */}
        <div
          style={{ position: "relative", display: "inline-block" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255, 255, 255, 0.6)",
              cursor: "help",
              fontSize: "0.7rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease"
            }}
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            ?
          </button>

          {/* Tooltip Content */}
          {isTooltipVisible && (
            <div
              ref={tooltipRef}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "0.5rem",
                width: "280px",
                animation: "slideInDown 0.3s ease-out"
              }}
            >
              <div style={{
                padding: "0.875rem",
                fontSize: "0.75rem",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(20px)",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.85)",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)"
              }}>
                <div style={{ marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.8rem" }}>Shortcuts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span>Toggle Window</span>
                      <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>⌘B</span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.6)", fontSize: "0.7rem", lineHeight: 1.3 }}>Show or hide this window</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span>Screenshot</span>
                      <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>⌘H</span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.6)", fontSize: "0.7rem", lineHeight: 1.3 }}>Capture problem description</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span>Solve</span>
                      <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>⌘↵</span>
                    </div>
                    <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.6)", fontSize: "0.7rem", lineHeight: 1.3 }}>Generate solution</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ marginLeft: "auto" }} />

        {/* Close App Button */}
        <button
          style={{
            padding: "0.5rem 0.5rem",
            borderRadius: "0.625rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "rgba(254, 202, 202, 0.8)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            fontSize: "0.75rem"
          }}
          title="Close App"
          onClick={() => window.electronAPI.quitApp()}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          tabIndex={-1}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
          }}
        >
          <IoCloseOutline style={{ width: "16px", height: "16px" }} />
        </button>
      </div>
      {/* Audio Result Display */}
      {audioResult && (
        <div style={{
          marginTop: "0.5rem",
          padding: "0.75rem",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: "0.625rem",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "0.75rem",
          maxWidth: "280px"
        }}>
          <span style={{ fontWeight: 600, color: "rgba(96, 165, 250, 0.9)" }}>Audio:</span> {audioResult}
        </div>
      )}
    </div>
  )
}

export default QueueCommands
