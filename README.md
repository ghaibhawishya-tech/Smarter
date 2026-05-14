# Smarter

An invisible, AI-powered desktop assistant designed to run seamlessly in the background during meetings, interviews, coding sessions, and presentations. It utilizes screen capture, OCR, and Large Language Models (LLMs) to provide real-time, discreet assistance.

## 🌟 Features

* **Invisible UI:** Designed to be unobtrusive and stay completely out of the way until you summon it.
* **Global Keyboard Shortcuts:** Trigger actions from anywhere without needing the app window to be focused.
* **Screen Analysis:** Instantly captures your screen and reads the text (OCR) to understand the current context.
* **Multi-LLM Support:** Choose your preferred AI brain:
  * **Google Gemini:** Fast and highly capable (Default).
  * **Local Ollama:** For ultimate privacy and offline capabilities.
  * **OpenAI / Azure:** For advanced reasoning.
* **Privacy Focused:** Screen captures are processed locally and only sent to the AI when explicitly triggered.

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A Google Gemini API Key (or OpenAI key / local Ollama setup)
* Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-github-repo-url>
   cd smarter
   ```

2. **Install dependencies:**
   This project relies on several native modules (like OCR and global keyboard hooks). It might take a moment to compile them.
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   * Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   * Open the `.env` file and add your AI API keys. For example:
     ```env
     GEMINI_API_KEY=your_actual_api_key_here
     ```

### Running the Application

**For Windows Users (Silent Mode):**
Simply double-click the `launch.vbs` script. This will start the application silently in the background without leaving a command prompt window open.

**For Mac / Linux / Development Mode:**
Run the following command in your terminal:
```bash
npm start
```

## ⌨️ Usage & Shortcuts

Since Smarter runs invisibly, you interact with it primarily through global keyboard shortcuts. *(Note: Check `electron/shortcuts.ts` to see or configure the exact keybindings)*.

Typically, the workflow looks like this:
1. You encounter a difficult question on your screen.
2. You press the global capture shortcut.
3. The app secretly takes a screenshot, extracts the text, and sends it to the configured LLM.
4. The AI's response is discreetly displayed on your screen.

## 🛠️ Tech Stack

* **Electron:** Desktop framework.
* **React + Vite:** Fast frontend UI.
* **Tailwind CSS:** Styling.
* **Tesseract.js:** Optical Character Recognition (OCR).
* **Sharp & Screenshot-Desktop:** Image processing and capturing.
* **UIOHook (Node):** Global keyboard and mouse listeners.

## ⚠️ Disclaimer

This tool is created for educational and experimental purposes. Please use it responsibly and ethically. Do not use this software to violate academic integrity policies, cheat on proctored exams, or break terms of service of any platform. The creators assume no liability for how this software is used.
