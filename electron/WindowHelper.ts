import { BrowserWindow, screen } from "electron";
import { AppState } from "./main";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";

const startUrl = isDev
  ? "http://localhost:5185"
  : `file://${path.join(__dirname, "../dist/index.html")}`;

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null;
  private isWindowVisible: boolean = false;
  private windowPosition: { x: number; y: number } | null = null;
  private windowSize: { width: number; height: number } | null = null;
  private appState: AppState;

  // Screen dimensions for movement helpers
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private step: number = 20;
  private currentX: number = 0;
  private currentY: number = 0;


  private alwaysOnTopInterval: NodeJS.Timeout | null = null;
  private skipTaskbarInterval: NodeJS.Timeout | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  /** macOS screen capture protection (basic) */
  private setMacOSScreenCaptureProtection(): void {
    if (!this.mainWindow || process.platform !== "darwin") return;
    console.log('macOS content protection enabled (basic level)');
  }

  /** No‑op – auto‑sizing caused glitches */
  public setWindowDimensions(_: number, __: number): void {
    return;
  }

  /** Create the hidden main window */
  public createWindow(): void {
    console.log("=== CREATE WINDOW CALLED ===");
    if (this.mainWindow) {
      console.log("Window already exists, skipping creation");
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    this.screenWidth = workArea.width;
    this.screenHeight = workArea.height;
    console.log("Screen dimensions:", this.screenWidth, "x", this.screenHeight);

    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      width: 360,
      height: 202,
      minWidth: 360,
      minHeight: 200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        offscreen: false,
      },
      show: true,
      alwaysOnTop: true,
      frame: false,
      transparent: true, // Restore transparency
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // Transparent background
      acceptFirstMouse: true,
      resizable: true,
      movable: true,
      center: true,
      skipTaskbar: true, // Hide from taskbar
    };

    this.mainWindow = new BrowserWindow(windowSettings);
    console.log("BrowserWindow created successfully");

    // Explicitly suppress taskbar on Windows (constructor option alone is not always respected)
    this.mainWindow.setSkipTaskbar(true);

    // Enable content protection safely after window is ready
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setSkipTaskbar(true); // re-enforce after show
        this.mainWindow.showInactive();
        this.mainWindow.setContentProtection(true);
        this.mainWindow.setSkipTaskbar(true); // enforce again after showInactive
        console.log("[WindowHelper] Content protection enabled on ready-to-show");
      }
    });

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.mainWindow.setHiddenInMissionControl(true);
      this.mainWindow.setAlwaysOnTop(true, "floating");
      this.setMacOSScreenCaptureProtection();
    }

    // Windows-specific: Additional protection
    if (process.platform === "win32") {
      try {
        const hwnd = this.mainWindow.getNativeWindowHandle();
        // We apply content protection in ready-to-show, but setting it here doesn't hurt
        // this.mainWindow.setContentProtection(true); 
      } catch (error) {
        console.error("[WindowHelper] Failed to set Windows protection:", error);
      }
    }

    (this.mainWindow as any).setAlwaysOnTop(true, "screen-saver");
    console.log("Loading URL:", startUrl);
    this.mainWindow.loadURL(startUrl).catch(err => {
      console.error("Failed to load URL:", err);
    });

    // Prevent certain input events from stealing focus
    this.mainWindow.webContents.on('before-input-event', (event: any, input: any) => {
      if (input.type === 'keyDown' || input.type === 'keyUp' || input.type === 'char') {
        return;
      }
    });

    // Store initial bounds and set up listeners
    const bounds = this.mainWindow.getBounds();
    this.windowPosition = { x: bounds.x, y: bounds.y };
    this.windowSize = { width: bounds.width, height: bounds.height };
    this.currentX = bounds.x;
    this.currentY = bounds.y;

    this.setupWindowListeners();
    this.isWindowVisible = true;

    // Continuously re-enforce skipTaskbar on Windows (it can get re-added spontaneously)
    if (process.platform === "win32") {
      this.startSkipTaskbarInterval();
    }
  }

  private startSkipTaskbarInterval(): void {
    if (this.skipTaskbarInterval) return; // already running
    this.skipTaskbarInterval = setInterval(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setSkipTaskbar(true);
      }
    }, 500);
  }

  private stopSkipTaskbarInterval(): void {
    if (this.skipTaskbarInterval) {
      clearInterval(this.skipTaskbarInterval);
      this.skipTaskbarInterval = null;
    }
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds();
        this.windowPosition = { x: bounds.x, y: bounds.y };
        this.currentX = bounds.x;
        this.currentY = bounds.y;
      }
    });

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds();
        this.windowSize = { width: bounds.width, height: bounds.height };
      }
    });

    this.mainWindow.on("closed", () => {
      this.stopSkipTaskbarInterval();
      this.mainWindow = null;
      this.isWindowVisible = false;
      this.windowPosition = null;
      this.windowSize = null;
    });
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public isVisible(): boolean {
    return this.isWindowVisible;
  }

  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    const bounds = this.mainWindow.getBounds();
    this.windowPosition = { x: bounds.x, y: bounds.y };
    this.windowSize = { width: bounds.width, height: bounds.height };
    this.mainWindow.hide();
    this.isWindowVisible = false;
    if (this.alwaysOnTopInterval) {
      clearInterval(this.alwaysOnTopInterval);
      this.alwaysOnTopInterval = null;
    }
    // Stop the interval while hidden — no need to poll
    this.stopSkipTaskbarInterval();
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height,
      });
    }
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    this.mainWindow.showInactive();
    this.mainWindow.setSkipTaskbar(true);
    this.mainWindow.setOpacity(1.0);
    this.isWindowVisible = true;

    // Re-apply protection when showing window to ensure it stays hidden from screen share
    this.mainWindow.setContentProtection(true);

    try {
      (this.mainWindow as any).setAlwaysOnTop(true, "screen-saver");
    } catch (e) {
      console.error("Error setting always on top:", e);
      this.mainWindow.setAlwaysOnTop(true);
    }
    // Re-suppress taskbar after alwaysOnTop change
    this.mainWindow.setSkipTaskbar(true);

    // Restart the polling interval (may have been stopped while hidden)
    if (process.platform === "win32") {
      this.startSkipTaskbarInterval();
    }
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow();
    } else {
      this.showMainWindow();
    }
  }

  private centerWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const windowBounds = this.mainWindow.getBounds();
    const windowWidth = windowBounds.width || 400;
    const windowHeight = windowBounds.height || 600;
    const centerX = Math.floor((workArea.width - windowWidth) / 2);
    const centerY = Math.floor((workArea.height - windowHeight) / 2);
    this.mainWindow.setBounds({ x: centerX, y: centerY, width: windowWidth, height: windowHeight });
    this.windowPosition = { x: centerX, y: centerY };
    this.windowSize = { width: windowWidth, height: windowHeight };
    this.currentX = centerX;
    this.currentY = centerY;
  }

  public centerAndShowWindow(): void {
    this.centerWindow();
    this.showMainWindow();
  }

  // Movement helpers
  public moveWindowRight(): void {
    if (!this.mainWindow) return;
    const windowWidth = this.windowSize?.width || 0;
    const halfWidth = windowWidth / 2;
    this.currentX = Math.min(this.screenWidth - halfWidth, this.currentX + this.step);
    this.mainWindow.setBounds({ x: Math.round(this.currentX), y: Math.round(this.currentY), width: windowWidth, height: this.windowSize?.height || 0 }, false);
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return;
    const windowWidth = this.windowSize?.width || 0;
    const halfWidth = windowWidth / 2;
    this.currentX = Math.max(-halfWidth, this.currentX - this.step);
    this.mainWindow.setBounds({ x: Math.round(this.currentX), y: Math.round(this.currentY), width: windowWidth, height: this.windowSize?.height || 0 }, false);
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return;
    const windowHeight = this.windowSize?.height || 0;
    const halfHeight = windowHeight / 2;
    this.currentY = Math.min(this.screenHeight - halfHeight, this.currentY + this.step);
    this.mainWindow.setBounds({ x: Math.round(this.currentX), y: Math.round(this.currentY), width: this.windowSize?.width || 0, height: windowHeight }, false);
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return;
    const windowHeight = this.windowSize?.height || 0;
    const halfHeight = windowHeight / 2;
    this.currentY = Math.max(-halfHeight, this.currentY - this.step);
    this.mainWindow.setBounds({ x: Math.round(this.currentX), y: Math.round(this.currentY), width: this.windowSize?.width || 0, height: windowHeight }, false);
  }

  // Snap helpers
  public snapToTopLeft(): void {
    if (!this.mainWindow) return;
    const w = this.windowSize?.width || 360;
    const h = this.windowSize?.height || 202;
    this.currentX = 0;
    this.currentY = 0;
    this.mainWindow.setBounds({ x: 0, y: 0, width: w, height: h }, false);
    this.windowPosition = { x: 0, y: 0 };
  }

  public snapToTopRight(): void {
    if (!this.mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const w = this.windowSize?.width || 360;
    const h = this.windowSize?.height || 202;
    this.currentX = workArea.width - w;
    this.currentY = 0;
    this.mainWindow.setBounds({ x: this.currentX, y: 0, width: w, height: h }, false);
    this.windowPosition = { x: this.currentX, y: 0 };
  }

  public snapToBottomLeft(): void {
    if (!this.mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const w = this.windowSize?.width || 360;
    const h = this.windowSize?.height || 202;
    this.currentX = 0;
    this.currentY = workArea.height - h;
    this.mainWindow.setBounds({ x: 0, y: this.currentY, width: w, height: h }, false);
    this.windowPosition = { x: 0, y: this.currentY };
  }

  public snapToBottomRight(): void {
    if (!this.mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const w = this.windowSize?.width || 360;
    const h = this.windowSize?.height || 202;
    this.currentX = workArea.width - w;
    this.currentY = workArea.height - h;
    this.mainWindow.setBounds({ x: this.currentX, y: this.currentY, width: w, height: h }, false);
    this.windowPosition = { x: this.currentX, y: this.currentY };
  }

  public setWindowOpacity(opacity: number): void {
    if (!this.mainWindow) return;
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    this.mainWindow.setOpacity(clamped);
  }

  public getWindowOpacity(): number {
    if (!this.mainWindow) return 1.0;
    return this.mainWindow.getOpacity();
  }

  public setContentProtection(enabled: boolean): void {
    if (!this.mainWindow) return;
    this.mainWindow.setContentProtection(enabled);
  }

  public dropFocus(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    // Temporarily disable focusability to force Windows to focus the next window (the game)
    this.mainWindow.setFocusable(false);
    // Re-enable it immediately so the user can click it again later
    this.mainWindow.setFocusable(true);
    // Also blur for good measure
    this.mainWindow.blur();
  }

  public setFocusable(focusable: boolean): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.setFocusable(focusable);
    if (!focusable) {
      this.mainWindow.blur();
    }
  }
}
