import { globalShortcut, app } from "electron"
import { AppState } from "./AppStateClass" // Adjust the import path if necessary

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public registerGlobalShortcuts(): void {
    // Add global shortcut to show/center window
    globalShortcut.register("CommandOrControl+Shift+Space", () => {
      console.log("Show/Center window shortcut pressed...")
      this.appState.centerAndShowWindow()
    })

    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        console.log("[ShortcutsHelper] Taking screenshot with Cmd+H...")
        try {
          console.log("[ShortcutsHelper] Calling takeScreenshot()...")
          const screenshotPath = await this.appState.takeScreenshot()
          console.log(`[ShortcutsHelper] Screenshot saved to: ${screenshotPath}`)

          console.log("[ShortcutsHelper] Getting image preview...")
          const preview = await this.appState.getImagePreview(screenshotPath)
          console.log(`[ShortcutsHelper] Preview generated, sending to renderer...`)

          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
          console.log("[ShortcutsHelper] Screenshot event sent successfully")
        } catch (error) {
          console.error("[ShortcutsHelper] Error capturing screenshot:", error)
          // Send error event to renderer
          mainWindow.webContents.send("screenshot-error", {
            error: error.message
          })
        }
      } else {
        console.warn("[ShortcutsHelper] Main window not available for screenshot")
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      console.log("[ShortcutsHelper] Ctrl+Enter pressed. Sending trigger-chat-solve...")
      const mainWindow = this.appState.getMainWindow()
      
      if (mainWindow) {
        try {
          const screenshotPath = await this.appState.takeScreenshot()
          const preview = await this.appState.getImagePreview(screenshotPath)

          // Tell the renderer to handle this as a chat "solve this question"
          mainWindow.webContents.send("trigger-chat-solve", {
            path: screenshotPath,
            preview
          })
          
          // Switch view back to queue if it isn't already, so the user sees the chat
          this.appState.setView("queue")
          mainWindow.webContents.send("reset-view")
        } catch (error) {
           console.error("[ShortcutsHelper] Error capturing screenshot for solve:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )

      // Cancel ongoing API requests
      this.appState.processingHelper.cancelOngoingRequests()

      // Clear both screenshot queues
      this.appState.clearQueues()

      console.log("Cleared queues.")

      // Update the view state to 'queue'
      this.appState.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.appState.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.appState.moveWindowRight()
    })
    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.appState.moveWindowDown()
    })
    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.appState.moveWindowUp()
    })

    globalShortcut.register("Alt+1", () => {
      this.appState.toggleMainWindow()
      // If window exists and we're showing it, bring it to front
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !this.appState.isVisible()) {
        // Force the window to the front on macOS
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          // Reset alwaysOnTop after a brief delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })

    // Corner snap shortcuts (using Alt to avoid macOS screenshot conflicts)
    globalShortcut.register("CommandOrControl+Alt+1", () => {
      console.log("Cmd+Alt+1 pressed. Snapping window to top-left corner.")
      this.appState.snapToTopLeft()
    })

    globalShortcut.register("CommandOrControl+Alt+2", () => {
      console.log("Cmd+Alt+2 pressed. Snapping window to top-right corner.")
      this.appState.snapToTopRight()
    })

    globalShortcut.register("CommandOrControl+Alt+3", () => {
      console.log("Cmd+Alt+3 pressed. Snapping window to bottom-left corner.")
      this.appState.snapToBottomLeft()
    })

    globalShortcut.register("CommandOrControl+Alt+4", () => {
      console.log("Cmd+Alt+4 pressed. Snapping window to bottom-right corner.")
      this.appState.snapToBottomRight()
    })

    // Copy last response shortcut (will be implemented via IPC)
    globalShortcut.register("CommandOrControl+Shift+C", () => {
      console.log("Cmd+Shift+C pressed. Copying last response to clipboard.")
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("copy-last-response")
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
