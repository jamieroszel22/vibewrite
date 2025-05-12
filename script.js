document.addEventListener('DOMContentLoaded', () => {
    let currentFilePath = null;
    let isDirty = false;

    // DOM Elements
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const draftPromptInput = document.getElementById('draft-prompt');
    const ollamaModelInput = document.getElementById('ollama-model');
    const draftButton = document.getElementById('draft-button');
    const llmStatus = document.getElementById('llm-status');
    const toolbar = document.querySelector('.toolbar');
    const themeToggle = document.getElementById('theme-toggle');
    const analyzeButton = document.getElementById('analyze-button');
    const suggestionsList = document.getElementById('suggestions-list');

    let currentSuggestions = []; // Variable to hold the suggestions array

    // Real-time preview
    async function updatePreview() {
        const markdown = editor.value;
        const html = await window.api.updatePreview(markdown);
        preview.innerHTML = html;
    }
    editor.addEventListener('input', () => {
        updatePreview();
        isDirty = true;
    });

    // File operation handlers
    window.api.onFileOpened(async (event, { content, path }) => {
        editor.value = content;
        currentFilePath = path;
        isDirty = false;
        await updatePreview();
    });

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
        llmStatus.style.color = '#555';
        draftButton.disabled = true;

        try {
            const result = await window.api.draftWithLLM(model, prompt);
            
            if (result.success) {
                const currentText = editor.value;
                const separator = currentText.trim() ? '\n\n' : '';
                editor.value += separator + result.response.trim();
                await updatePreview();
                llmStatus.textContent = 'Drafting complete!';
                llmStatus.style.color = 'green';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error drafting with LLM:', error);
            llmStatus.textContent = `Error: ${error.message}. Please ensure Ollama is running, the model '${model}' is available, and the Ollama server is reachable.`;
            llmStatus.style.color = 'red';
        } finally {
            draftButton.disabled = false;
        }
    });

    // Allow Enter to submit Draft Prompt
    draftPromptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            draftButton.click();
        }
    });

    // Toolbar formatting actions
    if (toolbar) {
        toolbar.addEventListener('click', function(e) {
            if (e.target.closest('.toolbar-btn')) {
                const btn = e.target.closest('.toolbar-btn');
                const action = btn.getAttribute('data-action');
                handleToolbarAction(action);
            }
        });
    }

    async function handleToolbarAction(action) {
        const textarea = editor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        let selected = textarea.value.substring(start, end);
        let before = textarea.value.substring(0, start);
        let after = textarea.value.substring(end);
        let newText = '';
        let cursorPos = start;

        // For bold/italic, trim spaces and preserve them outside the formatting
        let leadingSpaces = '', trailingSpaces = '';
        if (action === 'bold' || action === 'italic') {
            const match = selected.match(/^(\s*)(.*?)(\s*)$/);
            if (match) {
                leadingSpaces = match[1];
                selected = match[2];
                trailingSpaces = match[3];
            }
        }

        switch (action) {
            case 'bold':
                newText = `${leadingSpaces}**${selected || 'bold text'}**${trailingSpaces}`;
                cursorPos += leadingSpaces.length + 2;
                break;
            case 'italic':
                newText = `${leadingSpaces}*${selected || 'italic text'}*${trailingSpaces}`;
                cursorPos += leadingSpaces.length + 1;
                break;
            case 'heading':
                const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
                before = textarea.value.substring(0, lineStart);
                const line = textarea.value.substring(lineStart, end);
                newText = `# ${line || 'Heading'}`;
                after = textarea.value.substring(end);
                cursorPos = lineStart + 2;
                break;
            case 'list':
                const listLineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
                before = textarea.value.substring(0, listLineStart);
                const listLine = textarea.value.substring(listLineStart, end);
                newText = `- ${listLine || 'List item'}`;
                after = textarea.value.substring(end);
                cursorPos = listLineStart + 2;
                break;
            case 'inline-code':
                newText = `\`${selected || 'code'}\``;
                cursorPos += selected ? 1 : 1;
                break;
            case 'code-block':
                newText = `\n\n\`\`\`\n${selected || 'code block'}\n\`\`\`\n`;
                cursorPos = start + 5;
                break;
            default:
                return;
        }
        textarea.value = before + newText + after;
        if (action === 'heading' || action === 'list') {
            textarea.setSelectionRange(cursorPos, cursorPos + (selected ? selected.length : 0));
        } else if (selected) {
            textarea.setSelectionRange(cursorPos, cursorPos + selected.length);
        } else {
            textarea.setSelectionRange(cursorPos, cursorPos);
        }
        textarea.focus();
        await updatePreview();
    }

    // Theme toggle logic
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    function setTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        themeToggle.textContent = dark ? '☀️' : '🌙';
        window.api.setTheme(dark ? 'dark' : 'light');
    }
    
    // Initialize theme
    window.api.getTheme().then(theme => {
        if (theme === 'dark' || (theme === null && prefersDark)) {
            setTheme(true);
        } else {
            setTheme(false);
        }
    });

    themeToggle.addEventListener('click', () => {
        setTheme(!document.body.classList.contains('dark-mode'));
    });

    // Initial preview
    (async () => { await updatePreview(); })();

    // Analyze Text
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async () => {
            const textToAnalyze = editor.value;
            if (!textToAnalyze.trim()) {
                suggestionsList.innerHTML = '<p style="color: #777;">Editor is empty. Nothing to analyze.</p>';
                return;
            }

            suggestionsList.innerHTML = '<p style="color: #555;">Analyzing text for issues...</p>';
            analyzeButton.disabled = true;

            try {
                // Always perform grammar check now
                const result = await window.api.invokeCopyAnalysis(textToAnalyze, "grammar");
                
                if (result.success && result.suggestions && result.suggestions.length > 0) {
                    currentSuggestions = result.suggestions; // Store suggestions
                    
                    suggestionsList.innerHTML = currentSuggestions.map(suggestion => {
                        // Generate HTML with inline diff highlights
                        let diffHtml = suggestion.changes.map(part => {
                            const value = part.value.replace(/\n/g, '<br>'); // Handle newlines in diff display
                            if (part.added) {
                                return `<ins class="diff-added">${value}</ins>`;
                            } else if (part.removed) {
                                return `<del class="diff-removed">${value}</del>`;
                            } else {
                                return `<span>${value}</span>`;
                            }
                        }).join('');

                        return `
                            <div class="suggestion-item" data-suggestion-id="${suggestion.id}">
                                <p><strong>Suggested Correction (Paragraph ${suggestion.paragraphIndex + 1}):</strong></p>
                                <div class="diff-view">${diffHtml}</div> 
                                <button class="apply-suggestion" 
                                        data-suggestion-id="${suggestion.id}"
                                        data-paragraph-index="${suggestion.paragraphIndex}" 
                                        
                                        > 
                                    Apply Suggestion for Paragraph ${suggestion.paragraphIndex + 1}
                                </button>
                            </div>
                        `;
                    }).join('');

                    // Add event listeners to suggestion buttons
                    document.querySelectorAll('.apply-suggestion').forEach(button => {
                        button.addEventListener('click', () => {
                            const suggestionId = button.dataset.suggestionId;
                            const paragraphIndex = parseInt(button.dataset.paragraphIndex, 10);
                            
                            // Find the suggestion object using the ID
                            const suggestion = currentSuggestions.find(s => s.id === suggestionId);

                            if (!suggestion) {
                                console.error(`Could not find suggestion data for ID: ${suggestionId}`);
                                button.disabled = true;
                                button.textContent = "Error: Data Missing";
                                return;
                            }
                            
                            const correctedParagraph = suggestion.correctedParagraph; // Get the corrected paragraph from the stored object
                            
                            const editorText = editor.value;
                            const paragraphs = editorText.split('\n\n');
                            
                            if (paragraphs[paragraphIndex] !== undefined) {
                                // Replace the entire paragraph
                                paragraphs[paragraphIndex] = correctedParagraph;
                                
                                editor.value = paragraphs.join('\n\n');
                                updatePreview();
                                
                                // Remove the applied suggestion from the list
                                const suggestionElement = suggestionsList.querySelector(`div[data-suggestion-id="${suggestionId}"]`);
                                if (suggestionElement) suggestionElement.remove();

                                // Check if list is empty
                                if (suggestionsList.children.length === 0) {
                                     suggestionsList.innerHTML = '<p style="color: #777;">No suggestions remaining.</p>';
                                }
                            } else {
                                console.error(`Could not apply suggestion ${suggestionId}: Paragraph index ${paragraphIndex} out of bounds.`);
                                // Optionally disable button or show error
                                button.disabled = true;
                                button.textContent = "Error: Invalid Index";
                            }
                        });
                    });
                } else if (result.error) {
                    suggestionsList.innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;
                } else {
                    suggestionsList.innerHTML = '<p style="color: #777;">No grammar issues found.</p>';
                }
                
            } catch (error) {
                console.error('Error analyzing text:', error);
                suggestionsList.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            } finally {
                analyzeButton.disabled = false;
            }
        });
    }
}); 