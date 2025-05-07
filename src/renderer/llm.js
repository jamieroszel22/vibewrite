class LLMService {
    constructor() {
        this.statusElement = document.getElementById('llm-status');
        this.draftButton = document.getElementById('draft-button');
        this.promptInput = document.getElementById('draft-prompt');
        this.modelInput = document.getElementById('ollama-model');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.draftButton.addEventListener('click', () => this.handleDraft());
        this.promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleDraft();
            }
        });
    }
    
    async handleDraft() {
        const prompt = this.promptInput.value.trim();
        const model = this.modelInput.value.trim();
        
        if (!this.validateInputs(prompt, model)) {
            return;
        }
        
        this.setStatus(`Drafting with ${model}... Please wait.`, 'info');
        this.draftButton.disabled = true;
        
        try {
            const result = await window.api.draftWithLLM(model, prompt);
            
            if (result.success) {
                this.appendToEditor(result.response);
                this.setStatus('Drafting complete!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.handleError(error, model);
        } finally {
            this.draftButton.disabled = false;
        }
    }
    
    validateInputs(prompt, model) {
        if (!prompt) {
            this.setStatus('Please enter a draft prompt.', 'error');
            return false;
        }
        if (!model) {
            this.setStatus('Please enter an Ollama model name.', 'error');
            return false;
        }
        return true;
    }
    
    setStatus(message, type = 'info') {
        this.statusElement.textContent = message;
        this.statusElement.style.color = this.getStatusColor(type);
    }
    
    getStatusColor(type) {
        const colors = {
            info: '#555',
            success: 'green',
            error: 'red'
        };
        return colors[type] || colors.info;
    }
    
    appendToEditor(text) {
        const editor = document.getElementById('editor');
        const currentText = editor.value;
        const separator = currentText.trim() ? '\n\n' : '';
        editor.value += separator + text.trim();
        editor.dispatchEvent(new Event('input'));
    }
    
    handleError(error, model) {
        console.error('Error drafting with LLM:', error);
        this.setStatus(
            `Error: ${error.message}. Please ensure Ollama is running, the model '${model}' is available, and the Ollama server is reachable.`,
            'error'
        );
    }
}

// Initialize the service when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.llmService = new LLMService();
}); 