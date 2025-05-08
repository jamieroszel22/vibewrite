const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const marked = require('marked');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

let mainWindow;

// Create a window object for DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Add this at the top if fetch is not defined
let fetchFn = global.fetch;
if (!fetchFn) {
    fetchFn = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

// Test a Simple Fetch in Main Process (outside any function)
(async () => {
  try {
    // Ensure fetchFn is defined before calling it
    if (typeof fetchFn !== 'function') {
        console.error('Test fetch error: fetchFn is not a function. node-fetch might not be properly imported or available.');
        // Attempt to re-initialize fetchFn as a fallback, in case the initial import failed silently
        // This is a defensive measure.
        try {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
            if (typeof fetchFn === 'function') {
                console.log('Successfully re-initialized fetchFn with node-fetch.');
            } else {
                 console.error('Re-initialization of fetchFn with node-fetch also failed.');
                 return;
            }
        } catch (importError) {
            console.error('Error importing node-fetch during re-initialization:', importError);
            return;
        }
    }
    console.log('Attempting test fetch to http://localhost:11434 with fetchFn:', fetchFn);
    const res = await fetchFn('http://localhost:11434');
    console.log('Test fetch status:', res.status);
  } catch (e) {
    console.error('Test fetch error:', e);
    if (e.stack) console.error('Test fetch error stack:', e.stack); // Log stack trace for the test fetch
  }
})();


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Vibe Write',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // enableRemoteModule: true, // Deprecated and insecure, should be false if possible
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    });

    mainWindow.loadFile('index.html');
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('new-file');
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Markdown', extensions: ['md', 'markdown'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (filePaths && filePaths[0]) {
                            const content = fs.readFileSync(filePaths[0], 'utf8');
                            mainWindow.webContents.send('file-opened', {
                                content,
                                path: filePaths[0]
                            });
                        }
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: async () => {
                        mainWindow.webContents.send('save-file');
                    }
                },
                {
                    label: 'Save As',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        const { filePath } = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'Markdown', extensions: ['md'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (filePath) {
                            mainWindow.webContents.send('save-file-as', filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Handle file write operation
ipcMain.on('write-file', (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        event.reply('file-saved');
    } catch (error) {
        console.error('Error saving file:', error);
        if (error.stack) console.error('Error saving file stack:', error.stack);
        dialog.showErrorBox('Error', 'Failed to save file');
    }
});

// Handle save dialog request
ipcMain.on('show-save-dialog', async (event) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (filePath) {
        event.reply('save-file-as', filePath);
    }
});

// Handle LLM drafting
ipcMain.handle('draft-with-llm', async (event, { model, prompt }) => {
    console.log('ipcMain: draft-with-llm invoked with model:', model, 'and prompt:', prompt);
    try {
        console.log('Sending request to Ollama:', model, prompt);
        // Test Ollama root endpoint
        try {
            const rootRes = await fetchFn('http://127.0.0.1:11434');
            console.log('Ollama root status:', rootRes.status);
        } catch (rootErr) {
            console.error('Root fetch error (details):', rootErr);
            if (rootErr.stack) console.error('Root fetch error stack:', rootErr.stack);
             // Do not re-throw here, let the main generate call proceed to see its specific error
        }

        // Ensure fetchFn is defined before the main API call
        if (typeof fetchFn !== 'function') {
            console.error('Ollama generate API call error: fetchFn is not a function. node-fetch might not be properly imported or available.');
            // Attempt to re-initialize fetchFn as a fallback
            try {
                const nodeFetch = await import('node-fetch');
                fetchFn = nodeFetch.default;
                if (typeof fetchFn === 'function') {
                    console.log('Successfully re-initialized fetchFn with node-fetch before API generate call.');
                } else {
                    console.error('Re-initialization of fetchFn with node-fetch also failed before API generate call.');
                     throw new Error('fetchFn is not available for Ollama generate API call.');
                }
            } catch (importError) {
                console.error('Error importing node-fetch during re-initialization before API generate call:', importError);
                throw new Error('fetchFn could not be initialized for Ollama generate API call.');
            }
        }

        console.log('Attempting Ollama generate API call with fetchFn:', fetchFn);
        const response = await fetchFn('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        
        console.log('Ollama API response status:', response.status, response.statusText);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Ollama API error response body:', errorBody);
            throw new Error(`Ollama API error (${response.status}): ${response.statusText}. Body: ${errorBody}`);
        }
        
        const data = await response.json();
        console.log('Ollama API response data:', data);
        return { success: true, response: data.response };
    } catch (error) {
        console.error('Error in LLM drafting (catch block):', error); // Enhanced logging
        if (error.stack) console.error('LLM drafting error stack:', error.stack); // Log stack trace
        return { success: false, error: error.message };
    }
});

// Handle theme operations
ipcMain.handle('get-theme', () => {
    // This seems to be returning the userData path, not the theme.
    // Consider if this is the intended behavior or if it should store/retrieve actual theme string.
    console.log("ipcMain: get-theme called. Returning userData path:", app.getPath('userData'));
    return app.getPath('userData'); // For now, keeping existing logic
});

ipcMain.on('set-theme', (event, theme) => {
    console.log("ipcMain: set-theme called with theme:", theme);
    // Implement theme setting logic if needed in main process,
    // or confirm if this is purely a renderer-side concern after initial load.
});

// Handle markdown preview
ipcMain.handle('update-preview', (event, content) => {
    const html = marked.parse(content);
    return purify.sanitize(html);
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});