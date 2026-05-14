import { uIOhook, UiohookKey } from "uiohook-napi";
import { BrowserWindow } from "electron";

export class InputInterceptor {
    private isIntercepting: boolean = false;
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        this.setupListeners();
    }

    public setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    private setupListeners() {
        uIOhook.on("keydown", (e) => {
            if (!this.isIntercepting) return;

            // Map common keys to characters or actions
            const keyMapping = this.getKeyMapping(e.keycode);

            if (keyMapping) {
                // Send to renderer
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send("stealth-input", keyMapping);
                }
            }
        });
    }

    public startIntercepting() {
        if (this.isIntercepting) return;
        this.isIntercepting = true;
        uIOhook.start();
        console.log("[InputInterceptor] Started interception");
    }

    public stopIntercepting() {
        if (!this.isIntercepting) return;
        this.isIntercepting = false;
        uIOhook.stop();
        console.log("[InputInterceptor] Stopped interception");
    }

    private getKeyMapping(keycode: number): { type: string; value?: string } | null {
        // Basic mapping for alphanumeric and control keys
        // This is a simplified mapping. uiohook-napi provides raw keycodes.

        // Special keys
        if (keycode === UiohookKey.Backspace) return { type: "action", value: "BACKSPACE" };
        if (keycode === UiohookKey.Enter) return { type: "action", value: "ENTER" };
        if (keycode === UiohookKey.Space) return { type: "char", value: " " };
        if (keycode === UiohookKey.Escape) return { type: "action", value: "ESCAPE" };

        // Alphanumeric (A-Z, 0-9)
        // Note: This mapping is very basic and assumes US layout. 
        // For a robust solution, we'd need a proper keymap.
        // For now, we'll map the most common ones.

        // Map A-Z
        if (keycode >= UiohookKey.A && keycode <= UiohookKey.Z) {
            // Convert keycode to char. 
            // UiohookKey.A is 30. 'a' is 97.
            // This is tricky without a library. 
            // Let's use a manual map for safety.
            const charCode = this.getCharFromKeycode(keycode);
            if (charCode) return { type: "char", value: charCode };
        }

        // Map 0-9
        if (keycode >= UiohookKey["0"] && keycode <= UiohookKey["9"]) {
            const charCode = this.getNumberFromKeycode(keycode);
            if (charCode) return { type: "char", value: charCode };
        }

        return null;
    }

    private getCharFromKeycode(keycode: number): string | null {
        switch (keycode) {
            case UiohookKey.A: return 'a';
            case UiohookKey.B: return 'b';
            case UiohookKey.C: return 'c';
            case UiohookKey.D: return 'd';
            case UiohookKey.E: return 'e';
            case UiohookKey.F: return 'f';
            case UiohookKey.G: return 'g';
            case UiohookKey.H: return 'h';
            case UiohookKey.I: return 'i';
            case UiohookKey.J: return 'j';
            case UiohookKey.K: return 'k';
            case UiohookKey.L: return 'l';
            case UiohookKey.M: return 'm';
            case UiohookKey.N: return 'n';
            case UiohookKey.O: return 'o';
            case UiohookKey.P: return 'p';
            case UiohookKey.Q: return 'q';
            case UiohookKey.R: return 'r';
            case UiohookKey.S: return 's';
            case UiohookKey.T: return 't';
            case UiohookKey.U: return 'u';
            case UiohookKey.V: return 'v';
            case UiohookKey.W: return 'w';
            case UiohookKey.X: return 'x';
            case UiohookKey.Y: return 'y';
            case UiohookKey.Z: return 'z';
            default: return null;
        }
    }

    private getNumberFromKeycode(keycode: number): string | null {
        switch (keycode) {
            case UiohookKey["0"]: return '0';
            case UiohookKey["1"]: return '1';
            case UiohookKey["2"]: return '2';
            case UiohookKey["3"]: return '3';
            case UiohookKey["4"]: return '4';
            case UiohookKey["5"]: return '5';
            case UiohookKey["6"]: return '6';
            case UiohookKey["7"]: return '7';
            case UiohookKey["8"]: return '8';
            case UiohookKey["9"]: return '9';
            default: return null;
        }
    }
}
