document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const markdownInput = document.getElementById('markdown-input');
    const markdownPreview = document.getElementById('markdown-preview');
    const draftPromptInput = document.getElementById('draft-prompt');
    const ollamaModelInput = document.getElementById('ollama-model');
    const draftButton = document.getElementById('draft-button');
    const llmStatus = document.getElementById('llm-status');

    // Initialize Markdown Preview
    function updatePreview() {
        if (window.marked && typeof window.marked.parse === 'function') {
            markdownPreview.innerHTML = window.marked.parse(markdownInput.value);
        } else {
            markdownPreview.innerHTML = "<p>Error: Marked.js library not loaded or 'parse' function unavailable.</p>";
            console.error("Marked.js or marked.parse is not available.");
        }
    }

    markdownInput.addEventListener('input', updatePreview);
    updatePreview(); // Initial render

    // LLM Drafting
    draftButton.addEventListener('click', async () => {
        const prompt = draftPromptInput.value.trim();
        const model = ollamaModelInput.value.trim();

        if (!prompt) {
            llmStatus.textContent = 'Please enter a draft prompt.';
            llmStatus.style.color = 'red';
            return;
        }
        if (!model) {
            llmStatus.textContent = 'Please enter an Ollama model name.';
            llmStatus.style.color = 'red';
            return;
        }

        llmStatus.textContent = `Drafting with ${model}... Please wait.`;
        llmStatus.style.color = '#555'; // Reset color
        draftButton.disabled = true;

        try {
            // Ollama API endpoint
            const OLLAMA_API_ENDPOINT = 'http://localhost:11434/api/generate';

            const response = await fetch(OLLAMA_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false // For simplicity in Phase 1, not using streaming yet
                }),
            });

            if (!response.ok) {
                let errorDetails = `Ollama API error (${response.status}): `;
                try {
                    // Try to parse the error response from Ollama
                    const errorData = await response.json();
                    errorDetails += `${errorData.error || response.statusText}`;
                } catch (e) {
                    // If parsing fails, use the raw text of the response
                    errorDetails += `${await response.text() || response.statusText}`;
                }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            
            const currentText = markdownInput.value;
            // Insert a couple of newlines if there's existing text, for better separation
            const separator = currentText.trim() ? '\n\n' : '';
            markdownInput.value += separator + data.response.trim(); // Append LLM response
            
            updatePreview(); // Update preview with new content
            llmStatus.textContent = 'Drafting complete!';
            llmStatus.style.color = 'green';

        } catch (error) {
            console.error('Error drafting with LLM:', error);
            // Provide a more user-friendly error message
            llmStatus.textContent = `Error: ${error.message}. Please ensure Ollama is running, the model '${model}' is available, and the Ollama server is reachable.`;
            llmStatus.style.color = 'red';
        } finally {
            draftButton.disabled = false; // Re-enable the button
        }
    });
}); 