# SubMaster Pro: The Ultimate Guide

Welcome to **SubMaster Pro**, a professional-grade, browser-first subtitle editor. This document is your master manual for usage, local setup, embedding, and packaging.

---

## 1. Core Editor Interaction
*   **Play/Pause**: Use the **Spacebar** (activated when not typing in a textbox).
*   **Precision Seek**: Click and drag the **Playhead** (the red needle) on the timeline.
*   **Timeline Manipulation**:
    *   **Zooming**: Hold **Ctrl** + **Mouse Wheel** to scale the view.
    *   **Move**: Click and drag the center of a subtitle block to shift timing.
    *   **Trim**: Drag the left/right edges to adjust duration.
*   **Subtitle Controls**: 
    *   **Split**: Hover over a card and click the **scissors** icon.
    *   **Focus**: Press **Enter** on a selected line to seek the video to its start.
    *   **Dictionary**: Highlight a word and **Right-Click** for meanings.

---

## 2. Platform Options
SubMaster Pro is a hybrid app that can run anywhere:
1.  **Web**: Just host the `/dist` folder. Best for quick access.
2.  **Desktop**: Package as a `.exe` (Windows) or `.dmg` (Mac). Best for pro editing.
3.  **Mobile**: Package as an `.apk` (Android). Best for review on-the-go.

---

## 3. Local Installation (PC Setup)
To run SubMaster Pro on your own machine:

1.  **Install Node.js** from [nodejs.org](https://nodejs.org).
2.  **Run Installation**:
    ```bash
    npm install --legacy-peer-deps
    ```
    *(Note: The `--legacy-peer-deps` flag is mandatory for dependency resolution).*
3.  **Start**:
    ```bash
    npm start
    ```
    Access at `http://localhost:3000`.

---

## 4. Developer API & Embedding
If you want to add SubMaster Pro to your own Python (Streamlit) or Web app:

### Iframe Integration:
```html
<iframe src="YOUR_URL" width="100%" height="800px" style="border:none"></iframe>
```

### Control API (postMessage):
*   **Load Video**: `iframe.postMessage({ type: 'load-video', url: 'LINK' }, '*')`
*   **Export SRT**: `iframe.postMessage({ type: 'get-srt' }, '*')`
*   **Playback**: `iframe.postMessage({ type: 'pause' }, '*')`

---

## 5. Desktop & Mobile Packaging
### For Desktop (.exe):
1. Build the app: `npm run build`.
2. Use **Electron** to wrap the `/dist` folder.
3. Install `electron-builder` and run it to generate your installer.

### For Mobile (.apk):
1. Install **Capacitor**: `npm install @capacitor/core @capacitor/cli`.
2. Add android: `npx cap add android`.
3. Open in Android Studio: `npx cap open android` and build your signed APK.

---

## 6. AI, Independence, & Privacy
This application has been meticulously modified to remove **ALL external API dependencies**. 
It no longer requires a Google Gemini key, no backend server, and no cloud service to function. It is fully **in-built** and autonomous.

There are two primary modes under **Settings -> AI Provider**:
1. **Browser Native (Default)**: Leverages your device's internal GPU/CPU. When you click **AI Transcribe**, the app uses WebGL and `@xenova/transformers` to download and execute `whisper-tiny.en` *entirely* inside your browser's private sandbox. Highly accurate and fully offline after the first ~80MB cache download!
2. **Custom / Ollama**: If you want to use extremely heavy translation models offline without downloading a 1.2GB model into your browser, you can connect SubMaster Pro to a locally running instance of **Ollama** or **LMStudio** running models like `llama3`.

*(Note: Because completely offline browser translation models are extremely large, the "Translate" button currently uses a simulated placeholder when the Browser Native provider is active. You can use the Ollama API config for real offline multi-lingual translation.)*

---

## 7. Troubleshooting
### Blank Screen on Local PC?
If the app shows a blank screen when double-clicking `index.html` or running `npm start`:
1. **Local File Protocol (`file://`) Crash Fixed**: I have completely removed Angular Router from the app, which natively crashes when running on a local desktop outside of a browser server.
2. **Node Polyfills Fixed**: I have injected `window.process` natively into `index.html`. This ensures that third-party node-based libraries don't crash the browser before the app loads.
3. **No-API Independence**: I have completely removed the `@google/genai` dependency. The app will boot successfully natively whether you have internet or not. Make sure you don't use old locked dependency files.
4. **Base Href**: Ensure `index.html` has `<base href="./">` (already updated).

---

## 8. Development & Further Work
*   **VS Code**: Recommended for local development.
*   **Electron**: Use for `.exe` packaging.
*   **Capacitor**: Use for `.apk` packaging.
