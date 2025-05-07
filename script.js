document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');
    const marked = require('marked');
    const DOMPurify = require('dompurify');

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
    function updatePreview() {
        const markdown = editor.value;
        const html = marked.parse(markdown);
        preview.innerHTML = DOMPurify.sanitize(html);
    }
    editor.addEventListener('input', () => {
        updatePreview();
        isDirty = true;
    });

    // File operation handlers
    ipcRenderer.on('new-file', () => {
        if (isDirty) {
            if (confirm('Do you want to save changes?')) {
                saveFile();
            }
        }
        editor.value = '';
        currentFilePath = null;
        isDirty = false;
        updatePreview();
    });

    ipcRenderer.on('file-opened', (event, { content, path }) => {
        editor.value = content;
        currentFilePath = path;
        isDirty = false;
        updatePreview();
    });

    ipcRenderer.on('save-file', () => {
        saveFile();
    });

    ipcRenderer.on('save-file-as', (event, filePath) => {
        saveFileAs(filePath);
    });

    function saveFile() {
        if (currentFilePath) {
            saveFileAs(currentFilePath);
        } else {
            ipcRenderer.send('show-save-dialog');
        }
    }

    function saveFileAs(filePath) {
        const content = editor.value;
        ipcRenderer.send('write-file', { filePath, content });
        currentFilePath = filePath;
        isDirty = false;
    }

    ipcRenderer.on('file-saved', () => {
        console.log('File saved successfully');
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
            const OLLAMA_API_ENDPOINT = 'http://localhost:11434/api/generate';
            const response = await fetch(OLLAMA_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: false })
            });
            if (!response.ok) {
                let errorDetails = `Ollama API error (${response.status}): `;
                try {
                    const errorData = await response.json();
                    errorDetails += `${errorData.error || response.statusText}`;
                } catch (e) {
                    errorDetails += `${await response.text() || response.statusText}`;
                }
                throw new Error(errorDetails);
            }
            const data = await response.json();
            const currentText = editor.value;
            const separator = currentText.trim() ? '\n\n' : '';
            editor.value += separator + data.response.trim();
            updatePreview();
            llmStatus.textContent = 'Drafting complete!';
            llmStatus.style.color = 'green';
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

    function handleToolbarAction(action) {
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
        updatePreview();
    }

    // Theme toggle logic
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    function setTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        themeToggle.textContent = dark ? '☀️' : '🌙';
        localStorage.setItem('vibe-theme', dark ? 'dark' : 'light');
    }
    const savedTheme = localStorage.getItem('vibe-theme');
    if (savedTheme === 'dark' || (savedTheme === null && prefersDark)) {
        setTheme(true);
    } else {
        setTheme(false);
    }
    themeToggle.addEventListener('click', () => {
        setTheme(!document.body.classList.contains('dark-mode'));
    });

    // Initial preview
    updatePreview();
}); 