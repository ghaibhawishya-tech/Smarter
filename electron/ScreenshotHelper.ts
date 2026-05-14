// ScreenshotHelper.ts

import path from "node:path"
import fs from "node:fs"
import { app } from "electron"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5

  private screenshotDir: string = ""
  private extraScreenshotDir: string = ""
  private directoriesInitialized: boolean = false

  private view: "queue" | "solutions" = "queue"

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view
    // Don't initialize directories here - wait until app is ready
  }

  private initializeDirectories(): void {
    if (this.directoriesInitialized) return

    // Initialize directories
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots")
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    )
    this.directoriesInitialized = true

    // Create directories if they don't exist (with recursive option)
    this.ensureDirectoriesExist()
  }

  private ensureDirectoriesExist(): void {
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true })
      }
      if (!fs.existsSync(this.extraScreenshotDir)) {
        fs.mkdirSync(this.extraScreenshotDir, { recursive: true })
      }
    } catch (error) {
      console.error("Error creating screenshot directories:", error)
    }
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(`Error deleting screenshot at ${screenshotPath}:`, err)
      })
    })
    this.screenshotQueue = []

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(
            `Error deleting extra screenshot at ${screenshotPath}:`,
            err
          )
      })
    })
    this.extraScreenshotQueue = []
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    try {
      // Initialize directories on first use
      this.initializeDirectories()
      // Ensure directories exist before taking screenshot
      this.ensureDirectoriesExist()

      // Keep window visible during screenshot (user wants to see it)
      // console.log("[ScreenshotHelper] Hiding main window...")
      // hideMainWindow()

      // Add a small delay to ensure stability
      await new Promise(resolve => setTimeout(resolve, 100))

      let screenshotPath = ""

      console.log("[ScreenshotHelper] Attempting to capture screenshot...")

      try {
        // Capture screenshot as buffer and write manually
        const imgBuffer = await screenshot({ format: 'png' })

        if (!imgBuffer || imgBuffer.length === 0) {
          throw new Error("Screenshot buffer is empty")
        }

        console.log(`[ScreenshotHelper] Screenshot captured, buffer size: ${imgBuffer.length} bytes`)

        if (this.view === "queue") {
          screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`)
          await fs.promises.writeFile(screenshotPath, imgBuffer)
          console.log(`[ScreenshotHelper] Screenshot saved to: ${screenshotPath}`)

          this.screenshotQueue.push(screenshotPath)
          if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
            const removedPath = this.screenshotQueue.shift()
            if (removedPath) {
              try {
                await fs.promises.unlink(removedPath)
                console.log(`[ScreenshotHelper] Removed old screenshot: ${removedPath}`)
              } catch (error) {
                console.error("Error removing old screenshot:", error)
              }
            }
          }
        } else {
          screenshotPath = path.join(this.extraScreenshotDir, `${uuidv4()}.png`)
          await fs.promises.writeFile(screenshotPath, imgBuffer)
          console.log(`[ScreenshotHelper] Extra screenshot saved to: ${screenshotPath}`)

          this.extraScreenshotQueue.push(screenshotPath)
          if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
            const removedPath = this.extraScreenshotQueue.shift()
            if (removedPath) {
              try {
                await fs.promises.unlink(removedPath)
                console.log(`[ScreenshotHelper] Removed old extra screenshot: ${removedPath}`)
              } catch (error) {
                console.error("Error removing old extra screenshot:", error)
              }
            }
          }
        }

        return screenshotPath
      } catch (screenshotError) {
        console.error("[ScreenshotHelper] Failed to capture screenshot:", screenshotError)
        throw new Error(`Failed to capture screenshot: ${screenshotError.message}`)
      }
    } catch (error) {
      console.error("[ScreenshotHelper] Error in takeScreenshot:", error)
      throw new Error(`Failed to take screenshot: ${error.message}`)
    } finally {
      // Window stays visible, no need to show again
      // console.log("[ScreenshotHelper] Showing main window...")
      // showMainWindow()
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      this.initializeDirectories()
      const data = await fs.promises.readFile(filepath)
      return `data:image/png;base64,${data.toString("base64")}`
    } catch (error) {
      console.error("Error reading image:", error)
      throw error
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(path)
      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          (filePath) => filePath !== path
        )
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        )
      }
      return { success: true }
    } catch (error) {
      console.error("Error deleting file:", error)
      return { success: false, error: error.message }
    }
  }
}
