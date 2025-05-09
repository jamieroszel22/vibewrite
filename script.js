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
                // For this initial test, we'll use "grammar" as the analysisType
                // This aligns with F3.1 (Iteration 1: LLM Grammar Check)
                const result = await window.api.invokeCopyAnalysis(textToAnalyze, "grammar");
                console.log('Analysis Result from Main Process:', result);

                if (result.success) {
                    // suggestionsList.innerHTML = `<p style="color: green;">Mock Analysis Complete: ${result.message}</p>`;
                    if (result.suggestions && result.suggestions.length > 0) {
                        suggestionsList.innerHTML = ''; // Clear previous suggestions
                        const ul = document.createElement('ul');
                        ul.style.listStyleType = 'none';
                        ul.style.paddingLeft = '0';
                        result.suggestions.forEach(suggestion => {
                            const li = document.createElement('li');
                            li.style.borderBottom = '1px solid #eee';
                            li.style.padding = '8px 0';
                            li.style.marginBottom = '5px';
                            li.innerHTML = 
                                `<strong>Paragraph ${suggestion.paragraphIndex + 1}:</strong> <span style="text-decoration: line-through; color: #999;">${suggestion.originalPhrase}</span><br>
                                 Suggest: <span style="color: green;">${suggestion.correctedPhrase}</span><br>
                                 <em>${suggestion.explanation}</em>`;
                            
                            const acceptButton = document.createElement('button');
                            acceptButton.textContent = 'Accept';
                            acceptButton.style.marginLeft = '10px';
                            acceptButton.style.padding = '3px 8px';
                            acceptButton.style.cursor = 'pointer';
                            // Store data needed for acceptance on the button or li
                            acceptButton.dataset.paragraphIndex = suggestion.paragraphIndex;
                            // Storing entire phrases in dataset can be risky if they are huge.
                            // For now, we assume they are manageable. If not, we might only store an ID and retrieve from an in-memory array.
                            acceptButton.dataset.originalPhrase = suggestion.originalPhrase; 
                            acceptButton.dataset.correctedPhrase = suggestion.correctedPhrase;
                            acceptButton.classList.add('accept-suggestion-btn'); // Class for event delegation

                            li.appendChild(acceptButton);
                            ul.appendChild(li);
                        });
                        suggestionsList.appendChild(ul);

                        // Add event listener for accept buttons (using delegation)
                        suggestionsList.addEventListener('click', async function(e) {
                            if (e.target.classList.contains('accept-suggestion-btn')) {
                                const button = e.target;
                                const listItem = button.closest('li');

                                const pIndex = parseInt(button.dataset.paragraphIndex);
                                const originalP = button.dataset.originalPhrase;
                                const correctedP = button.dataset.correctedPhrase;

                                const currentEditorText = editor.value;
                                const editorParagraphs = currentEditorText.split('\n\n');

                                if (pIndex < editorParagraphs.length) {
                                    // Safety check: compare trimmed versions
                                    if (editorParagraphs[pIndex].trim() === originalP.trim()) {
                                        editorParagraphs[pIndex] = correctedP; // Replace the paragraph
                                        editor.value = editorParagraphs.join('\n\n');
                                        await updatePreview();
                                        
                                        // Mark as accepted or remove
                                        listItem.style.opacity = '0.5';
                                        button.textContent = 'Accepted';
                                        button.disabled = true;
                                        // Or: listItem.remove();
                                        // After accepting, we might want to clear llmStatus or update it.
                                        llmStatus.textContent = 'Suggestion accepted.';
                                        llmStatus.style.color = 'blue';
                                    } else {
                                        console.warn('Paragraph content changed since analysis. Suggestion not applied.', 
                                                     { expectedOriginal: originalP, currentInEditor: editorParagraphs[pIndex] });
                                        llmStatus.textContent = 'Paragraph changed since analysis. Suggestion not applied.';
                                        llmStatus.style.color = 'orange';
                                    }
                                } else {
                                    console.error('Paragraph index out of bounds.');
                                    llmStatus.textContent = 'Error applying suggestion: paragraph index out of bounds.';
                                    llmStatus.style.color = 'red';
                                }
                            }
                        });

                        llmStatus.textContent = `Analysis complete. Found ${result.suggestions.length} suggestion(s).`;
                        llmStatus.style.color = 'green';
                    } else {
                        suggestionsList.innerHTML = '<p style="color: #777;">No grammar issues found by the LLM.</p>';
                        llmStatus.textContent = 'Analysis complete. No issues found.';
                        llmStatus.style.color = 'green';
                    }
                } else {
                    throw new Error(result.error || 'Unknown error during analysis.');
                }
            } catch (error) {
                console.error('Error during text analysis:', error);
                suggestionsList.innerHTML = `<p style="color: red;">Error during analysis: ${error.message}</p>`;
            } finally {
                analyzeButton.disabled = false;
            }
        });
    }
}); 