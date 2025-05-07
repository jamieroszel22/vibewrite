module.exports = {
    // API Configuration
    OLLAMA: {
        API_ENDPOINT: 'http://localhost:11434/api/generate',
        DEFAULT_MODEL: 'granite3.3',
        TIMEOUT: 30000, // 30 seconds
    },
    
    // Editor Configuration
    EDITOR: {
        DEFAULT_FONT_SIZE: '16px',
        DEFAULT_LINE_HEIGHT: '1.6',
        TAB_SIZE: 4,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    },
    
    // Theme Configuration
    THEME: {
        LIGHT: {
            background: '#ffffff',
            text: '#333333',
            accent: '#007bff',
        },
        DARK: {
            background: '#1a1a1a',
            text: '#ffffff',
            accent: '#0d6efd',
        },
    },
    
    // File Types
    FILE_TYPES: {
        MARKDOWN: {
            extensions: ['md', 'markdown'],
            mimeType: 'text/markdown',
        },
    },
    
    // Window Configuration
    WINDOW: {
        DEFAULT_WIDTH: 1200,
        DEFAULT_HEIGHT: 800,
        MIN_WIDTH: 800,
        MIN_HEIGHT: 600,
    },
}; 