# Master Creation Prompt: professional-grade Apps

Use this prompt in a new chat to recreate the quality and architecture of SubMaster Pro for a different project.

---

**Prompt:**

Build a high-performance, professional-grade **[INSERT APP NAME/TYPE HERE]** using Angular.

**1. Aesthetic & UI Architecture:**
- Implement a distinctive, polished "Glassmorphism" interface.
- **Theme System:** Must support multiple artistic themes (Midnight, Dawn, Eco, Sunset, Cyber). Use CSS variables for a 0.5s smooth transition between themes.
- **Tailwind Artistry:** Use subtle borders (border-white/10), backdrop blurs, and shadow-accent/20 for primary buttons.

**2. Core UX & Interactivity:**
- **Rich Workstage:** Create a visual workspace with deep interactivity (Drag to move elements, Edge-dragging to resize, Scroll to zoom).
- **Navigation:** Use a dual-sidebar layout with a persistent playback/control header.
- **Global Hotkeys:** Support standard shortcuts (Space for Play/Pause, Enter for primary actions).

**3. Technical Architecture:**
- **State Management:** Use Angular Signals throughout for high-performance reactive updates.
- **Local-First:** Ensure all core logic and data processing happen 100% in the browser.
- **History System:** Implement a "Checkpoint" system to allow users to save and restore project states locally.

**4. AI & Integration:**
- **AI Plugin System:** Create a service that supports both Cloud (Gemini) and Local (Ollama) providers via a settings menu.
- **Inter-App API:** Expose a `postMessage` API so the app can be embedded in iframes (Streamlit, Flask, Web) and controlled remotely.

**5. Documentation & Delivery:**
- Perform a full object audit to ensure zero broken references.
- Create Markdown guides for: User Manual, Embedding API, PC Setup, and Mobile/Desktop packaging (.exe/.apk).
