const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        // File operations
        newFile: () => ipcRenderer.send('new-file'),
        openFile: () => ipcRenderer.send('open-file'),
        saveFile: () => ipcRenderer.send('save-file'),
        saveFileAs: () => ipcRenderer.send('save-file-as'),
        onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),
        onFileSaved: (callback) => ipcRenderer.on('file-saved', callback),
        
        // LLM operations
        draftWithLLM: (model, prompt) => ipcRenderer.invoke('draft-with-llm', { model, prompt }),
        
        // Theme operations
        getTheme: () => ipcRenderer.invoke('get-theme'),
        setTheme: (theme) => ipcRenderer.send('set-theme', theme),
        
        // Window operations
        minimize: () => ipcRenderer.send('minimize-window'),
        maximize: () => ipcRenderer.send('maximize-window'),
        close: () => ipcRenderer.send('close-window')
    }
); 