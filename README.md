# Vibe Code Markdown LLM Author

A modern, intuitive markdown authoring app with live preview and local LLM-powered drafting via Ollama.

## Overview
- **Purpose:** Foster a focused, pleasant writing experience with AI assistance.
- **Core Features:**
  - Markdown editor with live preview (Marked.js)
  - LLM drafting via local Ollama instance
  - Model selection dropdown for easy switching

## Setup
1. **Prerequisites:**
   - [Ollama](https://ollama.com/) installed and running locally
   - At least one model pulled (e.g., `ollama pull granite3.3`)
   - Modern web browser (Chrome, Firefox, Edge, Safari)
2. **Install:**
   - Clone/download this repo
   - Open `index.html` in your browser

## Usage
- **Write Markdown:** Use the left pane to type markdown. The right pane previews it live.
- **LLM Drafting:**
  1. Enter a prompt (e.g., "Write an intro about AI")
  2. Select a model from the dropdown
  3. Click "Draft with LLM" — the response is appended to your markdown
- **Status messages** indicate progress and errors.

## Model Selection
- Choose from your locally available models (e.g., Granite, Phi-4, Llama, etc.)
- For general text, try Granite 3.3 or Phi-4
- For reasoning, try Phi4-Reasoning
- For instruction following, try Granite 3.2 8B Instruct

## Troubleshooting
- **Ollama not running:** Start Ollama (`ollama serve`)
- **Model not found:** Pull the model with `ollama pull <model>`
- **Network issues:** Ensure Ollama is accessible at `http://localhost:11434`

## Next Steps
- Add copy editing and brainstorming features
- Support streaming LLM responses
- File save/load/export
- UI/UX refinements

---

*Made with ❤️ for a better writing vibe.* 