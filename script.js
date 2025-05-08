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
}); 