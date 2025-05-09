# Phase 3: LLM-Powered Copy Editor Implementation Plan

**Objective:** To integrate an LLM-powered copy editing feature into Vibe Write, focusing initially on grammar, conciseness, and basic style, with a provision for client-side spell checking. This plan emphasizes a granular, step-by-step approach to manage complexity and ensure robust implementation, particularly around LLM interaction and text manipulation.

**Core LLM:** `gemma3:4b` (via local Ollama instance)

**Guiding Principles & Key Strategies for LLM Interaction:**

*   **Ultra-Specific Prompts:** Instruct the LLM precisely on its task, the desired output format (e.g., JSON), and what *not* to do (e.g., be conversational, rewrite entire sections unless asked).
*   **Analyze Smallest Sensible Chunks:** Process text in manageable units (e.g., paragraphs) to limit the "blast radius" of potential LLM inaccuracies and to make suggestions more targeted.
*   **User-Initiated "Accept":** All LLM suggestions must be reviewed and explicitly accepted by the user. No automatic application of changes.
*   **Consider Diffing for Applying Changes:** For more robust text replacement, use text diffing algorithms to find minimal changes between the original and suggested text, applying only those.
*   **Iterative Prompt Refinement:** Continuously test and refine prompts based on LLM output to improve accuracy and reliability.
*   **Temperature Setting:** Utilize lower temperature settings (e.g., `0.2` or lower) for Ollama calls to encourage more deterministic and less "creative" responses suitable for editing tasks.

---

## Section 1: Foundation (Common for all LLM-based editing features)

This section covers the initial setup of UI elements and IPC communication required for all subsequent LLM-driven copy editing features.

### F3.0: Basic UI for Copy Editing Trigger & Display

*   **F3.0.1 (UI - Renderer `index.html`):**
    *   Add an "Analyze for Issues" button (or similar).
*   **F3.0.2 (UI - Renderer `index.html`):**
    *   Create a dedicated area (e.g., a sidebar, a collapsible panel below the editor, or a modal) to list suggestions.
    *   Initially, this area will display raw text suggestions, not in-editor highlights.
*   **Test Criteria (F3.0.1 & F3.0.2):**
    *   The "Analyze for Issues" button is visible in the UI.
    *   The dedicated suggestion display area is visible (or can be made visible).
    *   Clicking the button currently has no action or a placeholder action.

*   **F3.0.3 (IPC - `preload.js` & `main.js`):**
    *   Define a new IPC channel in `preload.js`:
        ```javascript
        window.api.invokeCopyAnalysis = (text, analysisType) => ipcRenderer.invoke('invoke-copy-analysis', { text, analysisType });
        ```
*   **F3.0.4 (IPC - `main.js`):**
    *   Create a basic handler in `main.js` for `invoke-copy-analysis`:
        ```javascript
        ipcMain.handle('invoke-copy-analysis', async (event, { text, analysisType }) => {
          console.log(`Received text for analysisType '${analysisType}':`, text.substring(0, 100) + "..."); // Log first 100 chars
          // TODO: Implement actual analysis logic
          return { success: true, message: "Analysis request received (mock response)." };
        });
        ```
*   **Test Criteria (F3.0.3 & F3.0.4):**
    *   Clicking the "Analyze for Issues" button (once connected in `script.js`) triggers the `invoke-copy-analysis` handler in `main.js`.
    *   The `main.js` console logs the received text and `analysisType`.
    *   The renderer process receives the mock success message.

---

## Section 2: Iteration 1 - LLM Grammar Check (Paragraph by Paragraph, Suggestion List)

This iteration focuses on implementing grammar checking using the LLM, displaying suggestions in a list, and allowing users to apply them.

### F3.1: Paragraph-based Grammar Analysis & Basic Suggestion Structure

*   **F3.1.1 (Backend - `main.js`):**
    *   **Modify `invoke-copy-analysis` Handler:**
        *   If `analysisType` is `"grammar"`, proceed with grammar analysis.
    *   **Chunking Logic:**
        *   Split the incoming `text` into paragraphs. A simple split by `\n\n` can be the initial approach. Robust markdown paragraph parsing can be a later refinement if necessary.
    *   **Prompt Engineering (Grammar - `gemma3:4b`):**
        *   For each paragraph, craft a precise prompt. Example:
            ```
            Analyze ONLY the following paragraph for grammatical errors.
            Paragraph: "[Insert Paragraph Here]"

            If you find errors, return a JSON array of objects. Each object should represent one error and have the following keys:
            - "originalPhrase": The exact text of the grammatical error from the paragraph.
            - "explanation": A brief explanation of the error.
            - "correctedPhrase": The suggested correction for that specific phrase.

            If there are no errors in this paragraph, return an empty JSON array: [].
            Do not add any conversational text or introductions. Only return the JSON.
            Do not rewrite the entire paragraph, only provide corrections for specific phrases.
            ```
    *   **LLM Interaction:**
        *   Loop through each paragraph.
        *   Send the paragraph and the prompt to the Ollama API (using `gemma3:4b` and a low temperature setting).
        *   Collect the JSON responses. Handle potential errors from the LLM (e.g., non-JSON response, API errors).
    *   **Suggestion Aggregation:**
        *   Combine suggestions from all paragraphs into a single array.
        *   Each suggestion object should be structured to include contextual information. Example:
            ```json
            {
              "id": "suggestion-uuid-123", // Generate a unique ID
              "paragraphIndex": 0, // Index of the paragraph in the original document
              "originalPhrase": "He go to store.",
              // "offsetInParagraph": 3, // Optional: Character offset if LLM can provide it reliably
              "explanation": "Subject-verb agreement error.",
              "correctedPhrase": "goes", // Or more complete if appropriate and reliable
              "analysisType": "grammar"
            }
            ```
    *   **Return Value:** The handler should return an array of these suggestion objects.
*   **Test Criteria (F3.1.1):**
    *   Send multi-paragraph text with known grammatical errors to `invoke-copy-analysis`.
    *   Verify `main.js` logs show iteration through paragraphs.
    *   Verify that the LLM is called for each paragraph.
    *   Verify that the returned data is an array of structured suggestion objects, including `paragraphIndex`, `originalPhrase`, `explanation`, and `correctedPhrase`.
    *   Test with paragraphs containing no errors (should return an empty array for that paragraph's suggestions).

*   **F3.1.2 (Frontend - `script.js`):**
    *   **Trigger Analysis:**
        *   When the "Analyze for Issues" button is clicked, get the current content from the markdown editor.
        *   Call `window.api.invokeCopyAnalysis(editorContent, "grammar")`.
    *   **Display Suggestions:**
        *   When suggestions are received from `main.js`:
            *   Clear any previous suggestions from the dedicated display area.
            *   For each suggestion object:
                *   Create a new list item or element in the display area.
                *   Display the information clearly (e.g., "Paragraph P+1: Issue with '`originalPhrase`'. Suggestion: '`correctedPhrase`'. Reason: `explanation`.").
*   **Test Criteria (F3.1.2):**
    *   Clicking "Analyze for Issues" populates the suggestion display area with grammar suggestions fetched from the backend.
    *   Paragraph indexing in the display is correct (e.g., "Paragraph 1", "Paragraph 2").
    *   Suggestions are clearly presented.

### F3.2: Applying a Single Grammar Suggestion (Simple Replacement)

*   **F3.2.1 (UI - Renderer `script.js` / `index.html`):**
    *   For each suggestion displayed in the list (from F3.1.2), add an "Accept" button.
*   **F3.2.2 (Logic - Renderer `script.js`):**
    *   **Event Listener:** Attach an event listener to each "Accept" button.
    *   **Applying Correction:**
        *   When "Accept" is clicked for a suggestion, retrieve its details (`paragraphIndex`, `originalPhrase`, `correctedPhrase`).
        *   **Challenge:** Accurately replacing `originalPhrase` with `correctedPhrase` only within the target paragraph in the main editor's full text.
        *   **Initial Approach:**
            1.  Get the full current text from the editor.
            2.  Split the editor's full text into paragraphs using the same logic as in `main.js` (e.g., `\n\n`).
            3.  Access the target paragraph string using `paragraphIndex`.
            4.  Attempt `String.prototype.replace(originalPhrase, correctedPhrase)` on *only* that paragraph's text.
                *   **Caution:** This is sensitive. `originalPhrase` must be an exact match. LLM variations in `originalPhrase` or overly creative `correctedPhrase` can cause failure or corruption.
            5.  Reconstruct the full editor text by joining the paragraphs (with the modified one).
            6.  Update the editor with the new full text.
            7.  Trigger the live preview update (`updatePreview()`).
            8.  Remove the accepted suggestion from the list or mark it as "Accepted."
*   **Test Criteria (F3.2.2):**
    *   Clicking "Accept" on a suggestion correctly modifies *only* the specified phrase within the correct paragraph in the editor.
    *   The live preview updates to reflect the change.
    *   The suggestion is removed or marked as accepted in the UI list.
    *   Test with various simple and slightly more complex phrases.
    *   Test edge cases: What if `originalPhrase` appears multiple times in the paragraph? (Initial `replace` will only get the first; this might be acceptable initially or require more sophisticated offset-based replacement later).

*   **F3.2.3 (Refinement - Based on F3.2.2 Testing):**
    *   This step is crucial if the simple `String.prototype.replace` proves unreliable.
    *   **More Constrained LLM Prompt:** Further refine the LLM prompt (F3.1.1) to be extremely explicit that `correctedPhrase` must be a direct, minimal replacement for `originalPhrase`. Emphasize returning only the changed segment if possible.
    *   **Diffing Library:** If necessary, integrate a lightweight client-side text diffing library.
        *   When "Accept" is clicked, diff `originalPhrase` and `correctedPhrase`.
        *   Apply only the minimal changes derived from the diff to the `originalPhrase`'s location within the target paragraph. This offers more precise control.
    *   **Focus on Offset (Advanced):** If the LLM can reliably provide character offsets of `originalPhrase` within the paragraph it analyzed, use this for a much more robust replacement mechanism (e.g., `paragraphText.substring(0, offset) + correctedPhrase + paragraphText.substring(offset + originalPhrase.length)`). This would require prompt adjustments and validation.

---

## Section 3: Iteration 2 - Client-Side Spell Check Integration

This iteration introduces basic, non-LLM spell checking for faster feedback.

### F3.3: Basic JavaScript Spell Checker

*   **F3.3.1 (Research & Integration - Renderer `script.js`):**
    *   Research and select a suitable lightweight JavaScript spell-checking library (e.g., Typo.js, or a simpler one, potentially focused on en-US initially). Consider bundle size and ease of integration.
    *   Integrate the chosen library into `script.js`.
    *   Implement logic to use the library to identify misspelled words in the editor's content. This could be triggered on demand (e.g., via a new button/option) or debounced as the user types.
*   **F3.3.2 (Display - Renderer `script.js` / `index.html` - Non-LLM):**
    *   **Challenge:** Displaying traditional squiggly underlines for misspellings. This is difficult with a standard `<textarea>`. It typically requires:
        *   Replacing the `<textarea>` with a `contenteditable <div>` and manually managing highlights/underlines with `<span>` tags and CSS.
        *   Or, migrating to a more advanced editor component (e.g., CodeMirror, Monaco Editor, TipTap, Milkdown) that provides APIs for text marking. This is a significant change.
    *   **Initial Workaround (if not ready for editor replacement):**
        *   List misspelled words in a separate UI area (similar to LLM suggestions but clearly marked as "Spelling Issues"). Each item could show the misspelled word and its paragraph or line number.
*   **Test Criteria (F3.3.1 & F3.3.2):**
    *   Typing misspelled words in the editor results in them being identified.
    *   Identified misspellings are displayed to the user (either via underlines if editor supports it, or in a list).

*   **F3.3.3 (Suggestion & Correction - Renderer `script.js` - Non-LLM):**
    *   Most spell-check libraries provide suggestion capabilities for misspelled words.
    *   Implement UI to show these suggestions (e.g., on hover/click of the misspelled word or list item).
    *   Implement logic to allow the user to select a suggestion and have it replace the misspelled word in the editor.
*   **Test Criteria (F3.3.3):**
    *   Users can view suggestions for misspelled words.
    *   Users can apply a chosen suggestion, and the word is corrected in the editor.
    *   The live preview updates.

---

## Section 4: Iteration 3 - Conciseness (Paragraph by Paragraph, Suggestion List)

This iteration adds LLM-based analysis for conciseness, following a similar pattern to the grammar check.

### F3.4: LLM Conciseness Analysis

*   **(Follows pattern of F3.1)**
*   **F3.4.1 (Backend - `main.js`):**
    *   In the `invoke-copy-analysis` handler, if `analysisType` is `"conciseness"`:
    *   **Prompt Engineering (Conciseness - `gemma3:4b`):**
        *   For each paragraph, craft a prompt asking the LLM to:
            *   Identify filler words, redundant phrases, or wordy sentences.
            *   For each issue, provide the `originalPhrase`.
            *   Provide an `explanation` (e.g., "This phrase is wordy," "Filler word").
            *   Provide a `suggestedConcisePhrase`.
        *   Ensure the LLM returns this as a JSON array of objects (similar to grammar).
    *   Aggregate suggestions with `paragraphIndex`, unique `id`, `analysisType: "conciseness"`, etc.
*   **F3.4.2 (Frontend - `script.js`):**
    *   When "Analyze for Issues" is clicked (perhaps with a new option for analysis type, or analyze for all types), call `window.api.invokeCopyAnalysis(editorContent, "conciseness")`.
    *   Display conciseness suggestions in the dedicated list area, clearly marked or distinguished from grammar suggestions.
*   **Test Criteria (F3.4.1 & F3.4.2):**
    *   Send text with known wordiness or filler words.
    *   Verify `main.js` and LLM interaction for conciseness.
    *   Conciseness suggestions (with `originalPhrase`, `explanation`, `suggestedConcisePhrase`) populate the UI list.

### F3.5: Applying Conciseness Suggestions

*   **(Follows pattern of F3.2)**
*   **F3.5.1 (UI & Logic - Renderer `script.js`):**
    *   Add "Accept" buttons to conciseness suggestions.
    *   Implement replacement logic similar to F3.2.2, being mindful of potential LLM creativity. The strategies from F3.2.3 (constrained prompts, diffing) are equally important here.
*   **Test Criteria (F3.5.1):**
    *   Accepting conciseness suggestions correctly modifies the text in the editor.
    *   The text becomes more concise as intended.
    *   Live preview updates.

---

## Section 5: Subsequent Iterations & UI/UX Enhancements (Future Scope)

These are potential future steps once the foundational LLM-based editing and spell check are functional.

*   **F3.X: LLM Readability Analysis:**
    *   Similar pattern: Define `analysisType="readability"`.
    *   Prompt LLM to identify complex sentences, long sentences, or passages that are hard to read.
    *   LLM suggests simpler alternatives or ways to break down sentences.
    *   Implement display and "Accept" functionality.

*   **F3.Y: LLM Style Suggestions:**
    *   Examples: passive voice detection, cliché identification.
    *   Each specific style suggestion might require its own focused prompt and `analysisType` (e.g., `"passivevoice"`, `"cliche"`).
    *   Implement display and "Accept" functionality.

*   **F3.Z: In-Editor Highlighting and Contextual Menus:**
    *   This is a significant UI/UX enhancement.
    *   **Goal:** Move away from a separate suggestion list to highlighting issues directly within the editor text.
    *   **Technical Exploration:**
        *   Investigate replacing the current `<textarea>` with a `contenteditable="true"> <div>`. This allows for wrapping text segments in `<span>` tags, which can then be styled (e.g., colored underlines) to indicate issues.
        *   Alternatively, explore integrating lightweight WYSIWYG or Markdown editor components that offer APIs for text marking and annotations (e.g., CodeMirror, TipTap, Milkdown). Evaluate their bundle size, complexity, and Markdown compatibility.
    *   **UX:**
        *   On hovering or clicking a highlighted section, display a small popup/tooltip showing the suggestion details (`explanation`, `correctedPhrase`) and an "Accept" button directly in context.

--- 