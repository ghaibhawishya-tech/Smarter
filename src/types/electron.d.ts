export interface ElectronAPI {
  updateContentDimensions?: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots?: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot?: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken?: (callback: (data: { path: string; preview: string }) => void) => () => void
  onSolutionsReady?: (callback: (solutions: string) => void) => () => void
  onResetView?: (callback: () => void) => () => void
  onSolutionStart?: (callback: () => void) => () => void
  onDebugStart?: (callback: () => void) => () => void
  onDebugSuccess?: (callback: (data: any) => void) => () => void
  onSolutionError?: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots?: (callback: () => void) => () => void
  onProblemExtracted?: (callback: (data: any) => void) => () => void
  onSolutionSuccess?: (callback: (data: any) => void) => () => void
  onUnauthorized?: (callback: () => void) => () => void
  onDebugError?: (callback: (error: string) => void) => () => void
  takeScreenshot?: () => Promise<void>
  moveWindowLeft?: () => Promise<void>
  moveWindowRight?: () => Promise<void>
  moveWindowUp?: () => Promise<void>
  moveWindowDown?: () => Promise<void>
  snapToTopLeft?: () => Promise<void>
  snapToTopRight?: () => Promise<void>
  snapToBottomLeft?: () => Promise<void>
  snapToBottomRight?: () => Promise<void>
  setWindowOpacity?: (opacity: number) => Promise<void>
  getWindowOpacity?: () => Promise<number>
  setContentProtection?: (enabled: boolean) => Promise<void>
  onCopyLastResponse?: (callback: () => void) => () => void
  analyzeAudioFromBase64?: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
  analyzeAudioFile?: (path: string) => Promise<{ text: string; timestamp: number }>
  analyzeImageFile?: (path: string) => Promise<void>
  quitApp?: () => Promise<void>
  invoke?: (channel: string, ...args: any[]) => Promise<any>
  getCurrentLlmConfig?: () => Promise<{ provider: "ollama" | "gemini"; model: string; isOllama: boolean }>
  getAvailableOllamaModels?: () => Promise<string[]>
  switchToOllama?: (model?: string, url?: string) => Promise<{ success: boolean; error?: string }>
  switchToGemini?: (apiKey?: string) => Promise<{ success: boolean; error?: string }>
  testLlmConnection?: () => Promise<{ success: boolean; error?: string }>
  onTriggerChatSolve?: (callback: (data: { path: string; preview: string }) => void) => () => void
  onStealthInput?: (callback: (event: any, data: { type: string; value: string }) => void) => () => void
  setFocusable?: (focusable: boolean) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}