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
                // Always perform improvement check now
                const result = await window.api.invokeCopyAnalysis(textToAnalyze, "improvement");
                
                if (result.success && result.suggestions && result.suggestions.length > 0) {
                    currentSuggestions = result.suggestions;
                    suggestionsList.innerHTML = ''; // Clear previous suggestions
                    
                    // Remove any existing event listeners
                    const oldButtons = suggestionsList.querySelectorAll('.apply-suggestion');
                    oldButtons.forEach(button => {
                        button.replaceWith(button.cloneNode(true));
                    });
                    
                    result.suggestions.forEach(suggestion => {
                        // Validate suggestion data
                        if (!suggestion.id || typeof suggestion.paragraphIndex !== 'number' || 
                            !suggestion.originalParagraph || !suggestion.correctedParagraph || 
                            !Array.isArray(suggestion.changes)) {
                            console.error('Invalid suggestion data:', suggestion);
                            return;
                        }

                        const suggestionDiv = document.createElement('div');
                        suggestionDiv.className = 'suggestion';
                        suggestionDiv.dataset.suggestionId = suggestion.id;
                        
                        // Create diff view
                        const diffView = document.createElement('div');
                        diffView.className = 'diff-view';
                        
                        suggestion.changes.forEach(change => {
                            if (change.added) {
                                const ins = document.createElement('ins');
                                ins.textContent = change.value;
                                diffView.appendChild(ins);
                            } else if (change.removed) {
                                const del = document.createElement('del');
                                del.textContent = change.value;
                                diffView.appendChild(del);
                            } else {
                                const span = document.createElement('span');
                                span.textContent = change.value;
                                diffView.appendChild(span);
                            }
                        });
                        
                        suggestionDiv.appendChild(diffView);
                        
                        // Add apply button
                        const applyButton = document.createElement('button');
                        applyButton.className = 'apply-suggestion';
                        applyButton.textContent = 'Apply Improvement';
                        applyButton.dataset.suggestionId = suggestion.id;
                        applyButton.dataset.paragraphIndex = suggestion.paragraphIndex;
                        suggestionDiv.appendChild(applyButton);
                        
                        suggestionsList.appendChild(suggestionDiv);
                    });

                    // Add event listeners to suggestion buttons
                    document.querySelectorAll('.apply-suggestion').forEach(button => {
                        button.addEventListener('click', async () => {
                            const suggestionId = button.dataset.suggestionId;
                            const paragraphIndex = parseInt(button.dataset.paragraphIndex, 10);
                            
                            // Disable all apply buttons during processing
                            document.querySelectorAll('.apply-suggestion').forEach(btn => btn.disabled = true);
                            button.textContent = 'Applying...';
                            
                            try {
                                // Find the suggestion object using the ID
                                const suggestion = currentSuggestions.find(s => s.id === suggestionId);

                                if (!suggestion) {
                                    throw new Error(`Could not find suggestion data for ID: ${suggestionId}`);
                                }
                                
                                const correctedParagraph = suggestion.correctedParagraph;
                                const editorText = editor.value;
                                const paragraphs = editorText.split('\n\n');
                                
                                if (paragraphs[paragraphIndex] === undefined) {
                                    throw new Error(`Paragraph index ${paragraphIndex} out of bounds`);
                                }

                                // Replace the entire paragraph
                                paragraphs[paragraphIndex] = correctedParagraph;
                                editor.value = paragraphs.join('\n\n');
                                await updatePreview();
                                
                                // Remove the applied suggestion from the list
                                const suggestionElement = suggestionsList.querySelector(`div[data-suggestion-id="${suggestionId}"]`);
                                if (suggestionElement) suggestionElement.remove();

                                // Check if list is empty
                                if (suggestionsList.children.length === 0) {
                                    suggestionsList.innerHTML = '<p style="color: #777;">No suggestions remaining.</p>';
                                }
                            } catch (error) {
                                console.error('Error applying suggestion:', error);
                                button.textContent = `Error: ${error.message}`;
                                button.style.backgroundColor = '#ff4444';
                            } finally {
                                // Re-enable remaining buttons
                                document.querySelectorAll('.apply-suggestion').forEach(btn => {
                                    if (btn !== button) btn.disabled = false;
                                });
                            }
                        });
                    });
                } else if (result.error) {
                    suggestionsList.innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;
                } else {
                    suggestionsList.innerHTML = '<p style="color: #777;">No improvements needed.</p>';
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