import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import fs from "fs"
import dotenv from "dotenv"

dotenv.config();

export class LLMHelper {
  private geminiClient: GoogleGenerativeAI | null = null
  private geminiApiKey: string = ""
  private readonly systemPrompt = `You are Wingman AI, a helpful assistant for coding and technical questions. Your responses should be:
- Direct and practical
- Concise, without unnecessary elaboration
- Code-focused when relevant
- Straight to the point

For code questions: Provide clean, working code with brief explanations.
Never ask users to upload images or provide canned responses about images.
Always respond to the user's actual question directly.`

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || "";
    if (this.geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(this.geminiApiKey);
      console.log("[LLMHelper] Initialized with Gemini API Key from environment.");
    } else {
      console.log("[LLMHelper] No GEMINI_API_KEY found in .env.");
    }
  }

  public async configureProvider(settings: any): Promise<boolean> {
    // Legacy support, automatically resolve true since we use .env
    return true;
  }

  private async fileToBase64(imagePath: string): Promise<string> {
    const imageData = await fs.promises.readFile(imagePath)
    return imageData.toString("base64")
  }

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    return text.trim();
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const messageParts: any[] = [{ text: prompt }];

      for (const path of imagePaths) {
        messageParts.push({
          inlineData: {
            mimeType: "image/png",
            data: await this.fileToBase64(path)
          }
        });
      }

      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-3.1-pro-high" });
      const result = await model.generateContent(messageParts);
      const text = this.cleanJsonResponse(result.response.text());
      return JSON.parse(text);
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `${this.systemPrompt}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate.",
    "confidence": 0.85
  }
}\n\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    try {
      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-3.1-pro-high" });
      const result = await model.generateContent(prompt);
      const text = this.cleanJsonResponse(result.response.text());
      return JSON.parse(text);
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      const messageParts: any[] = [{ text: prompt }];
      for (const path of debugImagePaths) {
        messageParts.push({
          inlineData: {
            mimeType: "image/png",
            data: await this.fileToBase64(path)
          }
        });
      }

      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-3.1-pro-high" });
      const result = await model.generateContent(messageParts);
      const text = this.cleanJsonResponse(result.response.text());
      return JSON.parse(text);
    } catch (error) {
      console.error("Error debugging solution with images:", error);
      throw error;
    }
  }

  public async analyzeAudioFile(audioPath: string): Promise<{ text: string; timestamp: number }> {
    return {
      text: "Audio analysis is not fully implemented in this version.",
      timestamp: Date.now()
    };
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string): Promise<{ text: string; timestamp: number }> {
    return {
      text: "Audio analysis is not fully implemented in this version.",
      timestamp: Date.now()
    };
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const base64Image = await this.fileToBase64(imagePath);
      const prompt = `${this.systemPrompt}\n\nAnalyze this screenshot and look for any visible questions, problems, or coding challenges. If you find any questions:
1. Provide a clear, concise answer to the question
2. If it's a coding problem, provide working code with explanations
3. Include examples or step-by-step solutions when relevant

If no clear question is visible, briefly describe what you see and suggest how you can help. Be direct and practical in your response.`;

      const messageParts: any[] = [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: base64Image } }
      ];

      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-3.1-pro-high" });
      const result = await model.generateContent(messageParts);
      return { text: result.response.text(), timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }

  public async chatWithGemini(message: string, history?: Array<{ role: string; text: string }>, screenshotPath?: string): Promise<string> {
    try {
      if (!this.geminiClient) {
        throw new Error("Gemini API is not configured via .env GEMINI_API_KEY");
      }

      // Hardcoded exclusive model per user instruction
      let modelCandidates = ["gemini-3.1-pro-high"];

      try {
        const params = new URLSearchParams({ key: this.geminiApiKey });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            const availableModels = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => m.name.replace("models/", ""));
            if (availableModels.length > 0) {
              modelCandidates = Array.from(new Set([
                "gemini-3.1-pro-high",
                "gemini-2.5-pro",
                ...availableModels
              ]));
            }
          }
        }
      } catch (e) {
        console.warn("[LLMHelper] Failed dynamic fetch:", e);
      }

      let lastError = null;

      for (const modelName of modelCandidates) {
        try {
          const model = this.geminiClient.getGenerativeModel({ model: modelName });
          const chatHistory = history?.map(msg => ({
            role: msg.role === "gemini" ? "model" : "user",
            parts: [{ text: msg.text }]
          })) || [];

          const chat = model.startChat({
            history: chatHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          });

          let messageParts: any[] = [{ text: message }];

          if (screenshotPath) {
            try {
              const imageData = await this.fileToBase64(screenshotPath);
              messageParts.unshift({
                inlineData: { mimeType: "image/png", data: imageData }
              });
            } catch (error) {
              console.error("[LLMHelper] Error processing screenshot:", error);
            }
          }

          const result = await chat.sendMessage(messageParts);
          return await result.response.text() || "No response";

        } catch (error: any) {
          lastError = error;
        }
      }

      throw new Error(`All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`);
    } catch (error) {
      console.error("[LLMHelper] Error in chat:", error);
      throw error;
    }
  }

  public async chat(message: string): Promise<string> {
    return this.chatWithGemini(message);
  }

  public isUsingOllama(): boolean {
    return false;
  }

  public async getOllamaModels(): Promise<string[]> {
    return [];
  }

  public getCurrentProvider(): "ollama" | "gemini" {
    return "gemini";
  }

  public getCurrentModel(): string {
    return "gemini-3.1-pro-high";
  }

  public async switchToOllama(model?: string, url?: string): Promise<void> {
    // No-op
  }

  public async switchToGemini(apiKey?: string): Promise<void> {
    // No-op, dynamically driven by .env
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.geminiClient) {
        return { success: false, error: "No Gemini client configured" };
      }
      await this.chatWithGemini("Hello");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: String(error) };
    }
  }
} 